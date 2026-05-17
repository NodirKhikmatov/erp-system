"use client";

import { useTranslations } from "next-intl";

import { logoutAction } from "@/actions/auth";
import { Button } from "@furniture/ui";
import { User } from "lucide-react";
import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { CurrentUser } from "@/lib/auth/session";

export function UserMenu({
  locale,
  user,
}: {
  locale: string;
  user: CurrentUser;
}) {
  const t = useTranslations("auth");
  const [menuReady, setMenuReady] = useState(false);
  useEffect(() => {
    setMenuReady(true);
  }, []);

  if (!menuReady) {
    return (
      <Button variant="outline" size="sm" className="gap-2" disabled aria-busy>
        <User className="size-4" />
        <span className="max-w-[10rem] truncate">{user.displayName}</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <User className="size-4" />
          <span className="max-w-[10rem] truncate">{user.displayName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-0.5">
            <span className="truncate text-sm font-medium">
              {user.displayName}
            </span>
            <span className="text-muted-foreground truncate text-xs">
              {user.email}
            </span>
            <span className="text-muted-foreground text-xs">{user.role}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer"
          onSelect={() => {
            const fd = new FormData();
            fd.set("locale", locale);
            void logoutAction(fd);
          }}
        >
          {t("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
