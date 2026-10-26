import { createStock, inventoryResponse } from "@/lib/inventory";

export async function POST(request: Request) {
  return inventoryResponse(async () => createStock(await request.json()));
}
