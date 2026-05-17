import { Module } from "@nestjs/common";

import { ActivityLogModule } from "../activity-log/activity-log.module";
import { PrismaModule } from "../../prisma/prisma.module";
import { TasksRealtimeModule } from "../tasks/tasks-realtime.module";
import { DailyReportsController } from "./daily-reports.controller";
import { DailyReportsService } from "./daily-reports.service";

@Module({
  imports: [PrismaModule, ActivityLogModule, TasksRealtimeModule],
  controllers: [DailyReportsController],
  providers: [DailyReportsService],
  exports: [DailyReportsService],
})
export class DailyReportsModule {}
