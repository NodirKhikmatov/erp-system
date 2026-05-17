import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from "class-validator";

const MAX_EXTRA_IMAGES = 20;
const MAX_URL_LENGTH = 2048;

export class CreateDailyReportDto {
  @ApiPropertyOptional({
    description:
      "ADMIN/MANAGER: boshqa ishchi nomiga. WORKER: yuborilsa ham e’tibor berilmaydi.",
  })
  @IsOptional()
  @IsUUID()
  workerId?: string;

  @ApiPropertyOptional({ description: "Bog‘langan vazifa" })
  @IsOptional()
  @IsUUID()
  taskId?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(20000)
  message!: string;

  @ApiPropertyOptional({ description: "Asosiy rasm URL" })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_URL_LENGTH)
  photoUrl?: string;

  @ApiPropertyOptional({
    description: "Qo‘shimcha rasm URL-lari",
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_EXTRA_IMAGES)
  @IsString({ each: true })
  @MaxLength(MAX_URL_LENGTH, { each: true })
  extraImageUrls?: string[];
}
