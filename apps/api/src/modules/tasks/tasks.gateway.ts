import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from "@nestjs/websockets";
import { UserRole } from "@prisma/client";
import type { Server, Socket } from "socket.io";

import type { Env } from "../../config/env";
import type { AuthUser, JwtAccessPayload } from "../auth/types/auth.types";
import { TasksRealtimeBridge } from "./tasks-realtime.bridge";
import { TasksService } from "./tasks.service";

function readTokenFromObject(obj: unknown, key: string): string | undefined {
  if (!obj || typeof obj !== "object") {
    return undefined;
  }
  const v = (obj as Record<string, unknown>)[key];
  if (typeof v === "string" && v.length > 0) {
    return v.trim();
  }
  return undefined;
}

function extractBearerToken(client: Socket): string | undefined {
  const header = client.handshake.headers.authorization;
  if (typeof header === "string" && /^Bearer\s+/i.test(header)) {
    return header.replace(/^Bearer\s+/i, "").trim();
  }
  const authToken = readTokenFromObject(client.handshake.auth, "token");
  if (authToken) {
    return authToken;
  }
  const q = client.handshake.query["token"];
  if (typeof q === "string" && q.length > 0) {
    return q.trim();
  }
  if (Array.isArray(q) && typeof q[0] === "string") {
    return q[0].trim();
  }
  return undefined;
}

@WebSocketGateway({
  namespace: "/realtime/tasks",
  cors: { origin: true, credentials: true },
})
export class TasksGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(TasksGateway.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
    private readonly bridge: TasksRealtimeBridge,
    private readonly tasks: TasksService,
  ) {}

  afterInit(): void {
    this.bridge.attachServer(this.server);
    this.logger.log("Socket.IO /realtime/tasks gateway ready");
  }

  async handleConnection(client: Socket): Promise<void> {
    const token = extractBearerToken(client);
    if (!token) {
      client.disconnect(true);
      return;
    }
    try {
      const secret = this.config.get("JWT_ACCESS_SECRET", { infer: true });
      const payload = await this.jwt.verifyAsync<JwtAccessPayload>(token, {
        secret,
      });
      const user: AuthUser = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      };
      (client.data as { user?: AuthUser }).user = user;
    } catch {
      client.disconnect(true);
    }
  }

  @SubscribeMessage("subscribe")
  async subscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    body: {
      taskId?: string;
      workerId?: string;
      orderId?: string;
      allTasks?: boolean;
    },
  ): Promise<{ ok: true; rooms: string[] }> {
    const user = (client.data as { user?: AuthUser }).user;
    if (!user) {
      throw new WsException("Unauthorized");
    }
    if (body.taskId) {
      await this.tasks.assertCanViewTask(user, body.taskId);
      await client.join(`task:${body.taskId}`);
      return { ok: true, rooms: [`task:${body.taskId}`] };
    }
    if (body.workerId) {
      if (user.role === UserRole.WORKER && body.workerId !== user.id) {
        throw new WsException("Forbidden");
      }
      await client.join(`worker:${body.workerId}`);
      return { ok: true, rooms: [`worker:${body.workerId}`] };
    }
    if (body.orderId) {
      await client.join(`order:${body.orderId}`);
      return { ok: true, rooms: [`order:${body.orderId}`] };
    }
    if (body.allTasks) {
      if (user.role !== UserRole.ADMIN && user.role !== UserRole.MANAGER) {
        throw new WsException("Forbidden");
      }
      await client.join("tasks:all");
      return { ok: true, rooms: ["tasks:all"] };
    }
    throw new WsException("Invalid subscribe payload");
  }
}
