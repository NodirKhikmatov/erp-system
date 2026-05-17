"use client";

import { useActionState } from "react";

import { loginAction, type LoginState } from "@/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "@/i18n/navigation";
import {
  loginLabelsWithFallback,
  type LoginAuthLabels,
} from "@/lib/auth-form-messages";
import { Button } from "@furniture/ui";

export function LoginForm({
  locale,
  labels,
}: {
  locale: string;
  /** Dev Fast Refresh bazan `labels` ni uzatmay qolishi mumkin — fallback qo‘llanadi. */
  labels?: LoginAuthLabels | null;
}) {
  const l = loginLabelsWithFallback(labels);
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    loginAction,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <div className="space-y-2">
        <Label htmlFor="email">{l.email}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">{l.password}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      {state?.error === "required" ? (
        <p className="text-destructive text-sm">{l.errorRequired}</p>
      ) : null}
      {state?.error === "invalid" ? (
        <p className="text-destructive text-sm">{l.errorInvalid}</p>
      ) : null}
      {state?.error === "unreachable" ? (
        <p className="text-destructive text-sm">{l.errorUnreachable}</p>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {l.submit}
      </Button>
      <p className="text-muted-foreground text-center text-sm">
        {l.noAccount}{" "}
        <Link
          href="/register"
          className="text-primary font-medium hover:underline"
        >
          {l.signUp}
        </Link>
      </p>
    </form>
  );
}
