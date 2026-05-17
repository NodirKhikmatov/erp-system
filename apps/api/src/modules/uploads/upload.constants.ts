/**
 * Ruxsat etilgan surat MIME turlari (brauzer/OS farqlari uchun kengaytirilgan).
 * `image/jpg`, `image/pjpeg`, HEIC, AVIF va hokazo.
 */
export const ALLOWED_IMAGE_MIME_REGEX =
  /^image\/(pjpeg|jpe?g|png|webp|gif|heic|heif|avif|bmp|tif|tiff)$/i;

const APPLICATION_OCTET_STREAM = /^application\/octet-stream$/i;

/** Baʼzi qurilmalar faylni `application/octet-stream` bilan va kengaytma bilan yuboradi. */
export const FALLBACK_ALLOWED_IMAGE_EXT_REGEX =
  /\.(jpe?g|png|gif|webp|heic|heif|avif|bmp|tiff?)$/i;

export function isMultipartImageAllowed(file: {
  mimetype: string;
  originalname?: string;
}): boolean {
  const mime = file.mimetype.trim();
  if (ALLOWED_IMAGE_MIME_REGEX.test(mime)) {
    return true;
  }
  if (
    APPLICATION_OCTET_STREAM.test(mime) &&
    FALLBACK_ALLOWED_IMAGE_EXT_REGEX.test(file.originalname ?? "")
  ) {
    return true;
  }
  return false;
}

/** Multer maydon nomi. */
export const IMAGE_UPLOAD_FIELD = "file";
