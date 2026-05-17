import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { imageSize } from "image-size";
import { randomUUID } from "node:crypto";
import { existsSync, promises as fs } from "node:fs";
import { basename, isAbsolute, join, resolve, sep } from "node:path";

import type { Env } from "../../config/env";

export interface StoredImageResult {
  url: string;
  secureUrl: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

const STORED_FILENAME_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.[a-z0-9]{2,5}$/i;

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/pjpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/avif": "avif",
  "image/bmp": "bmp",
  "image/tif": "tif",
  "image/tiff": "tiff",
};

const SIZE_TYPE_TO_EXT: Record<string, string> = {
  jpg: "jpg",
  jpeg: "jpg",
  png: "png",
  gif: "gif",
  webp: "webp",
  bmp: "bmp",
  tiff: "tiff",
  cur: "cur",
  psd: "psd",
  svg: "svg",
};

function sniffFormatExt(buffer: Buffer): string | undefined {
  const b = buffer;
  const n = b.length;
  if (n >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    return "jpg";
  }
  if (
    n >= 8 &&
    b[0] === 0x89 &&
    b[1] === 0x50 &&
    b[2] === 0x4e &&
    b[3] === 0x47 &&
    b[4] === 0x0d &&
    b[5] === 0x0a &&
    b[6] === 0x1a &&
    b[7] === 0x0a
  ) {
    return "png";
  }
  if (n >= 6) {
    const sig = b.subarray(0, 6).toString("ascii");
    if (sig === "GIF87a" || sig === "GIF89a") {
      return "gif";
    }
  }
  if (
    n >= 12 &&
    b.subarray(0, 4).toString("ascii") === "RIFF" &&
    b.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "webp";
  }
  if (n >= 2 && b[0] === 0x42 && b[1] === 0x4d) {
    return "bmp";
  }
  if (
    n >= 2 &&
    ((b[0] === 0x49 && b[1] === 0x49) || (b[0] === 0x4d && b[1] === 0x4d))
  ) {
    return "tiff";
  }
  if (n >= 12 && b.subarray(4, 8).toString("ascii") === "ftyp") {
    const brand = b.subarray(8, 12).toString("ascii").toLowerCase();
    if (
      brand.startsWith("heic") ||
      brand.startsWith("heix") ||
      brand === "heif" ||
      brand === "mif1" ||
      brand === "msf1"
    ) {
      return "heic";
    }
    if (brand === "avif" || brand === "avis") {
      return "avif";
    }
  }
  return undefined;
}

function pickExtension(mimetype: string, buffer: Buffer): string {
  const mime = mimetype.trim().toLowerCase();
  if (MIME_TO_EXT[mime]) {
    return MIME_TO_EXT[mime];
  }
  if (mime === "application/octet-stream" || mime.length === 0) {
    const sniffed = sniffFormatExt(buffer);
    if (sniffed) {
      return sniffed;
    }
  }
  try {
    const dim = imageSize(buffer);
    if (dim.type) {
      const mapped = SIZE_TYPE_TO_EXT[dim.type];
      if (mapped) {
        return mapped;
      }
    }
  } catch {
    //
  }
  const sniffed = sniffFormatExt(buffer);
  if (sniffed) {
    return sniffed;
  }
  throw new Error("unknown_image_extension");
}

function inferPrimaryUploadRoot(
  cwd: string,
  customRelativeOrAbsolute?: string,
): string {
  const trimmed = customRelativeOrAbsolute?.trim();
  if (trimmed) {
    return isAbsolute(trimmed) ? resolve(trimmed) : resolve(join(cwd, trimmed));
  }
  /** Turboreppo ildizi (`pnpm dev` turli ishchi kataloglarida). */
  if (existsSync(join(cwd, "apps", "api", "package.json"))) {
    return resolve(join(cwd, "apps", "api", ".local", "upload-images"));
  }
  return resolve(join(cwd, ".local", "upload-images"));
}

/** Eski yozuv boshqa papkaga tushgan bo‘lsa, GET uchun shu yerlarni ham qaraymiz. */
function buildAlternateReadRoots(cwd: string, primary: string): string[] {
  const candidates = [
    resolve(join(cwd, ".local", "upload-images")),
    resolve(join(cwd, "apps", "api", ".local", "upload-images")),
  ];
  if (basename(cwd) === "api") {
    candidates.push(resolve(join(cwd, "..", "..", ".local", "upload-images")));
  }
  const p = resolve(primary);
  return [...new Set(candidates)].filter((x) => x !== p);
}

