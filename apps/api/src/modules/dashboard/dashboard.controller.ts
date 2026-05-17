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
import { DashboardStatsQueryDto } from "./dto/dashboard-stats-query.dto";
import { DashboardStatsResponseDto } from "./dto/dashboard-stats-response.dto";
import { DashboardStatsService } from "./dashboard-stats.service";

@ApiTags("Dashboard")
@ApiBearerAuth("kirish-jetoni")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
@Controller("dashboard")
export class DashboardController {
  constructor(private readonly stats: DashboardStatsService) {}

  @Get("stats")
  @ApiOperation({
    summary:
      "Qo‘shma KPI: daromad, xarajat, foyda, faol buyurtmalar (analytics bilan bir xil manba)",
  })
  @ApiOkResponse({ type: DashboardStatsResponseDto })
  getStats(@Query() query: DashboardStatsQueryDto) {
    return this.stats.getStats(query);
  }
}
