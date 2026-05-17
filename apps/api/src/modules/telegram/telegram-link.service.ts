import { Injectable } from "@nestjs/common";
import { randomBytes } from "node:crypto";

import { PrismaService } from "../../prisma/prisma.service";
import { TELEGRAM_LINK_CODE_BYTE_LENGTH } from "./telegram-link.codes";

const LINK_TTL_MS = 15 * 60 * 1000;

@Injectable()
export class TelegramLinkService {
  constructor(private readonly prisma: PrismaService) {}

  async issueCode(userId: string): Promise<{ code: string; expiresAt: Date }> {
    const code = randomBytes(TELEGRAM_LINK_CODE_BYTE_LENGTH).toString("hex");
    const expiresAt = new Date(Date.now() + LINK_TTL_MS);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        telegramLinkCode: code,
        telegramLinkExpiresAt: expiresAt,
      },
    });
    return { code, expiresAt };
  }

  async clearLinkCode(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        telegramLinkCode: null,
        telegramLinkExpiresAt: null,
      },
    });
  }
}
