import { inventoryResponse, reorderOrders } from "@/lib/inventory";

export async function PUT(request: Request) {
  return inventoryResponse(async () => reorderOrders(await request.json()));
}
