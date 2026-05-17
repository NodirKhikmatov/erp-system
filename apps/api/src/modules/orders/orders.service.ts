import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  ExpenseCategory,
  OrderStatus,
  Prisma,
  TaskActivityType,
  TaskStatus,
  type Client,
  type Expense,
  type Order,
  type Task,
  type User,
} from "@prisma/client";

import { t } from "../../i18n/messages";
import { getRequestLocale } from "../../i18n/request-locale.storage";
import { PrismaService } from "../../prisma/prisma.service";
import {
  ActivityActions,
  ActivityEntityTypes,
  ActivityLogService,
} from "../activity-log/activity-log.service";
import type { AuthUser } from "../auth/types/auth.types";
import { TelegramBotService } from "../telegram/telegram-bot.service";
import { TasksRealtimeBridge } from "../tasks/tasks-realtime.bridge";
import type { AssignOrderTasksDto } from "./dto/assign-order-tasks.dto";
import type { CreateOrderDto } from "./dto/create-order.dto";
import type { ListOrdersQueryDto } from "./dto/list-orders-query.dto";
import type { OrderAnalyticsQueryDto } from "./dto/order-analytics-query.dto";
import type { UpdateOrderDto } from "./dto/update-order.dto";
import type { UpdateOrderStatusDto } from "./dto/update-order-status.dto";

type Bucket = "day" | "week" | "month";

const TERMINAL_STATUSES: OrderStatus[] = [
  OrderStatus.DELIVERED,
  OrderStatus.CANCELLED,
];

type OrderListRow = Order & {
  client: Pick<Client, "id" | "name">;
  _count: { tasks: number };
};

type OrderDetailRow = Order & {
  client: Pick<Client, "id" | "name">;
  tasks: (Task & {
    assignee: Pick<User, "id" | "displayName" | "role"> | null;
  })[];
  expenses: Expense[];
};

function toAmount(value: Prisma.Decimal | null): number | null {
  if (value === null) {
    return null;
  }
  return value.toNumber();
}

function startOfUtcDay(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
}

function bucketStart(d: Date, bucket: Bucket): Date {
  const day = startOfUtcDay(d);
  if (bucket === "day") {
    return day;
  }
  if (bucket === "month") {
    return new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), 1));
  }
  const dow = day.getUTCDay();
  const mondayOffset = (dow + 6) % 7;
  day.setUTCDate(day.getUTCDate() - mondayOffset);
  return day;
}

function bucketKey(d: Date, bucket: Bucket): string {
  return bucketStart(d, bucket).toISOString();
}

function addBucketStart(b: Date, bucket: Bucket): Date {
  const x = new Date(b);
  if (bucket === "day") {
    x.setUTCDate(x.getUTCDate() + 1);
  } else if (bucket === "week") {
    x.setUTCDate(x.getUTCDate() + 7);
  } else {
    x.setUTCMonth(x.getUTCMonth() + 1);
  }
  return x;
}

function groupAllCount(row: { _count?: { _all?: number } | true }): number {
  const c = row._count;
  if (c && typeof c === "object" && "_all" in c) {
    return Number(c._all);
  }
  return 0;
}

