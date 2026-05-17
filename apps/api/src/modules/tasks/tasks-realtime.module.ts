import { Module } from "@nestjs/common";

import { TasksRealtimeBridge } from "./tasks-realtime.bridge";

@Module({
  providers: [TasksRealtimeBridge],
  exports: [TasksRealtimeBridge],
})
export class TasksRealtimeModule {}
