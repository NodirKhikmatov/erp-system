import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL majburiy"),
  CORS_ORIGIN: z.string().optional(),
  SWAGGER_ENABLED: z.enum(["true", "false", "1", "0"]).optional(),
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, "JWT_ACCESS_SECRET kamida 32 ta belgidan iborat bo‘lishi kerak"),
  JWT_ACCESS_EXPIRES: z.string().default("900s"),
  JWT_REFRESH_EXPIRES_DAYS: z.coerce.number().int().positive().default(7),
  /** Nisbiy yoki mutlaq yoʻl — bo‘sh bo‘lsa `apps/api/.local/upload-images`. */
  LOCAL_IMAGE_UPLOAD_DIR: z.string().optional(),
  /**
   * Javobdagi rasmlarning toʻliq URL prefiksi (`http://HOST:PORT` yoki HTTPS domen).
   * Bo‘sh bo‘lsa `http://localhost:PORT`.
   */
  PUBLIC_UPLOAD_BASE_URL: z.string().url().optional(),
  UPLOAD_MAX_IMAGE_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .max(20 * 1024 * 1024)
    .default(5 * 1024 * 1024),
  /** Telegram bot (Telegraf). Bo‘sh bo‘lsa, webhook va bot o‘chiq. */
  TELEGRAM_BOT_TOKEN: z.string().min(1).optional(),
  /** setWebhook va `X-Telegram-Bot-Api-Secret-Token` tekshiruvi (kamida 8 belgi). */
  TELEGRAM_WEBHOOK_SECRET: z.string().min(8).optional(),
  /** Masalan: https://api.example.com — oxirida slash bo‘lmasin. */
  TELEGRAM_WEBHOOK_BASE_URL: z.string().url().optional(),
  /**
   * development: `TELEGRAM_WEBHOOK_BASE_URL` bo‘lmaganda long polling ishga tushadi (ngrok yoʻq mahalliy test).
   * Ishlab chiqarishda ishlamaydi.
   */
  TELEGRAM_DEV_POLLING: z.enum(["true", "false", "1", "0"]).optional(),
  /** puppeteer-core: Chrome / Chromium. PDF yozishda yo‘q bo‘lsa xato qaytariladi. */
  PUPPETEER_EXECUTABLE_PATH: z.string().min(1).optional(),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const message = parsed.error.flatten().fieldErrors;
    throw new Error(
      `Muhit o‘zgaruvchilari yaroqsiz: ${JSON.stringify(message)}`,
    );
  }
  return parsed.data;
}
