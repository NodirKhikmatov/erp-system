import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsIn, IsOptional } from "class-validator";

export class OrderAnalyticsQueryDto {
  @ApiPropertyOptional({ description: "ISO 8601 boshlanishi" })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: "ISO 8601 tugashi" })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ enum: ["day", "week", "month"], default: "day" })
  @IsOptional()
  @IsIn(["day", "week", "month"])
  bucket?: "day" | "week" | "month";
}
