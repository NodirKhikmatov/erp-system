import {
  BadRequestException,
  Logger,
  ValidationPipe,
  type ValidationError,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { IoAdapter } from "@nestjs/platform-socket.io";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

import { AppModule } from "./app.module";
import type { Env } from "./config/env";
import { i18nMiddleware } from "./i18n/i18n.middleware";
import { t } from "./i18n/messages";
import { getRequestLocale } from "./i18n/request-locale.storage";

function tekshiruvTafsilotlari(errors: ValidationError[]): unknown {
  return errors.map((err) => ({
    maydon: err.property,
    xabarlar: err.constraints ? Object.values(err.constraints) : [],
    ichki:
      err.children?.length && err.children.length > 0
        ? tekshiruvTafsilotlari(err.children)
        : undefined,
  }));
}

function isSwaggerExplicitlyDisabled(value: Env["SWAGGER_ENABLED"]): boolean {
  return value === "false" || value === "0";
}

function isSwaggerExplicitlyEnabled(value: Env["SWAGGER_ENABLED"]): boolean {
  return value === "true" || value === "1";
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  const config = app.get(ConfigService);

  app.useWebSocketAdapter(new IoAdapter(app));

  app.use(i18nMiddleware);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      exceptionFactory: (validationErrors: ValidationError[]) =>
        new BadRequestException({
          xabar: t(getRequestLocale(), "validation.invalid"),
          tafsilotlar: tekshiruvTafsilotlari(validationErrors),
        }),
    }),
  );

  const corsOrigin = config.get<string | undefined>("CORS_ORIGIN");
  const corsOrigins = corsOrigin
    ? corsOrigin.split(",").map((o) => o.trim())
    : true;
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Accept",
      "Accept-Language",
    ],
  });

  const nodeEnv = config.get<Env["NODE_ENV"]>("NODE_ENV");
  const swaggerEnv = config.get<Env["SWAGGER_ENABLED"]>("SWAGGER_ENABLED");
  const enableSwagger =
    nodeEnv !== "production"
      ? !isSwaggerExplicitlyDisabled(swaggerEnv)
      : isSwaggerExplicitlyEnabled(swaggerEnv);

  if (enableSwagger) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle("Mebel ishlab chiqarish ERP API")
      .setDescription(
        "UZ: Mebel ERP HTTP API. EN: HTTP API for furniture ERP (users, clients, orders, tasks, expenses, daily logs).",
      )
      .setVersion("1.0")
      .addBearerAuth(
        {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description:
            "UZ: Qisqa muddatli kirish jetoni. EN: Short-lived access token from POST /autentifikatsiya/kirish or /autentifikatsiya/jeton-yangilash.",
        },
        "kirish-jetoni",
      )
      .addTag("Autentifikatsiya", "Kirish, chiqish va jetonlar")
      .addTag("Salomatlik", "Server va bazaning holati")
      .addTag("Ishchilar", "Ishchilar va foydalanuvchilarni boshqarish")
      .addTag("Mijozlar", "Mijozlar CRUD, qidiruv va buyurtmalar")
      .addTag(
        "Buyurtmalar",
        "Buyurtmalar, vazifalar, xarajat/foyda, dashboard va analitika",
      )
      .addTag(
        "Vazifalar",
        "Vazifalar, izohlar, timeline; real-time: Socket.IO /realtime/tasks",
      )
      .addTag(
        "Kunlik hisobotlar",
        "Ishchilar kunlik hisoboti, rasm URL, vazifa bog‘lanishi, tarix",
      )
      .addTag(
        "Yuklash (mahalliy)",
        "Rasm mahalliy diskka yoziladi va umumiy URL beriladi (`public` GET)",
      )
      .addTag(
        "Telegram bot",
        "Webhook va akkauntni bog‘lash: /integrations/telegram",
      )
      .addTag(
        "Hisobotlar (PDF)",
        "Buyurtma bo‘yicha Puppeteer PDF (mijoz, vazifalar, xarajat, foyda)",
      )
      .addTag(
        "Analitika (dashboard)",
        "Bitta so‘rovda: daromad, xarajat, foyda, buyurtmalar, vazifalar, ishchilar",
      )
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup("hujjatlar", app, document);
  }

  const port = config.get<number>("PORT") ?? 4000;
  await app.listen(port);
  const origin = await app.getUrl();
  Logger.log(
    `${origin} — jonli tekshiruv: /salomatlik/jonli yoki /health/live`,
  );
}

void bootstrap();
