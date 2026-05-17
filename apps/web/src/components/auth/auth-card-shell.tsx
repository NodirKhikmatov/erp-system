import type { ReactNode } from "react";

import { Card, CardContent, CardDescription, CardHeader } from "@furniture/ui";

/** Auth sahifa sarlavhasi SSR da chiqadi — LCP uchun yirik matn klient kutishisiz.** */
export function AuthCardShell({
  kicker,
  title,
  subtitle,
  children,
}: {
  kicker: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <Card className="bg-card w-full max-w-md border shadow-lg">
      <CardHeader className="space-y-1">
        <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
          {kicker}
        </p>
        <h1 className="text-2xl font-semibold leading-none tracking-tight">
          {title}
        </h1>
        <CardDescription>{subtitle}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
