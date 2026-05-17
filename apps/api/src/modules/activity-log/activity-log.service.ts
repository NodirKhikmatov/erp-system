import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import { PrismaService } from "../../prisma/prisma.service";

/** Ilova bo‘ylab izchil `action` qatorlari. */
export const ActivityActions = {
  ORDER_CREATED: "ORDER_CREATED",
  TASK_ASSIGNED: "TASK_ASSIGNED",
  TASK_STATUS_CHANGED: "TASK_STATUS_CHANGED",
  TASK_CREATED: "TASK_CREATED",
  DAILY_REPORT_ADDED: "DAILY_REPORT_ADDED",
  EXPENSE_ADDED: "EXPENSE_ADDED",
} as const;

export const ActivityEntityTypes = {
  order: "order",
  task: "task",
  dailyReport: "daily_report",
  expense: "expense",
} as const;

@Injectable()
export class ActivityLogService {
  constructor(private readonly prisma: PrismaService) {}

  async record(params: {
    actorId: string | null;
    action: string;
    entityType: string;
    entityId: string;
    meta?: Prisma.InputJsonValue;
  }): Promise<void> {
    await this.prisma.activityLog.create({
      data: {
        actorId: params.actorId ?? undefined,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        meta: params.meta,
      },
    });
  }

  async listForEntity(entityType: string, entityId: string, take = 50) {
    const rows = await this.prisma.activityLog.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: "desc" },
      take: Math.min(take, 100),
      include: {
        actor: {
          select: { id: true, displayName: true, email: true, role: true },
        },
      },
    });
    return {
      data: rows.map((r) => ({
        id: r.id,
        action: r.action,
        entityType: r.entityType,
        entityId: r.entityId,
        meta: r.meta ?? null,
        createdAt: r.createdAt,
        actor: r.actor
          ? {
              id: r.actor.id,
              fullName: r.actor.displayName,
              email: r.actor.email,
              role: r.actor.role,
            }
          : null,
      })),
    };
  }
}
