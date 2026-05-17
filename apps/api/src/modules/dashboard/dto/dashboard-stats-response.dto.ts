import { ApiProperty } from "@nestjs/swagger";

export class DashboardStatsResponseDto {
  @ApiProperty()
  revenue!: number;

  @ApiProperty()
  expenses!: number;

  @ApiProperty()
  profit!: number;

  @ApiProperty({ description: "NEW / IN_PROGRESS / READY buyurtmalar" })
  activeOrders!: number;

  @ApiProperty()
  currency!: string;
}
