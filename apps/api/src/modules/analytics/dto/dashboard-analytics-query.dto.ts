import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsOptional, IsString, MaxLength } from "class-validator";

export class DashboardAnalyticsQueryDto {
  @ApiPropertyOptional({
    description:
      "ISO 8601: daromad (buyurtma createdAt), xarajat (incurredOn), bajarilgan vazifalar (completedAt) filtri",
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: "ISO 8601 tugash" })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({
    description: "Asosiy valyuta (primary jamlanma), default UZS",
    default: "UZS",
  })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  currency?: string;
}
