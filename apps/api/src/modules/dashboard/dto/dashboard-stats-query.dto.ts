import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

export class DashboardStatsQueryDto {
  @ApiPropertyOptional({ default: "UZS" })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string;
}
