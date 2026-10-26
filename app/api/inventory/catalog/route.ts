import { createCatalogProduct, inventoryResponse } from "@/lib/inventory";

export async function POST(request: Request) {
  return inventoryResponse(async () => createCatalogProduct(await request.json()));
}
