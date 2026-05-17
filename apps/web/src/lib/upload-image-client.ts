import { getBrowserApiPrefix } from "@/lib/api-base";
import { readApiErrorMessage } from "@/lib/read-api-error-message";

/** `POST /uploads/image` multipart maydon nomi (API bilan mos). */
export const IMAGE_UPLOAD_FIELD = "file";

/** Brauzer `accept` bilan bir xil MIME/kengaytma ro‘yxati. */
export const IMAGE_FILE_ACCEPT =
  "image/jpeg,image/jpg,image/pjpeg,image/png,image/webp,image/gif,image/heic,image/heif,image/avif,image/bmp,image/tif,image/tiff,.jpg,.jpeg,.png,.webp,.gif,.heic,.heif,.avif,.bmp,.tif,.tiff";

/** Bir so‘rovda yuborilishiga chek (tasodifiy 100 ta fayl). */
export const IMAGE_UPLOAD_HARD_BATCH_LIMIT = 50;

const FALLBACK_IMG_EXT = /\.(jpe?g|png|gif|webp|heic|heif|avif|bmp|tiff?)$/i;

/** Bitta faylni MIME yoki nom kengaytmasi bo‘yicha rasmga o‘xshash deb aniqlash. */
export function isLikelyImageFile(file: File): boolean {
  const t = file.type.trim().toLowerCase();
  if (t.startsWith("image/")) {
    return true;
  }
  return FALLBACK_IMG_EXT.test(file.name);
}

/** Drag–drop va `multiple` uchun rasmdek fayllarni ajratadi. */
export function filterLikelyImageFiles(files: Iterable<File>): File[] {
  return [...files].filter(isLikelyImageFile);
}

export type ImageUploadResult = {
  url: string;
  secureUrl: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
};

export async function uploadImageFile(file: File): Promise<ImageUploadResult> {
  const fd = new FormData();
  fd.append(IMAGE_UPLOAD_FIELD, file);

  const res = await fetch(`${getBrowserApiPrefix()}/uploads/image`, {
    method: "POST",
    body: fd,
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(await readApiErrorMessage(res));
  }

  return (await res.json()) as ImageUploadResult;
}
