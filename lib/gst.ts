export const GST_11 = 0.11;
export const GST_18 = 0.18;

/** Multiply an 11% rate by this to keep the same grand total at 18% GST. */
export const RATE_SCALE = (1 + GST_11) / (1 + GST_18);

const RATE_DECIMALS = 2;

export type GstRow = {
  id: string;
  product: string;
  rate: string;
  quantity: string;
  product18: string | null;
  rate18: string | null;
  quantity18: string | null;
};

export type LineView = {
  product: string;
  rate: string;
  quantity: string;
};

export type SheetTotals = {
  subtotal: number;
  gst: number;
  grand: number;
};

export function createGstRow(): GstRow {
  return {
    id: crypto.randomUUID(),
    product: "",
    rate: "",
    quantity: "",
    product18: null,
    rate18: null,
    quantity18: null,
  };
}

export function isGstRow(value: unknown): value is GstRow {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<GstRow>;
  return (
    typeof row.id === "string" &&
    typeof row.product === "string" &&
    typeof row.rate === "string" &&
    typeof row.quantity === "string" &&
    (row.product18 === null || typeof row.product18 === "string") &&
    (row.rate18 === null || typeof row.rate18 === "string") &&
    (row.quantity18 === null || typeof row.quantity18 === "string")
  );
}

export function parseAmount(value: string): number {
  const cleaned = value.replace(/[₹,\s]/g, "").trim();
  if (!cleaned || cleaned === "." || cleaned === "-" || cleaned === "-.") return 0;
  const amount = Number(cleaned);
  return Number.isFinite(amount) ? amount : 0;
}

export function roundHalfUp(value: number, digits: number): number {
  if (!Number.isFinite(value)) return 0;
  const sign = value < 0 ? -1 : 1;
  const factor = 10 ** digits;
  const shifted = Math.abs(value) * factor;
  const rounded = Math.round(shifted + 1e-9);
  return (sign * rounded) / factor;
}

export function formatNumber(value: number, digits: number): string {
  const rounded = roundHalfUp(value, digits);
  return rounded.toLocaleString("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatRate(value: number, digits = RATE_DECIMALS): string {
  if (!Number.isFinite(value)) return "";
  const rounded = roundHalfUp(value, digits);
  if (rounded === 0) return "";
  const negative = rounded < 0;
  const text = Math.abs(rounded)
    .toFixed(digits)
    .replace(/(\.\d*?[1-9])0+$/, "$1")
    .replace(/\.0+$/, "");
  return negative ? `-${text}` : text;
}

export function formatMoneyRate(value: number): string {
  if (!Number.isFinite(value)) return "";
  const rounded = roundHalfUp(value, RATE_DECIMALS);
  if (rounded === 0) return "";
  return rounded.toFixed(RATE_DECIMALS);
}

export function scaledRateString(rate: string): string {
  const amount = parseAmount(rate);
  if (!amount) return "";
  return formatMoneyRate(amount * RATE_SCALE);
}

/** Whole rupees. Paise are ignored when deciding whether the two sheets agree. */
export function wholeRupees(grand: number): number {
  return roundHalfUp(grand, 0);
}

export function sheetTotals(lines: Pick<LineView, "rate" | "quantity">[], gstRate: number): SheetTotals {
  const subtotal = lines.reduce(
    (sum, line) => sum + parseAmount(line.rate) * parseAmount(line.quantity),
    0,
  );
  return {
    subtotal,
    gst: subtotal * gstRate,
    grand: subtotal * (1 + gstRate),
  };
}

export function displayedGrand(grand: number): number {
  return roundHalfUp(grand, 2);
}

export function view11(row: GstRow): LineView {
  return {
    product: row.product,
    rate: row.rate,
    quantity: row.quantity,
  };
}

function grandAmount(lines: LineView[], gstRate: number): number {
  return sheetTotals(lines, gstRate).grand;
}

/**
 * 18% rates stay at 2 decimals. Automatic rates are scaled from the 11% sheet,
 * then shifted by one paisa at a time until the whole-rupee grand totals match.
 * A rate typed on the 18% sheet is left as entered.
 */
export function view18Lines(rows: GstRow[]): LineView[] {
  const lines = rows.map((row) => ({
    product: row.product18 ?? row.product,
    rate: row.rate18 ?? scaledRateString(row.rate),
    quantity: row.quantity18 ?? row.quantity,
  }));

  const adjustable = rows
    .map((row, index) => ({ row, index }))
    .filter(({ row, index }) => {
      if (row.rate18 !== null) return false;
      const quantity = parseAmount(lines[index].quantity);
      const rate = parseAmount(lines[index].rate);
      return quantity > 0 && rate > 0;
    });
  if (adjustable.length === 0) return lines;

  const target = wholeRupees(grandAmount(rows.map(view11), GST_11));
  const basePaise = adjustable.map(({ index }) => Math.round(parseAmount(lines[index].rate) * 100));

  const withPaise = (paise: number[]): LineView[] => {
    const next = lines.map((line) => ({ ...line }));
    adjustable.forEach(({ index }, slot) => {
      next[index] = { ...next[index], rate: (paise[slot] / 100).toFixed(RATE_DECIMALS) };
    });
    return next;
  };

  const distance = (paise: number[]) =>
    Math.abs(wholeRupees(grandAmount(withPaise(paise), GST_18)) - target);

  let best = basePaise;
  let bestDistance = distance(best);
  if (bestDistance === 0) return withPaise(best);

  const seen = new Set<string>([best.join(",")]);
  const queue = [best];
  let scanned = 0;

  while (queue.length > 0 && scanned < 20000 && bestDistance !== 0) {
    const current = queue.shift();
    if (!current) break;
    scanned += 1;
    for (let slot = 0; slot < current.length; slot += 1) {
      for (const step of [-1, 1]) {
        const next = current.slice();
        next[slot] += step;
        if (next[slot] < 1 || Math.abs(next[slot] - basePaise[slot]) > 40) continue;
        const key = next.join(",");
        if (seen.has(key)) continue;
        seen.add(key);
        const nextDistance = distance(next);
        if (nextDistance < bestDistance) {
          best = next;
          bestDistance = nextDistance;
          if (nextDistance === 0) return withPaise(next);
        }
        queue.push(next);
      }
    }
  }

  return withPaise(best);
}
