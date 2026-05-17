import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, UserRole, type User } from "@prisma/client";

import { t } from "../../i18n/messages";
import { getRequestLocale } from "../../i18n/request-locale.storage";
import { PrismaService } from "../../prisma/prisma.service";
import type { AuthUser } from "../auth/types/auth.types";
import { AuthService } from "../auth/auth.service";
import type { CreateWorkerDto } from "./dto/create-worker.dto";
import type { ListWorkersQueryDto } from "./dto/list-workers-query.dto";
import type { UpdateWorkerDto } from "./dto/update-worker.dto";
import type { WorkerTasksQueryDto } from "./dto/worker-tasks-query.dto";

function toSalaryNumber(value: Prisma.Decimal | null): number | null {
  if (value === null) {
    return null;
  }
  return value.toNumber();
}

@Injectable()
export class WorkersService {
  constructor(private readonly prisma: PrismaService) {}

  private mapUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.displayName,
      phone: user.phone,
      salary: toSalaryNumber(user.salary),
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private guardAdminOnlyActivationAndRole(
    actor: AuthUser,
    dto: UpdateWorkerDto,
  ): void {
    const lang = getRequestLocale();
    if (dto.isActive !== undefined || dto.role !== undefined) {
      if (actor.role !== UserRole.ADMIN) {
        throw new ForbiddenException(t(lang, "auth.insufficientRole"));
      }
    }
  }

  private ensureNotTargetingSelf(actor: AuthUser, targetId: string): void {
    const lang = getRequestLocale();
    if (actor.id === targetId) {
      throw new ForbiddenException(t(lang, "worker.cannotTargetSelf"));
    }
  }

  private async ensureNotRemovingLastAdmin(subject: User): Promise<void> {
    if (subject.role !== UserRole.ADMIN) {
      return;
    }
    const lang = getRequestLocale();
    const admins = await this.prisma.user.count({
      where: { role: UserRole.ADMIN, deletedAt: null },
    });
    if (admins <= 1) {
      throw new BadRequestException(t(lang, "worker.lastAdminProtected"));
    }
  }