function pathWithinParentDir(
  candidateFile: string,
  parentDir: string,
): boolean {
  const parentResolved = `${resolve(parentDir)}${sep}`;
  const fileResolved = resolve(candidateFile);
  return fileResolved.startsWith(parentResolved);
}

@Injectable()
export class LocalImageStorageService implements OnModuleInit {
  private readonly logger = new Logger(LocalImageStorageService.name);
  private rootDir!: string;
  private alternateReadRoots: string[] = [];

  constructor(private readonly config: ConfigService<Env, true>) {}

  async onModuleInit(): Promise<void> {
    const custom = this.config
      .get("LOCAL_IMAGE_UPLOAD_DIR", { infer: true })
      ?.trim();
    const cwd = process.cwd();
    this.rootDir = inferPrimaryUploadRoot(cwd, custom);
    this.alternateReadRoots = buildAlternateReadRoots(cwd, this.rootDir);

    await fs.mkdir(this.rootDir, { recursive: true });
    this.logger.log(`Mahalliy rasm papkasi (asosiy): ${this.rootDir}`);
    if (this.alternateReadRoots.length) {
      this.logger.log(
        `Qoʻshimcha o‘qish yo‘llari: ${this.alternateReadRoots.join("; ")}`,
      );
    }
  }

  private publicBaseUrl(): string {
    const explicit = this.config
      .get("PUBLIC_UPLOAD_BASE_URL", { infer: true })
      ?.trim();
    if (explicit && explicit.length > 0) {
      return explicit.replace(/\/$/, "");
    }
    const port = this.config.get("PORT", { infer: true });
    return `http://localhost:${String(port)}`;
  }

  /** Brauzer va DB ga yoziladigan URL (GET token talab etilmaydi). */
  private hrefFor(filename: string): string {
    const base = this.publicBaseUrl();
    return `${base}/uploads/public/${filename}`;
  }

  validateStoredBasename(filename: string): boolean {
    return STORED_FILENAME_RE.test(filename);
  }

  /**
   * `validateStoredBasename` true boʻlgan nom uchun diskda toʻliq yoʻlni qoʻyadi (asosiy yoki qoʻshimcha papkalarda).
   */
  findUploadedPhysicalPath(validBasename: string): string | null {
    const dirsToScan = [
      resolve(this.rootDir),
      ...this.alternateReadRoots.map((r) => resolve(r)),
    ];
    const uniqDirs = [...new Set(dirsToScan)];
    for (const dir of uniqDirs) {
      const abs = resolve(join(dir, validBasename));
      if (!pathWithinParentDir(abs, dir)) {
        continue;
      }
      if (existsSync(abs)) {
        return abs;
      }
    }
    return null;
  }

  async saveUploadedBuffer(
    buffer: Buffer,
    mimetype: string,
  ): Promise<StoredImageResult> {
    if (!buffer.length) {
      throw new Error("empty_image_buffer");
    }

    let ext: string;
    let width = 0;
    let height = 0;
    try {
      ext = pickExtension(mimetype, buffer);
      try {
        const dim = imageSize(buffer);
        if (typeof dim.width === "number") {
          width = dim.width;
        }
        if (typeof dim.height === "number") {
          height = dim.height;
        }
      } catch {
        //
      }
    } catch {
      throw new Error("unknown_image_extension");
    }

    const filename = `${randomUUID()}.${ext}`;
    const fullPath = resolve(join(this.rootDir, filename));
    await fs.writeFile(fullPath, buffer);

    const href = this.hrefFor(filename);
    return {
      url: href,
      secureUrl: href,
      publicId: filename,
      width,
      height,
      format: ext,
      bytes: buffer.length,
    };
  }

  async deleteByPublicId(
    publicId: string,
  ): Promise<{ result: "ok" | "not found" }> {
    const trimmed = publicId.trim();
    if (!trimmed.length) {
      throw new Error("publicId_empty");
    }
    if (!this.validateStoredBasename(trimmed)) {
      return { result: "not found" };
    }

    const abs = this.findUploadedPhysicalPath(trimmed);
    if (!abs) {
      return { result: "not found" };
    }

    try {
      await fs.unlink(abs);
      return { result: "ok" };
    } catch (e: unknown) {
      if (
        typeof e === "object" &&
        e !== null &&
        "code" in e &&
        (e as NodeJS.ErrnoException).code === "ENOENT"
      ) {
        return { result: "not found" };
      }
      throw e;
    }
  }
}
