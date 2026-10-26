import { createOrder, inventoryResponse } from "@/lib/inventory";

export async function POST(request: Request) {
  return inventoryResponse(async () => createOrder(await request.json()));
}
