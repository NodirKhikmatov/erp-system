import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ExpenseCategory } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export class CreateExpenseDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  orderId!: string;

  @ApiProperty({ example: "MDF plitalar" })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title!: string;

  @ApiProperty({ minimum: 0.01 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiProperty({ enum: ExpenseCategory })
  @IsEnum(ExpenseCategory)
  category!: ExpenseCategory;

  @ApiPropertyOptional({ description: "Qaydlar / izoh" })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  notes?: string;

  @ApiPropertyOptional({ default: "UZS" })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string;

  @ApiPropertyOptional({
    description: "ISO sana (xarajat sanasi), default: bugun",
  })
  @IsOptional()
  @IsDateString()
  incurredOn?: string;
}
