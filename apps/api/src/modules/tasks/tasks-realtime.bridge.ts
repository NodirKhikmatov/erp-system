import { Injectable } from "@nestjs/common";
import type { Server } from "socket.io";

export interface TaskRealtimePacket {
  taskId: string;
  assigneeId: string | null;
  kind: string;
  payload: unknown;
}

@Injectable()
export class TasksRealtimeBridge {
  private server: Server | undefined;

  attachServer(server: Server): void {
    this.server = server;
  }

  emitChange(packet: TaskRealtimePacket): void {
    if (!this.server) {
      return;
    }
    const body = {
      taskId: packet.taskId,
      kind: packet.kind,
      payload: packet.payload,
    };
    this.server.to(`task:${packet.taskId}`).emit("task:change", body);
    if (packet.assigneeId) {
      this.server.to(`worker:${packet.assigneeId}`).emit("task:change", body);
    }
    this.server.to("tasks:all").emit("task:change", body);
  }

  emitOrderProgress(
    orderId: string,
    payload: { done: number; total: number; percent: number },
  ): void {
    if (!this.server) {
      return;
    }
    const body = { orderId, ...payload };
    this.server.to(`order:${orderId}`).emit("order:progress", body);
    this.server.to("tasks:all").emit("order:progress", body);
  }

  emitOrderEvent(orderId: string, kind: string, payload: unknown): void {
    if (!this.server) {
      return;
    }
    const body = { orderId, kind, payload };
    this.server.to(`order:${orderId}`).emit("order:change", body);
    this.server.to("tasks:all").emit("order:change", body);
  }

  emitWorkspace(kind: string, payload: unknown): void {
    if (!this.server) {
      return;
    }
    this.server.to("tasks:all").emit("workspace:change", { kind, payload });
  }
}
