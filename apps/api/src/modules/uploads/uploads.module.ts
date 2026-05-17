import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { ImageBufferInterceptor } from "./image-buffer.interceptor";
import { LocalImageStorageService } from "./local-image-storage.service";
import { UploadsController } from "./uploads.controller";
import { UploadsPublicController } from "./uploads-public.controller";
import { UploadsService } from "./uploads.service";

@Module({
  imports: [AuthModule],
  controllers: [UploadsController, UploadsPublicController],
  providers: [LocalImageStorageService, UploadsService, ImageBufferInterceptor],
  exports: [LocalImageStorageService, UploadsService],
})
export class UploadsModule {}
