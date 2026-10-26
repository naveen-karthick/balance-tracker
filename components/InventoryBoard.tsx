"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import ConfirmModal from "@/components/ConfirmModal";
import type { CatalogProduct, InventoryData, InventoryOrder } from "@/types/inventory";

type Tab = "orders" | "stock";
type Sheet = "order" | "stock" | null;
type ConfirmState = {
  title: string;
  message: string;
  run: () => Promise<unknown>;
};

const fieldClass =
  "h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-base text-black outline-none focus:ring-2 focus:ring-black";

function formatCount(value: number): string {
  return value.toLocaleString("en-IN");
}

function SortableOrder({
  id,
  label,
  busy,
  progress,
  onOpen,
  children,
}: {
  id: number;
  label: string;
  busy: boolean;
  progress: number;
  onOpen: () => void;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    position: "relative" as const,
  };
  const pct = Math.round(progress * 100);

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`card relative overflow-hidden ${isDragging ? "opacity-80" : ""}`}
      aria-busy={busy}
    >
      <SavingMark active={busy} />
      <div className="flex items-stretch">
        <button
          type="button"
          ref={setActivatorNodeRef}
          className="flex w-11 shrink-0 touch-none items-center justify-center text-gray-400 active:text-black"
          aria-label={`Reorder ${label}`}
          {...attributes}
          {...listeners}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" className="h-4 w-4" aria-hidden>
            <circle cx="5" cy="3" r="1.15" fill="currentColor" />
            <circle cx="11" cy="3" r="1.15" fill="currentColor" />
            <circle cx="5" cy="8" r="1.15" fill="currentColor" />
            <circle cx="11" cy="8" r="1.15" fill="currentColor" />
            <circle cx="5" cy="13" r="1.15" fill="currentColor" />
            <circle cx="11" cy="13" r="1.15" fill="currentColor" />
          </svg>
        </button>
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 py-4 pr-4 text-left">
          {children}
        </button>
      </div>
      <div className="h-1.5 bg-gray-200" aria-hidden>
        <div className={`h-full ${pct >= 100 ? "bg-green-600" : "bg-black"}`} style={{ width: `${pct}%` }} />
      </div>
    </article>
  );
}

function averageProgress(lines: { filledQuantity: number; totalQuantity: number }[]): number {
  const ratios = lines
    .filter((line) => line.totalQuantity > 0)
    .map((line) => Math.min(1, line.filledQuantity / line.totalQuantity));
  if (ratios.length === 0) return 0;
  return ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length;
}

function withLineQuantities(
  data: InventoryData,
  lineId: number,
  patch: { totalQuantity?: number; filledQuantity?: number }
): InventoryData {
  return {
    ...data,
    orders: data.orders.map((order) => {
      const lines = order.lines.map((line) => {
        if (line.id !== lineId) return line;
        const totalQuantity = patch.totalQuantity ?? line.totalQuantity;
        const filledQuantity = Math.min(patch.filledQuantity ?? line.filledQuantity, totalQuantity);
        return {
          ...line,
          totalQuantity,
          filledQuantity,
          remainingQuantity: totalQuantity - filledQuantity,
        };
      });
      return {
        ...order,
        lines,
        remainingQuantity: lines.reduce((sum, line) => sum + line.remainingQuantity, 0),
      };
    }),
  };
}

function withLineProduct(data: InventoryData, lineId: number, product: string): InventoryData {
  return {
    ...data,
    orders: data.orders.map((order) => ({
      ...order,
      lines: order.lines.map((line) => (line.id === lineId ? { ...line, product } : line)),
    })),
  };
}

function withOrderNumber(data: InventoryData, orderId: number, orderNumber: string): InventoryData {
  return {
    ...data,
    orders: data.orders.map((order) => (order.id === orderId ? { ...order, orderNumber } : order)),
  };
}

function withOrderDate(data: InventoryData, orderId: number, orderDate: string): InventoryData {
  return {
    ...data,
    orders: data.orders.map((order) => (order.id === orderId ? { ...order, orderDate } : order)),
  };
}

function formatOrderDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function todayISO(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function withStockQuantity(data: InventoryData, itemId: number, quantity: number): InventoryData {
  return {
    ...data,
    stock: data.stock.map((item) => (item.id === itemId ? { ...item, quantity } : item)),
  };
}

function withStockProduct(data: InventoryData, itemId: number, product: string): InventoryData {
  return {
    ...data,
    stock: data.stock.map((item) => (item.id === itemId ? { ...item, product } : item)),
  };
}

function visibleOrders(orders: InventoryOrder[], query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return orders.map((order) => ({ order, lines: order.lines }));

  return orders.flatMap((order) => {
    const numberMatch =
      order.orderNumber.toLowerCase().includes(needle) || order.orderDate.includes(needle);
    const lines = numberMatch
      ? order.lines
      : order.lines.filter((line) => line.product.toLowerCase().includes(needle));
    if (!numberMatch && lines.length === 0) return [];
    return [{ order, lines }];
  });
}

function CommitText({
  value,
  onCommit,
  ariaLabel,
  className,
  list,
}: {
  value: string;
  onCommit: (next: string) => void;
  ariaLabel: string;
  className: string;
  list?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <input
      aria-label={ariaLabel}
      list={list}
      autoComplete="off"
      value={draft ?? value}
      onChange={(event) => setDraft(event.target.value)}
      onFocus={() => setDraft(value)}
      onBlur={() => {
        const next = (draft ?? value).trim();
        setDraft(null);
        if (next && next !== value) onCommit(next);
      }}
      className={className}
    />
  );
}

function CommitQuantity({
  value,
  onCommit,
  label,
  max = 1_000_000,
}: {
  value: number;
  onCommit: (next: number) => void;
  label: string;
  max?: number;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const draftRef = useRef<string | null>(null);
  const stepperHandled = useRef(false);
  const limit = Math.min(1_000_000, max);

  const setDraftValue = (next: string | null) => {
    draftRef.current = next;
    setDraft(next);
  };

  const current = () => {
    const raw = draftRef.current;
    if (raw === null || raw === "") return value;
    const next = Number(raw);
    return Number.isInteger(next) ? next : value;
  };

  const commit = (raw: string) => {
    const parsed = raw === "" ? value : Number(raw);
    setDraftValue(null);
    if (!Number.isInteger(parsed) || parsed < 0) return;
    const next = Math.min(limit, parsed);
    if (next === value) return;
    onCommit(next);
  };

  const step = (delta: number) => {
    stepperHandled.current = true;
    const next = Math.min(limit, Math.max(0, current() + delta));
    setDraftValue(null);
    if (next !== value) onCommit(next);
    window.setTimeout(() => {
      stepperHandled.current = false;
    }, 150);
  };

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        data-stepper="true"
        disabled={current() <= 0}
        onPointerDown={(event) => {
          stepperHandled.current = false;
          if (event.pointerType === "mouse") event.preventDefault();
        }}
        onClick={() => step(-1)}
        className="flex h-11 w-11 items-center justify-center rounded-lg border border-gray-300 text-xl font-medium text-black disabled:opacity-40"
      >
        −
      </button>
      <input
        aria-label={label}
        inputMode="numeric"
        value={draft ?? String(value)}
        onChange={(event) => setDraftValue(event.target.value.replace(/\D/g, "").slice(0, 7))}
        onFocus={() => setDraftValue(String(value))}
        onBlur={() => {
          const raw = draftRef.current ?? String(value);
          window.setTimeout(() => {
            if (stepperHandled.current) return;
            commit(raw);
          }, 120);
        }}
        className="h-11 w-16 rounded-lg border border-gray-300 text-center text-base font-semibold text-black outline-none focus:ring-2 focus:ring-black"
      />
      <button
        type="button"
        aria-label={`Increase ${label}`}
        data-stepper="true"
        onPointerDown={(event) => {
          stepperHandled.current = false;
          if (event.pointerType === "mouse") event.preventDefault();
        }}
        onClick={() => step(1)}
        disabled={current() >= limit}
        className="flex h-11 w-11 items-center justify-center rounded-lg border border-gray-300 text-xl font-medium text-black disabled:opacity-40"
      >
        +
      </button>
    </div>
  );
}

function Spinner({ light = false }: { light?: boolean }) {
  return (
    <span
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 ${
        light ? "border-white/40 border-t-white" : "border-gray-300 border-t-black"
      }`}
      aria-hidden
    />
  );
}

function SavingMark({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[inherit] bg-white/75">
      <span className="sr-only">Saving</span>
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-black" />
    </div>
  );
}

function SupplyMeter({
  supplied,
  total,
  compact = false,
}: {
  supplied: number;
  total: number;
  compact?: boolean;
}) {
  const pct = total <= 0 ? 0 : Math.min(100, Math.round((supplied / total) * 100));
  const done = total > 0 && supplied >= total;
  const left = Math.max(0, total - supplied);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className={`font-semibold leading-none tracking-tight text-black ${compact ? "text-lg" : "text-2xl"}`}>
          {formatCount(supplied)}
          <span className={`font-medium text-gray-400 ${compact ? "text-sm" : "text-base"}`}> / {formatCount(total)}</span>
        </p>
        <p className={`text-xs font-semibold uppercase tracking-wide ${done ? "text-green-700" : "text-gray-500"}`}>
          {done ? "Supplied" : `${formatCount(left)} left`}
        </p>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200" aria-hidden>
        <div className={`h-full rounded-full ${done ? "bg-green-600" : "bg-black"}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-gray-400">Supplied / total</p>
    </div>
  );
}

function ChooseProduct({ name, onClick, className }: { name: string; onClick: () => void; className?: string }) {
  return (
    <button type="button" onClick={onClick} className={className ?? `${fieldClass} text-left`}>
      <span className={name ? "text-black" : "text-gray-400"}>{name || "Choose from catalogue"}</span>
    </button>
  );
}

function CatalogueSheet({
  catalog,
  selected,
  onSelect,
  onClose,
  onAdd,
  onDelete,
  isBusy,
}: {
  catalog: CatalogProduct[];
  selected: string;
  onSelect: (name: string) => void;
  onClose: () => void;
  onAdd: (name: string) => Promise<boolean>;
  onDelete: (item: CatalogProduct) => void;
  isBusy: (key: string) => boolean;
}) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const shown = needle
    ? catalog.filter((item) => `${item.code} ${item.name}`.toLowerCase().includes(needle))
    : catalog;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Product catalogue"
        className="flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white p-5 shadow-xl pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:max-w-md sm:rounded-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-10 shrink-0 rounded-full bg-gray-200 sm:hidden" />
        <h2 className="text-lg font-bold text-black">Catalogue</h2>
        <p className="mt-1 text-sm text-gray-600">Choose a product, or add and remove products here.</p>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search catalogue"
          aria-label="Search catalogue"
          className={`${fieldClass} mt-3 shrink-0`}
        />
        <div className="mt-3 min-h-0 flex-1 space-y-1 overflow-y-auto">
          {shown.length === 0 && (
            <p className="py-6 text-center text-sm text-gray-500">
              {catalog.length === 0 ? "No products in the catalogue yet." : "No products match that search."}
            </p>
          )}
          {shown.map((item) => {
            const active = item.name.toLowerCase() === selected.toLowerCase();
            return (
              <div key={item.id} className={`relative flex items-center gap-1 rounded-lg ${active ? "bg-gray-100" : ""}`} aria-busy={isBusy(`catalog:${item.id}`)}>
                <SavingMark active={isBusy(`catalog:${item.id}`)} />
                <button
                  type="button"
                  onClick={() => onSelect(item.name)}
                  className="min-h-11 flex-1 px-3 py-2 text-left text-sm text-black"
                >
                  {item.code ? <span className="mr-2 text-gray-500">{item.code}</span> : null}
                  {item.name}
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${item.name} from catalogue`}
                  onClick={() => onDelete(item)}
                  className="flex h-11 w-11 shrink-0 items-center justify-center text-gray-500"
                >
                  <TrashIcon />
                </button>
              </div>
            );
          })}
        </div>
        <form
          className="mt-3 flex shrink-0 gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const name = String(new FormData(form).get("name") || "").trim();
            if (!name) return;
            void onAdd(name).then((saved) => {
              if (!saved) return;
              form.reset();
              onSelect(name);
            });
          }}
        >
          <input name="name" required placeholder="New product" aria-label="New catalogue product" className={fieldClass} />
          <button type="submit" disabled={isBusy("catalog-add")} className="btn-secondary flex h-11 w-16 shrink-0 items-center justify-center rounded-lg disabled:opacity-60">
            {isBusy("catalog-add") ? <Spinner /> : "Add"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Sheet({
  title,
  onClose,
  busy = false,
  children,
}: {
  title: string;
  onClose: () => void;
  busy?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:max-w-md sm:rounded-lg"
        aria-busy={busy}
        onClick={(event) => event.stopPropagation()}
      >
        <SavingMark active={busy} />
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-gray-200 sm:hidden" />
        <h2 className="mb-4 text-lg font-bold text-black">{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function InventoryBoard() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab: Tab = searchParams.get("tab") === "stock" ? "stock" : "orders";
  const orderView = searchParams.get("view") === "pending" ? "pending" : "all";

  const [board, setBoard] = useState<InventoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyCounts, setBusyCounts] = useState<Record<string, number>>({});
  const [query, setQuery] = useState("");
  const [sheet, setSheet] = useState<Sheet>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [picker, setPicker] = useState<null | { selected: string; onSelect: (name: string) => void }>(null);
  const [newOrderProduct, setNewOrderProduct] = useState("");
  const [newStockProduct, setNewStockProduct] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [editingOrder, setEditingOrder] = useState(false);
  const [draftProduct, setDraftProduct] = useState("");
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const orderSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/inventory");
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(typeof data.error === "string" ? data.error : "Could not load inventory");
        }
        if (!cancelled) setBoard(data as InventoryData);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Could not load inventory");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const isBusy = (key: string) => (busyCounts[key] ?? 0) > 0;

  const selectTab = (next: Tab) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "stock") params.set("tab", "stock");
    else params.delete("tab");
    const nextQuery = params.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  };

  const selectOrderView = (next: "all" | "pending") => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "pending") params.set("view", "pending");
    else params.delete("view");
    const nextQuery = params.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  };

  const reload = async () => {
    const response = await fetch("/api/inventory");
    const data = await response.json().catch(() => ({}));
    if (response.ok) setBoard(data as InventoryData);
  };

  const send = (url: string, method: string, body: unknown, key: string) => {
    setBusyCounts((current) => ({ ...current, [key]: (current[key] ?? 0) + 1 }));
    setError("");
    const job = queue.current.then(async () => {
      try {
        const response = await fetch(url, {
          method,
          headers: body === undefined ? undefined : { "Content-Type": "application/json" },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(typeof data.error === "string" ? data.error : "Could not save");
        }
        setBoard(data as InventoryData);
        return data as InventoryData;
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : "Could not save");
        await reload();
        return null;
      } finally {
        setBusyCounts((current) => ({ ...current, [key]: Math.max(0, (current[key] ?? 1) - 1) }));
      }
    });
    queue.current = job.then(
      () => undefined,
      () => undefined
    );
    return job;
  };

  const orders = board?.orders ?? [];
  const stock = board?.stock ?? [];
  const needle = query.trim().toLowerCase();
  const pendingOrders = orders.filter((order) => order.remainingQuantity > 0);
  const scopedOrders = orderView === "pending" ? pendingOrders : orders;
  const shownOrders = visibleOrders(scopedOrders, query);
  const shownStock = needle
    ? stock.filter((item) => item.product.toLowerCase().includes(needle))
    : stock;
  const pendingUnits = pendingOrders.reduce((sum, order) => sum + order.remainingQuantity, 0);
  const stockUnits = stock.reduce((sum, item) => sum + item.quantity, 0);

  const selectedOrder = orders.find((order) => order.id === selectedOrderId) ?? null;

  const handleOrderDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !board) return;
    const visible = shownOrders.map((item) => item.order);
    const oldIndex = visible.findIndex((order) => order.id === active.id);
    const newIndex = visible.findIndex((order) => order.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const moved = arrayMove(visible, oldIndex, newIndex);
    const movedIds = new Set(moved.map((order) => order.id));
    const placed = [...moved];
    const nextOrders = orders.map((order) => (movedIds.has(order.id) ? placed.shift()! : order));
    setBoard({ ...board, orders: nextOrders });
    void send("/api/inventory/orders/reorder", "PUT", { ids: nextOrders.map((order) => order.id) }, "orders-reorder");
  };

  const openOrder = (id: number) => {
    setSelectedOrderId(id);
    setEditingOrder(false);
    setDraftProduct("");
  };

  const closeOrder = () => {
    setSelectedOrderId(null);
    setEditingOrder(false);
    setDraftProduct("");
  };

  return (
    <div className="pb-28">
      <div className="sticky top-16 z-30 border-b border-gray-200 bg-[#fafafa]/95 backdrop-blur lg:top-0">
        <div className="mx-auto w-full max-w-xl px-4 pb-3 pt-3">
          <h1 className="text-xl font-bold tracking-tight text-black">Orders & Stock</h1>
          <p className="mt-1 text-sm text-gray-600">
            {tab === "orders"
              ? "Order number and date, then a product from the catalogue."
              : "Each product, with the individual units on hand."}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-1 rounded-lg bg-gray-200/70 p-1" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "orders"}
              onClick={() => selectTab("orders")}
              className={`h-11 rounded-md text-sm font-medium ${
                tab === "orders" ? "bg-white text-black shadow-sm" : "text-gray-600"
              }`}
            >
              Orders
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "stock"}
              onClick={() => selectTab("stock")}
              className={`h-11 rounded-md text-sm font-medium ${
                tab === "stock" ? "bg-white text-black shadow-sm" : "text-gray-600"
              }`}
            >
              Stock
            </button>
          </div>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={tab === "orders" ? "Search order or product" : "Search product"}
            aria-label={tab === "orders" ? "Search orders" : "Search stock"}
            className={`${fieldClass} mt-3`}
          />
          {tab === "orders" && (
            <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label="Filter orders">
              <button
                type="button"
                aria-pressed={orderView === "all"}
                onClick={() => selectOrderView("all")}
                className={`h-11 rounded-full px-4 text-sm font-medium ${
                  orderView === "all" ? "bg-black text-white" : "border border-gray-300 bg-white text-gray-700"
                }`}
              >
                All
              </button>
              <button
                type="button"
                aria-pressed={orderView === "pending"}
                onClick={() => selectOrderView("pending")}
                className={`inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-medium ${
                  orderView === "pending" ? "bg-black text-white" : "border border-gray-300 bg-white text-gray-700"
                }`}
              >
                Pending
                <span
                  className={`min-w-5 rounded-full px-1.5 text-xs font-semibold ${
                    orderView === "pending" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {formatCount(pendingOrders.length)}
                </span>
              </button>
            </div>
          )}
          <p className="mt-2 text-xs font-medium text-gray-500">
            {tab === "orders"
              ? orderView === "pending"
                ? `${formatCount(pendingOrders.length)} pending · ${formatCount(pendingUnits)} left`
                : `${formatCount(orders.length)} orders · ${formatCount(pendingUnits)} left`
              : `${formatCount(stock.length)} products · ${formatCount(stockUnits)} units available`}
          </p>
          {error && (
            <p role="alert" className="mt-2 text-sm text-red-600">
              {error}
            </p>
          )}
        </div>
      </div>

      <div className="mx-auto w-full max-w-xl space-y-3 px-4 py-3">
        {loading && <p className="py-8 text-center text-sm text-gray-600">Loading...</p>}

        {!loading && tab === "orders" && shownOrders.length === 0 && (
          <div className="card px-4 py-10 text-center">
            <p className="text-sm font-medium text-black">
              {needle
                ? "No orders match that search"
                : orderView === "pending"
                  ? "No pending orders"
                  : "No orders yet"}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {needle
                ? "Try another order number or product name."
                : orderView === "pending" && orders.length > 0
                  ? "Every order is fully supplied."
                  : "Add an order number, the date, and a product from the catalogue."}
            </p>
          </div>
        )}

        {!loading && tab === "stock" && shownStock.length === 0 && (
          <div className="card px-4 py-10 text-center">
            <p className="text-sm font-medium text-black">
              {stock.length === 0 ? "No stock yet" : "No products match that search"}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {stock.length === 0
                ? "Add a product and how many units are available."
                : "Try another product name."}
            </p>
          </div>
        )}

        {!loading && tab === "orders" && shownOrders.length > 0 && (
          <DndContext sensors={orderSensors} collisionDetection={closestCenter} onDragEnd={handleOrderDragEnd}>
            <SortableContext items={shownOrders.map(({ order }) => order.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3" aria-busy={isBusy("orders-reorder")}>
                {shownOrders.map(({ order }) => (
                  <SortableOrder
                    key={order.id}
                    id={order.id}
                    label={order.orderNumber}
                    busy={isBusy(`order:${order.id}`)}
                    progress={averageProgress(order.lines)}
                    onOpen={() => openOrder(order.id)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="min-w-0 truncate text-base font-semibold text-black">{order.orderNumber}</p>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5 shrink-0 text-gray-400" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </div>
                    {order.lines.length === 0 ? (
                      <p className="mt-2 text-sm text-gray-500">No products</p>
                    ) : (
                      <ul className="mt-3 space-y-2">
                        {order.lines.map((line) => (
                          <li key={line.id} className="flex items-baseline justify-between gap-3">
                            <span className="min-w-0 truncate text-sm text-black">{line.product}</span>
                            <span className="shrink-0 text-sm font-semibold text-black">
                              {formatCount(line.filledQuantity)}
                              <span className="font-medium text-gray-400"> / {formatCount(line.totalQuantity)}</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </SortableOrder>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {!loading &&
          tab === "stock" &&
          shownStock.map((item) => (
            <article key={item.id} className="card relative p-3" aria-busy={isBusy(`stock:${item.id}`)}>
              <SavingMark active={isBusy(`stock:${item.id}`)} />
              <div className="flex items-start gap-2">
                <ChooseProduct
                  name={item.product}
                  onClick={() =>
                    setPicker({
                      selected: item.product,
                      onSelect: (product) => {
                        setPicker(null);
                        if (product === item.product) return;
                        setBoard((current) => (current ? withStockProduct(current, item.id, product) : current));
                        void send(`/api/inventory/stock/${item.id}`, "PATCH", { product }, `stock:${item.id}`);
                      },
                    })
                  }
                  className="h-11 min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 text-left text-base font-semibold"
                />
                <button
                  type="button"
                  aria-label={`Delete ${item.product}`}
                  onClick={() =>
                    setConfirm({
                      title: "Delete stock",
                      message: `Remove ${item.product} from stock?`,
                      run: () => send(`/api/inventory/stock/${item.id}`, "DELETE", undefined, `stock:${item.id}`),
                    })
                  }
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-gray-500"
                >
                  <TrashIcon />
                </button>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Available units
                </span>
                <CommitQuantity
                  value={item.quantity}
                  label={`available units for ${item.product}`}
                  onCommit={(quantity) => {
                    setBoard((current) => (current ? withStockQuantity(current, item.id, quantity) : current));
                    void send(`/api/inventory/stock/${item.id}`, "PATCH", { quantity }, `stock:${item.id}`);
                  }}
                />
              </div>
            </article>
          ))}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:left-64">
        <div className="mx-auto w-full max-w-xl">
          <button
            type="button"
            onClick={() => setSheet(tab === "orders" ? "order" : "stock")}
            className="btn-primary h-12 w-full rounded-lg text-base"
          >
            {tab === "orders" ? "Add order" : "Add stock"}
          </button>
        </div>
      </div>

      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={closeOrder}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Order ${selectedOrder.orderNumber}`}
            className="flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white shadow-xl sm:max-w-md sm:rounded-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 pb-4 pt-5">
              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold text-black">{selectedOrder.orderNumber}</h2>
                {!editingOrder && (
                  <p className="mt-1 text-sm text-gray-600">{formatOrderDate(selectedOrder.orderDate)}</p>
                )}
              </div>
              <button
                type="button"
                onClick={closeOrder}
                aria-label="Close order"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-gray-500"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
              {editingOrder ? (
                <>
                  <label className="block text-sm font-medium text-gray-700">
                    Order number
                    <CommitText
                      value={selectedOrder.orderNumber}
                      ariaLabel="Order number"
                      onCommit={(orderNumber) => {
                        setBoard((current) =>
                          current ? withOrderNumber(current, selectedOrder.id, orderNumber) : current
                        );
                        void send(`/api/inventory/orders/${selectedOrder.id}`, "PATCH", { orderNumber }, `order:${selectedOrder.id}`);
                      }}
                      className={`${fieldClass} mt-1`}
                    />
                  </label>
                  <label className="block text-sm font-medium text-gray-700">
                    Order date
                    <input
                      type="date"
                      aria-label="Order date"
                      value={selectedOrder.orderDate}
                      onChange={(event) => {
                        const orderDate = event.target.value;
                        if (!orderDate) return;
                        setBoard((current) => (current ? withOrderDate(current, selectedOrder.id, orderDate) : current));
                        void send(`/api/inventory/orders/${selectedOrder.id}`, "PATCH", { orderDate }, `order:${selectedOrder.id}`);
                      }}
                      className={`${fieldClass} mt-1`}
                    />
                  </label>
                  <div className="relative" aria-busy={isBusy(`order:${selectedOrder.id}`)}>
                    <SavingMark active={isBusy(`order:${selectedOrder.id}`)} />
                    <p className="text-sm font-medium text-gray-700">Products</p>
                    <div className="mt-2 space-y-3">
                      {selectedOrder.lines.length === 0 && (
                        <p className="text-sm text-gray-500">No products on this order yet.</p>
                      )}
                      {selectedOrder.lines.map((line) => (
                        <div key={line.id} className="relative rounded-lg bg-gray-50 px-3 py-3" aria-busy={isBusy(`line:${line.id}`)}>
                          <SavingMark active={isBusy(`line:${line.id}`)} />
                          <div className="flex items-start gap-2">
                            <ChooseProduct
                              name={line.product}
                              onClick={() =>
                                setPicker({
                                  selected: line.product,
                                  onSelect: (product) => {
                                    setPicker(null);
                                    if (product === line.product) return;
                                    setBoard((current) =>
                                      current ? withLineProduct(current, line.id, product) : current
                                    );
                                    void send(`/api/inventory/lines/${line.id}`, "PATCH", { product }, `line:${line.id}`);
                                  },
                                })
                              }
                              className="h-11 min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 text-left text-base"
                            />
                            <button
                              type="button"
                              aria-label={`Remove ${line.product}`}
                              onClick={() =>
                                setConfirm({
                                  title: "Remove product",
                                  message: `Remove ${line.product} from order ${selectedOrder.orderNumber}?`,
                                  run: () => send(`/api/inventory/lines/${line.id}`, "DELETE", undefined, `line:${line.id}`),
                                })
                              }
                              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-gray-500"
                            >
                              <TrashIcon />
                            </button>
                          </div>
                          <div className="mt-3 space-y-3">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Supplied</span>
                              <CommitQuantity
                                value={line.filledQuantity}
                                max={line.totalQuantity}
                                label={`supplied quantity for ${line.product}`}
                                onCommit={(filledQuantity) => {
                                  setBoard((current) =>
                                    current ? withLineQuantities(current, line.id, { filledQuantity }) : current
                                  );
                                  void send(`/api/inventory/lines/${line.id}`, "PATCH", { filledQuantity }, `line:${line.id}`);
                                }}
                              />
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Total</span>
                              <CommitQuantity
                                value={line.totalQuantity}
                                label={`total quantity for ${line.product}`}
                                onCommit={(totalQuantity) => {
                                  const filledQuantity = Math.min(line.filledQuantity, totalQuantity);
                                  setBoard((current) =>
                                    current
                                      ? withLineQuantities(current, line.id, { totalQuantity, filledQuantity })
                                      : current
                                  );
                                  void send(
                                    `/api/inventory/lines/${line.id}`,
                                    "PATCH",
                                    { totalQuantity, filledQuantity },
                                    `line:${line.id}`
                                  );
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <form
                      className="relative mt-3 space-y-2"
                      aria-busy={isBusy(`order-line:${selectedOrder.id}`)}
                      onSubmit={(event) => {
                        event.preventDefault();
                        const form = event.currentTarget;
                        const data = new FormData(form);
                        if (!draftProduct) {
                          setError("Choose a product from the catalogue");
                          return;
                        }
                        void send(
                          "/api/inventory/lines",
                          "POST",
                          {
                            orderId: selectedOrder.id,
                            product: draftProduct,
                            totalQuantity: data.get("total"),
                            filledQuantity: data.get("filled"),
                          },
                          `order-line:${selectedOrder.id}`
                        ).then((saved) => {
                          if (!saved) return;
                          form.reset();
                          setDraftProduct("");
                        });
                      }}
                    >
                      <SavingMark active={isBusy(`order-line:${selectedOrder.id}`)} />
                      <ChooseProduct
                        name={draftProduct}
                        onClick={() =>
                          setPicker({
                            selected: draftProduct,
                            onSelect: (name) => {
                              setDraftProduct(name);
                              setPicker(null);
                            },
                          })
                        }
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          name="total"
                          required
                          inputMode="numeric"
                          pattern="[0-9]+"
                          placeholder="Total"
                          aria-label="Total quantity"
                          className={fieldClass}
                        />
                        <input
                          name="filled"
                          required
                          inputMode="numeric"
                          pattern="[0-9]+"
                          placeholder="Supplied"
                          defaultValue="0"
                          aria-label="Supplied quantity"
                          className={fieldClass}
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isBusy(`order-line:${selectedOrder.id}`)}
                        className="btn-secondary flex h-11 w-full items-center justify-center rounded-lg disabled:opacity-60"
                      >
                        {isBusy(`order-line:${selectedOrder.id}`) ? <Spinner /> : "Add product"}
                      </button>
                    </form>
                    <button
                      type="button"
                      onClick={() =>
                        setConfirm({
                          title: "Delete order",
                          message: `Delete order ${selectedOrder.orderNumber} and every product on it?`,
                          run: () =>
                            send(`/api/inventory/orders/${selectedOrder.id}`, "DELETE", undefined, `order:${selectedOrder.id}`).then(
                              (saved) => {
                                if (saved) closeOrder();
                              }
                            ),
                        })
                      }
                      className="btn-danger mt-4 h-11 w-full rounded-lg"
                    >
                      Delete order
                    </button>
                  </div>
                </>
              ) : selectedOrder.lines.length === 0 ? (
                <p className="text-sm text-gray-500">No products on this order yet.</p>
              ) : (
                <div className="space-y-3">
                  {selectedOrder.lines.map((line) => (
                    <div key={line.id} className="rounded-lg border border-gray-100 px-3 py-3">
                      <p className="text-sm font-semibold text-black">{line.product}</p>
                      <div className="mt-2">
                        <SupplyMeter supplied={line.filledQuantity} total={line.totalQuantity} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              {editingOrder ? (
                <button type="button" onClick={() => setEditingOrder(false)} className="btn-primary h-12 w-full rounded-lg">
                  Done
                </button>
              ) : (
                <button type="button" onClick={() => setEditingOrder(true)} className="btn-primary h-12 w-full rounded-lg">
                  Edit
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {picker && (
        <CatalogueSheet
          catalog={board?.catalog ?? []}
          selected={picker.selected}
          onClose={() => setPicker(null)}
          onSelect={picker.onSelect}
          onAdd={async (name) => {
            const saved = await send("/api/inventory/catalog", "POST", { name }, "catalog-add");
            return saved !== null;
          }}
          isBusy={isBusy}
          onDelete={(item) =>
            setConfirm({
              title: "Remove from catalogue",
              message: `Remove ${item.name} from the catalogue?`,
              run: () => send(`/api/inventory/catalog/${item.id}`, "DELETE", undefined, `catalog:${item.id}`),
            })
          }
        />
      )}

      {sheet === "order" && (
        <Sheet title="Add order" busy={isBusy("order-add")} onClose={() => setSheet(null)}>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              const orderNumber = String(data.get("orderNumber") || "");
              if (!newOrderProduct) {
                setError("Choose a product from the catalogue");
                return;
              }
              void send(
                "/api/inventory/orders",
                "POST",
                {
                  orderNumber,
                  orderDate: data.get("orderDate"),
                  product: newOrderProduct,
                  totalQuantity: data.get("total"),
                  filledQuantity: data.get("filled"),
                },
                "order-add"
              ).then((saved) => {
                if (!saved) return;
                const created = saved.orders.find(
                  (order) => order.orderNumber.toLowerCase() === orderNumber.trim().toLowerCase()
                );
                setNewOrderProduct("");
                setSheet(null);
                if (created) openOrder(created.id);
              });
            }}
          >
            <label className="block text-sm font-medium text-gray-700">
              Order number
              <input name="orderNumber" required autoComplete="off" className={`${fieldClass} mt-1`} />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Order date
              <input name="orderDate" type="date" required defaultValue={todayISO()} className={`${fieldClass} mt-1`} />
            </label>
            <div className="block text-sm font-medium text-gray-700">
              Product
              <div className="mt-1">
                <ChooseProduct
                  name={newOrderProduct}
                  onClick={() =>
                    setPicker({
                      selected: newOrderProduct,
                      onSelect: (name) => {
                        setNewOrderProduct(name);
                        setPicker(null);
                      },
                    })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-medium text-gray-700">
                Total quantity
                <input
                  name="total"
                  required
                  inputMode="numeric"
                  pattern="[0-9]+"
                  className={`${fieldClass} mt-1`}
                />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                Supplied
                <input
                  name="filled"
                  required
                  inputMode="numeric"
                  pattern="[0-9]+"
                  defaultValue="0"
                  className={`${fieldClass} mt-1`}
                />
              </label>
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setSheet(null)} className="btn-secondary h-12 flex-1 rounded-lg">
                Cancel
              </button>
              <button type="submit" disabled={isBusy("order-add")} className="btn-primary flex h-12 flex-1 items-center justify-center rounded-lg disabled:opacity-60">
                {isBusy("order-add") ? <Spinner light /> : "Save"}
              </button>
            </div>
          </form>
        </Sheet>
      )}

      {sheet === "stock" && (
        <Sheet title="Add stock" busy={isBusy("stock-add")} onClose={() => setSheet(null)}>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              if (!newStockProduct) {
                setError("Choose a product from the catalogue");
                return;
              }
              void send(
                "/api/inventory/stock",
                "POST",
                {
                  product: newStockProduct,
                  quantity: data.get("quantity"),
                },
                "stock-add"
              ).then((saved) => {
                if (!saved) return;
                setNewStockProduct("");
                setSheet(null);
              });
            }}
          >
            <div className="block text-sm font-medium text-gray-700">
              Product
              <div className="mt-1">
                <ChooseProduct
                  name={newStockProduct}
                  onClick={() =>
                    setPicker({
                      selected: newStockProduct,
                      onSelect: (name) => {
                        setNewStockProduct(name);
                        setPicker(null);
                      },
                    })
                  }
                />
              </div>
            </div>
            <label className="block text-sm font-medium text-gray-700">
              Available units
              <input
                name="quantity"
                required
                inputMode="numeric"
                pattern="[0-9]+"
                className={`${fieldClass} mt-1`}
              />
            </label>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setSheet(null)} className="btn-secondary h-12 flex-1 rounded-lg">
                Cancel
              </button>
              <button type="submit" disabled={isBusy("stock-add")} className="btn-primary flex h-12 flex-1 items-center justify-center rounded-lg disabled:opacity-60">
                {isBusy("stock-add") ? <Spinner light /> : "Save"}
              </button>
            </div>
          </form>
        </Sheet>
      )}

      <ConfirmModal
        isOpen={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm?.title ?? ""}
        message={confirm?.message ?? ""}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => {
          if (confirm) void confirm.run();
        }}
      />
    </div>
  );
}

function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-5 w-5">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
      />
    </svg>
  );
}
