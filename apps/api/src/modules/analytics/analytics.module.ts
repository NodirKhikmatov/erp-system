import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { AnalyticsController } from "./analytics.controller";
import { DashboardAnalyticsService } from "./dashboard-analytics.service";

@Module({
  imports: [AuthModule],
  controllers: [AnalyticsController],
  providers: [DashboardAnalyticsService],
  exports: [DashboardAnalyticsService],
})
export class AnalyticsModule {}
