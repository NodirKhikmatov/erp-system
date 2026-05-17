import { Module } from "@nestjs/common";

import { ActivityLogModule } from "../activity-log/activity-log.module";
import { TasksRealtimeModule } from "../tasks/tasks-realtime.module";
import { ExpensesController } from "./expenses.controller";
import { ExpensesService } from "./expenses.service";

@Module({
  imports: [TasksRealtimeModule, ActivityLogModule],
  controllers: [ExpensesController],
  providers: [ExpensesService],
  exports: [ExpensesService],
})
export class ExpensesModule {}
