import { Module, forwardRef } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../../prisma/prisma.module";
import { TelegramModule } from "../telegram/telegram.module";
import { TasksController } from "./tasks.controller";
import { TasksGateway } from "./tasks.gateway";
import { TasksRealtimeModule } from "./tasks-realtime.module";
import { TasksService } from "./tasks.service";

@Module({
  imports: [
    AuthModule,
    PrismaModule,
    TasksRealtimeModule,
    forwardRef(() => TelegramModule),
  ],
  controllers: [TasksController],
  providers: [TasksService, TasksGateway],
  exports: [TasksService, TasksRealtimeModule],
})
export class TasksModule {}
