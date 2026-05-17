-- Order display number, reference images
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "order_number" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "reference_images" JSONB;

CREATE UNIQUE INDEX IF NOT EXISTS "orders_order_number_key" ON "orders"("order_number");

-- Task priority & estimates
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "priority" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "estimated_hours" DECIMAL(6,2);

-- Activity log (audit)
CREATE TABLE IF NOT EXISTS "activity_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_id" UUID,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "meta" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "activity_log_entity_created_idx" ON "activity_logs"("entity_type", "entity_id", "created_at");
CREATE INDEX IF NOT EXISTS "activity_log_created_idx" ON "activity_logs"("created_at");

ALTER TABLE "activity_logs" DROP CONSTRAINT IF EXISTS "activity_logs_actor_id_fkey";
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill order numbers for existing rows (dev-friendly; avoids NULL unique issues)
UPDATE "orders" SET "order_number" = 'LEGACY-' || SUBSTRING("id"::text, 1, 8)
WHERE "order_number" IS NULL AND "deleted_at" IS NULL;
