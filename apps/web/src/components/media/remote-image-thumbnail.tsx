"use client";

import { cn } from "@furniture/ui";
import { useState } from "react";

function isSafeHttpUrl(raw: string): boolean {
  const s = raw.trim();
  if (!s || !/^https?:\/\//i.test(s)) {
    return false;
  }
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Matn ichidagi toʻliq HTTPS/HTTP URL larni chiqaradi (takrorlarsiz). */
export function extractDisplayableImageUrls(lines: Iterable<string>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t || seen.has(t)) {
      continue;
    }
    if (!isSafeHttpUrl(t)) {
      continue;
    }
    seen.add(t);
    out.push(t);
  }
  return out;
}

type RemoteImageThumbnailProps = {
  src: string;
  alt: string;
  className?: string;
};

/** Xavfsiz faqat HTTP(S) uchun; xato/notoʻgʻri URL boʻlmasa harf boʻlmasa koʻrinmaydi. */
export function RemoteImageThumbnail({
  src,
  alt,
  className,
}: RemoteImageThumbnailProps) {
  const [broken, setBroken] = useState(false);
  const ok = isSafeHttpUrl(src);

  if (!ok || broken) {
    return null;
  }

  return (
    <a
      href={src}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "border-border bg-muted/40 ring-offset-background inline-flex max-w-full shrink-0 overflow-hidden rounded-md border shadow-sm hover:opacity-95",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- tashqi mahalliy API URL lar (next/image uchun qulay emas). */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer-when-downgrade"
        className="max-h-40 w-auto max-w-[min(240px,100%)] object-contain"
        onError={() => setBroken(true)}
      />
    </a>
  );
}

export function RemoteImageStrip({
  urls,
  altPrefix,
  className,
}: {
  urls: readonly string[];
  altPrefix: string;
  className?: string;
}) {
  const clean = extractDisplayableImageUrls(urls);
  if (!clean.length) {
    return null;
  }
  return (
    <div
      className={cn(
        "flex flex-wrap items-start gap-2 empty:hidden sm:gap-3",
        className,
      )}
    >
      {clean.map((url, i) => (
        <RemoteImageThumbnail
          key={url}
          src={url}
          alt={`${altPrefix} ${i + 1}`}
        />
      ))}
    </div>
  );
}
