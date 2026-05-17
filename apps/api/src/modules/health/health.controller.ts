import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { HealthResponse } from "@furniture/types";

import { t } from "../../i18n/messages";
import { getRequestLocale } from "../../i18n/request-locale.storage";
import { PrismaService } from "../../prisma/prisma.service";

@ApiTags("Salomatlik")
@Controller(["salomatlik", "health"])
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /** Jarayon ishlamoqda (ma’lumotlar bazasini tekshirmaydi). */
  @Get(["jonli", "live"])
  @ApiOperation({ summary: "Jonli tekshiruv — server javob bermoqdamikan" })
  live(): HealthResponse {
    const lang = getRequestLocale();
    return {
      holat: "yaroqli",
      xizmat: "mebel-erp-api",
      vaqt: new Date().toISOString(),
      xabar: t(lang, "health.ok"),
    };
  }

  /** Ma’lumotlar bazasiga ulanish tekshiriladi. */
  @Get()
  @ApiOperation({ summary: "Tayyorlik — bazaga ulanish bor-yo‘qligi" })
  async ready(): Promise<HealthResponse> {
    await this.prisma.$queryRaw`SELECT 1`;
    const lang = getRequestLocale();
    return {
      holat: "yaroqli",
      xizmat: "mebel-erp-api",
      vaqt: new Date().toISOString(),
      xabar: t(lang, "health.ok"),
    };
  }
}
