import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Express } from "express";

import type { Env } from "../../config/env";
import { t } from "../../i18n/messages";
import { getRequestLocale } from "../../i18n/request-locale.storage";
import {
  LocalImageStorageService,
  type StoredImageResult,
} from "./local-image-storage.service";

function uploadDiag(err: unknown): string | undefined {
  if (err instanceof Error && err.message.trim()) {
    return err.message.replace(/\s+/g, " ").trim().slice(0, 380);
  }
  if (typeof err === "object" && err !== null && "message" in err) {
    const candidate = Reflect.get(err, "message");
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.replace(/\s+/g, " ").trim().slice(0, 380);
    }
  }
  return undefined;
}

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);

  constructor(
    private readonly storage: LocalImageStorageService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async uploadImage(
    file: Express.Multer.File | undefined,
  ): Promise<StoredImageResult> {
    const lang = getRequestLocale();
    if (!file?.buffer.length) {
      throw new BadRequestException(t(lang, "upload.fileRequired"));
    }

    try {
      return await this.storage.saveUploadedBuffer(file.buffer, file.mimetype);
    } catch (e) {
      if (
        e instanceof Error &&
        (e.message === "unknown_image_extension" ||
          e.message === "empty_image_buffer")
      ) {
        throw new BadRequestException(
          e.message === "empty_image_buffer"
            ? t(lang, "upload.fileRequired")
            : t(lang, "upload.invalidType"),
        );
      }

      const diag = uploadDiag(e);
      this.logger.warn(
        diag
          ? `Rasm yozish/yuklash muvaffaqiyatsiz: ${diag}`
          : `Rasm yuklash muvaffaqiyatsiz: ${e instanceof Error ? (e.stack ?? e.message) : String(e)}`,
      );

      const base = t(lang, "upload.storageFailed");
      const prod =
        this.config.get("NODE_ENV", { infer: true }) === "production";

      throw new BadRequestException(prod || !diag ? base : `${base} (${diag})`);
    }
  }

  async deleteImage(publicId: string): Promise<void> {
    const lang = getRequestLocale();
    try {
      await this.storage.deleteByPublicId(publicId);
    } catch (e) {
      if (e instanceof BadRequestException) {
        throw e;
      }
      throw new BadRequestException(t(lang, "upload.deleteFailed"));
    }
  }
}
