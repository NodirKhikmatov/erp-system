import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, MinLength } from "class-validator";

import { EMAIL_VALIDATION_OPTIONS } from "./email-validation";

export class LoginDto {
  @ApiProperty({
    example: "admin@mebel-erp.local",
    description: "UZ: Elektron pochta. EN: Email.",
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
}
