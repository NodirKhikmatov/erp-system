import { ApiProperty } from "@nestjs/swagger";

export class TelegramLinkCodeResponseDto {
  @ApiProperty({ description: "Botda: /start <code>" })
  code!: string;

  @ApiProperty({ description: "ISO-8601 vaqt" })
  expiresAt!: string;
}
