"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createColumnHelper,
  flexRender,
  tableFeatures,
  useTable,
  type ColumnDef,
} from "@tanstack/react-table";
import ConfirmModal from "@/components/ConfirmModal";
import PriceListModal from "@/components/PriceListModal";
import { findPrice, type PriceItem } from "@/lib/priceList";
import {
  GST_11,
  GST_18,
  createGstRow,
  displayedGrand,
  formatNumber,
  isGstRow,
  parseAmount,
  roundHalfUp,
  scaledRateString,
  sheetTotals,
  view11,
  view18Lines,
  wholeRupees,
  type GstRow,
  type SheetTotals,
} from "@/lib/gst";

const STORAGE_KEY = "gst-sheet-v1";

type GstTableMeta = {
  updateRow: (id: string, patch: Partial<GstRow>) => void;
  removeRow: (id: string) => void;
  openPriceList: (rowId: string) => void;
};

type SheetRow = {
  id: string;
  product11: string;
  rate11: string;
  quantity11: string;
  product18: string;
  rate18: string;
  quantity18: string;
  product18Edited: boolean;
  rate18Edited: boolean;
  quantity18Edited: boolean;
};

const features = tableFeatures({
  tableMeta: {} as GstTableMeta,
});

const columnHelper = createColumnHelper<typeof features, SheetRow>();

