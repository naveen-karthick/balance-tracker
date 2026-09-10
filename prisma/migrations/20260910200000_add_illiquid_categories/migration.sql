-- CreateTable
CREATE TABLE "illiquid_categories" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "illiquid_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "illiquid_categories_user_id_idx" ON "illiquid_categories"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "illiquid_categories_user_id_name_key" ON "illiquid_categories"("user_id", "name");

-- AddForeignKey
ALTER TABLE "illiquid_categories" ADD CONSTRAINT "illiquid_categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
