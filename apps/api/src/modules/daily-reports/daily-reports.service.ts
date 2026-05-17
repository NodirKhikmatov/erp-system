import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, UserRole } from "@prisma/client";

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
import type { CreateDailyReportDto } from "./dto/create-daily-report.dto";
import type { ListDailyReportsQueryDto } from "./dto/list-daily-reports-query.dto";

type ReportRow = Prisma.DailyReportGetPayload<{
  include: {
    worker: { select: { id: true; displayName: true; email: true } };
    task: {
      select: { id: true; title: true; status: true; orderId: true };
    };
  };
}>;

@Injectable()
export class DailyReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService,
    private readonly realtime: TasksRealtimeBridge,
  ) {}

  private canManage(user: AuthUser): boolean {
    return user.role === UserRole.ADMIN || user.role === UserRole.MANAGER;
  }

  private extraImagesFromDb(raw: Prisma.JsonValue | null): string[] {
    if (raw == null) {
      return [];
    }
    if (!Array.isArray(raw)) {
      return [];
    }
    return raw.filter((x): x is string => typeof x === "string");
  }

  private mapReport(row: ReportRow) {
    const extra = this.extraImagesFromDb(row.extraImages);
    const imageUrls = [...(row.photoUrl ? [row.photoUrl] : []), ...extra];
    return {
      id: row.id,
      workerId: row.workerId,
      taskId: row.taskId,
      message: row.message,
      photoUrl: row.photoUrl,
      imageUrls,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      worker: {
        id: row.worker.id,
        fullName: row.worker.displayName,
        email: row.worker.email,
      },
      task: row.task
        ? {
            id: row.task.id,
            title: row.task.title,
            status: row.task.status,
            orderId: row.task.orderId,
          }
        : null,
    };
  }

  private async resolveWorkerId(
    user: AuthUser,
    dto: CreateDailyReportDto,
  ): Promise<string> {
    const lang = getRequestLocale();
    if (user.role === UserRole.WORKER) {
      return user.id;
    }
    if (!dto.workerId) {
      throw new BadRequestException(t(lang, "dailyReport.workerIdRequired"));
    }
    const w = await this.prisma.user.findFirst({
      where: { id: dto.workerId, deletedAt: null, isActive: true },
    });
    if (!w) {
      throw new NotFoundException(t(lang, "worker.notFound"));
    }
    return dto.workerId;
  }

  private async validateTaskForReport(
    taskId: string | undefined,
    workerId: string,
    user: AuthUser,
  ): Promise<void> {
    if (!taskId) {
      return;
    }
    const lang = getRequestLocale();
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, deletedAt: null },
    });
    if (!task) {
      throw new NotFoundException(t(lang, "task.notFound"));
    }
    if (this.canManage(user)) {
      return;
    }
    if (task.assigneeId !== workerId) {
      throw new BadRequestException(t(lang, "dailyReport.taskMismatch"));
    }
  }

  private assertCanView(
    user: AuthUser,
    report: Pick<ReportRow, "workerId">,
  ): void {
    const lang = getRequestLocale();
    if (this.canManage(user)) {
      return;
    }
    if (report.workerId !== user.id) {
      throw new ForbiddenException(t(lang, "dailyReport.forbidden"));
    }
  }

  private buildWhere(
    query: ListDailyReportsQueryDto,
    forceWorkerId: string | undefined,
  ): Prisma.DailyReportWhereInput {
    const parts: Prisma.DailyReportWhereInput[] = [{ deletedAt: null }];
    const workerId = forceWorkerId ?? query.workerId;
    if (workerId) {
      parts.push({ workerId });
    }
    if (query.taskId) {
      parts.push({ taskId: query.taskId });
    }
    if (query.createdFrom ?? query.createdTo) {
      parts.push({
        createdAt: {
          ...(query.createdFrom ? { gte: new Date(query.createdFrom) } : {}),
          ...(query.createdTo ? { lte: new Date(query.createdTo) } : {}),
        },
      });
    }
    const q = query.search?.trim();
    if (q) {
      parts.push({
        message: { contains: q, mode: "insensitive" },
      });
    }
    return { AND: parts };
  }

  private async paginate(
    where: Prisma.DailyReportWhereInput,
    query: ListDailyReportsQueryDto,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const dir = query.sortOrder ?? "desc";
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.dailyReport.count({ where }),
      this.prisma.dailyReport.findMany({
        where,
        orderBy: { createdAt: dir },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          worker: { select: { id: true, displayName: true, email: true } },
          task: {
            select: { id: true, title: true, status: true, orderId: true },
          },
        },
      }),
    ]);
    return {
      data: rows.map((r) => this.mapReport(r)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async create(dto: CreateDailyReportDto, user: AuthUser) {
    const workerId = await this.resolveWorkerId(user, dto);
    await this.validateTaskForReport(dto.taskId, workerId, user);
    const extra =
      dto.extraImageUrls && dto.extraImageUrls.length > 0
        ? dto.extraImageUrls
        : undefined;
    const row = await this.prisma.dailyReport.create({
      data: {
        workerId,
        taskId: dto.taskId ?? null,
        message: dto.message.trim(),
        photoUrl: dto.photoUrl?.trim() ? dto.photoUrl.trim() : null,
        extraImages: extra ?? undefined,
      },
      include: {
        worker: { select: { id: true, displayName: true, email: true } },
        task: {
          select: { id: true, title: true, status: true, orderId: true },
        },
      },
    });
    const mapped = this.mapReport(row);
    await this.activityLog.record({
      actorId: user.id,
      action: ActivityActions.DAILY_REPORT_ADDED,
      entityType: ActivityEntityTypes.dailyReport,
      entityId: row.id,
      meta: {
        taskId: row.taskId,
        orderId: row.task?.orderId ?? null,
        preview: row.message.slice(0, 120),
      },
    });
    this.realtime.emitWorkspace("daily_report.created", mapped);
    return mapped;
  }

  async findAll(query: ListDailyReportsQueryDto) {
    const where = this.buildWhere(query, undefined);
    return this.paginate(where, query);
  }

  async findMine(userId: string, query: ListDailyReportsQueryDto) {
    const where = this.buildWhere(query, userId);
    return this.paginate(where, query);
  }

  async findOne(id: string, user: AuthUser) {
    const lang = getRequestLocale();
    const row = await this.prisma.dailyReport.findFirst({
      where: { id, deletedAt: null },
      include: {
        worker: { select: { id: true, displayName: true, email: true } },
        task: {
          select: { id: true, title: true, status: true, orderId: true },
        },
      },
    });
    if (!row) {
      throw new NotFoundException(t(lang, "dailyReport.notFound"));
    }
    this.assertCanView(user, row);
    return this.mapReport(row);
  }

  async remove(id: string): Promise<void> {
    const lang = getRequestLocale();
    const row = await this.prisma.dailyReport.findFirst({
      where: { id, deletedAt: null },
    });
    if (!row) {
      throw new NotFoundException(t(lang, "dailyReport.notFound"));
    }
    await this.prisma.dailyReport.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
