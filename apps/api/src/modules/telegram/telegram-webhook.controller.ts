import {
  Controller,
  HttpStatus,
  Logger,
  Post,
  Req,
  Res,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request, Response } from "express";
import type { Update } from "telegraf/types";

import type { Env } from "../../config/env";
import { TelegramBotService } from "./telegram-bot.service";

const SECRET_HEADER = "x-telegram-bot-api-secret-token";

@Controller("integrations/telegram")
export class TelegramWebhookController {
  private readonly logger = new Logger(TelegramWebhookController.name);

  constructor(
    private readonly bot: TelegramBotService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Post("webhook")
  async webhook(@Req() req: Request, @Res() res: Response): Promise<void> {
    if (!this.bot.isEnabled) {
      throw new ServiceUnavailableException("Telegram bot sozlanmagan");
    }

    const secret = this.config.get("TELEGRAM_WEBHOOK_SECRET", { infer: true });
    if (secret) {
      const got = req.headers[SECRET_HEADER];
      if (typeof got !== "string" || got !== secret) {
        throw new UnauthorizedException();
      }
    }

    try {
      await this.bot.handleUpdate(req.body as Update);
    } catch (e) {
      this.logger.error(
        "Webhook yangilanishini qayta ishlashda xato",
        e instanceof Error ? e.stack : e,
      );
      /* Telegram qayta yuborishini kamaytirish uchun 200 qaytaramiz */
    }
    res.status(HttpStatus.OK).send();
  }
}
