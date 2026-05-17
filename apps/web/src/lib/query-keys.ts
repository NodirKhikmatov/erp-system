import { getBrowserApiPrefix } from "@/lib/api-base";

export const queryKeys = {
  analytics: {
    dashboard: (from?: string, to?: string, currency?: string) =>
      ["analytics", "dashboard", from, to, currency] as const,
  },
  expenses: {
    recent: (limit: number, currency?: string) =>
      ["expenses", "recent", limit, currency ?? ""] as const,
    analytics: (currency?: string, from?: string, to?: string) =>
      ["expenses", "analytics", currency ?? "", from ?? "", to ?? ""] as const,
  },
  orders: {
    list: (page: number, limit: number) => ["orders", page, limit] as const,
    detail: (id: string) => ["orders", "detail", id] as const,
    latest: () => ["orders", "latest-dashboard"] as const,
    analytics: (bucket: string, from?: string, to?: string) =>
      ["orders", "analytics", bucket, from ?? "", to ?? ""] as const,
  },
  tasks: {
    list: (scope: "all" | "my", page: number, limit: number) =>
      ["tasks", scope, page, limit] as const,
    /** Worker hub uses a larger page size; keep keys distinct from list(). */
    hub: (workerId: string) => ["tasks", "hub", workerId] as const,
    detail: (id: string) => ["tasks", "detail", id] as const,
  },
  workers: {
    list: (page: number, limit: number) => ["workers", page, limit] as const,
  },
  clients: {
    list: (page: number, limit: number) => ["clients", page, limit] as const,
  },
  activity: {
    forEntity: (entityType: string, entityId: string) =>
      ["activity-logs", entityType, entityId] as const,
  },
  dailyReports: {
    list: (scope: "all" | "my", page: number, limit: number) =>
      ["daily-reports", scope, page, limit] as const,
  },
};

export async function proxyFetch(path: string, init?: RequestInit) {
  const base = getBrowserApiPrefix();
  const url = `${base}/${path.replace(/^\//, "")}`;
  const res = await fetch(url, {
    ...init,
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      ...init?.headers,
    },
  });
  return res;
}
