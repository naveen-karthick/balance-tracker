-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "phone_number" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "savings_account" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "savings_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolio_categories" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "is_liquid" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portfolio_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "joint_categories" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "joint_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lent_categories" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lent_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lent_entries" (
    "id" SERIAL NOT NULL,
    "category_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "date" DATE NOT NULL,
    "notes" TEXT,
    "is_paid" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lent_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_resets" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "reset_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "savings_account_value" DECIMAL(12,2) NOT NULL,
    "total_liquid" DECIMAL(12,2) NOT NULL,
    "total_portfolio" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "monthly_resets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_number_key" ON "users"("phone_number");

-- CreateIndex
CREATE UNIQUE INDEX "savings_account_user_id_key" ON "savings_account"("user_id");

-- CreateIndex
CREATE INDEX "portfolio_categories_user_id_idx" ON "portfolio_categories"("user_id");

-- CreateIndex
CREATE INDEX "portfolio_categories_is_liquid_idx" ON "portfolio_categories"("is_liquid");

-- CreateIndex
CREATE UNIQUE INDEX "portfolio_categories_user_id_name_key" ON "portfolio_categories"("user_id", "name");

-- CreateIndex
CREATE INDEX "joint_categories_user_id_idx" ON "joint_categories"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "joint_categories_user_id_name_key" ON "joint_categories"("user_id", "name");

-- CreateIndex
CREATE INDEX "lent_categories_user_id_idx" ON "lent_categories"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "lent_categories_user_id_name_key" ON "lent_categories"("user_id", "name");

-- CreateIndex
CREATE INDEX "lent_entries_category_id_idx" ON "lent_entries"("category_id");

-- CreateIndex
CREATE INDEX "lent_entries_is_paid_idx" ON "lent_entries"("is_paid");

-- CreateIndex
CREATE INDEX "monthly_resets_user_id_reset_date_idx" ON "monthly_resets"("user_id", "reset_date");

-- AddForeignKey
ALTER TABLE "savings_account" ADD CONSTRAINT "savings_account_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_categories" ADD CONSTRAINT "portfolio_categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "joint_categories" ADD CONSTRAINT "joint_categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lent_categories" ADD CONSTRAINT "lent_categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lent_entries" ADD CONSTRAINT "lent_entries_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "lent_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_resets" ADD CONSTRAINT "monthly_resets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
