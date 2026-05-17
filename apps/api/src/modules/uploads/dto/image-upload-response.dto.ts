import { ApiProperty } from "@nestjs/swagger";

export class ImageUploadResponseDto {
  @ApiProperty()
  url!: string;

  @ApiProperty({
    description: "HTTPS yoki boshqa umumiy rasm havolasi (mahalliy server)",
  })
  secureUrl!: string;

  @ApiProperty({
    description:
      "Yuklangan fayl nomi (UUID+kengaytma); DELETE so‘rovida shu qiymat",
  })
  publicId!: string;

  @ApiProperty()
  width!: number;

  @ApiProperty()
  height!: number;

  @ApiProperty()
  format!: string;

  @ApiProperty()
  bytes!: number;
}
