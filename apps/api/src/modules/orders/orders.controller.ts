import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { AssignOrderTasksDto } from "./dto/assign-order-tasks.dto";
import { CreateOrderDto } from "./dto/create-order.dto";
import { ListOrdersQueryDto } from "./dto/list-orders-query.dto";
import { OrderAnalyticsQueryDto } from "./dto/order-analytics-query.dto";
import {
  OrderAnalyticsResponseDto,
  OrderDashboardResponseDto,
  OrderDetailResponseDto,
  OrderListResponseDto,
  OrderProfitResponseDto,
} from "./dto/order-response.dto";
import { UpdateOrderDto } from "./dto/update-order.dto";
import { UpdateOrderStatusDto } from "./dto/update-order-status.dto";
import { OrdersService } from "./orders.service";

@ApiTags("Buyurtmalar")
@ApiBearerAuth("kirish-jetoni")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
@Controller("orders")
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  @ApiOperation({ summary: "Yangi buyurtma yaratish" })
  @ApiCreatedResponse({ type: OrderDetailResponseDto })
  create(@Body() dto: CreateOrderDto, @CurrentUser() user: AuthUser) {
    return this.orders.create(dto, user);
  }

  @Get("dashboard")
  @ApiOperation({
    summary:
      "Statistika: status bo‘yicha sonlar, valyuta kesimida daromad / xarajat / foyda",
  })
  @ApiOkResponse({ type: OrderDashboardResponseDto })
  getDashboard() {
    return this.orders.getDashboard();
  }

  @Get("analytics")
  @ApiOperation({
    summary:
      "Vaqt qatorida buyurtmalar (createdAt) va xarajatlar (incurredOn) bo‘yicha",
  })
  @ApiOkResponse({ type: OrderAnalyticsResponseDto })
  getAnalytics(@Query() query: OrderAnalyticsQueryDto) {
    return this.orders.getAnalytics(query);
  }

  @Get()
  @ApiOperation({
    summary:
      "Ro‘yxat — pagination, status(lar), mijoz, sanalar, qidiruv, saralash",
  })
  @ApiOkResponse({ type: OrderListResponseDto })
  findAll(@Query() query: ListOrdersQueryDto) {
    return this.orders.findAll(query);
  }

  @Get(":id/profit")
  @ApiOperation({
    summary: "Buyurtma narxi, xarajatlar yig‘indisi va sof foyda (avtomatik)",
  })
  @ApiOkResponse({ type: OrderProfitResponseDto })
  getProfit(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.orders.getProfitSnapshot(id);
  }

  @Get(":id")
  @ApiOperation({
    summary: "Batafsil: mijoz, vazifalar, xarajatlar, totalExpenses, profit",
  })
  @ApiOkResponse({ type: OrderDetailResponseDto })
  findOne(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.orders.findOne(id);
  }

  @Patch(":id/status")
  @ApiOperation({ summary: "Buyurtma holatini yangilash" })
  @ApiOkResponse({ type: OrderDetailResponseDto })
  updateStatus(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.orders.updateStatus(id, dto);
  }

  @Post(":id/tasks")
  @ApiOperation({
    summary: "Buyurtmaga vazifalar qo‘shish va ijrochilarni biriktirish",
  })
  @ApiOkResponse({ type: OrderDetailResponseDto })
  assignTasks(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: AssignOrderTasksDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.orders.assignTasks(id, dto, user);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Buyurtmani yangilash" })
  @ApiOkResponse({ type: OrderDetailResponseDto })
  update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateOrderDto,
  ) {
    return this.orders.update(id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Buyurtmani soft-delete qilish" })
  @ApiNoContentResponse()
  remove(@Param("id", new ParseUUIDPipe()) id: string): Promise<void> {
    return this.orders.remove(id);
  }
}
