-- AlterTable
ALTER TABLE "portfolio_categories" ADD COLUMN "is_stock" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "portfolio_categories" ADD COLUMN "stock_symbol" TEXT;
ALTER TABLE "portfolio_categories" ADD COLUMN "stock_units" DECIMAL(12,4);