  private buildWhere(query: ListWorkersQueryDto): Prisma.UserWhereInput {
    const parts: Prisma.UserWhereInput[] = [{ deletedAt: null }];
    if (query.role !== undefined) {
      parts.push({ role: query.role });
    }
    if (query.isActive !== undefined) {
      parts.push({ isActive: query.isActive });
    }
    const q = query.search?.trim();
    if (q) {
      parts.push({
        OR: [
          { displayName: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { phone: { contains: q, mode: "insensitive" } },
        ],
      });
    }
    return { AND: parts };
  }

  private orderBy(
    query: ListWorkersQueryDto,
  ): Prisma.UserOrderByWithRelationInput {
    const dir = query.sortOrder ?? "desc";
    const key = query.sortBy ?? "createdAt";
    if (key === "fullName") {
      return { displayName: dir };
    }
    if (key === "salary") {
      return { salary: dir };
    }
    return { createdAt: dir };
  }

  async create(dto: CreateWorkerDto) {
    const lang = getRequestLocale();
    const email = dto.email.toLowerCase().trim();
    const taken = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
    });
    if (taken) {
      throw new ConflictException(t(lang, "worker.emailTaken"));
    }
    const passwordHash = await AuthService.hashPassword(dto.password);
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        displayName: dto.fullName.trim(),
        phone: dto.phone?.trim() ? dto.phone.trim() : null,
        salary: dto.salary != null ? new Prisma.Decimal(dto.salary) : null,
        role: dto.role,
      },
    });
    return this.mapUser(user);
  }

  async findAll(query: ListWorkersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = this.buildWhere(query);
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: this.orderBy(query),
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return {
      data: rows.map((u) => this.mapUser(u)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async getStatistics() {
    const baseWhere: Prisma.UserWhereInput = { deletedAt: null };

    const [total, userRoles, active, inactive, avgRow, openTaskAssignees] =
      await this.prisma.$transaction([
        this.prisma.user.count({ where: baseWhere }),
        this.prisma.user.findMany({
          where: baseWhere,
          select: { role: true },
        }),
        this.prisma.user.count({ where: { ...baseWhere, isActive: true } }),
        this.prisma.user.count({ where: { ...baseWhere, isActive: false } }),
        this.prisma.user.aggregate({
          where: { ...baseWhere, salary: { not: null } },
          _avg: { salary: true },
        }),
        this.prisma.task.findMany({
          where: {
            deletedAt: null,
            assigneeId: { not: null },
            status: { in: ["PENDING", "WORKING"] },
            assignee: { deletedAt: null, isActive: true },
          },
          select: { assigneeId: true },
          distinct: ["assigneeId"],
        }),
      ]);

    const roleTotals = new Map<UserRole, number>();
    for (const row of userRoles) {
      roleTotals.set(row.role, (roleTotals.get(row.role) ?? 0) + 1);
    }
    const byRole = Array.from(roleTotals.entries())
      .map(([role, count]) => ({ role, count }))
      .sort((a, b) => a.role.localeCompare(b.role));

    const averageSalary =
      avgRow._avg.salary != null ? avgRow._avg.salary.toNumber() : null;

    return {
      total,
      byRole,
      active,
      inactive,
      averageSalary,
      workersWithOpenTasks: openTaskAssignees.length,
    };
  }

  async findOne(id: string) {
    const lang = getRequestLocale();
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });
    if (!user) {
      throw new NotFoundException(t(lang, "worker.notFound"));
    }
    return this.mapUser(user);
  }

  async update(id: string, dto: UpdateWorkerDto, actor: AuthUser) {
    const lang = getRequestLocale();
    this.guardAdminOnlyActivationAndRole(actor, dto);
    const existing = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException(t(lang, "worker.notFound"));
    }

    if (dto.isActive === false) {
      this.ensureNotTargetingSelf(actor, id);
      await this.ensureNotRemovingLastAdmin(existing);
    }

    if (
      dto.role !== undefined &&
      existing.role === UserRole.ADMIN &&
      dto.role !== UserRole.ADMIN
    ) {
      await this.ensureNotRemovingLastAdmin(existing);
    }
    if (dto.email !== undefined) {
      const email = dto.email.toLowerCase().trim();
      const clash = await this.prisma.user.findFirst({
        where: { email, deletedAt: null, NOT: { id } },
      });
      if (clash) {
        throw new ConflictException(t(lang, "worker.emailTaken"));
      }
    }
    const data: Prisma.UserUpdateInput = {};
    if (dto.email !== undefined) {
      data.email = dto.email.toLowerCase().trim();
    }
    if (dto.password !== undefined) {
      data.passwordHash = await AuthService.hashPassword(dto.password);
    }
    if (dto.fullName !== undefined) {
      data.displayName = dto.fullName.trim();
    }
    if (dto.phone !== undefined) {
      data.phone = dto.phone.trim() || null;
    }
    if (dto.salary !== undefined) {
      data.salary = dto.salary === null ? null : new Prisma.Decimal(dto.salary);
    }
    if (dto.role !== undefined) {
      data.role = dto.role;
    }
    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }
    const user = await this.prisma.user.update({
      where: { id },
      data,
    });
    return this.mapUser(user);
  }

  async remove(id: string, actor: AuthUser): Promise<void> {
    const lang = getRequestLocale();
    const existing = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException(t(lang, "worker.notFound"));
    }

    this.ensureNotTargetingSelf(actor, id);
    await this.ensureNotRemovingLastAdmin(existing);

    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: now },
      }),
      this.prisma.user.update({
        where: { id },
        data: { deletedAt: now, isActive: false },
      }),
    ]);
  }

  async tasksForWorker(workerId: string, query: WorkerTasksQueryDto) {
    const lang = getRequestLocale();
    const worker = await this.prisma.user.findFirst({
      where: { id: workerId, deletedAt: null },
    });
    if (!worker) {
      throw new NotFoundException(t(lang, "worker.notFound"));
    }
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.TaskWhereInput = {
      deletedAt: null,
      assigneeId: workerId,
    };
    if (query.status !== undefined) {
      where.status = query.status;
    }
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.task.count({ where }),
      this.prisma.task.findMany({
        where,
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return {
      data: rows.map((t) => ({
        id: t.id,
        orderId: t.orderId,
        title: t.title,
        status: t.status,
        dueDate: t.dueDate,
        sortOrder: t.sortOrder,
        createdAt: t.createdAt,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }
}
