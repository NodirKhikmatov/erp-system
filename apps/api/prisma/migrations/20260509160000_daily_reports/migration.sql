-- CreateTable
CREATE TABLE "daily_reports" (
    "id" UUID NOT NULL,
    "worker_id" UUID NOT NULL,
    "task_id" UUID,
    "message" TEXT NOT NULL,
    "photo_url" TEXT,
    "extra_images" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "daily_reports_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "daily_report_worker_created_deleted_idx" ON "daily_reports"("worker_id", "created_at", "deleted_at");

-- CreateIndex
CREATE INDEX "daily_report_task_deleted_idx" ON "daily_reports"("task_id", "deleted_at");

-- CreateIndex
CREATE INDEX "daily_report_deleted_at_idx" ON "daily_reports"("deleted_at");
