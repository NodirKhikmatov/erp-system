"use server";

import { cookies } from "next/headers";

import { isLocale } from "@/i18n/config";
import { redirect } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { getApiBaseUrl } from "@/lib/api-base";
import { REFRESH_COOKIE } from "@/lib/auth/cookies";
import {
  clearTokenPair,
  persistTokenPair,
  type TokenPair,
} from "@/lib/auth/token-pair";

function actionLocale(formValue: string): AppLocale {
  return isLocale(formValue) ? formValue : routing.defaultLocale;
}

export type LoginState = { error?: string } | undefined;

export type RegisterState =
  | {
      error?: "required" | "invalid" | "emailTaken" | "unreachable" | "server";
    }
  | undefined;

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const locale = actionLocale(String(formData.get("locale") ?? ""));
  if (!email || !password) {
    return { error: "required" };
  }

  let res: Response;
  try {
    res = await fetch(`${getApiBaseUrl()}/autentifikatsiya/kirish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    return { error: "unreachable" };
  }

  if (!res.ok) {
    return { error: "invalid" };
  }

  const data = (await res.json()) as TokenPair;
  await persistTokenPair(data);

  redirect({ href: "/dashboard", locale });
}

export async function registerAction(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const fullname = String(formData.get("fullname") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "").trim();
  const locale = actionLocale(String(formData.get("locale") ?? ""));

  if (!fullname || !email || !password || !role) {
    return { error: "required" };
  }

  let res: Response;
  try {
    res = await fetch(`${getApiBaseUrl()}/autentifikatsiya/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Accept-Language": locale === "uz" ? "uz" : "en",
      },
      body: JSON.stringify({ fullname, email, password, role }),
    });
  } catch {
    return { error: "unreachable" };
  }

  if (res.status === 409) {
    return { error: "emailTaken" };
  }

  if (res.status === 400) {
    return { error: "invalid" };
  }

  if (!res.ok) {
    return { error: "server" };
  }

  const data = (await res.json()) as TokenPair;
  await persistTokenPair(data);

  redirect({ href: "/dashboard", locale });
}

export async function logoutAction(formData: FormData): Promise<void> {
  const locale = actionLocale(String(formData.get("locale") ?? ""));
  const store = await cookies();
  const refresh = store.get(REFRESH_COOKIE)?.value;

  if (refresh) {
    await fetch(`${getApiBaseUrl()}/autentifikatsiya/chiqish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: refresh }),
    }).catch(() => undefined);
  }
  await clearTokenPair();
  redirect({ href: "/login", locale });
}
