import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export class CreateWorkerDto {
  @ApiProperty({ example: "worker@mebel-erp.local" })
  @IsEmail()
  email!: string;

  @ApiProperty({ format: "password", minLength: 8 })
  @IsString()
  @MinLength(8, {
    message:
      "Parol kamida 8 ta belgidan iborat bo‘lishi kerak / Password must be at least 8 characters",
  })
  password!: string;

  @ApiProperty({ example: "Ali Valiyev", description: "To‘liq ism" })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  fullName!: string;

  @ApiPropertyOptional({ example: "+998901112233" })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @ApiPropertyOptional({
    description: "Oylik (UZS, ixtiyoriy)",
    example: 5_000_000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  salary?: number;

  @ApiProperty({ enum: UserRole, default: UserRole.WORKER })
  @IsEnum(UserRole)
  role!: UserRole;
}
