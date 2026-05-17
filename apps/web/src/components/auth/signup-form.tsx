"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@furniture/ui";
import { startTransition, useActionState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { registerAction, type RegisterState } from "@/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "@/i18n/navigation";
import {
  signupLabelsWithFallback,
  type SignupAuthLabels,
} from "@/lib/auth-form-messages";

const registerSchema = z.object({
  fullname: z.string().min(1).max(200),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["WORKER", "MANAGER"]),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export function SignupForm({
  locale,
  labels,
}: {
  locale: string;
  labels?: SignupAuthLabels | null;
}) {
  const lb = signupLabelsWithFallback(labels);
  const [state, formAction, pending] = useActionState<RegisterState, FormData>(
    registerAction,
    undefined,
  );
  const lastNotified = useRef<string | undefined>(undefined);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullname: "",
      email: "",
      password: "",
      role: "WORKER",
    },
  });

  useEffect(() => {
    const err = state?.error;
    if (!err || lastNotified.current === err) {
      return;
    }
    lastNotified.current = err;
    if (err === "required") {
      toast.error(lb.registerErrorRequired);
    } else if (err === "emailTaken") {
      toast.error(lb.registerErrorEmailTaken);
    } else if (err === "invalid") {
      toast.error(lb.registerErrorInvalid);
    } else if (err === "unreachable") {
      toast.error(lb.errorUnreachable);
    } else if (err === "server") {
      toast.error(lb.registerErrorServer);
    }
  }, [
    lb.errorUnreachable,
    lb.registerErrorEmailTaken,
    lb.registerErrorInvalid,
    lb.registerErrorRequired,
    lb.registerErrorServer,
    state,
  ]);

  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit((values) => {
        lastNotified.current = undefined;
        const fd = new FormData();
        fd.set("fullname", values.fullname);
        fd.set("email", values.email);
        fd.set("password", values.password);
        fd.set("role", values.role);
        fd.set("locale", locale);
        startTransition(() => {
          formAction(fd);
        });
      })}
    >
      <div className="space-y-2">
        <Label htmlFor="fullname">{lb.fullName}</Label>
        <Input
          id="fullname"
          autoComplete="name"
          {...form.register("fullname")}
        />
        {form.formState.errors.fullname ? (
          <p className="text-destructive text-sm">
            {form.formState.errors.fullname.message}
          </p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">{lb.email}</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          {...form.register("email")}
        />
        {form.formState.errors.email ? (
          <p className="text-destructive text-sm">
            {form.formState.errors.email.message}
          </p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">{lb.password}</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          {...form.register("password")}
        />
        {form.formState.errors.password ? (
          <p className="text-destructive text-sm">
            {form.formState.errors.password.message}
          </p>
        ) : null}
        <p className="text-muted-foreground text-xs">{lb.passwordHint}</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="role">{lb.roleLabel}</Label>
        <select
          id="role"
          className="border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm"
          {...form.register("role")}
        >
          <option value="WORKER">{lb.roleWorker}</option>
          <option value="MANAGER">{lb.roleManager}</option>
        </select>
        {form.formState.errors.role ? (
          <p className="text-destructive text-sm">
            {form.formState.errors.role.message}
          </p>
        ) : null}
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? lb.registerSubmitting : lb.registerSubmit}
      </Button>
      <p className="text-muted-foreground text-center text-sm">
        {lb.haveAccount}{" "}
        <Link
          href="/login"
          className="text-primary font-medium hover:underline"
        >
          {lb.signIn}
        </Link>
      </p>
    </form>
  );
}
