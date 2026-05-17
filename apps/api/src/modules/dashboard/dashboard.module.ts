import { Module } from "@nestjs/common";

import { AnalyticsModule } from "../analytics/analytics.module";
import { AuthModule } from "../auth/auth.module";
import { DashboardController } from "./dashboard.controller";
import { DashboardStatsService } from "./dashboard-stats.service";

@Module({
  imports: [AuthModule, AnalyticsModule],
  controllers: [DashboardController],
  providers: [DashboardStatsService],
})
export class DashboardModule {}
