-- One active user per email (soft-deleted rows do not block re-registration).
CREATE UNIQUE INDEX "users_email_active_key" ON "users"("email") WHERE "deleted_at" IS NULL;
