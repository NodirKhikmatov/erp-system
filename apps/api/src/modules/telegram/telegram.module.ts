import { Module, forwardRef } from "@nestjs/common";

import { PrismaModule } from "../../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { DailyReportsModule } from "../daily-reports/daily-reports.module";
import { TasksModule } from "../tasks/tasks.module";
import { TelegramBotService } from "./telegram-bot.service";
import { TelegramCommandsService } from "./telegram-commands.service";
import { TelegramLinkController } from "./telegram-link.controller";
import { TelegramLinkService } from "./telegram-link.service";
import { TelegramWebhookController } from "./telegram-webhook.controller";
import { TelegramWorkerResolveService } from "./telegram-worker-resolve.service";

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    forwardRef(() => TasksModule),
    DailyReportsModule,
  ],
  controllers: [TelegramWebhookController, TelegramLinkController],
  providers: [
    TelegramBotService,
    TelegramCommandsService,
    TelegramLinkService,
    TelegramWorkerResolveService,
  ],
  exports: [TelegramBotService, TelegramLinkService],
})
export class TelegramModule {}
