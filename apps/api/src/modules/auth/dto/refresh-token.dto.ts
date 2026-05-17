import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class RefreshTokenDto {
  @ApiProperty({
    description:
      "UZ: POST /autentifikatsiya/kirish javobidagi yangilanish jetoni. EN: Refresh token from the login response.",
  })
  @IsString({
    message: "Jeton matn bo‘lishi kerak / Token must be a string",
  })
  @MinLength(32, {
    message: "Jeton formati yaroqsiz / Invalid token format",
  })
  refreshToken!: string;
}
