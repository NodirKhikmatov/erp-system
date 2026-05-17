import { create } from "zustand";
import { io, type Socket } from "socket.io-client";

import { env } from "@/env";

type RealtimeStatus = "idle" | "connecting" | "connected" | "error";

type RealtimeState = {
  socket: Socket | null;
  status: RealtimeStatus;
  lastTaskChange: unknown;
  lastOrderProgress: unknown;
  lastOrderChange: unknown;
  lastWorkspace: unknown;
  connectForManager: () => Promise<void>;
  connectForWorker: (workerId: string) => Promise<void>;
  connectForOrder: (orderId: string) => Promise<void>;
  disconnect: () => void;
};

function apiOrigin(): string {
  return (env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:4000").replace(
    /\/$/,
    "",
  );
}

async function fetchWsToken(): Promise<string | null> {
  const res = await fetch("/api/auth/ws-token", { credentials: "same-origin" });
  if (!res.ok) {
    return null;
  }
  const body = (await res.json()) as { token?: string };
  return body.token ?? null;
}

export const useRealtimeStore = create<RealtimeState>((set, get) => ({
  socket: null,
  status: "idle",
  lastTaskChange: null,
  lastOrderProgress: null,
  lastOrderChange: null,
  lastWorkspace: null,

  connectForManager: async () => {
    if (typeof window === "undefined") {
      return;
    }
    const token = await fetchWsToken();
    if (!token) {
      return;
    }
    const existing = get().socket;
    if (existing?.connected) {
      return;
    }
    existing?.disconnect();
    set({ status: "connecting" });
    const s = io(`${apiOrigin()}/realtime/tasks`, {
      transports: ["websocket"],
      auth: { token },
    });
    s.on("connect", () => set({ status: "connected" }));
    s.on("disconnect", () => set({ status: "idle" }));
    s.on("connect_error", () => set({ status: "error" }));
    s.on("task:change", (payload) => set({ lastTaskChange: payload }));
    s.on("order:progress", (payload) => set({ lastOrderProgress: payload }));
    s.on("order:change", (payload) => set({ lastOrderChange: payload }));
    s.on("workspace:change", (payload) => set({ lastWorkspace: payload }));
    s.emit("subscribe", { allTasks: true });
    set({ socket: s });
  },

  connectForWorker: async (workerId: string) => {
    if (typeof window === "undefined") {
      return;
    }
    const token = await fetchWsToken();
    if (!token) {
      return;
    }
    get().socket?.disconnect();
    set({ status: "connecting" });
    const s = io(`${apiOrigin()}/realtime/tasks`, {
      transports: ["websocket"],
      auth: { token },
    });
    s.on("connect", () => set({ status: "connected" }));
    s.on("disconnect", () => set({ status: "idle" }));
    s.on("connect_error", () => set({ status: "error" }));
    s.on("task:change", (payload) => set({ lastTaskChange: payload }));
    s.on("order:progress", (payload) => set({ lastOrderProgress: payload }));
    s.on("order:change", (payload) => set({ lastOrderChange: payload }));
    s.on("workspace:change", (payload) => set({ lastWorkspace: payload }));
    s.emit("subscribe", { workerId });
    set({ socket: s });
  },

  connectForOrder: async (orderId: string) => {
    if (typeof window === "undefined") {
      return;
    }
    const token = await fetchWsToken();
    if (!token) {
      return;
    }
    get().socket?.disconnect();
    set({ status: "connecting" });
    const s = io(`${apiOrigin()}/realtime/tasks`, {
      transports: ["websocket"],
      auth: { token },
    });
    s.on("connect", () => set({ status: "connected" }));
    s.on("disconnect", () => set({ status: "idle" }));
    s.on("connect_error", () => set({ status: "error" }));
    s.on("task:change", (payload) => set({ lastTaskChange: payload }));
    s.on("order:progress", (payload) => set({ lastOrderProgress: payload }));
    s.on("order:change", (payload) =>
      set({ lastOrderChange: payload, lastWorkspace: payload }),
    );
    s.emit("subscribe", { orderId });
    set({ socket: s });
  },

  disconnect: () => {
    get().socket?.disconnect();
    set({
      socket: null,
      status: "idle",
    });
  },
}));
