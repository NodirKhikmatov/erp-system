import { ApiPropertyOptional } from "@nestjs/swagger";
import { TaskStatus } from "@prisma/client";
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from "class-validator";

export class UpdateTaskDto {
  @ApiPropertyOptional({
    nullable: true,
    description: "null — biriktirishni olib tashlash",
  })
  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsUUID()
  workerId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({
    nullable: true,
    description: "null — startedAt tozalash",
  })
  @IsOptional()
  @ValidateIf((_, v) => v != null && v !== "")
  @IsDateString()
  startDate?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: "null — dueDate tozalash",
  })
  @IsOptional()
  @ValidateIf((_, v) => v != null && v !== "")
  @IsDateString()
  endDate?: string | null;

  @ApiPropertyOptional({ enum: TaskStatus })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;
}
