import { ApiPropertyOptional } from "@nestjs/swagger";
import { OrderStatus } from "@prisma/client";
import { Transform, Type } from "class-transformer";
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from "class-validator";

function toStatusArray(value: unknown): string[] | undefined {
  if (value === undefined || value === "") {
    return undefined;
  }
  let raw: string[];
  if (Array.isArray(value)) {
    raw = value.flatMap((v) => {
      if (typeof v === "string") {
        return v.split(",");
      }
      if (typeof v === "number") {
        return [String(v)];
      }
      return [];
    });
  } else if (typeof value === "string") {
    raw = value.split(",");
  } else {
    return undefined;
  }
  const parts = raw.map((s) => s.trim()).filter(Boolean);
  if (!parts.length) {
    return undefined;
  }
  return parts;
}

export class ListOrdersQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: "Bir yoki bir nechta status (vergul bilan)",
    isArray: true,
    enum: OrderStatus,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => toStatusArray(value))
  @IsArray()
  @IsEnum(OrderStatus, { each: true })
  statuses?: OrderStatus[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional({ description: "Sarlavha / tavsif bo‘yicha qidiruv" })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  createdFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  createdTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  deadlineFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  deadlineTo?: string;

  @ApiPropertyOptional({
    enum: ["createdAt", "deadline", "totalPrice", "status", "title"],
  })
  @IsOptional()
  @IsIn(["createdAt", "deadline", "totalPrice", "status", "title"])
  sortBy?: "createdAt" | "deadline" | "totalPrice" | "status" | "title";

  @ApiPropertyOptional({ enum: ["asc", "desc"] })
  @IsOptional()
  @IsIn(["asc", "desc"])
  sortOrder?: "asc" | "desc";
}
