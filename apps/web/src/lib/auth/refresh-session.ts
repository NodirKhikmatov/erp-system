import { cookies } from "next/headers";

import { getApiBaseUrl } from "@/lib/api-base";
import { REFRESH_COOKIE } from "@/lib/auth/cookies";
import {
  clearTokenPair,
  persistTokenPair,
  type TokenPair,
} from "@/lib/auth/token-pair";

/** Server-only: refreshes HttpOnly cookies using the Nest refresh endpoint. */
export async function tryRefreshTokens(): Promise<boolean> {
  const store = await cookies();
  const refresh = store.get(REFRESH_COOKIE)?.value;
  if (!refresh) {
    return false;
  }

  const res = await fetch(
    `${getApiBaseUrl()}/autentifikatsiya/jeton-yangilash`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: refresh }),
      cache: "no-store",
    },
  );

  if (!res.ok) {
    await clearTokenPair();
    return false;
  }

  const data = (await res.json()) as TokenPair;
  await persistTokenPair(data);
  return true;
}
