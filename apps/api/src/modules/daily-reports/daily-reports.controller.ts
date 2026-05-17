import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { UserRole } from "@prisma/client";

import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import type { AuthUser } from "../auth/types/auth.types";
import { DailyReportsService } from "./daily-reports.service";
import { CreateDailyReportDto } from "./dto/create-daily-report.dto";
import {
  DailyReportListResponseDto,
  DailyReportResponseDto,
} from "./dto/daily-report-response.dto";
import { ListDailyReportsQueryDto } from "./dto/list-daily-reports-query.dto";

@ApiTags("Kunlik hisobotlar")
@ApiBearerAuth("kirish-jetoni")
@Controller("daily-reports")
@UseGuards(JwtAuthGuard)
export class DailyReportsController {
  constructor(private readonly reports: DailyReportsService) {}

  @Post()
  @ApiOperation({
    summary:
      "Kunlik hisobot yaratish. WORKER: o‘zi. ADMIN/MANAGER: workerId bilan.",
  })
  @ApiCreatedResponse({ type: DailyReportResponseDto })
  create(@Body() dto: CreateDailyReportDto, @CurrentUser() user: AuthUser) {
    return this.reports.create(dto, user);
  }

  @Get("my")
  @ApiOperation({
    summary: "Joriy foydalanuvchi hisobotlari (tarix + filtr)",
  })
  @ApiOkResponse({ type: DailyReportListResponseDto })
  listMine(
    @CurrentUser() user: AuthUser,
    @Query() query: ListDailyReportsQueryDto,
  ) {
    return this.reports.findMine(user.id, query);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: "Barcha hisobotlar — ishchi, vazifa, sana, matn bo‘yicha filtr",
  })
  @ApiOkResponse({ type: DailyReportListResponseDto })
  findAll(@Query() query: ListDailyReportsQueryDto) {
    return this.reports.findAll(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Bitta hisobot" })
  @ApiOkResponse({ type: DailyReportResponseDto })
  findOne(
    @Param("id", new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.reports.findOne(id, user);
  }

  @Delete(":id")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Hisobotni soft-delete (boshqaruv)" })
  @ApiNoContentResponse()
  remove(@Param("id", new ParseUUIDPipe()) id: string): Promise<void> {
    return this.reports.remove(id);
  }
}
