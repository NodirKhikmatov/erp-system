import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
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
import { CreateExpenseDto } from "./dto/create-expense.dto";
import { ExpenseAnalyticsQueryDto } from "./dto/expense-analytics-query.dto";
import { RecentExpensesQueryDto } from "./dto/recent-expenses-query.dto";
import { ExpensesService } from "./expenses.service";

@ApiTags("Xarajatlar")
@ApiBearerAuth("kirish-jetoni")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
@Controller("expenses")
export class ExpensesController {
  constructor(private readonly expenses: ExpensesService) {}

  @Post()
  @ApiOperation({
    summary: "Buyurtmaga xarajat qo‘shish (real-time yangilanish bilan)",
  })
  @ApiCreatedResponse({ description: "Yaratilgan xarajat qatori" })
  create(@Body() dto: CreateExpenseDto, @CurrentUser() user: AuthUser) {
    return this.expenses.create(dto, user);
  }

  @Get("recent")
  @ApiOperation({ summary: "So‘nggi xarajatlar (dashboard)" })
  @ApiOkResponse({ description: "Xarajatlar ro‘yxati" })
  listRecent(@Query() query: RecentExpensesQueryDto) {
    return this.expenses.listRecent({
      limit: query.limit,
      currency: query.currency,
    });
  }

  @Get("analytics")
  @ApiOperation({
    summary: "Kategoriya va oylik xarajatlar (grafiklar uchun)",
  })
  @ApiOkResponse({ description: "Agregatlar" })
  getAnalytics(@Query() query: ExpenseAnalyticsQueryDto) {
    return this.expenses.getAnalytics(query);
  }
}
