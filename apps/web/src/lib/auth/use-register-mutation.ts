"use client";

import { useMutation } from "@tanstack/react-query";

import { getBrowserApiPrefix } from "@/lib/api-base";

/** Payload for POST /autentifikatsiya/register (tokens in JSON; does not set httpOnly cookies via this hook alone). */
export type RegisterApiPayload = {
  fullname: string;
  email: string;
  password: string;
  role: "WORKER" | "MANAGER";
};

export type RegisterApiSuccess = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

/**
 * Use when calling the API from the browser without server actions (e.g. mobile or SPA).
 * Prefer `registerAction` from `@/actions/auth` for the web app so cookies are set securely.
 */
export function useRegisterMutation() {
  return useMutation({
    mutationFn: async (payload: RegisterApiPayload) => {
      const res = await fetch(
        `${getBrowserApiPrefix()}/autentifikatsiya/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify(payload),
        },
      );
      if (res.status === 409) {
        throw new Error("emailTaken");
      }
      if (!res.ok) {
        throw new Error(`registerFailed:${res.status}`);
      }
      return (await res.json()) as RegisterApiSuccess;
    },
  });
}
