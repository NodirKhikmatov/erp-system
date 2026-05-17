import {
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  Prisma,
  TaskActivityType,
  TaskStatus,
  UserRole,
  type Order,
  type Task,
  type User,
} from "@prisma/client";

import { t } from "../../i18n/messages";
import { getRequestLocale } from "../../i18n/request-locale.storage";
import { PrismaService } from "../../prisma/prisma.service";
import type { AuthUser } from "../auth/types/auth.types";
import { TelegramBotService } from "../telegram/telegram-bot.service";
import type { AddTaskCommentDto } from "./dto/add-task-comment.dto";
import type { CreateTaskDto } from "./dto/create-task.dto";
import type {
  ListMyTasksQueryDto,
  ListTasksQueryDto,
} from "./dto/list-tasks-query.dto";
import type { UpdateTaskDto } from "./dto/update-task.dto";
import type { UpdateTaskStatusDto } from "./dto/update-task-status.dto";
import { TasksRealtimeBridge } from "./tasks-realtime.bridge";

type TaskWithOrderWorker = Task & {
  order: Pick<Order, "id" | "title" | "status" | "createdById" | "orderNumber">;
  assignee: Pick<User, "id" | "displayName"> | null;
};

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: TasksRealtimeBridge,
    @Inject(forwardRef(() => TelegramBotService))
    private readonly telegram: TelegramBotService,
  ) {}

  canManageTasks(user: AuthUser): boolean {
    return user.role === UserRole.ADMIN || user.role === UserRole.MANAGER;
  }

  async assertCanViewTask(user: AuthUser, taskId: string): Promise<void> {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, deletedAt: null, order: { deletedAt: null } },
      select: { assigneeId: true },
    });
    const lang = getRequestLocale();
    if (!task) {
      throw new NotFoundException(t(lang, "task.notFound"));
    }
    if (this.canManageTasks(user)) {
      return;
    }
    if (task.assigneeId === user.id) {
      return;
    }
    throw new ForbiddenException(t(lang, "task.forbidden"));
  }

  private async getTaskOrThrow(id: string): Promise<Task> {
    const lang = getRequestLocale();
    const task = await this.prisma.task.findFirst({
      where: { id, deletedAt: null, order: { deletedAt: null } },
    });
    if (!task) {
      throw new NotFoundException(t(lang, "task.notFound"));
    }
    return task;
  }

  private assertWorkerCanEdit(
    user: AuthUser,
    task: Task,
    dto: UpdateTaskDto,
  ): void {
    const lang = getRequestLocale();
    if (user.role === UserRole.WORKER && task.status === TaskStatus.DONE) {
      throw new ForbiddenException(t(lang, "task.doneReadonly"));
    }
    if (this.canManageTasks(user)) {
      return;
    }
    if (task.assigneeId !== user.id) {
      throw new ForbiddenException(t(lang, "task.forbidden"));
    }
    if (dto.workerId !== undefined && dto.workerId !== task.assigneeId) {
      throw new ForbiddenException(t(lang, "task.forbidden"));
    }
  }

  private assertWorkerCanEditStatus(user: AuthUser, task: Task): void {
    const lang = getRequestLocale();
    if (user.role === UserRole.WORKER && task.status === TaskStatus.DONE) {
      throw new ForbiddenException(t(lang, "task.doneReadonly"));
    }
    if (this.canManageTasks(user)) {
      return;
    }
    if (task.assigneeId !== user.id) {
      throw new ForbiddenException(t(lang, "task.forbidden"));
    }
  }

  private mapWorker(u: Pick<User, "id" | "displayName"> | null) {
    if (!u) {
      return null;
    }
    return { id: u.id, fullName: u.displayName };
  }

  private mapCommentAuthor(u: Pick<User, "id" | "displayName">) {
    return { id: u.id, fullName: u.displayName };
  }

  private mapOrder(
    o: Pick<Order, "id" | "title" | "status" | "createdById" | "orderNumber">,
  ) {
    return { id: o.id, title: o.title, status: o.status };
  }

  private notifyNewTaskForAssignee(
    assigneeId: string | null,
    title: string,
  ): void {
    if (!assigneeId) {
      return;
    }
    void this.telegram.notifyWorkerText(
      assigneeId,
      `📋 Yangi vazifa: ${title}`,
    );
  }

  /** Buyurtmani yaratgan foydalanuvchiga (Telegram bog‘langan bo‘lsa). */
  private notifyOrderCreatorTaskDone(
    order: Pick<Order, "createdById" | "orderNumber">,
    task: Pick<Task, "title"> & {
      assignee: Pick<User, "displayName"> | null;
    },
    actorId: string,
  ): void {
    const creatorId = order.createdById;
    if (!creatorId || creatorId === actorId) {
      return;
    }
    const who = task.assignee?.displayName ?? "Ishchi";
    const ordLabel = order.orderNumber?.trim() || "—";
    void this.telegram.notifyWorkerText(
      creatorId,
      `✅ ${who} vazifani tugatdi: «${task.title}»\nBuyurtma: ${ordLabel}`,
    );
  }

  mapTaskRow(row: Task) {
    return {
      id: row.id,
      orderId: row.orderId,
      workerId: row.assigneeId,
      title: row.title,
      description: row.description,
      priority: row.priority,
      estimatedHours: row.estimatedHours?.toNumber() ?? null,
      startDate: row.startedAt,
      endDate: row.dueDate,
      completedAt: row.completedAt,
      status: row.status,
      sortOrder: row.sortOrder,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private mapDetailRow(row: TaskWithOrderWorker) {
    return {
      ...this.mapTaskRow(row),
      order: this.mapOrder(row.order),
      worker: this.mapWorker(row.assignee),
    };
  }

  private async logActivity(
    tx: Prisma.TransactionClient,
    taskId: string,
    actorId: string | null,
    type: TaskActivityType,
    meta?: Prisma.InputJsonValue,
  ): Promise<void> {
    await tx.taskActivity.create({
      data: {
        taskId,
        actorId,
        type,
        meta: meta ?? undefined,
      },
    });
  }

  private emit(
    kind: string,
    snapshot: ReturnType<TasksService["mapTaskRow"]>,
    assigneeId: string | null,
  ) {
    this.realtime.emitChange({
      taskId: snapshot.id,
      assigneeId,
      kind,
      payload: snapshot,
    });
  }

  private async emitOrderProgressForOrder(orderId: string): Promise<void> {
    const tasks = await this.prisma.task.findMany({
      where: { orderId, deletedAt: null },
      select: { status: true },
    });
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === TaskStatus.DONE).length;
    const percent = total === 0 ? 0 : Math.round((done / total) * 100);
    this.realtime.emitOrderProgress(orderId, { done, total, percent });
  }

  private async ensureOrder(orderId: string): Promise<void> {
    const lang = getRequestLocale();
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, deletedAt: null },
    });
    if (!order) {
      throw new NotFoundException(t(lang, "order.notFound"));
    }
  }

  private async ensureWorker(
    workerId: string | null | undefined,
  ): Promise<void> {
    if (!workerId) {
      return;
    }
    const lang = getRequestLocale();
    const w = await this.prisma.user.findFirst({
      where: { id: workerId, deletedAt: null, isActive: true },
    });
    if (!w) {
      throw new NotFoundException(t(lang, "worker.notFound"));
    }
  }

  private applyStatusSideEffects(
    next: TaskStatus,
    prev: TaskStatus,
    row: Pick<Task, "startedAt" | "completedAt" | "dueDate">,
  ): { startedAt: Date | null; completedAt: Date | null } {
    let startedAt = row.startedAt;
    let completedAt = row.completedAt;
    if (next === TaskStatus.WORKING && !startedAt) {
      startedAt = new Date();
    }
    if (next === TaskStatus.DONE) {
      completedAt = row.completedAt ?? new Date();
    } else if (prev === TaskStatus.DONE) {
      completedAt = null;
    }
    return { startedAt, completedAt };
  }

  async create(dto: CreateTaskDto, actor: AuthUser) {
    await this.ensureOrder(dto.orderId);
    await this.ensureWorker(dto.workerId ?? null);
    const maxSort = await this.prisma.task.aggregate({
      where: { orderId: dto.orderId, deletedAt: null },
      _max: { sortOrder: true },
    });
    const sortOrder = (maxSort._max.sortOrder ?? -1) + 1;
    const status = dto.status ?? TaskStatus.PENDING;
    let startedAt = dto.startDate ? new Date(dto.startDate) : null;
    const dueDate = dto.endDate ? new Date(dto.endDate) : null;
    let completedAt: Date | null = null;
    if (status === TaskStatus.WORKING && !startedAt) {
      startedAt = new Date();
    }
    if (status === TaskStatus.DONE) {
      completedAt = new Date();
    }
    const row = await this.prisma.$transaction(async (tx) => {
      const created = await tx.task.create({
        data: {
          orderId: dto.orderId,
          assigneeId: dto.workerId ?? null,
          title: dto.title.trim(),
          description: dto.description?.trim() ? dto.description.trim() : null,
          startedAt,
          dueDate,
          completedAt,
          status,
          sortOrder,
          priority: dto.priority ?? 0,
          estimatedHours:
            dto.estimatedHours != null
              ? new Prisma.Decimal(dto.estimatedHours)
              : null,
        },
        include: {
          order: {
            select: {
              id: true,
              title: true,
              status: true,
              createdById: true,
              orderNumber: true,
            },
          },
          assignee: { select: { id: true, displayName: true } },
        },
      });
      await this.logActivity(
        tx,
        created.id,
        actor.id,
        TaskActivityType.CREATED,
        {
          title: created.title,
          workerId: created.assigneeId,
        },
      );
      return created;
    });
    const snap = this.mapTaskRow(row);
    this.emit("task.created", snap, row.assigneeId);
    await this.emitOrderProgressForOrder(row.orderId);
    this.notifyNewTaskForAssignee(row.assigneeId, row.title);
    if (row.status === TaskStatus.DONE) {
      this.notifyOrderCreatorTaskDone(row.order, row, actor.id);
    }
    return this.findOne(row.id, actor);
  }

  async findAll(query: ListTasksQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const parts: Prisma.TaskWhereInput[] = [
      { deletedAt: null },
      { order: { deletedAt: null } },
    ];
    if (query.orderId) {
      parts.push({ orderId: query.orderId });
    }
    if (query.workerId) {
      parts.push({ assigneeId: query.workerId });
    }
    if (query.statuses?.length) {
      parts.push({ status: { in: query.statuses } });
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
    const where = { AND: parts };
    const dir = query.sortOrder ?? "desc";
    const sortKey = query.sortBy ?? "createdAt";
    let orderBy: Prisma.TaskOrderByWithRelationInput = { createdAt: dir };
    if (sortKey === "dueDate") {
      orderBy = { dueDate: dir };
    } else if (sortKey === "status") {
      orderBy = { status: dir };
    } else if (sortKey === "title") {
      orderBy = { title: dir };
    } else if (sortKey === "sortOrder") {
      orderBy = { sortOrder: dir };
    }
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.task.count({ where }),
      this.prisma.task.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          order: {
            select: {
              id: true,
              title: true,
              status: true,
              createdById: true,
              orderNumber: true,
            },
          },
          assignee: { select: { id: true, displayName: true } },
        },
      }),
    ]);
    return {
      data: rows.map((r) => this.mapDetailRow(r)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async listForWorker(workerId: string, query: ListMyTasksQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.TaskWhereInput = {
      deletedAt: null,
      assigneeId: workerId,
      order: { deletedAt: null },
    };
    if (query.status) {
      where.status = query.status;
    }
    if (query.orderId) {
      where.orderId = query.orderId;
    }
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.task.count({ where }),
      this.prisma.task.findMany({
        where,
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          order: {
            select: {
              id: true,
              title: true,
              status: true,
              createdById: true,
              orderNumber: true,
            },
          },
          assignee: { select: { id: true, displayName: true } },
        },
      }),
    ]);
    return {
      data: rows.map((r) => this.mapDetailRow(r)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async findOne(id: string, user: AuthUser) {
    await this.assertCanViewTask(user, id);
    const row = await this.prisma.task.findFirst({
      where: { id, deletedAt: null, order: { deletedAt: null } },
      include: {
        order: {
          select: {
            id: true,
            title: true,
            status: true,
            createdById: true,
            orderNumber: true,
          },
        },
        assignee: { select: { id: true, displayName: true } },
      },
    });
    if (!row) {
      const lang = getRequestLocale();
      throw new NotFoundException(t(lang, "task.notFound"));
    }
    return this.mapDetailRow(row);
  }

  async getTimeline(id: string, user: AuthUser) {
    await this.assertCanViewTask(user, id);
    const [activities, comments] = await this.prisma.$transaction([
      this.prisma.taskActivity.findMany({
        where: { taskId: id },
        orderBy: { createdAt: "desc" },
        include: {
          actor: { select: { id: true, displayName: true } },
        },
      }),
      this.prisma.taskComment.findMany({
        where: { taskId: id },
        orderBy: { createdAt: "desc" },
        include: {
          author: { select: { id: true, displayName: true } },
        },
      }),
    ]);
    const activityItems = activities.map((a) => ({
      kind: "activity" as const,
      id: a.id,
      type: a.type,
      meta: a.meta ?? null,
      createdAt: a.createdAt,
      actor: this.mapWorker(a.actor),
    }));
    const commentItems = comments.map((c) => ({
      kind: "comment" as const,
      id: c.id,
      body: c.body,
      createdAt: c.createdAt,
      author: this.mapCommentAuthor(c.author),
    }));
    const items = [...activityItems, ...commentItems].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
    return { items };
  }

  async update(id: string, dto: UpdateTaskDto, user: AuthUser) {
    const existing = await this.getTaskOrThrow(id);
    this.assertWorkerCanEdit(user, existing, dto);
    if (dto.workerId) {
      await this.ensureWorker(dto.workerId);
    }
    const data: Prisma.TaskUpdateInput = {};
    let assigneeChanged = false;
    if (dto.workerId !== undefined) {
      assigneeChanged = dto.workerId !== existing.assigneeId;
      data.assignee =
        dto.workerId === null
          ? { disconnect: true }
          : { connect: { id: dto.workerId } };
    }
    if (dto.title !== undefined) {
      data.title = dto.title.trim();
    }
    if (dto.description !== undefined) {
      data.description = dto.description.trim() ? dto.description.trim() : null;
    }

    const nextStatus = dto.status ?? existing.status;
    let nextStarted = existing.startedAt;
    let nextDue = existing.dueDate;
    if (dto.startDate !== undefined) {
      nextStarted = dto.startDate?.trim() ? new Date(dto.startDate) : null;
    }
    if (dto.endDate !== undefined) {
      nextDue = dto.endDate?.trim() ? new Date(dto.endDate) : null;
    }
    const scheduleTouched =
      dto.status !== undefined ||
      dto.startDate !== undefined ||
      dto.endDate !== undefined;
    if (scheduleTouched) {
      const d = this.applyStatusSideEffects(nextStatus, existing.status, {
        startedAt: nextStarted,
        dueDate: nextDue,
        completedAt: existing.completedAt,
      });
      data.status = nextStatus;
      data.startedAt = d.startedAt;
      data.completedAt = d.completedAt;
      data.dueDate = nextDue;
    }

    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.task.update({
        where: { id },
        data,
        include: {
          order: {
            select: {
              id: true,
              title: true,
              status: true,
              createdById: true,
              orderNumber: true,
            },
          },
          assignee: { select: { id: true, displayName: true } },
        },
      });
      let logged = false;
      if (dto.status !== undefined && dto.status !== existing.status) {
        await this.logActivity(
          tx,
          id,
          user.id,
          TaskActivityType.STATUS_CHANGED,
          {
            from: existing.status,
            to: dto.status,
          },
        );
        logged = true;
      }
      if (!logged && assigneeChanged) {
        await this.logActivity(tx, id, user.id, TaskActivityType.ASSIGNED, {
          from: existing.assigneeId,
          to: dto.workerId ?? null,
        });
        logged = true;
      }
      if (
        !logged &&
        (dto.title !== undefined ||
          dto.description !== undefined ||
          scheduleTouched)
      ) {
        await this.logActivity(tx, id, user.id, TaskActivityType.UPDATED, {
          keys: Object.keys(dto).filter(
            (k) => (dto as Record<string, unknown>)[k] !== undefined,
          ),
        });
      }
      return updated;
    });
    const snap = this.mapTaskRow(row);
    this.emit("task.updated", snap, row.assigneeId);
    await this.emitOrderProgressForOrder(row.orderId);
    if (
      assigneeChanged &&
      row.assigneeId &&
      row.assigneeId !== existing.assigneeId
    ) {
      this.notifyNewTaskForAssignee(row.assigneeId, row.title);
    }
    if (existing.status !== TaskStatus.DONE && row.status === TaskStatus.DONE) {
      this.notifyOrderCreatorTaskDone(row.order, row, user.id);
    }
    return this.mapDetailRow(row);
  }

  async updateStatus(id: string, dto: UpdateTaskStatusDto, user: AuthUser) {
    const existing = await this.getTaskOrThrow(id);
    this.assertWorkerCanEditStatus(user, existing);
    const dates = this.applyStatusSideEffects(
      dto.status,
      existing.status,
      existing,
    );
    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.task.update({
        where: { id },
        data: {
          status: dto.status,
          startedAt: dates.startedAt,
          completedAt: dates.completedAt,
        },
        include: {
          order: {
            select: {
              id: true,
              title: true,
              status: true,
              createdById: true,
              orderNumber: true,
            },
          },
          assignee: { select: { id: true, displayName: true } },
        },
      });
      if (dto.status !== existing.status) {
        await this.logActivity(
          tx,
          id,
          user.id,
          TaskActivityType.STATUS_CHANGED,
          {
            from: existing.status,
            to: dto.status,
          },
        );
      }
      return updated;
    });
    const snap = this.mapTaskRow(row);
    this.emit("task.status", snap, row.assigneeId);
    await this.emitOrderProgressForOrder(row.orderId);
    if (existing.status !== TaskStatus.DONE && row.status === TaskStatus.DONE) {
      this.notifyOrderCreatorTaskDone(row.order, row, user.id);
    }
    return this.mapDetailRow(row);
  }

  async addComment(id: string, dto: AddTaskCommentDto, user: AuthUser) {
    const existing = await this.getTaskOrThrow(id);
    const lang = getRequestLocale();
    if (!this.canManageTasks(user) && existing.assigneeId !== user.id) {
      throw new ForbiddenException(t(lang, "task.forbidden"));
    }
    const comment = await this.prisma.taskComment.create({
      data: {
        taskId: id,
        authorId: user.id,
        body: dto.body.trim(),
      },
      include: {
        author: { select: { id: true, displayName: true } },
      },
    });
    const detail = await this.findOne(id, user);
    this.realtime.emitChange({
      taskId: id,
      assigneeId: existing.assigneeId,
      kind: "task.comment",
      payload: {
        comment: {
          id: comment.id,
          body: comment.body,
          createdAt: comment.createdAt,
          author: this.mapCommentAuthor(comment.author),
        },
        task: detail,
      },
    });
    return {
      id: comment.id,
      body: comment.body,
      createdAt: comment.createdAt,
      author: this.mapCommentAuthor(comment.author),
    };
  }

  async remove(id: string, actor: AuthUser): Promise<void> {
    const existing = await this.getTaskOrThrow(id);
    const snap = this.mapTaskRow(existing);
    await this.prisma.$transaction(async (tx) => {
      await tx.task.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      await this.logActivity(tx, id, actor.id, TaskActivityType.DELETED, {});
    });
    this.emit("task.deleted", snap, existing.assigneeId);
    await this.emitOrderProgressForOrder(existing.orderId);
  }
}
