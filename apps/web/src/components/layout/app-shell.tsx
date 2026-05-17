"use client";

import { Button } from "@furniture/ui";
import { Menu, PanelLeft, PanelLeftClose } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { LanguageSwitcher } from "@/components/language-switcher";
import { MainNav } from "@/components/layout/main-nav";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

import type { CurrentUser } from "@/lib/auth/session";
import { useUiStore } from "@/stores/ui-store";

export function AppShell({
  locale,
  user,
  children,
}: {
  locale: string;
  user: CurrentUser;
  children: React.ReactNode;
}) {
  const [mobileNav, setMobileNav] = useState(false);
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useUiStore((s) => s.setSidebarCollapsed);
  const tAuth = useTranslations("auth");
  const tCommon = useTranslations("common");

  return (
    <div className="bg-background flex min-h-dvh w-full">
      <aside
        className={`border-border/60 from-primary/[0.04] via-card/95 to-muted/25 dark:from-primary/[0.07] relative hidden shrink-0 flex-col border-r bg-gradient-to-b shadow-[inset_-1px_0_0_0_rgba(255,255,255,0.04)] backdrop-blur-md md:flex dark:shadow-[inset_-1px_0_0_0_rgba(0,0,0,0.25)] ${sidebarCollapsed ? "w-[4.25rem]" : "w-60"} transition-[width] duration-200`}
      >
        <div
          className={`border-border/60 flex h-14 items-center border-b px-2 text-sm font-semibold tracking-tight ${
            sidebarCollapsed ? "justify-center" : "justify-between gap-1"
          }`}
        >
          <span
            className={`truncate px-2 ${sidebarCollapsed ? "sr-only" : ""}`}
          >
            {tAuth("kicker")}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            aria-expanded={!sidebarCollapsed}
            aria-label={
              sidebarCollapsed
                ? tCommon("aria.expandSidebar")
                : tCommon("aria.collapseSidebar")
            }
          >
            {sidebarCollapsed ? (
              <PanelLeft className="size-4" />
            ) : (
              <PanelLeftClose className="size-4" />
            )}
          </Button>
        </div>
        <div className="flex-1 overflow-auto p-3">
          <MainNav user={user} collapsed={sidebarCollapsed} />
        </div>
      </aside>

      <Sheet open={mobileNav} onOpenChange={setMobileNav}>
        <SheetContent side="left" className="w-[min(20rem,90vw)]">
          <SheetTitle className="sr-only">{tCommon("aria.menu")}</SheetTitle>
          <p className="mb-4 text-sm font-semibold">{tAuth("kicker")}</p>
          <MainNav user={user} onNavigate={() => setMobileNav(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-background/80 sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b px-3 backdrop-blur-md md:px-4">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileNav(true)}
            aria-label={tCommon("aria.menu")}
          >
            <Menu className="size-5" />
          </Button>
          <div className="flex flex-1 items-center justify-end gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
            <UserMenu locale={locale} user={user} />
          </div>
        </header>
        <main className="from-background via-background to-muted/15 flex-1 overflow-x-hidden bg-gradient-to-b p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
