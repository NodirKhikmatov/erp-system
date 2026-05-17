import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import type { Express } from "express";
import { UserRole } from "@prisma/client";

import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { DeleteUploadedImageDto } from "./dto/delete-uploaded-image.dto";
import { ImageUploadResponseDto } from "./dto/image-upload-response.dto";
import { ImageBufferInterceptor } from "./image-buffer.interceptor";
import { IMAGE_UPLOAD_FIELD } from "./upload.constants";
import { UploadsService } from "./uploads.service";

@ApiTags("Yuklash (mahalliy)")
@ApiBearerAuth("kirish-jetoni")
@Controller("uploads")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.WORKER)
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  @Post("image")
  @UseInterceptors(ImageBufferInterceptor)
  @ApiConsumes("multipart/form-data")
  @ApiOperation({
    summary: "Rasm yuklash (server mahalliy diskka yozadi)",
  })
  @ApiBody({
    schema: {
      type: "object",
      required: [IMAGE_UPLOAD_FIELD],
      properties: {
        [IMAGE_UPLOAD_FIELD]: {
          type: "string",
          format: "binary",
          description:
            "JPEG, PNG, WebP, GIF, HEIC, HEIF, AVIF, BMP, TIFF; baʼzi qurilmalar `application/octet-stream` + nom kengaytmasi",
        },
      },
    },
  })
  @ApiCreatedResponse({ type: ImageUploadResponseDto })
  uploadImage(@UploadedFile() file: Express.Multer.File | undefined) {
    return this.uploads.uploadImage(file);
  }

  @Delete("image")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Yuklangan rasmini publicId (fayl nomi) bo‘yicha o‘chirish",
  })
  @ApiNoContentResponse()
  async deleteImage(@Body() dto: DeleteUploadedImageDto): Promise<void> {
    await this.uploads.deleteImage(dto.publicId);
  }
}
