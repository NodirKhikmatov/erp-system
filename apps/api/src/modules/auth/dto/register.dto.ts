import { ApiProperty } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { Transform } from "class-transformer";
import {
  IsEmail,
  IsEnum,
  IsIn,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

import { EMAIL_VALIDATION_OPTIONS } from "./email-validation";

export class RegisterDto {
  @ApiProperty({
    example: "Ali Valiyev",
    description: "UZ: To‘liq ism. EN: Full display name.",
  })
  @IsString({
    message: "To‘liq ism matn bo‘lishi kerak / Full name must be a string",
  })
  @MinLength(1, {
    message: "To‘liq ism majburiy / Full name is required",
  })
  @MaxLength(200, {
    message:
      "To‘liq ism juda uzun (200 belgi) / Full name is too long (200 chars)",
  })
  fullname!: string;

  @ApiProperty({
    example: "worker@mebel-erp.local",
    description: "UZ: Elektron pochta (noyob). EN: Email (unique).",
  })
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value === "string") {
      return value.trim().toLowerCase();
    }
    return "";
  })
  @IsEmail(EMAIL_VALIDATION_OPTIONS, {
    message: "Elektron pochta manzili noto‘g‘ri / Invalid email address",
  })
  email!: string;

  @ApiProperty({
    format: "password",
    minLength: 6,
    description: "UZ: Parol (kamida 6 belgi). EN: Password (min 6 characters).",
  })
  @IsString({
    message: "Parol matn bo‘lishi kerak / Password must be a string",
  })
  @MinLength(6, {
    message:
      "Parol kamida 6 ta belgidan iborat bo‘lishi kerak / Password must be at least 6 characters",
  })
  password!: string;

  @ApiProperty({
    enum: [UserRole.WORKER, UserRole.MANAGER],
    enumName: "UserRolePublicRegister",
    description:
      "UZ: Ochiq ro‘yxatdan o‘tish — faqat WORKER yoki MANAGER. EN: Public signup — WORKER or MANAGER only.",
  })
  @IsEnum(UserRole, {
    message: "Rol noto‘g‘ri / Invalid role",
  })
  @IsIn([UserRole.WORKER, UserRole.MANAGER], {
    message:
      "Ochiq ro‘yxatdan o‘tishda faqat ishchi yoki menejer roli mumkin / Only WORKER or MANAGER can self-register",
  })
  role!: UserRole;
}
