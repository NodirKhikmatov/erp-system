import { Injectable } from "@nestjs/common";
import { UserRole } from "@prisma/client";

import type { Context } from "telegraf";

import { t } from "../../i18n/messages";
import type { AppLocale } from "@furniture/types";
import { PrismaService } from "../../prisma/prisma.service";
import type { AuthUser } from "../auth/types/auth.types";
import { normalizeTelegramLinkCode } from "./telegram-link.codes";

export type TelegramFromUser = NonNullable<Context["from"]>;

@Injectable()
export class TelegramWorkerResolveService {
  constructor(private readonly prisma: PrismaService) {}

  toAuthUser(row: { id: string; email: string; role: UserRole }): AuthUser {
    return {
      id: row.id,
      email: row.email,
      role: row.role,
    };
  }

  async findLinkedContext(telegramId: bigint): Promise<AuthUser | null> {
    const link = await this.prisma.telegramUser.findFirst({
      where: {
        telegramId,
        deletedAt: null,
        isBlocked: false,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            isActive: true,
            deletedAt: true,
          },
        },
      },
    });
    if (!link) {
      return null;
    }
    if (link.user.deletedAt !== null || !link.user.isActive) {
      return null;
    }
    return this.toAuthUser(link.user);
  }

  async linkByCode(
    lang: AppLocale,
    telegramId: bigint,
    chatId: bigint,
    codeRaw: string,
    from: TelegramFromUser,
  ): Promise<{ ok: true } | { ok: false; message: string }> {
    if (!codeRaw.trim()) {
      return { ok: false, message: t(lang, "telegram.linkCodeMissing") };
    }

    const codeNorm = normalizeTelegramLinkCode(codeRaw);
    if (!codeNorm) {
      return { ok: false, message: t(lang, "telegram.linkCodeFormat") };
    }

    const user = await this.prisma.user.findFirst({
      where: {
        deletedAt: null,
        isActive: true,
        telegramLinkCode: codeNorm,
        telegramLinkExpiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });
    if (!user) {
      return { ok: false, message: t(lang, "telegram.linkCodeInvalid") };
    }

    const existingTg = await this.prisma.telegramUser.findFirst({
      where: { telegramId, deletedAt: null },
      select: { userId: true },
    });
    if (existingTg && existingTg.userId !== user.id) {
      return { ok: false, message: t(lang, "telegram.telegramBusy") };
    }

    const profileForUser = await this.prisma.telegramUser.findFirst({
      where: { userId: user.id, deletedAt: null },
      select: { telegramId: true },
    });
    if (profileForUser && profileForUser.telegramId !== telegramId) {
      return { ok: false, message: t(lang, "telegram.userAlreadyLinked") };
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.telegramUser.upsert({
        where: { telegramId },
        create: {
          userId: user.id,
          telegramId,
          chatId,
          username: from.username ?? null,
          firstName: from.first_name,
          lastName: from.last_name,
          languageCode: from.language_code ?? null,
          lastInteractionAt: new Date(),
        },
        update: {
          userId: user.id,
          chatId,
          username: from.username ?? null,
          firstName: from.first_name,
          lastName: from.last_name,
          languageCode: from.language_code ?? null,
          lastInteractionAt: new Date(),
          deletedAt: null,
          isBlocked: false,
        },
      });
      await tx.user.update({
        where: { id: user.id },
        data: {
          telegramLinkCode: null,
          telegramLinkExpiresAt: null,
        },
      });
    });

    return { ok: true };
  }
}
