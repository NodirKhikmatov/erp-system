import { Injectable } from "@nestjs/common";
import { OrderStatus, Prisma, TaskStatus, UserRole } from "@prisma/client";

import { PrismaService } from "../../prisma/prisma.service";
import type { DashboardAnalyticsQueryDto } from "./dto/dashboard-analytics-query.dto";

const TERMINAL_STATUSES: OrderStatus[] = [
  OrderStatus.DELIVERED,
  OrderStatus.CANCELLED,
];

function groupAllCount(row: { _count?: { _all?: number } | true }): number {
  const c = row._count;
  if (c && typeof c === "object" && "_all" in c) {
    const n = c._all;
    return typeof n === "number" ? n : 0;
  }
  return 0;
}

function mergeCurrencyTotals(
  revenueGroups: {
    currency: string;
    _sum?: { totalAmount?: Prisma.Decimal | null };
  }[],
  expenseGroups: {
    currency: string;
    _sum?: { amount?: Prisma.Decimal | null };
  }[],
): { currency: string; revenue: number; expenses: number; profit: number }[] {
  const expenseByCur = new Map(
    expenseGroups.map((g) => {
      const a = g._sum?.amount;
      return [g.currency, a != null ? a.toNumber() : 0] as const;
    }),
  );
  const rows = revenueGroups.map((g) => {
    const ta = g._sum?.totalAmount;
    const revenue = ta != null ? ta.toNumber() : 0;
    const expenses = expenseByCur.get(g.currency) ?? 0;
    return {
      currency: g.currency,
      revenue,
      expenses,
      profit: revenue - expenses,
    };
  });
  for (const [currency, exp] of expenseByCur) {
    if (rows.some((t) => t.currency === currency)) {
      continue;
    }
    rows.push({
      currency,
      revenue: 0,
      expenses: exp,
      profit: -exp,
    });
  }
  return rows.sort((a, b) => a.currency.localeCompare(b.currency));
}

@Injectable()
export class DashboardAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(query: DashboardAnalyticsQueryDto) {
    const cur = query.currency?.trim();
    const primaryCurrency = (cur && cur.length > 0 ? cur : "UZS").toUpperCase();
    const fromIso = query.from?.trim();
    const toIso = query.to?.trim();
    const hasPeriod = Boolean(fromIso && toIso);
    const fromDate = fromIso ? new Date(fromIso) : null;
    const toDate = toIso ? new Date(toIso) : null;

    const orderFinancialWhere: Prisma.OrderWhereInput = {
      deletedAt: null,
      status: { not: OrderStatus.CANCELLED },
      ...(hasPeriod && fromDate && toDate
        ? { createdAt: { gte: fromDate, lte: toDate } }
        : {}),
    };

    const expenseFinancialWhere: Prisma.ExpenseWhereInput = {
      deletedAt: null,
      orderId: { not: null },
      order: {
        deletedAt: null,
        status: { not: OrderStatus.CANCELLED },
      },
      ...(hasPeriod && fromDate && toDate
        ? {
            incurredOn: {
              gte: fromDate,
              lte: toDate,
            },
          }
        : {}),
    };

    const taskDoneWhere: Prisma.TaskWhereInput = {
      deletedAt: null,
      status: TaskStatus.DONE,
      ...(hasPeriod && fromDate && toDate
        ? {
            completedAt: {
              gte: fromDate,
              lte: toDate,
            },
          }
        : {}),
    };

    const taskDoneWorkerWhere: Prisma.TaskWhereInput = {
      ...taskDoneWhere,
      assigneeId: { not: null },
    };

    const [
      statusGroups,
      revenueGroups,
      expenseGroups,
      activeOrders,
      totalOrders,
      completedTasks,
      doneByAssignee,
      openByAssignee,
    ] = await this.prisma.$transaction([
      this.prisma.order.groupBy({
        by: ["status"],
        where: { deletedAt: null },
        orderBy: { status: "asc" },
        _count: { _all: true },
      }),
      this.prisma.order.groupBy({
        by: ["currency"],
        where: orderFinancialWhere,
        orderBy: { currency: "asc" },
        _sum: { totalAmount: true },
      }),
      this.prisma.expense.groupBy({
        by: ["currency"],
        where: expenseFinancialWhere,
        orderBy: { currency: "asc" },
        _sum: { amount: true },
      }),
      this.prisma.order.count({
        where: {
          deletedAt: null,
          status: { notIn: TERMINAL_STATUSES },
        },
      }),
      this.prisma.order.count({ where: { deletedAt: null } }),
      this.prisma.task.count({ where: taskDoneWhere }),
      this.prisma.task.groupBy({
        by: ["assigneeId"],
        where: taskDoneWorkerWhere,
        orderBy: { assigneeId: "asc" },
        _count: { _all: true },
      }),
      this.prisma.task.groupBy({
        by: ["assigneeId"],
        where: {
          deletedAt: null,
          status: { in: [TaskStatus.PENDING, TaskStatus.WORKING] },
          assigneeId: { not: null },
        },
        orderBy: { assigneeId: "asc" },
        _count: { _all: true },
      }),
    ]);

    const totalsByCurrency = mergeCurrencyTotals(revenueGroups, expenseGroups);
    const primaryRow = totalsByCurrency.find(
      (r) => r.currency === primaryCurrency,
    );
    const primary = primaryRow ?? {
      currency: primaryCurrency,
      revenue: 0,
      expenses: 0,
      profit: 0,
    };

    const byStatus = Object.values(OrderStatus).map((status) => {
      const row = statusGroups.find((g) => g.status === status);
      return { status, count: row ? groupAllCount(row) : 0 };
    });

    const doneMap = new Map<string, number>();
    for (const row of doneByAssignee) {
      if (row.assigneeId) {
        doneMap.set(row.assigneeId, groupAllCount(row));
      }
    }
    const openMap = new Map<string, number>();
    for (const row of openByAssignee) {
      if (row.assigneeId) {
        openMap.set(row.assigneeId, groupAllCount(row));
      }
    }

    const workerIds = new Set<string>([...doneMap.keys(), ...openMap.keys()]);
    const workers =
      workerIds.size === 0
        ? []
        : await this.prisma.user.findMany({
            where: {
              id: { in: [...workerIds] },
              deletedAt: null,
              role: UserRole.WORKER,
            },
            select: { id: true, displayName: true },
          });
    const nameById = new Map(workers.map((w) => [w.id, w.displayName]));

    const workerPerformance = [...workerIds]
      .filter((id) => nameById.has(id))
      .map((workerId) => {
        const tasksCompletedInPeriod = doneMap.get(workerId) ?? 0;
        const openTasks = openMap.get(workerId) ?? 0;
        const denom = tasksCompletedInPeriod + openTasks;
        const completionRatePercent =
          denom > 0
            ? Math.round((tasksCompletedInPeriod / denom) * 100)
            : tasksCompletedInPeriod > 0
              ? 100
              : 0;
        return {
          workerId,
          fullName: nameById.get(workerId) ?? workerId,
          tasksCompletedInPeriod,
          openTasks,
          completionRatePercent,
        };
      })
      .sort(
        (a, b) =>
          b.tasksCompletedInPeriod - a.tasksCompletedInPeriod ||
          b.openTasks - a.openTasks,
      );

    return {
      period: {
        from: hasPeriod && fromIso ? fromIso : null,
        to: hasPeriod && toIso ? toIso : null,
      },
      totalsByCurrency,
      primary,
      orders: {
        active: activeOrders,
        total: totalOrders,
        byStatus,
      },
      tasks: {
        completed: completedTasks,
      },
      workerPerformance,
    };
  }
}
