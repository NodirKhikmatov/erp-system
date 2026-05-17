import { ApiPropertyOptional } from "@nestjs/swagger";
import { OrderStatus } from "@prisma/client";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
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

export class CreateOrderDto {
  @ApiPropertyOptional({ description: "Mavjud mijoz ID" })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional({
    description: "Yangi mijoz nomi (maydon to‘ldirilsa, clientId yuborilmasin)",
    example: "Karimov Aziz",
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  clientName?: string;

  @ApiPropertyOptional({ example: "Shkaf buyurtmasi" })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string;

  @ApiPropertyOptional({ description: "Umumiy narx (totalAmount)" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalPrice?: number;

  @ApiPropertyOptional({ description: "Oldindan to‘lov" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  prepayment?: number;

  @ApiPropertyOptional({ description: "Muddat (dueDate), ISO 8601" })
  @IsOptional()
  @IsDateString()
  deadline?: string;

  @ApiPropertyOptional({ enum: OrderStatus, default: OrderStatus.NEW })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({ default: "UZS" })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string;

  @ApiPropertyOptional({
    description: "Namuna rasmlar URL-lari",
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(2048, { each: true })
  referenceImages?: string[];
}
