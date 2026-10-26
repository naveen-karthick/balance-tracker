export type InventoryLine = {
  id: number;
  product: string;
  totalQuantity: number;
  filledQuantity: number;
  remainingQuantity: number;
};

export type InventoryOrder = {
  id: number;
  orderNumber: string;
  orderDate: string;
  remainingQuantity: number;
  lines: InventoryLine[];
};

export type CatalogProduct = {
  id: number;
  name: string;
  code: string;
};

export type InventoryStockItem = {
  id: number;
  product: string;
  quantity: number;
};

export type InventoryData = {
  orders: InventoryOrder[];
  stock: InventoryStockItem[];
  catalog: CatalogProduct[];
};
