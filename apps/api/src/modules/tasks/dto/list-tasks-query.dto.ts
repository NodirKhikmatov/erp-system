import { ApiPropertyOptional } from "@nestjs/swagger";
import { TaskStatus } from "@prisma/client";
import { Transform, Type } from "class-transformer";
import {
  IsArray,
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

export class ListTasksQueryDto {
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  orderId?: string;

  @ApiPropertyOptional({ description: "Ishchi ID (assigneeId)" })
  @IsOptional()
  @IsUUID()
  workerId?: string;

  @ApiPropertyOptional({ isArray: true, enum: TaskStatus })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => toStatusArray(value))
  @IsArray()
  @IsEnum(TaskStatus, { each: true })
  statuses?: TaskStatus[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({
    enum: ["createdAt", "dueDate", "status", "title", "sortOrder"],
  })
  @IsOptional()
  @IsIn(["createdAt", "dueDate", "status", "title", "sortOrder"])
  sortBy?: "createdAt" | "dueDate" | "status" | "title" | "sortOrder";

  @ApiPropertyOptional({ enum: ["asc", "desc"] })
  @IsOptional()
  @IsIn(["asc", "desc"])
  sortOrder?: "asc" | "desc";
}

export class ListMyTasksQueryDto {
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

  @ApiPropertyOptional({ enum: TaskStatus })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  orderId?: string;
}
