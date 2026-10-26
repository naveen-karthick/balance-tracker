-- AlterTable
ALTER TABLE "pending_orders" ADD COLUMN "order_date" DATE NOT NULL DEFAULT CURRENT_DATE;

-- CreateTable
CREATE TABLE "catalog_products" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "catalog_products_name_key" ON "catalog_products"("name");

-- Seed the Jayam Agency price list
INSERT INTO "catalog_products" ("name", "code", "updated_at") VALUES
('Plastic Round Plate Washer', '0001', CURRENT_TIMESTAMP),
('Handle Leg Bush Big Size', '0002', CURRENT_TIMESTAMP),
('Rubber Bush', '0003', CURRENT_TIMESTAMP),
('Swing leg bush', '0005', CURRENT_TIMESTAMP),
('Small Dining Bush', '0007', CURRENT_TIMESTAMP),
('Bunker Top Bush', '0009', CURRENT_TIMESTAMP),
('Bunker Bottom Bush', '0011', CURRENT_TIMESTAMP),
('Dining Bottom Bush', '0012', CURRENT_TIMESTAMP),
('Small Bush', '0013', CURRENT_TIMESTAMP),
('Bottom Cross Bush', '0014', CURRENT_TIMESTAMP),
('1" x 1" Square bush', '0015', CURRENT_TIMESTAMP),
('1 1/2" x 1 1/2" Square Bush', '0016', CURRENT_TIMESTAMP),
('Dining Top Bush', '0017', CURRENT_TIMESTAMP),
('Small Thread Bush', '0018', CURRENT_TIMESTAMP),
('Plastic Button', '0019', CURRENT_TIMESTAMP),
('Plastic Big Gear', '0020', CURRENT_TIMESTAMP),
('Big Thread Bush', '0021', CURRENT_TIMESTAMP),
('Big Nut Bush', '0022', CURRENT_TIMESTAMP),
('JF-1124 Study Chair Bush', '0024', CURRENT_TIMESTAMP),
('Plastic Gear Small', '0025', CURRENT_TIMESTAMP),
('8 MM Nylon bush for sliding', '0028', CURRENT_TIMESTAMP),
('16 MM Nylon bush for sliding', '0029', CURRENT_TIMESTAMP),
('1 1/2" x 3/4" bush thick (204)', '0031', CURRENT_TIMESTAMP),
('3/4 inner bush (210)', '0032', CURRENT_TIMESTAMP),
('Bunker Top Bush 2 Inch', '0041', CURRENT_TIMESTAMP),
('Thread Leg Key Bush', '0043', CURRENT_TIMESTAMP),
('1 Inch Bush Laptop Table', '0044', CURRENT_TIMESTAMP),
('Yoga Chair Gear', '0045', CURRENT_TIMESTAMP),
('3/4" Square Bush', '0046', CURRENT_TIMESTAMP),
('Nylon Wheel', '0051', CURRENT_TIMESTAMP),
('White Gear', '', CURRENT_TIMESTAMP);
