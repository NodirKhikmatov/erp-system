import { ApiProperty } from "@nestjs/swagger";
import { OrderStatus } from "@prisma/client";

export class DashboardPeriodDto {
  @ApiProperty({ nullable: true })
  from!: string | null;

  @ApiProperty({ nullable: true })
  to!: string | null;
}

export class DashboardFinancialPrimaryDto {
  @ApiProperty()
  currency!: string;

  @ApiProperty({
    description: "buyurtmalar totalPrice yig‘indisi (bekor qarzdan tashqari)",
  })
  revenue!: number;

  @ApiProperty({ description: "buyurtmaga bog‘langan xarajatlar" })
  expenses!: number;

  @ApiProperty()
  profit!: number;
}

export class DashboardFinancialByCurrencyDto {
  @ApiProperty()
  currency!: string;

  @ApiProperty()
  revenue!: number;

  @ApiProperty()
  expenses!: number;

  @ApiProperty()
  profit!: number;
}

export class OrderStatusCountDto {
  @ApiProperty({ enum: OrderStatus })
  status!: OrderStatus;

  @ApiProperty()
  count!: number;
}

export class DashboardOrdersSummaryDto {
  @ApiProperty({
    description: "DELIVERED va CANCELLED dan tashqari, o‘chirilmagan",
  })
  active!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty({ type: [OrderStatusCountDto] })
  byStatus!: OrderStatusCountDto[];
}

export class DashboardTasksSummaryDto {
  @ApiProperty({ description: "status=DONE, completedAt / filter" })
  completed!: number;
}

export class WorkerPerformanceItemDto {
  @ApiProperty()
  workerId!: string;

  @ApiProperty()
  fullName!: string;

  @ApiProperty({
    description: "Oraliqda bajarilgan vazifalar (completedAt)",
  })
  tasksCompletedInPeriod!: number;

  @ApiProperty({
    description: "Hozir PENDING+WORKING (biriktirilgan)",
  })
  openTasks!: number;

  @ApiProperty({
    description:
      "0–100: tasksCompletedInPeriod / (tasksCompletedInPeriod + openTasks)",
  })
  completionRatePercent!: number;
}

export class DashboardAnalyticsResponseDto {
  @ApiProperty({ type: DashboardPeriodDto })
  period!: DashboardPeriodDto;

  @ApiProperty({ type: [DashboardFinancialByCurrencyDto] })
  totalsByCurrency!: DashboardFinancialByCurrencyDto[];

  @ApiProperty({ type: DashboardFinancialPrimaryDto })
  primary!: DashboardFinancialPrimaryDto;

  @ApiProperty({ type: DashboardOrdersSummaryDto })
  orders!: DashboardOrdersSummaryDto;

  @ApiProperty({ type: DashboardTasksSummaryDto })
  tasks!: DashboardTasksSummaryDto;

  @ApiProperty({ type: [WorkerPerformanceItemDto] })
  workerPerformance!: WorkerPerformanceItemDto[];
}
