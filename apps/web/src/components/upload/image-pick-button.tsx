"use client";

import { Button, cn } from "@furniture/ui";
import { Upload } from "lucide-react";
import type { ChangeEvent, DragEvent } from "react";
import { useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  IMAGE_FILE_ACCEPT,
  IMAGE_UPLOAD_HARD_BATCH_LIMIT,
  filterLikelyImageFiles,
  isLikelyImageFile,
  uploadImageFile,
} from "@/lib/upload-image-client";

/**
 * `<input type="file">` dagi jonli {@link FileList}: `value` tozalansa yoki `await` ketidan fayllar
 * yoʻqolib ketishi mumkin — darhol qoʻllanmani massiv koʻrinishiga olamiz (WebKit asosidagi brauzerlar).
 */
function snapshotFileList(files: FileList | null): File[] {
  return files?.length ? [...files] : [];
}

/** `consumeFileBatch` uchun so‘zdagi matn ishlab chiqaruvchilari (`next-intl` kalitlari aniq yoziladi). */
type ImageUploadNotices = {
  success: () => string;
  successMany: (count: number) => string;
  failed: () => string;
  filteredNonImages: (count: number) => string;
  extraFilesIgnored: (count: number) => string;
  batchLimited: (kept: number, removed: number) => string;
  limitReached: () => string;
  truncatedToSlots: (uploaded: number, skipped: number) => string;
  partialOutcome: (ok: number, fail: number) => string;
  dropNoFiles: () => string;
  /** Navbatdagi yuklash tugamaguncha. */
  busyWait: () => string;
  /** Ota-komponent `disabled` (masalan, forma yuborilmoqda). */
  blockedDisabled: () => string;
  /** Fayl tanlov oynasi yopildi, hech narsa kelib tushmadi. */
  pickEmpty: () => string;
  /** Filtr/chegara tufayli yuboriladigan rasm qoldi. */
  notQueued: () => string;
};

export type ImagePickButtonProps = {
  onUploaded: (secureUrl: string) => void;
  disabled?: boolean;
  /** Mavjud bo‘lsa, `<input>` ga beriladi (`htmlFor` bilan bog‘lash mumkin). */
  id?: string;
  /** Brauzerda bir nechta fayl tanlash. */
  multiple?: boolean;
  /** Surilib tashlash paneli va izoh — `false` bo‘lsa faqat tugma. */
  showDropZone?: boolean;
  /**
   * Qolgan qoʻshilish slotlari (namuna rasmlar, hub qo‘shimchalari).
   * `0` da yangi yuklash boshlanmaydi.
   */
  remainingSlots?: number;
  className?: string;
};

async function consumeFileBatch(opts: {
  files: Iterable<File>;
  multiple: boolean;
  remainingSlots: number | undefined;
  notices: ImageUploadNotices;
  clearInput: () => void;
  onUploaded: (url: string) => void;
}): Promise<void> {
  const { files, multiple, remainingSlots, notices, clearInput, onUploaded } =
    opts;

  clearInput();

  let raw = [...files];

  let ignoredExtraSelectionCount = 0;
  if (!multiple && raw.length > 1) {
    ignoredExtraSelectionCount = raw.length - 1;
    raw = raw.slice(0, 1);
  }

  if (ignoredExtraSelectionCount > 0) {
    toast.warning(notices.extraFilesIgnored(ignoredExtraSelectionCount));
  }

  const nonImageOnlyDropped = raw.filter((f) => !isLikelyImageFile(f)).length;

  const imageFiles = filterLikelyImageFiles(raw);

  if (nonImageOnlyDropped > 0) {
    toast.warning(notices.filteredNonImages(nonImageOnlyDropped));
  }

  if (!imageFiles.length) {
    if (!raw.length) {
      toast.info(notices.dropNoFiles());
    }
    return;
  }

  if (remainingSlots !== undefined && remainingSlots <= 0) {
    toast.warning(notices.limitReached());
    return;
  }

  let toUpload =
    typeof remainingSlots === "number"
      ? imageFiles.slice(0, Math.max(0, remainingSlots))
      : [...imageFiles];

  if (
    typeof remainingSlots === "number" &&
    remainingSlots >= 1 &&
    imageFiles.length > remainingSlots
  ) {
    toast.warning(
      notices.truncatedToSlots(
        remainingSlots,
        imageFiles.length - remainingSlots,
      ),
    );
  }

  if (toUpload.length > IMAGE_UPLOAD_HARD_BATCH_LIMIT) {
    const removed = toUpload.length - IMAGE_UPLOAD_HARD_BATCH_LIMIT;
    toUpload = toUpload.slice(0, IMAGE_UPLOAD_HARD_BATCH_LIMIT);
    toast.warning(notices.batchLimited(IMAGE_UPLOAD_HARD_BATCH_LIMIT, removed));
  }

  if (!toUpload.length) {
    toast.info(notices.notQueued());
    return;
  }

  let okCount = 0;
  let failCount = 0;
  let firstErrorDetail: string | null = null;

  for (const file of toUpload) {
    try {
      const r = await uploadImageFile(file);
      const href = r.secureUrl.trim() ? r.secureUrl : r.url;
      onUploaded(href);
      okCount++;
    } catch (err) {
      failCount++;
      if (failCount === 1) {
        firstErrorDetail =
          err instanceof Error && err.message.trim()
            ? err.message.trim().slice(0, 380)
            : null;
      }
    }
  }

  if (failCount === 0) {
    if (okCount === 1) {
      toast.success(notices.success());
    } else {
      toast.success(notices.successMany(okCount));
    }
    return;
  }

  if (okCount === 0) {
    toast.error(firstErrorDetail ?? notices.failed());
    return;
  }

  toast.warning(
    `${notices.partialOutcome(okCount, failCount)}${firstErrorDetail ? `\n(${firstErrorDetail})` : ""}`,
  );
}

