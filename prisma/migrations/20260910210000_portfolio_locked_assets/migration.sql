-- AlterTable
ALTER TABLE "portfolio_categories" ADD COLUMN "is_locked" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "portfolio_categories_is_locked_idx" ON "portfolio_categories"("is_locked");

-- Migrate illiquid categories into portfolio as locked assets
INSERT INTO "portfolio_categories" ("user_id", "name", "amount", "is_liquid", "is_locked", "is_stock", "sort_order", "created_at", "updated_at")
SELECT "user_id", "name", "amount", false, true, false, "sort_order", "created_at", "updated_at"
FROM "illiquid_categories"
ON CONFLICT ("user_id", "name") DO UPDATE SET "is_locked" = true, "amount" = EXCLUDED."amount";

-- DropTable
DROP TABLE "illiquid_categories";
