import { Injectable } from "@nestjs/common";

import { DashboardAnalyticsService } from "../analytics/dashboard-analytics.service";
import type { DashboardStatsQueryDto } from "./dto/dashboard-stats-query.dto";

@Injectable()
export class DashboardStatsService {
  constructor(private readonly analytics: DashboardAnalyticsService) {}

  async getStats(query: DashboardStatsQueryDto) {
    const dash = await this.analytics.getDashboard({
      currency: query.currency,
    });
    return {
      revenue: dash.primary.revenue,
      expenses: dash.primary.expenses,
      profit: dash.primary.profit,
      activeOrders: dash.orders.active,
      currency: dash.primary.currency,
    };
  }
}
