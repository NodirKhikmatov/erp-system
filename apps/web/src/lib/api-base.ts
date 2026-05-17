import { env } from "@/env";

/** Server-side va server actionlar uchun to‘g‘ridan-to‘g‘ri API bazasi. */
export function getApiBaseUrl(): string {
  return (
    env.API_URL ??
    env.NEXT_PUBLIC_API_URL ??
    "http://127.0.0.1:4000"
  ).replace(/\/$/, "");
}

/** Brauzer / React Query: cookie bilan Next.js proxy. */
export function getBrowserApiPrefix(): string {
  return "/api/proxy";
}
