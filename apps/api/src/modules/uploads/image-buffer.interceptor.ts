import {
  BadRequestException,
  Injectable,
  PayloadTooLargeException,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request, Response } from "express";
import multer, { type MulterError } from "multer";
import { Observable } from "rxjs";

import type { Env } from "../../config/env";
import { t } from "../../i18n/messages";
import { getRequestLocale } from "../../i18n/request-locale.storage";
import {
  IMAGE_UPLOAD_FIELD,
  isMultipartImageAllowed,
} from "./upload.constants";

type MulterFileFilterCb = (error: Error | null, acceptFile?: boolean) => void;

const memory = multer.memoryStorage();

function isMulterLimitError(err: unknown): err is MulterError {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as MulterError).code === "LIMIT_FILE_SIZE"
  );
}

@Injectable()
export class ImageBufferInterceptor implements NestInterceptor {
  private readonly upload: multer.Multer;

  constructor(config: ConfigService<Env, true>) {
    const maxBytes = config.get("UPLOAD_MAX_IMAGE_BYTES", { infer: true });
    this.upload = multer({
      storage: memory,
      limits: { fileSize: maxBytes, files: 1 },
      fileFilter: (_req, file, cb) => {
        const lang = getRequestLocale();
        const done = cb as MulterFileFilterCb;
        if (!isMultipartImageAllowed(file)) {
          done(new BadRequestException(t(lang, "upload.invalidType")), false);
          return;
        }
        done(null, true);
      },
    });
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    return new Observable((observer) => {
      this.upload.single(IMAGE_UPLOAD_FIELD)(req, res, (err: unknown) => {
        if (err) {
          if (isMulterLimitError(err)) {
            observer.error(
              new PayloadTooLargeException(
                t(getRequestLocale(), "upload.tooLarge"),
              ),
            );
            return;
          }
          observer.error(err);
          return;
        }
        next.handle().subscribe({
          next: (v) => {
            observer.next(v);
          },
          error: (e) => {
            observer.error(e);
          },
          complete: () => {
            observer.complete();
          },
        });
      });
    });
  }
}
