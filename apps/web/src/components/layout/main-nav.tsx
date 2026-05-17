"use client";

import type { LucideIcon } from "lucide-react";
import {
  CheckSquare,
  CreditCard,
  FileText,
  Hammer,
  LayoutDashboard,
  Settings,
  ShoppingCart,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@furniture/ui";

import { Link, usePathname } from "@/i18n/navigation";
import type { CurrentUser } from "@/lib/auth/session";

type NavDef = {
  segment: keyof {
    dashboard: string;
    orders: string;
    tasks: string;
    worker: string;
    workers: string;
    expenses: string;
    reports: string;
    settings: string;
  };
  icon: LucideIcon;
  roles: CurrentUser["role"][];
};

const NAV_ITEMS: NavDef[] = [
  {
    segment: "dashboard",
    icon: LayoutDashboard,
    roles: ["ADMIN", "MANAGER", "WORKER"],
  },
  {
    segment: "orders",
    icon: ShoppingCart,
    roles: ["ADMIN", "MANAGER"],
  },
  {
    segment: "tasks",
    icon: CheckSquare,
    roles: ["ADMIN", "MANAGER", "WORKER"],
  },
  {
    segment: "worker",
    icon: Hammer,
    roles: ["WORKER"],
  },
  {
    segment: "workers",
    icon: Users,
    roles: ["ADMIN", "MANAGER"],
  },
  {
    segment: "expenses",
    icon: CreditCard,
    roles: ["ADMIN", "MANAGER"],
  },
  {
    segment: "reports",
    icon: FileText,
    roles: ["ADMIN", "MANAGER", "WORKER"],
  },
  {
    segment: "settings",
    icon: Settings,
    roles: ["ADMIN", "MANAGER", "WORKER"],
  },
];

export function MainNav({
  user,
  collapsed = false,
  onNavigate,
}: {
  user: CurrentUser;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const tNav = useTranslations("common.nav");

  const items = NAV_ITEMS.filter((i) => i.roles.includes(user.role));

  return (
    <nav className="flex flex-col gap-1" aria-label="Main">
      {items.map((item) => {
        const href = `/${item.segment}`;
        const Icon = item.icon;
        const active =
          pathname === href ||
          (item.segment !== "dashboard" && pathname.startsWith(`${href}/`));
        return (
          <Link
            key={item.segment}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              collapsed && "justify-center px-2",
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
            )}
          >
            <Icon className="size-4 shrink-0 opacity-80" aria-hidden />
            <span className={collapsed ? "sr-only" : undefined}>
              {tNav(item.segment)}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
