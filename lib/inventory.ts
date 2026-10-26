import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { canAccessInventory } from "@/lib/inventoryAccess";
import type { InventoryData } from "@/types/inventory";

export class InventoryError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function cleanText(value: unknown, label: string, max: number): string {
  if (typeof value !== "string") {
    throw new InventoryError(`${label} is required`, 400);
  }
  const text = value.trim();
  if (!text) throw new InventoryError(`${label} is required`, 400);
  if (text.length > max) throw new InventoryError(`${label} is too long`, 400);
  return text;
}

function cleanQuantity(value: unknown, label: string): number {
  if (value === undefined || value === null || value === "") {
    throw new InventoryError(`${label} is required`, 400);
  }
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(number) || number < 0 || number > 1_000_000) {
    throw new InventoryError(`${label} must be a whole number from 0 to 1000000`, 400);
  }
  return number;
}

function cleanDate(value: unknown): Date {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new InventoryError("Order date is required", 400);
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new InventoryError("Order date is invalid", 400);
  }
  return date;
}

function asRecord(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new InventoryError("Invalid request", 400);
  }
  return body as Record<string, unknown>;
}

function lineQuantities(
  body: Record<string, unknown>,
  existing?: { totalQuantity: number; filledQuantity: number }
) {
  if (body.totalQuantity === undefined && !existing) {
    throw new InventoryError("Total quantity is required", 400);
  }
  const totalQuantity =
    body.totalQuantity === undefined
      ? existing!.totalQuantity
      : cleanQuantity(body.totalQuantity, "Total quantity");
  const filledQuantity =
    body.filledQuantity === undefined
      ? (existing?.filledQuantity ?? 0)
      : cleanQuantity(body.filledQuantity, "Filled");
  if (filledQuantity > totalQuantity) {
    throw new InventoryError("Filled can't be more than the total quantity", 400);
  }
  return { totalQuantity, filledQuantity };
}

function parseId(value: string): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new InventoryError("Not found", 404);
  }
  return id;
}

