import { deleteStock, inventoryResponse, updateStock } from "@/lib/inventory";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return inventoryResponse(async () => updateStock(id, await request.json()));
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return inventoryResponse(() => deleteStock(id));
}
