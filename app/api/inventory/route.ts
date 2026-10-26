import { getInventory, inventoryResponse } from "@/lib/inventory";

export async function GET() {
  return inventoryResponse(() => getInventory());
}
