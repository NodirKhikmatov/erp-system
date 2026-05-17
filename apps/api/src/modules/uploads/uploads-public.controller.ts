import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Res,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";

import { LocalImageStorageService } from "./local-image-storage.service";

/**
 * `send` moduli mutlaq yoʻlda `.local` kabi `.` bilan boshlangan segmentni dotfile deb 404 beradi.
 * Yuklagichlar `…/.local/upload-images` ostida — `dotfiles` shart. Fayl yoʻli uchun boshqa tekshiruvlar
 * (`validateStoredBasename`, `findUploadedPhysicalPath`) avval ishlaydi.
 */
const SEND_PUBLIC_IMAGE_OPTS = { dotfiles: "allow" as const };

@ApiTags("Yuklash (mahalliy)")
@Controller("uploads/public")
export class UploadsPublicController {
  constructor(private readonly storage: LocalImageStorageService) {}

  @Get(":filename")
  @ApiOperation({
    summary: "Saqlangan rasm faylini chiqarish (JWT talab qilinmaydi)",
    description:
      "Mahalliy diskdagi URL; javobidagi `secureUrl` shu yoʻl bilan ochiladi.",
  })
  serve(
    @Param("filename") filename: string,
    @Res({ passthrough: false }) res: Response,
  ): void {
    if (!this.storage.validateStoredBasename(filename)) {
      throw new BadRequestException();
    }
    const abs = this.storage.findUploadedPhysicalPath(filename);
    if (!abs) {
      throw new NotFoundException();
    }
    res.sendFile(abs, SEND_PUBLIC_IMAGE_OPTS);
  }
}
