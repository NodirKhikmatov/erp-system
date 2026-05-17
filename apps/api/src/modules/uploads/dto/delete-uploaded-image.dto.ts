import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength, MinLength } from "class-validator";

export class DeleteUploadedImageDto {
  @ApiProperty({
    description:
      "POST /uploads/image javobidagi `publicId` (masalan `uuid.webp`)",
    example: "b3d3c4f0-2141-4734-9c5a-a2c6d7e80901.jpg",
  })
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  publicId!: string;
}
