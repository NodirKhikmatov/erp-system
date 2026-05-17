import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Telegraf } from "telegraf";
import type { Update } from "telegraf/types";

import type { Env } from "../../config/env";
import { PrismaService } from "../../prisma/prisma.service";
import { TelegramCommandsService } from "./telegram-commands.service";

function isPollingForceFlagOn(v: Env["TELEGRAM_DEV_POLLING"]): boolean {
  return v === "true" || v === "1";
}

function webhookFullyConfigured(
  baseUrl: string | undefined,
  secret: string | undefined,
): boolean {
  return (
    typeof baseUrl === "string" &&
    baseUrl.trim().length > 0 &&
    typeof secret === "string" &&
    secret.trim().length > 0
  );
}

function errStr(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

@Injectable()
export class TelegramBotService
  implements OnModuleInit, OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(TelegramBotService.name);
  private bot: Telegraf | null = null;
  /** Long polling aktiv (stop uchun). */
  private pollingActive = false;

  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly commands: TelegramCommandsService,
    private readonly prisma: PrismaService,
  ) {}

  get isEnabled(): boolean {
    const token = this.config.get("TELEGRAM_BOT_TOKEN", { infer: true });
    return typeof token === "string" && token.length > 0;
  }

  /** Faqat middleware va komandalar — tarmoq chaqiruvlari emas (Nest listen bloklanmasin). */
  onModuleInit(): void {
    const token = this.config.get("TELEGRAM_BOT_TOKEN", { infer: true });
    if (!token) {
      this.logger.warn(
        "TELEGRAM_BOT_TOKEN yo‘q — Telegram bot o‘chiq (veb-xuk kelganda 503).",
      );
      return;
    }

    const bot = new Telegraf(token);
    bot.catch((err) => {
      this.logger.error(
        "Telegraf xatolik",
        err instanceof Error ? err.stack : err,
      );
    });

    bot.command("start", async (ctx) => {
      await this.commands.handleStart(ctx);
    });
    bot.command(["tasks", "vazifalar"], async (ctx) => {
      await this.commands.handleTasks(ctx);
    });
    bot.command(["done", "bajarildi"], async (ctx) => {
      await this.commands.handleDone(ctx);
    });
    bot.command(["report", "hisobot"], async (ctx) => {
      await this.commands.handleReport(ctx);
    });

    void bot.telegram
      .setMyCommands([
        {
          command: "start",
          description: "Veb kod bilan akkauntni ulash",
        },
        {
          command: "vazifalar",
          description: "Biriktirilgan vazifalar ro'yxati",
        },
        {
          command: "bajarildi",
          description: "Vazifani bajarildi deb belgilash",
        },
        {
          command: "hisobot",
          description: "Kunlik ish hisoboti yuborish",
        },
      ])
      .catch((e: unknown) => {
        this.logger.warn(`Telegram setMyCommands: ${errStr(e)}`);
      });

    this.bot = bot;
  }

  /** Webhook / long polling — `bot.launch()` cheksiz kutadi, shuning uchun fon vazifada. */
  onApplicationBootstrap(): void {
    const token = this.config.get("TELEGRAM_BOT_TOKEN", { infer: true });
    if (!token || !this.bot) {
      return;
    }

    const bot = this.bot;
    const nodeEnv = this.config.get("NODE_ENV", { infer: true });
    const pollingFlag = this.config.get("TELEGRAM_DEV_POLLING", {
      infer: true,
    });
    const baseUrl = this.config.get("TELEGRAM_WEBHOOK_BASE_URL", {
      infer: true,
    });
    const secret = this.config.get("TELEGRAM_WEBHOOK_SECRET", {
      infer: true,
    });
    const webhookOk = webhookFullyConfigured(baseUrl, secret);
    const forcePollingPreference =
      nodeEnv === "development" && isPollingForceFlagOn(pollingFlag);

    const autoPollingWithoutWebhook = nodeEnv === "development" && !webhookOk;

    const usePollingDev =
      nodeEnv === "development" &&
      (autoPollingWithoutWebhook || forcePollingPreference);

    if (usePollingDev) {
      this.runLongPollingInBackground(bot, forcePollingPreference, webhookOk);
      return;
    }

    if (
      webhookOk &&
      baseUrl &&
      typeof secret === "string" &&
      secret.trim().length > 0
    ) {
      const url = `${baseUrl.replace(/\/$/, "")}/integrations/telegram/webhook`;
      this.scheduleSetWebhook(bot, url, secret);
      return;
    }

    if (pollingFlag === "true" || pollingFlag === "1") {
      this.logger.warn(
        "TELEGRAM_DEV_POLLING faqat NODE_ENV=development da qo‘llanadi.",
      );
    }

    this.logger.warn(
      "Ishlab chiqarish uchun TELEGRAM_WEBHOOK_BASE_URL va TELEGRAM_WEBHOOK_SECRET kerak.",
    );
  }

  private scheduleSetWebhook(bot: Telegraf, url: string, secret: string): void {
    Promise.resolve(bot.telegram.setWebhook(url, { secret_token: secret }))
      .then(() => {
        this.logger.log(`Telegram webhook o‘rnatildi: ${url}`);
      })
      .catch((e: unknown) => {
        this.logger.error(
          "setWebhook muvaffaqiyatsiz — `.env` va HTTPS domenni tekshiring",
          errStr(e),
        );
      });
  }

  /**
   * `bot.launch()` ichidagi polling sikli tugamaydi — Nest lifecycle ni bloklamaslik uchun fon zanjir.
   */
  private runLongPollingInBackground(
    bot: Telegraf,
    forcePollingPreference: boolean,
    webhookOk: boolean,
  ): void {
    void this.bootstrapLongPolling(
      bot,
      forcePollingPreference,
      webhookOk,
    ).catch((e: unknown) => {
      this.logger.error(
        "Telegram long polling tayyorgarligi muvaffaqiyatsiz",
        errStr(e),
      );
    });
  }

  private async bootstrapLongPolling(
    bot: Telegraf,
    forcePollingPreference: boolean,
    webhookOk: boolean,
  ): Promise<void> {
    try {
      await bot.telegram.deleteWebhook({ drop_pending_updates: false });
    } catch (e: unknown) {
      this.logger.warn(`deleteWebhook (polling rejim oldidan): ${errStr(e)}`);
    }
    try {
      await bot.telegram.getMe();
    } catch (e: unknown) {
      this.logger.error(
        "Telegram TOKEN yaroqsiz yoki tarmoq xatosi (getMe)",
        errStr(e),
      );
      return;
    }
    try {
      this.pollingActive = true;
      if (forcePollingPreference && webhookOk) {
        this.logger.log(
          "Telegram long polling (development, TELEGRAM_DEV_POLLING=1)",
        );
      } else {
        this.logger.log(
          "Telegram long polling (development): webhook toʻliq emas — yangilanishlar fon rejimida.",
        );
      }
      await bot.launch();
    } catch (e: unknown) {
      this.pollingActive = false;
      this.logger.error("Telegraf launch muvaffaqiyatsiz", errStr(e));
    }
  }

  onApplicationShutdown(): void {
    if (!this.bot || !this.pollingActive) {
      return;
    }
    try {
      this.bot.stop("NestJS shutdown");
    } catch (e: unknown) {
      this.logger.warn(`Telegraf stop: ${errStr(e)}`);
    }
    this.pollingActive = false;
  }

  async handleUpdate(update: Update): Promise<void> {
    if (!this.bot) {
      throw new Error("Telegram bot yaratilmagan");
    }
    await this.bot.handleUpdate(update);
  }

  /** Vazifa biriktirilganda ishchiga (bog‘langan chatId bo‘lsa) xabar. */
  async notifyWorkerText(workerUserId: string, text: string): Promise<void> {
    if (!this.bot) {
      return;
    }
    const link = await this.prisma.telegramUser.findFirst({
      where: { userId: workerUserId, deletedAt: null, chatId: { not: null } },
    });
    if (!link?.chatId) {
      return;
    }
    try {
      await this.bot.telegram.sendMessage(Number(link.chatId), text);
    } catch (e: unknown) {
      this.logger.warn(
        `Telegram xabar yuborilmadi (${workerUserId}): ${errStr(e)}`,
      );
    }
  }
}
