import { addOrderLine, inventoryResponse } from "@/lib/inventory";

export async function POST(request: Request) {
  return inventoryResponse(async () => addOrderLine(await request.json()));
}
