import { headers } from "next/headers";

/**
 * Same-origin absolute URL for server-side fetch to Next routes (cookie refresh via proxy chain).
 */
export async function resolveServerAppOrigin(): Promise<string> {
  const explicit =
    process.env["AUTH_INTERNAL_ORIGIN"] ?? process.env["NEXT_PUBLIC_APP_URL"];
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }

  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (host) {
      const forwarded = h.get("x-forwarded-proto");
      const proto =
        forwarded ??
        (host.startsWith("localhost") || host.startsWith("127.")
          ? "http"
          : "https");
      return `${proto}://${host}`;
    }
  } catch {
    /* headers() outside request */
  }

  return "http://127.0.0.1:3000";
}