async function requireInventoryAccess() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAccessInventory(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function inventoryResponse(work: () => Promise<InventoryData>) {
  const blocked = await requireInventoryAccess();
  if (blocked) return blocked;

  try {
    return NextResponse.json(await work());
  } catch (error) {
    if (error instanceof InventoryError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    if (typeof error === "object" && error && "code" in error) {
      const code = (error as { code: string }).code;
      if (code === "P2002") {
        return NextResponse.json({ error: "That name is already in use" }, { status: 409 });
      }
      if (code === "P2021" || code === "P2022") {
        return NextResponse.json({ error: "Inventory tables are not set up yet." }, { status: 503 });
      }
    }
    console.error(error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

async function catalogName(product: string): Promise<string> {
  const item = await prisma.catalogProduct.findFirst({
    where: { name: { equals: product, mode: "insensitive" } },
  });
  if (!item) throw new InventoryError("Choose a product from the catalogue", 400);
  return item.name;
}

function dateOnly(value: Date): string {
  const iso = value.toISOString();
  if (iso.endsWith("T00:00:00.000Z")) return iso.slice(0, 10);
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${value.getFullYear()}-${month}-${day}`;
}

export async function getInventory(): Promise<InventoryData> {
  const [orders, stock, catalog] = await Promise.all([
    prisma.pendingOrder.findMany({
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      include: { lines: { orderBy: { id: "asc" } } },
    }),
    prisma.stockUnit.findMany({ orderBy: { product: "asc" } }),
    prisma.catalogProduct.findMany({ orderBy: [{ name: "asc" }] }),
  ]);

  return {
    orders: orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      orderDate: dateOnly(order.orderDate),
      lines: order.lines.map((line) => ({
        id: line.id,
        product: line.product,
        totalQuantity: line.totalQuantity,
        filledQuantity: line.filledQuantity,
        remainingQuantity: line.totalQuantity - line.filledQuantity,
      })),
      remainingQuantity: order.lines.reduce(
        (sum, line) => sum + (line.totalQuantity - line.filledQuantity),
        0
      ),
    })),
    stock: stock.map((item) => ({
      id: item.id,
      product: item.product,
      quantity: item.quantity,
    })),
    catalog: catalog.map((item) => ({
      id: item.id,
      name: item.name,
      code: item.code,
    })),
  };
}

export async function createOrder(input: unknown) {
  const body = asRecord(input);
  const orderNumber = cleanText(body.orderNumber, "Order number", 80);
  const orderDate = cleanDate(body.orderDate);
  const product = await catalogName(cleanText(body.product, "Product", 160));
  const quantities = lineQuantities(body);

  const duplicate = await prisma.pendingOrder.findFirst({
    where: { orderNumber: { equals: orderNumber, mode: "insensitive" } },
  });
  if (duplicate) throw new InventoryError("That order number already exists", 409);

  await prisma.$transaction(async (tx) => {
    const top = await tx.pendingOrder.aggregate({ _min: { sortOrder: true } });
    await tx.pendingOrder.create({
      data: {
        orderNumber,
        orderDate,
        sortOrder: (top._min.sortOrder ?? 0) - 1,
        lines: { create: { product, ...quantities } },
      },
    });
  });

  return getInventory();
}

export async function updateOrder(idValue: string, input: unknown) {
  const body = asRecord(input);
  const id = parseId(idValue);
  const order = await prisma.pendingOrder.findUnique({ where: { id } });
  if (!order) throw new InventoryError("Order not found", 404);

  const data: { orderNumber?: string; orderDate?: Date } = {};
  if (body.orderNumber !== undefined) {
    const orderNumber = cleanText(body.orderNumber, "Order number", 80);
    const duplicate = await prisma.pendingOrder.findFirst({
      where: {
        id: { not: id },
        orderNumber: { equals: orderNumber, mode: "insensitive" },
      },
    });
    if (duplicate) throw new InventoryError("That order number already exists", 409);
    data.orderNumber = orderNumber;
  }
  if (body.orderDate !== undefined) {
    data.orderDate = cleanDate(body.orderDate);
  }
  if (data.orderNumber === undefined && data.orderDate === undefined) {
    throw new InventoryError("Nothing to update", 400);
  }

  await prisma.pendingOrder.update({ where: { id }, data });
  return getInventory();
}

export async function reorderOrders(input: unknown) {
  const body = asRecord(input);
  if (!Array.isArray(body.ids)) throw new InventoryError("Choose an order for the list", 400);

  const ids = body.ids.map((value) => {
    const id = typeof value === "number" ? value : Number(value);
    if (!Number.isInteger(id) || id <= 0) throw new InventoryError("Choose an order for the list", 400);
    return id;
  });
  if (new Set(ids).size !== ids.length) throw new InventoryError("That order list has duplicates", 400);

  const existing = await prisma.pendingOrder.findMany({ select: { id: true } });
  const known = new Set(existing.map((order) => order.id));
  if (existing.length !== ids.length || ids.some((id) => !known.has(id))) {
    throw new InventoryError("The order list changed. Try again.", 409);
  }

  await prisma.$transaction(
    ids.map((id, index) =>
      prisma.pendingOrder.update({
        where: { id },
        data: { sortOrder: index },
      })
    )
  );

  return getInventory();
}

export async function deleteOrder(idValue: string) {
  const id = parseId(idValue);
  const order = await prisma.pendingOrder.findUnique({ where: { id } });
  if (!order) throw new InventoryError("Order not found", 404);
  await prisma.pendingOrder.delete({ where: { id } });
  return getInventory();
}

export async function addOrderLine(input: unknown) {
  const body = asRecord(input);
  const orderId = typeof body.orderId === "number" ? body.orderId : Number(body.orderId);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    throw new InventoryError("Order not found", 404);
  }
  const product = await catalogName(cleanText(body.product, "Product", 160));
  const quantities = lineQuantities(body);

  const order = await prisma.pendingOrder.findUnique({ where: { id: orderId } });
  if (!order) throw new InventoryError("Order not found", 404);

  const duplicate = await prisma.pendingOrderLine.findFirst({
    where: { orderId, product: { equals: product, mode: "insensitive" } },
  });
  if (duplicate) {
    throw new InventoryError("That product is already on this order. Update its filled quantity.", 409);
  }

  await prisma.pendingOrderLine.create({
    data: { orderId, product, ...quantities },
  });
  await prisma.pendingOrder.update({ where: { id: orderId }, data: { updatedAt: new Date() } });
  return getInventory();
}

export async function updateOrderLine(idValue: string, input: unknown) {
  const body = asRecord(input);
  const id = parseId(idValue);
  const line = await prisma.pendingOrderLine.findUnique({ where: { id } });
  if (!line) throw new InventoryError("Product not found", 404);

  const product =
    body.product === undefined ? line.product : await catalogName(cleanText(body.product, "Product", 160));
  const quantities = lineQuantities(body, line);

  if (product.toLowerCase() !== line.product.toLowerCase()) {
    const duplicate = await prisma.pendingOrderLine.findFirst({
      where: {
        orderId: line.orderId,
        id: { not: id },
        product: { equals: product, mode: "insensitive" },
      },
    });
    if (duplicate) throw new InventoryError("That product is already on this order", 409);
  }

  await prisma.pendingOrderLine.update({
    where: { id },
    data: { product, ...quantities },
  });
  await prisma.pendingOrder.update({
    where: { id: line.orderId },
    data: { updatedAt: new Date() },
  });
  return getInventory();
}

export async function deleteOrderLine(idValue: string) {
  const id = parseId(idValue);
  const line = await prisma.pendingOrderLine.findUnique({ where: { id } });
  if (!line) throw new InventoryError("Product not found", 404);
  await prisma.pendingOrderLine.delete({ where: { id } });
  await prisma.pendingOrder.update({
    where: { id: line.orderId },
    data: { updatedAt: new Date() },
  });
  return getInventory();
}

export async function createStock(input: unknown) {
  const body = asRecord(input);
  const product = await catalogName(cleanText(body.product, "Product", 160));
  const quantity = cleanQuantity(body.quantity, "Available units");

  const duplicate = await prisma.stockUnit.findFirst({
    where: { product: { equals: product, mode: "insensitive" } },
  });
  if (duplicate) {
    throw new InventoryError("That product is already in stock. Update its available units.", 409);
  }

  await prisma.stockUnit.create({ data: { product, quantity } });
  return getInventory();
}

export async function updateStock(idValue: string, input: unknown) {
  const body = asRecord(input);
  const id = parseId(idValue);
  const item = await prisma.stockUnit.findUnique({ where: { id } });
  if (!item) throw new InventoryError("Product not found", 404);

  const product =
    body.product === undefined ? item.product : await catalogName(cleanText(body.product, "Product", 160));
  const quantity = body.quantity === undefined ? item.quantity : cleanQuantity(body.quantity, "Available units");

  if (product.toLowerCase() !== item.product.toLowerCase()) {
    const duplicate = await prisma.stockUnit.findFirst({
      where: {
        id: { not: id },
        product: { equals: product, mode: "insensitive" },
      },
    });
    if (duplicate) throw new InventoryError("That product is already in stock", 409);
  }

  await prisma.stockUnit.update({ where: { id }, data: { product, quantity } });
  return getInventory();
}

export async function deleteStock(idValue: string) {
  const id = parseId(idValue);
  const item = await prisma.stockUnit.findUnique({ where: { id } });
  if (!item) throw new InventoryError("Product not found", 404);
  await prisma.stockUnit.delete({ where: { id } });
  return getInventory();
}

export async function createCatalogProduct(input: unknown) {
  const body = asRecord(input);
  const name = cleanText(body.name, "Product", 160);
  const duplicate = await prisma.catalogProduct.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });
  if (duplicate) throw new InventoryError("That product is already in the catalogue", 409);

  await prisma.catalogProduct.create({ data: { name } });
  return getInventory();
}

export async function deleteCatalogProduct(idValue: string) {
  const id = parseId(idValue);
  const item = await prisma.catalogProduct.findUnique({ where: { id } });
  if (!item) throw new InventoryError("Product not found", 404);
  await prisma.catalogProduct.delete({ where: { id } });
  return getInventory();
}
