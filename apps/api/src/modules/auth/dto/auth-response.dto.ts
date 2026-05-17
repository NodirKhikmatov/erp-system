import { ApiProperty } from "@nestjs/swagger";
import type { UserRole } from "@prisma/client";

export class CurrentUserResponseDto {
  @ApiProperty({ format: "uuid", description: "Foydalanuvchi identifikatori" })
  id!: string;

  @ApiProperty({ description: "Elektron pochta manzili" })
  email!: string;

  @ApiProperty({
    enum: ["ADMIN", "MANAGER", "WORKER"],
    description:
      "Rol: ADMIN — bosh administrator, MANAGER — menejer, WORKER — ishchi",
  })
  role!: UserRole;

  @ApiProperty({ description: "Ko‘rinadigan ism" })
  displayName!: string;

  @ApiProperty({
    required: false,
    description: "Telefon raqami (bo‘sh bo‘lishi mumkin)",
  })
  phone!: string | null;
}

export class TokenPairResponseDto {
  @ApiProperty({
    description:
      "Qisqa muddatli kirish jetoni (`Authorization` sarlavhasida: Bearer …)",
  })
  accessToken!: string;

  @ApiProperty({
    description:
      "Yangilanish jetoni — POST /autentifikatsiya/jeton-yangilash yoki POST /autentifikatsiya/chiqish ga yuboriladi",
  })
  refreshToken!: string;

  @ApiProperty({
    description: "Kirish jetonining amal qilish muddati (soniyada)",
  })
  expiresIn!: number;
}
