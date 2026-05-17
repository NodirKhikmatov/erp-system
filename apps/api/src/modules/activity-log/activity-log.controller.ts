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
import { ActivityLogService } from "./activity-log.service";
import { ListActivityQueryDto } from "./dto/list-activity-query.dto";
import { ActivityLogListResponseDto } from "./dto/activity-log-response.dto";

@ApiTags("Faollik jurnali")
@ApiBearerAuth("kirish-jetoni")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
@Controller("activity-logs")
export class ActivityLogController {
  constructor(private readonly logs: ActivityLogService) {}

  @Get()
  @ApiOperation({ summary: "Buyurtma / boshqa obyekt bo‘yicha voqealar" })
  @ApiOkResponse({ type: ActivityLogListResponseDto })
  list(@Query() query: ListActivityQueryDto) {
    return this.logs.listForEntity(
      query.entityType,
      query.entityId,
      query.take,
    );
  }
}
