import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { UserRole } from "@prisma/client";

import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { DashboardAnalyticsService } from "./dashboard-analytics.service";
import { DashboardAnalyticsQueryDto } from "./dto/dashboard-analytics-query.dto";
import { DashboardAnalyticsResponseDto } from "./dto/dashboard-analytics-response.dto";

@ApiTags("Analitika (dashboard)")
@ApiBearerAuth("kirish-jetoni")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly dashboard: DashboardAnalyticsService) {}

  @Get("dashboard")
  @ApiOperation({
    summary:
      "Dashboard: daromad, xarajat, foyda (valyuta), faol buyurtmalar, bajarilgan vazifalar, ishchilar samaradorligi — bitta Prisma $transaction",
  })
  @ApiOkResponse({ type: DashboardAnalyticsResponseDto })
  getDashboard(@Query() query: DashboardAnalyticsQueryDto) {
    return this.dashboard.getDashboard(query);
  }
}
