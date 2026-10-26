-- CreateTable
CREATE TABLE "pending_orders" (
    "id" SERIAL NOT NULL,
    "order_number" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pending_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pending_order_lines" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "product" TEXT NOT NULL,
    "total_quantity" INTEGER NOT NULL,
    "filled_quantity" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pending_order_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_units" (
    "id" SERIAL NOT NULL,
    "product" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_units_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pending_orders_order_number_key" ON "pending_orders"("order_number");

-- CreateIndex
CREATE INDEX "pending_order_lines_order_id_idx" ON "pending_order_lines"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "stock_units_product_key" ON "stock_units"("product");

-- AddForeignKey
ALTER TABLE "pending_order_lines" ADD CONSTRAINT "pending_order_lines_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "pending_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
