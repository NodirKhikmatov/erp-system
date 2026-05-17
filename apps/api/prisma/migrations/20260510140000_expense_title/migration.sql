-- Optional expense line title (notes remain in description).
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "title" TEXT;
