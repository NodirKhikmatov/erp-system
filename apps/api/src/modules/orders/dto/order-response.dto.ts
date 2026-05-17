import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  ExpenseCategory,
  OrderStatus,
  TaskStatus,
  UserRole,
} from "@prisma/client";

export class OrderClientSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  fullName!: string;
}

export class OrderAssigneeSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  fullName!: string;

  @ApiProperty({ enum: UserRole })
  role!: UserRole;
}

export class OrderProgressDto {
  @ApiProperty()
  total!: number;

  @ApiProperty()
  done!: number;

  @ApiProperty()
  percent!: number;
}

export class OrderTaskDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty({ enum: TaskStatus })
  status!: TaskStatus;

  @ApiProperty({ default: 0 })
  priority!: number;

  @ApiPropertyOptional({ nullable: true, description: "Baholangan soatlar" })
  estimatedHours!: number | null;

  @ApiProperty({ nullable: true, type: OrderAssigneeSummaryDto })
  assignee!: OrderAssigneeSummaryDto | null;

  @ApiProperty({ nullable: true })
  dueDate!: Date | null;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class OrderExpenseItemDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional({
    nullable: true,
    description: "Xarajat qatori sarlavhasi",
  })
  title!: string | null;

  @ApiProperty({ enum: ExpenseCategory })
  category!: ExpenseCategory;

  @ApiProperty()
  amount!: number;

  @ApiProperty()
  currency!: string;

  @ApiProperty({ nullable: true, description: "Izoh / qaydlar" })
  description!: string | null;

  @ApiProperty()
  incurredOn!: Date;

  @ApiProperty()
  createdAt!: Date;
}

export class OrderProfitResponseDto {
  @ApiProperty({ nullable: true })
  orderPrice!: number | null;

  @ApiProperty()
  totalExpenses!: number;

  @ApiProperty({ nullable: true })
  profit!: number | null;

  @ApiProperty()
  currency!: string;
}

export class OrderDetailResponseDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional({ nullable: true, description: "Ko‘rsatish raqami" })
  orderNumber!: string | null;

  @ApiProperty({ enum: OrderStatus })
  status!: OrderStatus;

  @ApiProperty({ nullable: true })
  title!: string | null;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty({ description: "Umumiy narx" })
  totalPrice!: number | null;

  @ApiProperty({ nullable: true, description: "Oldindan to‘lov" })
  prepayment!: number | null;

  @ApiProperty()
  currency!: string;

  @ApiProperty({ nullable: true, description: "Muddat (dueDate)" })
  deadline!: Date | null;

  @ApiProperty({ nullable: true })
  completedAt!: Date | null;

  @ApiProperty()
  clientId!: string;

  @ApiProperty({ type: OrderClientSummaryDto })
  client!: OrderClientSummaryDto;

  @ApiPropertyOptional({ nullable: true })
  createdById!: string | null;

  @ApiProperty({ type: [String], description: "Namuna rasmlar URL" })
  referenceImages!: string[];

  @ApiProperty({ type: OrderProgressDto })
  progress!: OrderProgressDto;

  @ApiProperty({
    description: "Buyurtmaga bog‘langan xarajatlar yig‘indisi (bir valyuta)",
  })
  totalExpenses!: number;

  @ApiProperty({
    nullable: true,
    description: "totalPrice - totalExpenses (narx bo‘lmasa null)",
  })
  profit!: number | null;

  @ApiProperty({ type: [OrderTaskDto] })
  tasks!: OrderTaskDto[];

  @ApiProperty({ type: [OrderExpenseItemDto] })
  expenses!: OrderExpenseItemDto[];

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class OrderListItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: OrderStatus })
  status!: OrderStatus;

  @ApiProperty({ nullable: true })
  title!: string | null;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty({ nullable: true })
  totalPrice!: number | null;

  @ApiProperty({ nullable: true })
  prepayment!: number | null;

  @ApiProperty()
  currency!: string;

  @ApiProperty({ nullable: true })
  deadline!: Date | null;

  @ApiProperty()
  clientId!: string;

  @ApiProperty({ type: OrderClientSummaryDto })
  client!: OrderClientSummaryDto;

  @ApiProperty()
  totalExpenses!: number;

  @ApiProperty({ nullable: true })
  profit!: number | null;

  @ApiProperty()
  taskCount!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class PaginationMetaDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class OrderListResponseDto {
  @ApiProperty({ type: [OrderListItemDto] })
  data!: OrderListItemDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}

export class OrdersByStatusCountDto {
  @ApiProperty({ enum: OrderStatus })
  status!: OrderStatus;

  @ApiProperty()
  count!: number;
}

export class CurrencyTotalsDto {
  @ApiProperty()
  currency!: string;

  @ApiProperty({ description: "Bekor qilinmagan buyurtmalar narxi yig‘indisi" })
  revenue!: number;

  @ApiProperty({ description: "Shu valyutadagi xarajatlar" })
  expenses!: number;

  @ApiProperty()
  profit!: number;
}

export class OrderDashboardResponseDto {
  @ApiProperty({ type: [OrdersByStatusCountDto] })
  ordersByStatus!: OrdersByStatusCountDto[];

  @ApiProperty({ type: [CurrencyTotalsDto] })
  totalsByCurrency!: CurrencyTotalsDto[];

  @ApiProperty({
    description:
      "Faol buyurtmalar (DELIVERED va CANCELLED dan tashqari, o‘chirilmagan)",
  })
  activeOrders!: number;

  @ApiProperty({
    description: "Muddati o‘tgan, hali yakunlanmagan buyurtmalar",
  })
  overdueOrders!: number;

  @ApiProperty()
  totalOrders!: number;
}

export class OrderAnalyticsBucketDto {
  @ApiProperty({
    description: "Interval kaliti (masalan kun yoki hafta boshlanishi)",
  })
  period!: string;

  @ApiProperty()
  ordersCreated!: number;

  @ApiProperty({
    description: "Yaratilgan buyurtmalar bo‘yicha totalPrice yig‘indisi",
  })
  revenue!: number;

  @ApiProperty({
    description: "incurred_on oralig‘idagi xarajatlar (buyurtmaga bog‘langan)",
  })
  expenses!: number;
}

export class OrderAnalyticsResponseDto {
  @ApiProperty()
  from!: string;

  @ApiProperty()
  to!: string;

  @ApiProperty({ enum: ["day", "week", "month"] })
  bucket!: "day" | "week" | "month";

  @ApiProperty({ type: [OrderAnalyticsBucketDto] })
  series!: OrderAnalyticsBucketDto[];
}
