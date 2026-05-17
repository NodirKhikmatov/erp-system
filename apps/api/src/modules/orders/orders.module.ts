import { Module } from "@nestjs/common";

import { ActivityLogModule } from "../activity-log/activity-log.module";
import { PrismaModule } from "../../prisma/prisma.module";
import { TasksModule } from "../tasks/tasks.module";
import { TelegramModule } from "../telegram/telegram.module";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";

@Module({
  imports: [PrismaModule, TasksModule, ActivityLogModule, TelegramModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
