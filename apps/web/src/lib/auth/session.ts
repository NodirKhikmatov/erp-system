import { cookies, headers } from "next/headers";
import { cache } from "react";

import { ACCESS_COOKIE } from "@/lib/auth/cookies";
import { resolveServerAppOrigin } from "@/lib/server-app-origin";

export type CurrentUser = {
  id: string;
  email: string;
  role: "ADMIN" | "MANAGER" | "WORKER";
  displayName: string;
  phone: string | null;
};

async function loadCurrentUser(): Promise<CurrentUser | null> {
  const jar = await cookies();
  /** Auth cookie yo‘q bo‘lsa umuman `/me` chaqirishmasligi LCP SSR ga katta taʼsir qiladi. */
  if (!jar.get(ACCESS_COOKIE)?.value) {
    return null;
  }

  const h = await headers();
  const cookieHeader = h.get("cookie");
  try {
    const origin = await resolveServerAppOrigin();
    const res = await fetch(`${origin}/api/proxy/autentifikatsiya/men`, {
      headers: {
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        Accept: "application/json",
      },
      cache: "no-store",
    });
    if (!res.ok) {
      return null;
    }
    return (await res.json()) as CurrentUser;
  } catch {
    return null;
  }
}

export const getCurrentUser = cache(loadCurrentUser);