function loadStoredRows(): GstRow[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0 || !parsed.every(isGstRow)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function moveToNextInput(event: React.KeyboardEvent<HTMLInputElement>) {
  if (event.key !== "Enter") return;
  event.preventDefault();
  const table = event.currentTarget.closest("table");
  if (!table) return;
  const inputs = Array.from(table.querySelectorAll("input"));
  const index = inputs.indexOf(event.currentTarget);
  inputs[index + 1]?.focus();
}

function SheetInput({
  value,
  onChange,
  label,
  align = "left",
  decimal = false,
  edited = false,
  focusToken,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  align?: "left" | "right";
  decimal?: boolean;
  edited?: boolean;
  focusToken?: string;
}) {
  return (
    <input
      value={value}
      aria-label={label}
      data-focus={focusToken}
      inputMode={decimal ? "decimal" : "text"}
      autoComplete="off"
      spellCheck={decimal ? false : undefined}
      onChange={(event) => onChange(event.target.value)}
      onFocus={(event) => event.currentTarget.select()}
      onKeyDown={moveToNextInput}
      className={`box-border h-10 w-full min-w-0 bg-transparent px-3 text-sm text-black outline-none focus:bg-gray-50 ${
        align === "right" ? "text-right tabular-nums" : "text-left"
      } ${edited ? "bg-amber-50 focus:bg-amber-100" : ""}`}
    />
  );
}

function ProductCell({
  value,
  label,
  focusToken,
  onChange,
  onOpenPriceList,
}: {
  value: string;
  label: string;
  focusToken: string;
  onChange: (value: string) => void;
  onOpenPriceList: () => void;
}) {
  const match = findPrice(value);
  const missing = value.trim() !== "" && !match;
  const title = match
    ? `${match.name}, rate ${match.rate}`
    : missing
      ? "No rate for this product. Open the price list."
      : "View price list";

  return (
    <div className="flex h-10 items-center">
      <input
        value={value}
        aria-label={label}
        title={match ? title : undefined}
        data-focus={focusToken}
        autoComplete="off"
        onChange={(event) => onChange(event.target.value)}
        onFocus={(event) => event.currentTarget.select()}
        onKeyDown={moveToNextInput}
        className="box-border h-10 min-w-0 flex-1 bg-transparent px-3 text-sm text-black outline-none focus:bg-gray-50"
      />
      <button
        type="button"
        onClick={onOpenPriceList}
        title={title}
        aria-label={title}
        className={`flex h-10 w-9 shrink-0 items-center justify-center ${
          missing ? "text-orange-600 hover:bg-orange-50" : "text-gray-400 hover:bg-gray-100 hover:text-black"
        }`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
        </svg>
      </button>
    </div>
  );
}

function TotalCell({ rate, quantity }: { rate: string; quantity: string }) {
  const total = parseAmount(rate) * parseAmount(quantity);
  return (
    <div className="flex h-10 items-center justify-end px-3 text-right text-sm tabular-nums text-black">
      {formatNumber(total, 2)}
    </div>
  );
}

const columns11 = columnHelper.columns([
  columnHelper.accessor("product11", {
    id: "product11",
    header: "Product",
    cell: (info) => (
      <ProductCell
        value={info.getValue()}
        label={`Product ${info.row.index + 1}`}
        focusToken={info.row.original.id}
        onChange={(product) => {
          const previous = info.row.original.product11;
          const currentRate = info.row.original.rate11;
          const match = findPrice(product);
          const previousMatch = findPrice(previous);
          const patch: Partial<GstRow> = { product };
          if (match) {
            patch.rate = match.rate;
          } else if (previousMatch && currentRate === previousMatch.rate) {
            patch.rate = "";
          }
          info.table.options.meta?.updateRow(info.row.original.id, patch);
        }}
        onOpenPriceList={() => info.table.options.meta?.openPriceList(info.row.original.id)}
      />
    ),
  }),
  columnHelper.accessor("rate11", {
    id: "rate11",
    header: "Rate",
    cell: (info) => (
      <SheetInput
        value={info.getValue()}
        label={`Rate ${info.row.index + 1}`}
        align="right"
        decimal
        onChange={(rate) => info.table.options.meta?.updateRow(info.row.original.id, { rate })}
      />
    ),
  }),
  columnHelper.accessor("quantity11", {
    id: "quantity11",
    header: "Quantity",
    cell: (info) => (
      <SheetInput
        value={info.getValue()}
        label={`Quantity ${info.row.index + 1}`}
        align="right"
        decimal
        onChange={(quantity) =>
          info.table.options.meta?.updateRow(info.row.original.id, { quantity })
        }
      />
    ),
  }),
  columnHelper.display({
    id: "total11",
    header: "Total",
    cell: (info) => <TotalCell rate={info.row.original.rate11} quantity={info.row.original.quantity11} />,
  }),
  columnHelper.display({
    id: "actions",
    header: () => <span className="sr-only">Remove</span>,
    cell: (info) => (
      <button
        type="button"
        aria-label={`Remove ${info.row.original.product11 || "product"} ${info.row.index + 1}`}
        onClick={() => info.table.options.meta?.removeRow(info.row.original.id)}
        className="mx-auto flex h-9 w-9 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-black"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
          <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
        </svg>
      </button>
    ),
  }),
]);

const columns18 = columnHelper.columns([
  columnHelper.accessor("product18", {
    id: "product18",
    header: "Product",
    cell: (info) => (
      <SheetInput
        value={info.getValue()}
        label={`18% product ${info.row.index + 1}`}
        edited={info.row.original.product18Edited}
        onChange={(value) =>
          info.table.options.meta?.updateRow(info.row.original.id, {
            product18: value === info.row.original.product11 ? null : value,
          })
        }
      />
    ),
  }),
  columnHelper.accessor("rate18", {
    id: "rate18",
    header: "Rate",
    cell: (info) => (
      <SheetInput
        value={info.getValue()}
        label={`18% rate ${info.row.index + 1}`}
        align="right"
        decimal
        edited={info.row.original.rate18Edited}
        onChange={(value) =>
          info.table.options.meta?.updateRow(info.row.original.id, {
            rate18: value === scaledRateString(info.row.original.rate11) ? null : value,
          })
        }
      />
    ),
  }),
  columnHelper.accessor("quantity18", {
    id: "quantity18",
    header: "Quantity",
    cell: (info) => (
      <SheetInput
        value={info.getValue()}
        label={`18% quantity ${info.row.index + 1}`}
        align="right"
        decimal
        edited={info.row.original.quantity18Edited}
        onChange={(value) =>
          info.table.options.meta?.updateRow(info.row.original.id, {
            quantity18: value === info.row.original.quantity11 ? null : value,
          })
        }
      />
    ),
  }),
  columnHelper.display({
    id: "total18",
    header: "Total",
    cell: (info) => <TotalCell rate={info.row.original.rate18} quantity={info.row.original.quantity18} />,
  }),
]);

function formatGap(difference: number): string {
  const text = formatNumber(Math.abs(difference), 2);
  if (difference > 0) return `+${text}`;
  if (difference < 0) return `−${text}`;
  return text;
}

function formatSignedInr(difference: number): string {
  const text = formatNumber(Math.abs(difference), 2);
  if (difference > 0) return `+₹${text}`;
  if (difference < 0) return `−₹${text}`;
  return `₹${text}`;
}

function SheetTable({
  data,
  columns,
  meta,
  gstLabel,
  totals,
  gap,
}: {
  data: SheetRow[];
  columns: Array<ColumnDef<typeof features, SheetRow, any>>;
  meta: GstTableMeta;
  gstLabel: string;
  totals: SheetTotals;
  gap?: number;
}) {
  const table = useTable({
    features,
    data,
    columns,
    meta,
    getRowId: (row) => row.id,
  });

  const hasActions = columns.some((column) => column.id === "actions");

  const cellBorder = "border border-gray-300";

  return (
    <div className="overflow-x-auto">
      <table className="w-full table-fixed border-collapse">
        <colgroup>
          <col />
          <col style={{ width: "8.5rem" }} />
          <col style={{ width: "9.5rem" }} />
          <col style={{ width: "9.5rem" }} />
          {hasActions ? <col style={{ width: "2.75rem" }} /> : null}
        </colgroup>
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const numeric = header.column.id !== "product11" && header.column.id !== "product18" && header.column.id !== "actions";
                return (
                  <th
                    key={header.id}
                    scope="col"
                    className={`${cellBorder} overflow-hidden bg-gray-100 px-3 py-2 text-xs font-semibold uppercase text-gray-600 ${
                      numeric ? "text-right" : "text-left"
                    }`}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className={`${cellBorder} px-3 py-8 text-center text-sm text-gray-500`}>
                Add a product to start the sheet.
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getAllCells().map((cell) => (
                  <td key={cell.id} className={`${cellBorder} overflow-hidden bg-white p-0 align-middle`}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={2} className={cellBorder} />
            <td className={`${cellBorder} bg-gray-50 px-3 py-2 text-right text-sm text-gray-600`}>Total</td>
            <td className={`${cellBorder} bg-gray-50 px-3 py-2 text-right text-sm tabular-nums text-black`}>
              {formatNumber(totals.subtotal, 2)}
            </td>
            {hasActions ? <td className={`${cellBorder} bg-gray-50`} /> : null}
          </tr>
          <tr>
            <td colSpan={2} className={cellBorder} />
            <td className={`${cellBorder} px-3 py-2 text-right text-sm text-gray-600`}>{gstLabel}</td>
            <td className={`${cellBorder} px-3 py-2 text-right text-sm tabular-nums text-black`}>
              {formatNumber(totals.gst, 3)}
            </td>
            {hasActions ? <td className={cellBorder} /> : null}
          </tr>
          <tr>
            <td colSpan={2} className={cellBorder} />
            <td className={`${cellBorder} bg-gray-100 px-3 py-2.5 text-right text-sm font-semibold text-black`}>Grand Total</td>
            <td className={`${cellBorder} bg-gray-100 px-3 py-2.5 text-right text-sm font-semibold tabular-nums text-black`}>
              {formatNumber(totals.grand, 2)}
            </td>
            {hasActions ? <td className={`${cellBorder} bg-gray-100`} /> : null}
          </tr>
          {gap !== undefined && gap !== 0 ? (
            <tr>
              <td colSpan={2} className={cellBorder} />
              <td className={`${cellBorder} px-3 py-2 text-right text-sm text-orange-700`}>vs 11% total</td>
              <td className={`${cellBorder} px-3 py-2 text-right text-sm tabular-nums text-orange-700`}>{formatGap(gap)}</td>
            </tr>
          ) : null}
        </tfoot>
      </table>
    </div>
  );
}

export function GstWorksheet() {
  const [rows, setRows] = useState<GstRow[]>([]);
  const [ready, setReady] = useState(false);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [priceListOpen, setPriceListOpen] = useState(false);
  const [priceListRowId, setPriceListRowId] = useState<string | null>(null);

  useEffect(() => {
    const stored = loadStoredRows();
    setRows(stored ?? [createGstRow()]);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  }, [ready, rows]);

  useEffect(() => {
    if (!focusId) return;
    document.querySelector<HTMLInputElement>(`[data-focus="${focusId}"]`)?.focus();
    setFocusId(null);
  }, [focusId, rows]);

  const updateRow = useCallback((id: string, patch: Partial<GstRow>) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }, []);

  const removeRow = useCallback((id: string) => {
    setRows((current) => current.filter((row) => row.id !== id));
  }, []);

  const openPriceList = useCallback((rowId: string) => {
    setPriceListRowId(rowId);
    setPriceListOpen(true);
  }, []);

  const meta = useMemo<GstTableMeta>(
    () => ({ updateRow, removeRow, openPriceList }),
    [updateRow, removeRow, openPriceList],
  );

  const applyPrice = useCallback((item: PriceItem) => {
    const product = item.code || item.name;
    setRows((current) => {
      const targetId = priceListRowId ?? current.find((row) => !row.product.trim())?.id;
      if (!targetId) {
        return [...current, { ...createGstRow(), product, rate: item.rate }];
      }
      return current.map((row) => (row.id === targetId ? { ...row, product, rate: item.rate } : row));
    });
    setPriceListOpen(false);
  }, [priceListRowId]);

  const addRow = useCallback(() => {
    const row = createGstRow();
    setRows((current) => [...current, row]);
    setFocusId(row.id);
  }, []);

  const resetRates = useCallback(() => {
    setRows((current) => current.map((row) => ({ ...row, rate18: null })));
  }, []);

  const clearSheet = useCallback(() => {
    const row = createGstRow();
    setRows([row]);
    setFocusId(row.id);
  }, []);

  const model = useMemo(() => {
    const lines11 = rows.map(view11);
    const lines18 = view18Lines(rows);
    const totals11 = sheetTotals(lines11, GST_11);
    const totals18 = sheetTotals(lines18, GST_18);
    const grand11 = displayedGrand(totals11.grand);
    const grand18 = displayedGrand(totals18.grand);
    const tableRows: SheetRow[] = rows.map((row, index) => ({
      id: row.id,
      product11: row.product,
      rate11: row.rate,
      quantity11: row.quantity,
      product18: lines18[index]?.product ?? "",
      rate18: lines18[index]?.rate ?? "",
      quantity18: lines18[index]?.quantity ?? "",
      product18Edited: row.product18 !== null,
      rate18Edited: row.rate18 !== null,
      quantity18Edited: row.quantity18 !== null,
    }));

    return {
      tableRows,
      totals11,
      totals18,
      grand11,
      grand18,
      difference: roundHalfUp(grand18 - grand11, 2),
      wholeGap: wholeRupees(totals18.grand) - wholeRupees(totals11.grand),
      hasCustomRates: rows.some((row) => row.rate18 !== null),
      hasEdits: rows.some((row) => row.rate18 !== null || row.product18 !== null || row.quantity18 !== null),
      active: totals11.subtotal !== 0 || totals18.subtotal !== 0,
    };
  }, [rows]);

  const wholesMatch = model.active && model.wholeGap === 0;
  const differenceHint = !model.active
    ? "Add a product to compare"
    : wholesMatch
      ? "Whole rupees match"
      : model.wholeGap > 0
        ? "18% is higher — lower a rate"
        : "18% is lower — raise a rate";

  const downloadPdf = async () => {
    const lines11 = rows.map(view11);
    const lines18 = view18Lines(rows);
    const { downloadGstPdf } = await import("@/lib/gstPdf");
    downloadGstPdf([
      { title: "GST 11%", gstLabel: "GST 11%", lines: lines11, totals: sheetTotals(lines11, GST_11) },
      { title: "GST 18%", gstLabel: "GST 18%", lines: lines18, totals: sheetTotals(lines18, GST_18) },
    ]);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-black">GST Sheet</h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Type a product code and the rate fills in from the Jayam Agency price list. The list
            icon opens the full table when a code is not on it. The first sheet adds 11% GST, and
            the second sheet uses 18% with rates kept to 2 decimals so the whole-rupee totals match. Paise can differ.
          </p>
          <p className="mt-1 text-xs text-gray-400">Saved in this browser.</p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={downloadPdf}
            className="rounded-lg bg-black px-3 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Download PDF
          </button>
          <button
            type="button"
            onClick={() => {
              setPriceListRowId(null);
              setPriceListOpen(true);
            }}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-black hover:bg-gray-50"
          >
            Price list
          </button>
          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Clear
          </button>
        </div>
      </div>

      {ready ? (
        <>
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">11% grand total</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-black">₹{formatNumber(model.grand11, 2)}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">18% grand total</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-black">₹{formatNumber(model.grand18, 2)}</p>
            </div>
            <div
              className={`rounded-xl border px-4 py-3 ${
                  !model.active
                  ? "border-gray-200 bg-white"
                  : wholesMatch
                    ? "border-green-200 bg-green-50"
                    : "border-orange-200 bg-orange-50"
              }`}
            >
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Difference</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-black">
                {wholesMatch || !model.active ? "₹0" : formatSignedInr(model.wholeGap).replace(".00", "")}
              </p>
              <p
                className={`mt-0.5 text-xs ${
                  wholesMatch
                    ? "text-green-700"
                    : model.active
                      ? "text-orange-700"
                      : "text-gray-500"
                }`}
              >
                {differenceHint}
              </p>
            </div>
          </div>

          <section className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-4 py-3">
              <h2 className="text-base font-semibold text-black">GST 11%</h2>
            </div>
            <SheetTable
              data={model.tableRows}
              columns={columns11}
              meta={meta}
              gstLabel="GST 11%"
              totals={model.totals11}
            />
            <div className="border-t border-gray-100 px-4 py-3">
              <button
                type="button"
                onClick={addRow}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-black hover:bg-gray-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                  <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                </svg>
                Add product
              </button>
            </div>
          </section>

          <section className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
              <div>
                <h2 className="text-base font-semibold text-black">GST 18%</h2>
                <p className="text-xs text-gray-500">
                  {model.hasEdits
                    ? "Amber cells are values you changed. Reset rates to approximate the 11% total again."
                    : "Rates stay at 2 decimals. Whole rupees are matched; paise can differ."}
                </p>
              </div>
              <button
                type="button"
                onClick={resetRates}
                disabled={!model.hasCustomRates}
                className="shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-black hover:bg-gray-50 disabled:cursor-default disabled:text-gray-400 disabled:hover:bg-transparent"
              >
                Reset rates
              </button>
            </div>
            <SheetTable
              data={model.tableRows}
              columns={columns18}
              meta={meta}
              gstLabel="GST 18%"
              totals={model.totals18}
              gap={model.wholeGap === 0 ? 0 : model.difference}
            />
          </section>
        </>
      ) : (
        <p className="mt-6 text-sm text-gray-500">Loading sheet…</p>
      )}

      <PriceListModal
        isOpen={priceListOpen}
        onClose={() => setPriceListOpen(false)}
        onSelect={applyPrice}
      />
      <ConfirmModal
        isOpen={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={clearSheet}
        title="Clear this sheet?"
        message="This removes every product from both the 11% and 18% sheets."
        confirmLabel="Clear sheet"
        variant="danger"
      />
    </div>
  );
}