/** Buyurtma PDF / hisobot uchun seriyalizatsiya qilinadigan model. */
export interface OrderPdfModel {
  documentTitle: string;
  generatedAt: string;
  generatedAtDisplay: string;
  client: {
    name: string;
    companyName: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
  };
  order: {
    id: string;
    status: OrderStatus;
    title: string | null;
    description: string | null;
    totalPrice: number | null;
    prepayment: number | null;
    currency: string;
    deadline: Date | null;
    completedAt: Date | null;
    createdAt: Date;
  };
  tasks: {
    title: string;
    status: TaskStatus;
    assigneeName: string;
    dueDate: Date | null;
  }[];
  expenses: {
    category: ExpenseCategory;
    amount: number;
    currency: string;
    description: string | null;
    incurredOn: Date;
  }[];
  totals: {
    revenue: number | null;
    totalExpenses: number;
    profit: number | null;
    currency: string;
  };
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService,
    private readonly realtime: TasksRealtimeBridge,
    private readonly telegram: TelegramBotService,
  ) {}

  private parseRefImages(raw: Prisma.JsonValue | null): string[] {
    if (raw == null || !Array.isArray(raw)) {
      return [];
    }
    return raw.filter((x): x is string => typeof x === "string");
  }

  private orderProgress(tasks: Pick<Task, "status">[]): {
    total: number;
    done: number;
    percent: number;
  } {
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === TaskStatus.DONE).length;
    const percent = total === 0 ? 0 : Math.round((done / total) * 100);
    return { total, done, percent };
  }

  private async nextOrderNumber(tx: Prisma.TransactionClient): Promise<string> {
    const year = new Date().getUTCFullYear();
    const prefix = `ORD-${String(year)}-`;
    const latest = await tx.order.findFirst({
      where: { orderNumber: { startsWith: prefix } },
      orderBy: { orderNumber: "desc" },
      select: { orderNumber: true },
    });
    let seq = 1;
    if (latest?.orderNumber) {
      const part = latest.orderNumber.replace(prefix, "");
      const n = parseInt(part, 10);
      if (!Number.isNaN(n)) {
        seq = n + 1;
      }
    }
    return `${prefix}${String(seq).padStart(5, "0")}`;
  }

  private snapshotTask(t: Task) {
    return {
      id: t.id,
      orderId: t.orderId,
      workerId: t.assigneeId,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      estimatedHours: t.estimatedHours?.toNumber() ?? null,
      sortOrder: t.sortOrder,
      dueDate: t.dueDate,
      startedAt: t.startedAt,
      completedAt: t.completedAt,
    };
  }

  private mapClientSummary(c: Pick<Client, "id" | "name">) {
    return { id: c.id, fullName: c.name };
  }

  private mapAssignee(u: Pick<User, "id" | "displayName" | "role">) {
    return {
      id: u.id,
      fullName: u.displayName,
      role: u.role,
    };
  }

  private expenseSumForOrderRows(
    expenses: Pick<Expense, "amount" | "currency">[],
    orderCurrency: string,
  ): number {
    return expenses
      .filter((e) => e.currency === orderCurrency)
      .reduce((acc, e) => acc + e.amount.toNumber(), 0);
  }

  private profitFrom(
    totalPrice: number | null,
    expenseSum: number,
  ): number | null {
    if (totalPrice === null) {
      return null;
    }
    return totalPrice - expenseSum;
  }

  private mapExpenseItem(e: Expense) {
    return {
      id: e.id,
      title: e.title ?? null,
      category: e.category,
      amount: e.amount.toNumber(),
      currency: e.currency,
      description: e.description,
      incurredOn: e.incurredOn,
      createdAt: e.createdAt,
    };
  }

  private mapTask(
    t: Task & { assignee: Pick<User, "id" | "displayName" | "role"> | null },
  ) {
    return {
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      estimatedHours: t.estimatedHours?.toNumber() ?? null,
      assignee: t.assignee ? this.mapAssignee(t.assignee) : null,
      dueDate: t.dueDate,
      sortOrder: t.sortOrder,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    };
  }

  private mapDetail(row: OrderDetailRow) {
    const totalPrice = toAmount(row.totalAmount);
    const prepayment = toAmount(row.prepaymentAmount);
    const expenseSum = this.expenseSumForOrderRows(row.expenses, row.currency);
    return {
      id: row.id,
      orderNumber: row.orderNumber,
      status: row.status,
      title: row.title,
      description: row.description,
      totalPrice,
      prepayment,
      currency: row.currency,
      deadline: row.dueDate,
      completedAt: row.completedAt,
      clientId: row.clientId,
      client: this.mapClientSummary(row.client),
      createdById: row.createdById,
      referenceImages: this.parseRefImages(row.referenceImages),
      progress: this.orderProgress(row.tasks),
      totalExpenses: expenseSum,
      profit: this.profitFrom(totalPrice, expenseSum),
      tasks: row.tasks.map((t) => this.mapTask(t)),
      expenses: row.expenses.map((e) => this.mapExpenseItem(e)),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private mapListItem(row: OrderListRow, expenseSum: number) {
    const totalPrice = toAmount(row.totalAmount);
    return {
      id: row.id,
      status: row.status,
      title: row.title,
      description: row.description,
      totalPrice,
      prepayment: toAmount(row.prepaymentAmount),
      currency: row.currency,
      deadline: row.dueDate,
      clientId: row.clientId,
      client: this.mapClientSummary(row.client),
      totalExpenses: expenseSum,
      profit: this.profitFrom(totalPrice, expenseSum),
      taskCount: row._count.tasks,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private async ensureClient(clientId: string): Promise<void> {
    const lang = getRequestLocale();
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, deletedAt: null },
    });
    if (!client) {
      throw new NotFoundException(t(lang, "client.notFound"));
    }
  }

  private async ensureOrder(id: string): Promise<Order> {
    const lang = getRequestLocale();
    const order = await this.prisma.order.findFirst({
      where: { id, deletedAt: null },
    });
    if (!order) {
      throw new NotFoundException(t(lang, "order.notFound"));
    }
    return order;
  }

  private buildWhere(query: ListOrdersQueryDto): Prisma.OrderWhereInput {
    const parts: Prisma.OrderWhereInput[] = [{ deletedAt: null }];

    if (query.statuses?.length) {
      parts.push({ status: { in: query.statuses } });
    }
    if (query.clientId) {
      parts.push({ clientId: query.clientId });
    }

    const q = query.search?.trim();
    if (q) {
      parts.push({
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      });
    }

    if (query.createdFrom ?? query.createdTo) {
      parts.push({
        createdAt: {
          ...(query.createdFrom ? { gte: new Date(query.createdFrom) } : {}),
          ...(query.createdTo ? { lte: new Date(query.createdTo) } : {}),
        },
      });
    }

    if (query.deadlineFrom ?? query.deadlineTo) {
      parts.push({
        dueDate: {
          ...(query.deadlineFrom ? { gte: new Date(query.deadlineFrom) } : {}),
          ...(query.deadlineTo ? { lte: new Date(query.deadlineTo) } : {}),
        },
      });
    }

    return { AND: parts };
  }

  private orderBy(
    query: ListOrdersQueryDto,
  ): Prisma.OrderOrderByWithRelationInput {
    const dir = query.sortOrder ?? "desc";
    const key = query.sortBy ?? "createdAt";
    if (key === "deadline") {
      return { dueDate: dir };
    }
    if (key === "totalPrice") {
      return { totalAmount: dir };
    }
    if (key === "status") {
      return { status: dir };
    }
    if (key === "title") {
      return { title: dir };
    }
    return { createdAt: dir };
  }

  async create(dto: CreateOrderDto, user: AuthUser) {
    const lang = getRequestLocale();
    const trimmedName = dto.clientName?.trim() ?? "";
    const hasId = !!dto.clientId;
    const hasName = trimmedName.length > 0;
    if (!hasId && !hasName) {
      throw new BadRequestException(t(lang, "order.clientRequired"));
    }
    if (hasId && hasName) {
      throw new BadRequestException(t(lang, "order.clientRefConflict"));
    }

    const ref = dto.referenceImages?.length
      ? dto.referenceImages.map((u) => u.trim()).filter((u) => u.length > 0)
      : undefined;

    const row = await this.prisma.$transaction(async (tx) => {
      let resolvedClientId: string;
      if (hasName) {
        const created = await tx.client.create({
          data: {
            name: trimmedName,
            createdById: user.id,
          },
          select: { id: true },
        });
        resolvedClientId = created.id;
      } else {
        const cid = dto.clientId;
        if (!cid) {
          throw new BadRequestException(t(lang, "order.clientRequired"));
        }
        const client = await tx.client.findFirst({
          where: { id: cid, deletedAt: null },
          select: { id: true },
        });
        if (!client) {
          throw new NotFoundException(t(lang, "client.notFound"));
        }
        resolvedClientId = client.id;
      }

      const orderNumber = await this.nextOrderNumber(tx);
      return tx.order.create({
        data: {
          orderNumber,
          clientId: resolvedClientId,
          createdById: user.id,
          title: dto.title?.trim() ? dto.title.trim() : null,
          description: dto.description?.trim() ? dto.description.trim() : null,
          totalAmount:
            dto.totalPrice != null ? new Prisma.Decimal(dto.totalPrice) : null,
          prepaymentAmount:
            dto.prepayment != null ? new Prisma.Decimal(dto.prepayment) : null,
          dueDate: dto.deadline ? new Date(dto.deadline) : null,
          status: dto.status ?? OrderStatus.NEW,
          currency: dto.currency?.trim() ? dto.currency.trim() : "UZS",
          referenceImages: ref?.length ? ref : undefined,
        },
        include: {
          client: { select: { id: true, name: true } },
          tasks: {
            where: { deletedAt: null },
            orderBy: { sortOrder: "asc" },
            include: {
              assignee: {
                select: { id: true, displayName: true, role: true },
              },
            },
          },
          expenses: { where: { deletedAt: null } },
        },
      });
    });

    await this.activityLog.record({
      actorId: user.id,
      action: ActivityActions.ORDER_CREATED,
      entityType: ActivityEntityTypes.order,
      entityId: row.id,
      meta: {
        orderNumber: row.orderNumber,
        clientId: row.clientId,
        ...(hasName ? { clientCreatedAs: trimmedName } : {}),
      },
    });

    const mapped = this.mapDetail(row);
    this.realtime.emitOrderEvent(row.id, "order.created", mapped);
    this.realtime.emitOrderProgress(row.id, this.orderProgress(row.tasks));
    return mapped;
  }

  async findAll(query: ListOrdersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = this.buildWhere(query);
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        orderBy: this.orderBy(query),
        skip: (page - 1) * limit,
        take: limit,
        include: {
          client: { select: { id: true, name: true } },
          _count: {
            select: {
              tasks: { where: { deletedAt: null } },
            },
          },
        },
      }),
    ]);

    const ids = rows.map((r) => r.id);
    const sumRows =
      ids.length === 0
        ? []
        : await this.prisma.expense.groupBy({
            by: ["orderId", "currency"],
            where: { orderId: { in: ids }, deletedAt: null },
            _sum: { amount: true },
          });
    const sumMap = new Map<string, number>();
    for (const s of sumRows) {
      if (!s.orderId) {
        continue;
      }
      const key = `${s.orderId}:${s.currency}`;
      sumMap.set(key, s._sum.amount?.toNumber() ?? 0);
    }

    return {
      data: rows.map((r) => {
        const expenseSum = sumMap.get(`${r.id}:${r.currency}`) ?? 0;
        return this.mapListItem(r, expenseSum);
      }),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async getProfitSnapshot(orderId: string) {
    const row = await this.prisma.order.findFirst({
      where: { id: orderId, deletedAt: null },
      select: { id: true, totalAmount: true, currency: true },
    });
    if (!row) {
      const lang = getRequestLocale();
      throw new NotFoundException(t(lang, "order.notFound"));
    }
    const agg = await this.prisma.expense.aggregate({
      where: {
        orderId,
        deletedAt: null,
        currency: row.currency,
      },
      _sum: { amount: true },
    });
    const totalExpenses = agg._sum.amount?.toNumber() ?? 0;
    const orderPrice =
      row.totalAmount != null ? row.totalAmount.toNumber() : null;
    return {
      orderPrice,
      totalExpenses,
      profit: orderPrice != null ? orderPrice - totalExpenses : null,
      currency: row.currency,
    };
  }

  async findOne(id: string) {
    const row = await this.prisma.order.findFirst({
      where: { id, deletedAt: null },
      include: {
        client: { select: { id: true, name: true } },
        tasks: {
          where: { deletedAt: null },
          orderBy: { sortOrder: "asc" },
          include: {
            assignee: {
              select: { id: true, displayName: true, role: true },
            },
          },
        },
        expenses: {
          where: { deletedAt: null },
          orderBy: { incurredOn: "desc" },
        },
      },
    });
    if (!row) {
      const lang = getRequestLocale();
      throw new NotFoundException(t(lang, "order.notFound"));
    }
    return this.mapDetail(row);
  }

  async update(id: string, dto: UpdateOrderDto) {
    const existing = await this.ensureOrder(id);
    if (dto.clientId !== undefined && dto.clientId !== existing.clientId) {
      await this.ensureClient(dto.clientId);
    }

    const data: Prisma.OrderUpdateInput = {};

    if (dto.clientId !== undefined) {
      data.client = { connect: { id: dto.clientId } };
    }
    if (dto.title !== undefined) {
      data.title = dto.title.trim() ? dto.title.trim() : null;
    }
    if (dto.description !== undefined) {
      data.description = dto.description.trim() ? dto.description.trim() : null;
    }
    if (dto.totalPrice !== undefined) {
      data.totalAmount = new Prisma.Decimal(dto.totalPrice);
    }
    if (dto.prepayment !== undefined) {
      data.prepaymentAmount = new Prisma.Decimal(dto.prepayment);
    }
    if (dto.deadline !== undefined) {
      data.dueDate = dto.deadline.trim() ? new Date(dto.deadline) : null;
    }
    if (dto.status !== undefined) {
      data.status = dto.status;
      if (dto.status === OrderStatus.DELIVERED && !existing.completedAt) {
        data.completedAt = new Date();
      } else if (
        dto.status !== OrderStatus.DELIVERED &&
        existing.status === OrderStatus.DELIVERED
      ) {
        data.completedAt = null;
      }
    }
    if (dto.currency !== undefined) {
      data.currency = dto.currency.trim() ? dto.currency.trim() : "UZS";
    }

    const row = await this.prisma.order.update({
      where: { id },
      data,
      include: {
        client: { select: { id: true, name: true } },
        tasks: {
          where: { deletedAt: null },
          orderBy: { sortOrder: "asc" },
          include: {
            assignee: {
              select: { id: true, displayName: true, role: true },
            },
          },
        },
        expenses: { where: { deletedAt: null } },
      },
    });
    return this.mapDetail(row);
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto) {
    const existing = await this.ensureOrder(id);
    const completedAt =
      dto.status === OrderStatus.DELIVERED
        ? (existing.completedAt ?? new Date())
        : existing.status === OrderStatus.DELIVERED
          ? null
          : existing.completedAt;

    const row = await this.prisma.order.update({
      where: { id },
      data: {
        status: dto.status,
        completedAt,
      },
      include: {
        client: { select: { id: true, name: true } },
        tasks: {
          where: { deletedAt: null },
          orderBy: { sortOrder: "asc" },
          include: {
            assignee: {
              select: { id: true, displayName: true, role: true },
            },
          },
        },
        expenses: { where: { deletedAt: null } },
      },
    });
    return this.mapDetail(row);
  }

  async assignTasks(
    orderId: string,
    dto: AssignOrderTasksDto,
    actor: AuthUser,
  ) {
    const lang = getRequestLocale();
    await this.ensureOrder(orderId);

    const assigneeIds = [
      ...new Set(dto.tasks.map((t) => t.assigneeId).filter(Boolean)),
    ] as string[];
    if (assigneeIds.length > 0) {
      const users = await this.prisma.user.findMany({
        where: {
          id: { in: assigneeIds },
          deletedAt: null,
          isActive: true,
        },
      });
      if (users.length !== assigneeIds.length) {
        throw new BadRequestException(t(lang, "order.assigneeInvalid"));
      }
    }

    const maxAgg = await this.prisma.task.aggregate({
      where: { orderId, deletedAt: null },
      _max: { sortOrder: true },
    });
    let nextSort = (maxAgg._max.sortOrder ?? -1) + 1;

    const createdTasks = await this.prisma.$transaction(async (tx) => {
      const out: Task[] = [];
      for (const item of dto.tasks) {
        const st = item.status ?? TaskStatus.PENDING;
        let startedAt: Date | null = null;
        let completedAt: Date | null = null;
        if (st === TaskStatus.WORKING) {
          startedAt = new Date();
        }
        if (st === TaskStatus.DONE) {
          startedAt = startedAt ?? new Date();
          completedAt = new Date();
        }

        const created = await tx.task.create({
          data: {
            orderId,
            title: item.title.trim(),
            description: item.description?.trim()
              ? item.description.trim()
              : null,
            assigneeId: item.assigneeId ?? null,
            dueDate: item.dueDate ? new Date(item.dueDate) : null,
            priority: item.priority ?? 0,
            estimatedHours:
              item.estimatedHours != null
                ? new Prisma.Decimal(item.estimatedHours)
                : null,
            sortOrder: nextSort++,
            status: st,
            startedAt,
            completedAt,
          },
        });

        await tx.taskActivity.create({
          data: {
            taskId: created.id,
            actorId: actor.id,
            type: TaskActivityType.CREATED,
            meta: {
              title: created.title,
              workerId: created.assigneeId,
              source: "order.assignTasks",
            },
          },
        });
        out.push(created);
      }
      return out;
    });

    for (const task of createdTasks) {
      await this.activityLog.record({
        actorId: actor.id,
        action: ActivityActions.TASK_ASSIGNED,
        entityType: ActivityEntityTypes.order,
        entityId: orderId,
        meta: {
          taskId: task.id,
          assigneeId: task.assigneeId,
          title: task.title,
        },
      });

      this.realtime.emitChange({
        taskId: task.id,
        assigneeId: task.assigneeId,
        kind: "task.created",
        payload: this.snapshotTask(task),
      });

      if (task.assigneeId) {
        void this.telegram.notifyWorkerText(
          task.assigneeId,
          `📋 Yangi vazifa: ${task.title}`,
        );
      }
    }

    const detail = await this.findOne(orderId);
    this.realtime.emitOrderProgress(
      orderId,
      this.orderProgress(detail.tasks.map((x) => ({ status: x.status }))),
    );
    return detail;
  }

  async remove(id: string): Promise<void> {
    await this.ensureOrder(id);
    const now = new Date();
    const tasks = await this.prisma.task.findMany({
      where: { orderId: id, deletedAt: null },
    });

    await this.prisma.$transaction([
      this.prisma.expense.updateMany({
        where: { orderId: id, deletedAt: null },
        data: { deletedAt: now },
      }),
      this.prisma.task.updateMany({
        where: { orderId: id, deletedAt: null },
        data: { deletedAt: now },
      }),
      this.prisma.order.update({
        where: { id },
        data: { deletedAt: now },
      }),
    ]);

    for (const t of tasks) {
      this.realtime.emitChange({
        taskId: t.id,
        assigneeId: t.assigneeId,
        kind: "task.deleted",
        payload: this.snapshotTask(t),
      });
    }
    this.realtime.emitOrderEvent(id, "order.deleted", { id });
    this.realtime.emitOrderProgress(id, { done: 0, total: 0, percent: 0 });
  }

  async getDashboard() {
    const [statusGroups, revenueGroups, expenseGroups, overdue, active, total] =
      await this.prisma.$transaction([
        this.prisma.order.groupBy({
          by: ["status"],
          where: { deletedAt: null },
          orderBy: { status: "asc" },
          _count: { _all: true },
        }),
        this.prisma.order.groupBy({
          by: ["currency"],
          where: {
            deletedAt: null,
            status: { not: OrderStatus.CANCELLED },
          },
          orderBy: { currency: "asc" },
          _sum: { totalAmount: true },
        }),
        this.prisma.expense.groupBy({
          by: ["currency"],
          where: {
            deletedAt: null,
            order: {
              deletedAt: null,
              status: { not: OrderStatus.CANCELLED },
            },
          },
          orderBy: { currency: "asc" },
          _sum: { amount: true },
        }),
        this.prisma.order.count({
          where: {
            deletedAt: null,
            dueDate: { lt: new Date() },
            status: { notIn: TERMINAL_STATUSES },
          },
        }),
        this.prisma.order.count({
          where: {
            deletedAt: null,
            status: { notIn: TERMINAL_STATUSES },
          },
        }),
        this.prisma.order.count({ where: { deletedAt: null } }),
      ]);

    const ordersByStatus = Object.values(OrderStatus).map((status) => {
      const row = statusGroups.find((g) => g.status === status);
      return { status, count: row ? groupAllCount(row) : 0 };
    });

    const expenseByCur = new Map(
      expenseGroups.map((g) => [g.currency, g._sum?.amount?.toNumber() ?? 0]),
    );
    const totalsByCurrency = revenueGroups.map((g) => {
      const revenue = g._sum?.totalAmount?.toNumber() ?? 0;
      const expenses = expenseByCur.get(g.currency) ?? 0;
      return {
        currency: g.currency,
        revenue,
        expenses,
        profit: revenue - expenses,
      };
    });

    for (const [currency, exp] of expenseByCur) {
      if (totalsByCurrency.some((t) => t.currency === currency)) {
        continue;
      }
      totalsByCurrency.push({
        currency,
        revenue: 0,
        expenses: exp,
        profit: -exp,
      });
    }

    return {
      ordersByStatus,
      totalsByCurrency,
      activeOrders: active,
      overdueOrders: overdue,
      totalOrders: total,
    };
  }

  async getAnalytics(query: OrderAnalyticsQueryDto) {
    const bucket = query.bucket ?? "day";
    const to = query.to ? new Date(query.to) : new Date();
    const from = query.from
      ? new Date(query.from)
      : new Date(to.getTime() - 30 * 86400000);

    const orders = await this.prisma.order.findMany({
      where: {
        deletedAt: null,
        createdAt: { gte: from, lte: to },
      },
      select: {
        createdAt: true,
        totalAmount: true,
      },
    });

    const expenses = await this.prisma.expense.findMany({
      where: {
        deletedAt: null,
        orderId: { not: null },
        order: { deletedAt: null },
        incurredOn: {
          gte: startOfUtcDay(from),
          lte: startOfUtcDay(to),
        },
      },
      select: { incurredOn: true, amount: true },
    });

    const map = new Map<
      string,
      { ordersCreated: number; revenue: number; expenses: number }
    >();
    const ensure = (k: string) => {
      let cell = map.get(k);
      if (!cell) {
        cell = { ordersCreated: 0, revenue: 0, expenses: 0 };
        map.set(k, cell);
      }
      return cell;
    };

    for (const o of orders) {
      const k = bucketKey(o.createdAt, bucket);
      const cell = ensure(k);
      cell.ordersCreated += 1;
      if (o.totalAmount) {
        cell.revenue += o.totalAmount.toNumber();
      }
    }

    for (const e of expenses) {
      const d = new Date(e.incurredOn);
      const k = bucketKey(d, bucket);
      ensure(k).expenses += e.amount.toNumber();
    }

    const series: {
      period: string;
      ordersCreated: number;
      revenue: number;
      expenses: number;
    }[] = [];
    let cursor = bucketStart(from, bucket);
    const end = bucketStart(to, bucket);
    while (cursor <= end) {
      const key = cursor.toISOString();
      const cell = map.get(key) ?? {
        ordersCreated: 0,
        revenue: 0,
        expenses: 0,
      };
      series.push({
        period: key,
        ordersCreated: cell.ordersCreated,
        revenue: cell.revenue,
        expenses: cell.expenses,
      });
      cursor = addBucketStart(cursor, bucket);
    }

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      bucket,
      series,
    };
  }

  /**
   * PDF hisobot: to‘liq mijoz rekvizitlari, buyurtma, vazifalar, xarajatlar, foyda.
   */
  async buildPdfModel(id: string): Promise<OrderPdfModel> {
    const row = await this.prisma.order.findFirst({
      where: { id, deletedAt: null },
      include: {
        client: {
          select: {
            name: true,
            companyName: true,
            email: true,
            phone: true,
            address: true,
          },
        },
        tasks: {
          where: { deletedAt: null },
          orderBy: { sortOrder: "asc" },
          include: {
            assignee: { select: { displayName: true } },
          },
        },
        expenses: {
          where: { deletedAt: null },
          orderBy: { incurredOn: "desc" },
        },
      },
    });
    if (!row) {
      const lang = getRequestLocale();
      throw new NotFoundException(t(lang, "order.notFound"));
    }
    const totalPrice = toAmount(row.totalAmount);
    const prepayment = toAmount(row.prepaymentAmount);
    const expenseSum = this.expenseSumForOrderRows(row.expenses, row.currency);
    const profit = this.profitFrom(totalPrice, expenseSum);
    const trimmedTitle = row.title?.trim();
    const title =
      trimmedTitle && trimmedTitle.length > 0
        ? trimmedTitle
        : `Order ${row.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
    return {
      documentTitle: title,
      generatedAt: new Date().toISOString(),
      generatedAtDisplay: new Date().toLocaleString("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
      client: {
        name: row.client.name,
        companyName: row.client.companyName,
        email: row.client.email,
        phone: row.client.phone,
        address: row.client.address,
      },
      order: {
        id: row.id,
        status: row.status,
        title: row.title,
        description: row.description,
        totalPrice,
        prepayment,
        currency: row.currency,
        deadline: row.dueDate,
        completedAt: row.completedAt,
        createdAt: row.createdAt,
      },
      tasks: row.tasks.map((task) => ({
        title: task.title,
        status: task.status,
        assigneeName: task.assignee?.displayName ?? "—",
        dueDate: task.dueDate,
      })),
      expenses: row.expenses.map((e) => ({
        category: e.category,
        amount: e.amount.toNumber(),
        currency: e.currency,
        description: e.description,
        incurredOn: e.incurredOn,
      })),
      totals: {
        revenue: totalPrice,
        totalExpenses: expenseSum,
        profit,
        currency: row.currency,
      },
    };
  }
}
