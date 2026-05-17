import { Injectable, NotFoundException } from "@nestjs/common";
import { OrderStatus, Prisma } from "@prisma/client";

import { t } from "../../i18n/messages";
import { getRequestLocale } from "../../i18n/request-locale.storage";
import { PrismaService } from "../../prisma/prisma.service";
import {
  ActivityActions,
  ActivityEntityTypes,
  ActivityLogService,
} from "../activity-log/activity-log.service";
import type { AuthUser } from "../auth/types/auth.types";
import { TasksRealtimeBridge } from "../tasks/tasks-realtime.bridge";
import type { CreateExpenseDto } from "./dto/create-expense.dto";
import type { ExpenseAnalyticsQueryDto } from "./dto/expense-analytics-query.dto";

function startOfUtcDay(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
}

@Injectable()
export class ExpensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: TasksRealtimeBridge,
    private readonly activityLog: ActivityLogService,
  ) {}

  private async profitSnapshotForOrder(
    orderId: string,
    currency: string,
  ): Promise<{
    orderPrice: number | null;
    totalExpenses: number;
    profit: number | null;
    currency: string;
  }> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, deletedAt: null },
      select: { totalAmount: true },
    });
    const orderPrice =
      order?.totalAmount != null ? order.totalAmount.toNumber() : null;
    const agg = await this.prisma.expense.aggregate({
      where: {
        orderId,
        deletedAt: null,
        currency,
      },
      _sum: { amount: true },
    });
    const totalExpenses = agg._sum.amount?.toNumber() ?? 0;
    return {
      orderPrice,
      totalExpenses,
      profit: orderPrice != null ? orderPrice - totalExpenses : null,
      currency,
    };
  }

  async create(dto: CreateExpenseDto, user: AuthUser) {
    const lang = getRequestLocale();
    const order = await this.prisma.order.findFirst({
      where: { id: dto.orderId, deletedAt: null },
      select: { id: true, currency: true, status: true },
    });
    if (!order) {
      throw new NotFoundException(t(lang, "order.notFound"));
    }
    if (order.status === OrderStatus.CANCELLED) {
      throw new NotFoundException(t(lang, "order.notFound"));
    }

    const dtoCurTrim = dto.currency?.trim();
    let currencyBasis = order.currency;
    if (dtoCurTrim !== undefined && dtoCurTrim.length > 0) {
      currencyBasis = dtoCurTrim;
    }
    const currency = currencyBasis.toUpperCase();
    const incurredOn = dto.incurredOn
      ? startOfUtcDay(new Date(dto.incurredOn))
      : startOfUtcDay(new Date());

    const row = await this.prisma.expense.create({
      data: {
        orderId: dto.orderId,
        recordedById: user.id,
        title: dto.title.trim(),
        category: dto.category,
        amount: new Prisma.Decimal(dto.amount),
        currency,
        description: dto.notes?.trim() ? dto.notes.trim() : null,
        incurredOn,
      },
    });

    const profit = await this.profitSnapshotForOrder(dto.orderId, currency);

    await this.activityLog.record({
      actorId: user.id,
      action: ActivityActions.EXPENSE_ADDED,
      entityType: ActivityEntityTypes.order,
      entityId: dto.orderId,
      meta: {
        expenseId: row.id,
        title: row.title,
        amount: row.amount.toNumber(),
        category: row.category,
        currency: row.currency,
        profit: profit.profit,
        totalExpenses: profit.totalExpenses,
      },
    });

    const payload = {
      expense: {
        id: row.id,
        orderId: row.orderId,
        title: row.title,
        category: row.category,
        amount: row.amount.toNumber(),
        currency: row.currency,
        notes: row.description,
        incurredOn: row.incurredOn,
        createdAt: row.createdAt,
      },
      profit,
    };

    this.realtime.emitOrderEvent(dto.orderId, "expense.created", payload);
    this.realtime.emitWorkspace("expense.created", {
      orderId: dto.orderId,
      ...payload,
    });

    return payload.expense;
  }

  async listRecent(query: { limit?: number; currency?: string }) {
    const take = Math.min(query.limit ?? 20, 50);
    const currency = query.currency?.trim().toUpperCase();
    const rows = await this.prisma.expense.findMany({
      where: {
        deletedAt: null,
        orderId: { not: null },
        ...(currency ? { currency } : {}),
      },
      orderBy: { createdAt: "desc" },
      take,
      include: {
        order: {
          select: {
            id: true,
            title: true,
            orderNumber: true,
            currency: true,
          },
        },
      },
    });
    return {
      data: rows.map((r) => ({
        id: r.id,
        title: r.title,
        category: r.category,
        amount: r.amount.toNumber(),
        currency: r.currency,
        notes: r.description,
        incurredOn: r.incurredOn,
        createdAt: r.createdAt,
        order: r.order
          ? {
              id: r.order.id,
              title: r.order.title,
              orderNumber: r.order.orderNumber,
              currency: r.order.currency,
            }
          : null,
      })),
    };
  }

  async getAnalytics(query: ExpenseAnalyticsQueryDto) {
    const qCurTrim = query.currency?.trim();
    let analyticsBasis = "UZS";
    if (qCurTrim !== undefined && qCurTrim.length > 0) {
      analyticsBasis = qCurTrim;
    }
    const currency = analyticsBasis.toUpperCase();
    const parts: Prisma.ExpenseWhereInput[] = [
      { deletedAt: null },
      { orderId: { not: null } },
      { currency },
      {
        order: {
          deletedAt: null,
          status: { not: OrderStatus.CANCELLED },
        },
      },
    ];

    if (query.from?.trim() && query.to?.trim()) {
      const from = new Date(query.from);
      const to = new Date(query.to);
      parts.push({
        incurredOn: { gte: startOfUtcDay(from), lte: startOfUtcDay(to) },
      });
    }

    const where: Prisma.ExpenseWhereInput = { AND: parts };

    const [byCategoryRows, expenseRows] = await this.prisma.$transaction([
      this.prisma.expense.groupBy({
        by: ["category"],
        where,
        _sum: { amount: true },
        orderBy: { category: "asc" },
      }),
      this.prisma.expense.findMany({
        where,
        select: { amount: true, incurredOn: true },
      }),
    ]);

    const byCategory = byCategoryRows.map((r) => ({
      category: r.category,
      total: r._sum?.amount?.toNumber() ?? 0,
    }));

    const monthlyMap = new Map<string, number>();
    for (const r of expenseRows) {
      const d = r.incurredOn;
      const key = `${String(d.getUTCFullYear())}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + r.amount.toNumber());
    }
    const monthly = [...monthlyMap.entries()]
      .map(([period, total]) => ({ period, total }))
      .sort((a, b) => a.period.localeCompare(b.period));

    return {
      currency,
      byCategory,
      monthly,
    };
  }
}
