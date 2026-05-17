-- Bir martalik Telegram bog'lash kodi (veb orqali chiqariladi, bot /start bilan tasdiqlanadi)
ALTER TABLE "users" ADD COLUMN "telegram_link_code" TEXT;
ALTER TABLE "users" ADD COLUMN "telegram_link_expires_at" TIMESTAMP(3);

CREATE UNIQUE INDEX "users_telegram_link_code_key" ON "users"("telegram_link_code");
