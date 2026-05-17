import { cookies } from "next/headers";

import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/auth/cookies";

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

function accessCookieMaxAge(expiresIn: unknown): number {
  const n = typeof expiresIn === "number" ? expiresIn : Number(expiresIn);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 900;
}

const cookieSecure = (): boolean => process.env.NODE_ENV === "production";

export async function persistTokenPair(data: TokenPair): Promise<void> {
  const store = await cookies();
  store.set(ACCESS_COOKIE, data.accessToken, {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "lax",
    path: "/",
    maxAge: accessCookieMaxAge(data.expiresIn),
  });
  store.set(REFRESH_COOKIE, data.refreshToken, {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearTokenPair(): Promise<void> {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
}
