import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { TaskStatus } from "@prisma/client";
import type { Context } from "telegraf";

import type { AppLocale } from "@furniture/types";
import { t } from "../../i18n/messages";
import { requestLocaleStorage } from "../../i18n/request-locale.storage";
import { DailyReportsService } from "../daily-reports/daily-reports.service";
import { TasksService } from "../tasks/tasks.service";
import type { AuthUser } from "../auth/types/auth.types";
import { TelegramWorkerResolveService } from "./telegram-worker-resolve.service";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const TASK_LIST_LIMIT = 25;
const MAX_REPORT_LEN = 20_000;

/** Telegram bot foydalanuvchiga har doim o‘zbekcha javob beradi. */
const TG: AppLocale = "uz";

const TASK_STATUS_UZ: Record<TaskStatus, string> = {
  [TaskStatus.PENDING]: "Kutishda",
  [TaskStatus.WORKING]: "Bajarilmoqda",
  [TaskStatus.DONE]: "Tugallangan",
};

function extractCommandArgs(text: string, command: string): string {
  const re = new RegExp(`^/${command}(?:@[\\w_]+)?(?:\\s+(.*))?$`, "is");
  const m = text.match(re);
  return (m?.[1] ?? "").trim();
}

/** Bir xabar matnidan /buyruq yoki /buyruq@bot nomlaridan biriga mos kelganda qolgan qismi. */
function extractCommandArgsAlt(text: string, commands: string[]): string {
  for (const command of commands) {
    const args = extractCommandArgs(text, command);
    const re = new RegExp(`^/${command}(?:@[\\w_]+)?(?:\\s+|$)`, "i");
    if (re.test(text.trim())) {
      return args;
    }
  }
  return "";
}

@Injectable()
export class TelegramCommandsService {
  constructor(
    private readonly tasks: TasksService,
    private readonly reports: DailyReportsService,
    private readonly workers: TelegramWorkerResolveService,
  ) {}

  private async withLocale<T>(
    lang: AppLocale,
    fn: () => Promise<T>,
  ): Promise<T> {
    return requestLocaleStorage.run(lang, fn);
  }

  private async requireUser(ctx: Context): Promise<AuthUser | null> {
    const from = ctx.from;
    if (!from) {
      await ctx.reply(t(TG, "telegram.chatUserMissing"));
      return null;
    }
    const auth = await this.workers.findLinkedContext(BigInt(from.id));
    if (!auth) {
      await ctx.reply(t(TG, "telegram.notLinked"));
      return null;
    }
    return auth;
  }

  async handleStart(ctx: Context): Promise<void> {
    const from = ctx.from;
    if (!from) {
      await ctx.reply(t(TG, "telegram.chatUserMissing"));
      return;
    }
    const composerPayload =
      "payload" in ctx &&
      typeof (ctx as { payload?: string }).payload === "string"
        ? (ctx as { payload: string }).payload.trim()
        : "";

    const textPayload =
      ctx.message &&
      "text" in ctx.message &&
      typeof ctx.message.text === "string"
        ? extractCommandArgs(ctx.message.text, "start").trim()
        : "";

    const payload = composerPayload || textPayload;

    if (!payload) {
      await ctx.reply(t(TG, "telegram.startWelcome"));
      return;
    }

    const res = await this.workers.linkByCode(
      TG,
      BigInt(from.id),
      BigInt(ctx.chat?.id ?? from.id),
      payload,
      from,
    );
    if (!res.ok) {
      await ctx.reply(res.message);
      return;
    }
    await ctx.reply(t(TG, "telegram.linkSuccess"));
  }

  async handleTasks(ctx: Context): Promise<void> {
    const user = await this.requireUser(ctx);
    if (!user) {
      return;
    }

    const list = await this.withLocale(TG, () =>
      this.tasks.listForWorker(user.id, {
        page: 1,
        limit: TASK_LIST_LIMIT,
      }),
    );

    if (!list.data.length) {
      await ctx.reply(t(TG, "telegram.tasksEmpty"));
      return;
    }

    const lines = list.data.map((row) => {
      const st = TASK_STATUS_UZ[row.status];
      const title =
        row.title.length > 80 ? `${row.title.slice(0, 77)}…` : row.title;
      const orderTitle = row.order.title
        ? row.order.title.length > 40
          ? `${row.order.title.slice(0, 37)}…`
          : row.order.title
        : "—";
      return `• ${st} | ${orderTitle}\n  ${title}\n  identifikator: ${row.id}`;
    });
    await ctx.reply(
      `${t(TG, "telegram.tasksHeader")}\n\n${lines.join("\n\n")}`,
    );
  }

  async handleDone(ctx: Context): Promise<void> {
    const user = await this.requireUser(ctx);
    if (!user) {
      return;
    }

    const text = ctx.message && "text" in ctx.message ? ctx.message.text : "";
    const rest =
      extractCommandArgsAlt(text, ["bajarildi", "done"])
        .split(/\s+/)[0]
        ?.trim() ?? "";
    const taskId = rest;
    if (!UUID_RE.test(taskId)) {
      await ctx.reply(t(TG, "telegram.doneUsage"));
      return;
    }

    try {
      await this.withLocale(TG, () =>
        this.tasks.updateStatus(taskId, { status: TaskStatus.DONE }, user),
      );
      await ctx.reply(t(TG, "telegram.doneOk"));
    } catch (e) {
      const msg = this.mapServiceError(e);
      await ctx.reply(msg);
    }
  }

  async handleReport(ctx: Context): Promise<void> {
    const user = await this.requireUser(ctx);
    if (!user) {
      return;
    }

    const text = ctx.message && "text" in ctx.message ? ctx.message.text : "";
    let message = extractCommandArgsAlt(text, ["hisobot", "report"]);
    if (!message) {
      await ctx.reply(t(TG, "telegram.reportUsage"));
      return;
    }
    message = message.trim();
    if (message.length > MAX_REPORT_LEN) {
      await ctx.reply(t(TG, "telegram.reportTooLong"));
      return;
    }

    try {
      await this.withLocale(TG, () => this.reports.create({ message }, user));
      await ctx.reply(t(TG, "telegram.reportOk"));
    } catch (e) {
      const msg = this.mapServiceError(e);
      await ctx.reply(msg);
    }
  }

  private mapServiceError(e: unknown): string {
    if (e instanceof NotFoundException) {
      return t(TG, "telegram.errNotFound");
    }
    if (e instanceof ForbiddenException) {
      return t(TG, "telegram.errForbidden");
    }
    if (e instanceof BadRequestException) {
      return t(TG, "telegram.errBadRequest");
    }
    return t(TG, "telegram.errGeneric");
  }
}