export function ImagePickButton({
  onUploaded,
  disabled,
  id,
  multiple = true,
  showDropZone = true,
  remainingSlots,
  className,
}: ImagePickButtonProps) {
  const tCommon = useTranslations("common");

  const notices: ImageUploadNotices = useMemo(
    () => ({
      success: () => tCommon("upload.success"),
      successMany: (count: number) => tCommon("upload.successMany", { count }),
      failed: () => tCommon("upload.failed"),
      filteredNonImages: (count: number) =>
        tCommon("upload.filteredNonImages", { count }),
      extraFilesIgnored: (count: number) =>
        tCommon("upload.extraFilesIgnored", { count }),
      batchLimited: (kept: number, removed: number) =>
        tCommon("upload.batchLimited", { kept, removed }),
      limitReached: () => tCommon("upload.limitReached"),
      truncatedToSlots: (uploaded: number, skipped: number) =>
        tCommon("upload.truncatedToSlots", { uploaded, skipped }),
      partialOutcome: (ok: number, fail: number) =>
        tCommon("upload.partialOutcome", { ok, fail }),
      dropNoFiles: () => tCommon("upload.dropNoFiles"),
      busyWait: () => tCommon("upload.busyWait"),
      blockedDisabled: () => tCommon("upload.blockedDisabled"),
      pickEmpty: () => tCommon("upload.pickEmpty"),
      notQueued: () => tCommon("upload.notQueued"),
    }),
    [tCommon],
  );

  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  /** `dragenter/dragleave` bolalar uchun tebranish kamaytirish. */
  const dragDepthRef = useRef(0);

  const slotsBlocked =
    typeof remainingSlots === "number" && remainingSlots <= 0;
  const busyOrParentDisabled = !!(disabled || busy);
  /** Slot tugaganda ochiladigan fayldan bloklanadi, lekin tugma ustida limit haqida xabar beriladi. */
  const inputDisabled = busyOrParentDisabled || slotsBlocked;

  const resetInputValue = () => {
    const el = inputRef.current;
    if (el) {
      el.value = "";
    }
  };

  const runUploadPipeline = async (picked: Iterable<File>) => {
    if (busy) {
      toast.info(notices.busyWait());
      return;
    }
    if (disabled) {
      toast.info(notices.blockedDisabled());
      return;
    }
    if (slotsBlocked) {
      toast.warning(notices.limitReached());
      return;
    }
    setBusy(true);
    try {
      await consumeFileBatch({
        files: picked,
        multiple,
        remainingSlots,
        notices,
        clearInput: resetInputValue,
        onUploaded,
      });
    } finally {
      setBusy(false);
    }
  };

  const onChangeInput = async (e: ChangeEvent<HTMLInputElement>) => {
    const snapshot = snapshotFileList(e.target.files);
    if (!snapshot.length) {
      toast.info(notices.pickEmpty());
      return;
    }
    e.target.value = "";
    await runUploadPipeline(snapshot);
  };

  const onDragEnter = (e: DragEvent) => {
    if (busyOrParentDisabled || slotsBlocked) {
      return;
    }
    e.preventDefault();
    dragDepthRef.current += 1;
    setDragging(true);
  };

  const onDragLeave = () => {
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setDragging(false);
    }
  };

  const onDragOver = (e: DragEvent) => {
    if (busyOrParentDisabled || slotsBlocked) {
      return;
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const onDrop = async (e: DragEvent) => {
    e.preventDefault();
    dragDepthRef.current = 0;
    setDragging(false);
    if (busy) {
      toast.info(notices.busyWait());
      return;
    }
    if (slotsBlocked) {
      toast.warning(notices.limitReached());
      return;
    }
    if (disabled) {
      toast.info(notices.blockedDisabled());
      return;
    }
    const dropped = e.dataTransfer.files;
    if (!dropped?.length) {
      toast.info(notices.dropNoFiles());
      return;
    }
    await runUploadPipeline([...dropped]);
  };

  const innerControls = (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <input
        {...(id ? { id } : {})}
        ref={inputRef}
        type="file"
        multiple={multiple}
        accept={IMAGE_FILE_ACCEPT}
        className="sr-only"
        disabled={inputDisabled}
        tabIndex={-1}
        onChange={(e) => void onChangeInput(e)}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1"
        aria-busy={busy}
        disabled={busyOrParentDisabled}
        onClick={() => {
          if (slotsBlocked) {
            toast.warning(notices.limitReached());
            return;
          }
          inputRef.current?.click();
        }}
      >
        <Upload className="size-4 shrink-0" aria-hidden />
        {busy ? tCommon("upload.uploading") : tCommon("upload.pickImage")}
      </Button>
      <span className="text-muted-foreground text-xs">
        {tCommon("upload.typesHint")}
      </span>
    </div>
  );

  const dropHint = tCommon("upload.dragDropHint");

  if (!showDropZone) {
    return (
      <div
        className={cn("inline-flex flex-wrap items-center gap-2", className)}
      >
        {innerControls}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-dashed px-4 py-3 transition-colors sm:px-3 sm:py-2.5",
        dragging
          ? "border-primary bg-muted/40"
          : "border-muted-foreground/25 bg-muted/10",
        busyOrParentDisabled
          ? "pointer-events-none opacity-60"
          : slotsBlocked
            ? "opacity-[0.92]"
            : "opacity-100",
        className,
      )}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={(e) => void onDrop(e)}
    >
      {innerControls}
      <p className="text-muted-foreground mt-2 text-[11px] leading-snug sm:text-xs">
        {dropHint}
      </p>
    </div>
  );
}
