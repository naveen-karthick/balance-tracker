-- Manual display order for the shared order list.
-- Existing rows keep the previous date ordering.
ALTER TABLE "pending_orders" ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 0;

WITH ranked AS (
  SELECT id, (ROW_NUMBER() OVER (ORDER BY order_date DESC, id DESC) - 1) AS sort_order
  FROM pending_orders
)
UPDATE pending_orders AS orders
SET sort_order = ranked.sort_order
FROM ranked
WHERE orders.id = ranked.id;

CREATE INDEX "pending_orders_sort_order_idx" ON "pending_orders"("sort_order");
