import {
  createGstRow,
  parseAmount,
  view18Lines,
  type GstRow,
  type LineView,
} from "@/lib/gst";

export const GST_PDF_MARGIN_MM = 14;
export const GST_PDF_COLUMN_MM = [70, 35, 40, 35] as const;

const MARKER = "GSTSHEET:";
const MM_TO_PT = 72 / 25.4;
const MAX_ROWS = 500;

type TextItem = { x: number; y: number; text: string };
type Column = 0 | 1 | 2 | 3 | "title";
type LineCells = { y: number; cells: Map<Column, string> };

export function encodeGstSheet(rows: GstRow[]): string {
  const payload = {
    v: 1,
    rows: rows.map((row) => ({
      product: row.product,
      rate: row.rate,
      quantity: row.quantity,
      product18: row.product18,
      rate18: row.rate18,
      quantity18: row.quantity18,
    })),
  };
  return MARKER + bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
}

export async function restoreGstSheet(buffer: ArrayBuffer): Promise<GstRow[]> {
  const pdf = bytesToLatin1(new Uint8Array(buffer));
  if (!pdf.includes("%PDF")) {
    throw new Error("This file is not a PDF.");
  }

  const embedded = decodeEmbeddedRows(pdf);
  if (embedded) return embedded;

  const sheets = await readVisibleSheets(pdf);
  if (!sheets) {
    throw new Error("This PDF is not a GST sheet from this page.");
  }
  return rowsFromSheets(sheets.lines11, sheets.lines18);
}

function decodeEmbeddedRows(pdf: string): GstRow[] | null {
  const match = pdf.match(/\/(?:Subject|Keywords) \(GSTSHEET:([A-Za-z0-9_-]+)\)/);
  if (!match) return null;
  try {
    const json = new TextDecoder().decode(base64UrlToBytes(match[1]));
    const parsed: unknown = JSON.parse(json);
    if (!parsed || typeof parsed !== "object") return null;
    const record = parsed as { v?: unknown; rows?: unknown };
    if (record.v !== 1 || !Array.isArray(record.rows)) return null;
    if (record.rows.length > MAX_ROWS) {
      throw new Error("This GST sheet has too many products to restore.");
    }
    const rows = record.rows.map(payloadRow);
    if (rows.some((row) => row === null)) return null;
    return rows.length > 0 ? (rows as GstRow[]) : [createGstRow()];
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("This GST sheet")) throw error;
    return null;
  }
}

function payloadRow(value: unknown): GstRow | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.product !== "string" || typeof row.rate !== "string" || typeof row.quantity !== "string") {
    return null;
  }
  if (!optionalString(row.product18) || !optionalString(row.rate18) || !optionalString(row.quantity18)) {
    return null;
  }
  return {
    ...createGstRow(),
    product: row.product,
    rate: row.rate,
    quantity: row.quantity,
    product18: row.product18 as string | null,
    rate18: row.rate18 as string | null,
    quantity18: row.quantity18 as string | null,
  };
}

function optionalString(value: unknown): boolean {
  return value === null || typeof value === "string";
}

function rowsFromSheets(lines11: LineView[], lines18: LineView[]): GstRow[] {
  if (lines11.length > MAX_ROWS) {
    throw new Error("This GST sheet has too many products to restore.");
  }
  let rows = lines11.map((line) => ({
    ...createGstRow(),
    product: line.product,
    rate: line.rate,
    quantity: line.quantity,
  }));

  // 18% rates in the PDF already include paisa adjustments. Lock only the cells
  // that still differ after each pass, so untouched rates stay automatic.
  for (let pass = 0; pass <= rows.length; pass += 1) {
    const computed = view18Lines(rows);
    let locked = false;
    rows = rows.map((row, index) => {
      const pdf = lines18[index];
      const auto = computed[index];
      if (!pdf || !auto) return row;
      const next = { ...row };
      if (row.product18 === null && pdf.product !== auto.product) {
        next.product18 = pdf.product;
        locked = true;
      }
      if (row.rate18 === null && !sameAmount(pdf.rate, auto.rate)) {
        next.rate18 = pdf.rate;
        locked = true;
      }
      if (row.quantity18 === null && pdf.quantity !== auto.quantity) {
        next.quantity18 = pdf.quantity;
        locked = true;
      }
      return next;
    });
    if (!locked) break;
  }

  return rows.length > 0 ? rows : [createGstRow()];
}

function sameAmount(left: string, right: string): boolean {
  return Math.abs(parseAmount(left) - parseAmount(right)) < 0.001;
}

async function readVisibleSheets(pdf: string): Promise<{ lines11: LineView[]; lines18: LineView[] } | null> {
  const streams = streamSlices(pdf);
  const lines11: LineView[] = [];
  const lines18: LineView[] = [];
  let sawSheet = false;
  let current: "11" | "18" | null = null;

  for (const slice of streams) {
    const content = await streamText(slice);
    if (!content) continue;
    for (const line of tableLines(extractTextItems(content))) {
      const section = sectionTitle(line);
      if (section) {
        sawSheet = true;
        current = section;
        continue;
      }
      if (!current || isHeader(line) || isFooter(line)) continue;
      const product = line.cells.get(0) ?? "";
      const rate = line.cells.get(1) ?? "";
      const quantity = line.cells.get(2) ?? "";
      if (product === "" && rate === "" && quantity === "") continue;
      (current === "11" ? lines11 : lines18).push({ product, rate, quantity });
    }
  }

  if (!sawSheet) return null;
  return { lines11, lines18 };
}

function sectionTitle(line: LineCells): "11" | "18" | null {
  const title = line.cells.get("title") ?? "";
  if (title === "GST 11%") return "11";
  if (title === "GST 18%") return "18";
  return null;
}

function isHeader(line: LineCells): boolean {
  return line.cells.get(0) === "Product" && line.cells.get(1) === "Rate";
}

function isFooter(line: LineCells): boolean {
  const label = line.cells.get(2) ?? "";
  return label === "Total" || label === "Grand Total" || /^GST \d+%$/.test(label);
}

function tableLines(items: TextItem[]): LineCells[] {
  const groups: LineCells[] = [];
  const sorted = items.filter((item) => item.text.trim() !== "").sort((a, b) => b.y - a.y || a.x - b.x);
  for (const item of sorted) {
    const column = columnOf(item.x);
    if (column === null) continue;
    let group = groups.find((candidate) => Math.abs(candidate.y - item.y) < 0.8);
    if (!group) {
      group = { y: item.y, cells: new Map() };
      groups.push(group);
    }
    const previous = group.cells.get(column);
    group.cells.set(column, previous ? `${previous} ${item.text}` : item.text);
  }
  groups.sort((a, b) => b.y - a.y);

  const merged: LineCells[] = [];
  for (const group of groups) {
    const keys = [...group.cells.keys()];
    const onlyProduct = keys.length === 1 && keys[0] === 0;
    const previous = merged[merged.length - 1];
    const gap = previous ? previous.y - group.y : 0;
    if (
      onlyProduct &&
      previous &&
      previous.cells.has(0) &&
      !isHeader(previous) &&
      !isFooter(previous) &&
      !sectionTitle(previous) &&
      gap > 2 &&
      gap < 18
    ) {
      previous.cells.set(0, `${previous.cells.get(0)} ${group.cells.get(0)}`);
      previous.y = group.y;
      continue;
    }
    merged.push(group);
  }
  return merged;
}

function columnOf(x: number): Column | null {
  const left = GST_PDF_MARGIN_MM * MM_TO_PT;
  if (x < left + 4) return "title";
  let start = left;
  for (let index = 0; index < GST_PDF_COLUMN_MM.length; index += 1) {
    const end = start + GST_PDF_COLUMN_MM[index] * MM_TO_PT;
    const slack = index === GST_PDF_COLUMN_MM.length - 1 ? 4 : 0.75;
    if (x >= start - 0.75 && x < end + slack) return index as Column;
    start = end;
  }
  return null;
}

type StreamSlice = { dict: string; data: Uint8Array };

function streamSlices(pdf: string): StreamSlice[] {
  const slices: StreamSlice[] = [];
  let index = 0;
  while (index < pdf.length) {
    const start = pdf.indexOf("stream", index);
    if (start < 0) break;
    const boundary = start === 0 || /[\s\r\n]/.test(pdf[start - 1]);
    const after = pdf[start + 6] ?? "";
    if (!boundary || (after !== "\n" && after !== "\r" && !/\s/.test(after))) {
      index = start + 6;
      continue;
    }
    let dataStart = start + 6;
    if (pdf[dataStart] === "\r") dataStart += 1;
    if (pdf[dataStart] === "\n") dataStart += 1;
    const end = pdf.indexOf("endstream", dataStart);
    if (end < 0) break;
    let dataEnd = end;
    if (pdf[dataEnd - 1] === "\n") dataEnd -= 1;
    if (pdf[dataEnd - 1] === "\r") dataEnd -= 1;
    const close = pdf.lastIndexOf(">>", start);
    const open = close >= 0 ? pdf.lastIndexOf("<<", close) : -1;
    const dict = open >= 0 && start - close < 40 ? pdf.slice(open, close + 2) : "";
    slices.push({ dict, data: latin1ToBytes(pdf.slice(dataStart, dataEnd)) });
    index = end + 9;
  }
  return slices;
}

async function streamText(slice: StreamSlice): Promise<string | null> {
  if (/\/Subtype\s*\/Image/.test(slice.dict)) return null;
  let bytes = slice.data;
  if (/FlateDecode/.test(slice.dict)) {
    try {
      bytes = await inflateZlib(bytes);
    } catch {
      return null;
    }
  }
  return bytesToLatin1(bytes);
}

async function inflateZlib(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new DecompressionStream("deflate");
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  const decompressed = new Blob([copy]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(decompressed).arrayBuffer());
}

function extractTextItems(content: string): TextItem[] {
  const items: TextItem[] = [];
  const stack: Array<number | string> = [];
  let x = 0;
  let y = 0;
  let leading = 0;
  let index = 0;

  const pushText = (text: string) => {
    if (text !== "") items.push({ x, y, text });
  };

  while (index < content.length) {
    const char = content[index];
    if (char === " " || char === "\t" || char === "\n" || char === "\r" || char === "\f" || char === "\0") {
      index += 1;
      continue;
    }
    if (char === "%") {
      while (index < content.length && content[index] !== "\n" && content[index] !== "\r") index += 1;
      continue;
    }
    if (char === "(") {
      const literal = readLiteral(content, index);
      stack.push(literal.value);
      index = literal.end;
      continue;
    }
    if (char === "<" && content[index + 1] === "<") {
      index = skipDict(content, index);
      continue;
    }
    if (char === "<") {
      const hex = readHex(content, index);
      stack.push(hex.value);
      index = hex.end;
      continue;
    }
    if (char === "[") {
      const array = readArray(content, index);
      stack.push(array.value);
      index = array.end;
      continue;
    }
    if (char === "/") {
      index += 1;
      while (index < content.length && /[^\s<>[\](){}/%]/.test(content[index])) index += 1;
      continue;
    }
    const number = readNumber(content, index);
    if (number) {
      stack.push(number.value);
      index = number.end;
      continue;
    }
    const operator = readOperator(content, index);
    if (!operator) {
      index += 1;
      continue;
    }
    applyOperator(operator.op, stack, {
      get x() {
        return x;
      },
      get y() {
        return y;
      },
      get leading() {
        return leading;
      },
      set x(value: number) {
        x = value;
      },
      set y(value: number) {
        y = value;
      },
      set leading(value: number) {
        leading = value;
      },
      pushText,
    });
    stack.length = 0;
    index = operator.end;
  }

  return items;
}

type TextState = {
  x: number;
  y: number;
  leading: number;
  pushText: (text: string) => void;
};

function applyOperator(op: string, stack: Array<number | string>, state: TextState) {
  if (op === "BT") {
    state.x = 0;
    state.y = 0;
    return;
  }
  if (op === "T*") {
    state.y -= state.leading;
    return;
  }
  if (op === "TL") {
    const leading = popNumber(stack);
    if (leading !== null) state.leading = leading;
    return;
  }
  if (op === "Td" || op === "TD") {
    const ty = popNumber(stack);
    const tx = popNumber(stack);
    if (tx === null || ty === null) return;
    state.x += tx;
    state.y += ty;
    if (op === "TD") state.leading = -ty;
    return;
  }
  if (op === "Tm") {
    const f = popNumber(stack);
    const e = popNumber(stack);
    popNumber(stack);
    popNumber(stack);
    popNumber(stack);
    popNumber(stack);
    if (e === null || f === null) return;
    state.x = e;
    state.y = f;
    return;
  }
  if (op === "Tj" || op === "'" || op === '"') {
    if (op === "'") state.y -= state.leading;
    const text = popString(stack);
    if (text !== null) state.pushText(text);
  }
}

function popNumber(stack: Array<number | string>): number | null {
  const value = stack.pop();
  return typeof value === "number" ? value : null;
}

function popString(stack: Array<number | string>): string | null {
  const value = stack.pop();
  return typeof value === "string" ? value : null;
}

function readLiteral(content: string, start: number): { value: string; end: number } {
  let index = start + 1;
  let value = "";
  while (index < content.length) {
    const char = content[index];
    if (char === "\\") {
      const next = content[index + 1];
      if (next === "n") value += "\n";
      else if (next === "r") value += "\r";
      else if (next === "t") value += "\t";
      else if (next === "b") value += "\b";
      else if (next === "f") value += "\f";
      else if (next === "(" || next === ")" || next === "\\") value += next;
      else if (next === "\n") {
        index += 2;
        continue;
      } else if (next === "\r") {
        index += 2;
        if (content[index] === "\n") index += 1;
        continue;
      } else if (next !== undefined && next >= "0" && next <= "7") {
        let octal = next;
        let cursor = index + 2;
        for (let extra = 0; extra < 2 && content[cursor] >= "0" && content[cursor] <= "7"; extra += 1) {
          octal += content[cursor];
          cursor += 1;
        }
        value += String.fromCharCode(parseInt(octal, 8));
        index = cursor;
        continue;
      } else if (next !== undefined) value += next;
      index += 2;
      continue;
    }
    if (char === ")") return { value, end: index + 1 };
    value += char;
    index += 1;
  }
  return { value, end: index };
}

function readHex(content: string, start: number): { value: string; end: number } {
  const end = content.indexOf(">", start + 1);
  if (end < 0) return { value: "", end: content.length };
  const hex = content.slice(start + 1, end).replace(/\s/g, "");
  const padded = hex.length % 2 === 0 ? hex : `${hex}0`;
  let value = "";
  for (let index = 0; index < padded.length; index += 2) {
    const byte = parseInt(padded.slice(index, index + 2), 16);
    if (Number.isFinite(byte)) value += String.fromCharCode(byte);
  }
  return { value, end: end + 1 };
}

function readArray(content: string, start: number): { value: string; end: number } {
  let index = start + 1;
  let value = "";
  while (index < content.length) {
    const char = content[index];
    if (char === "]") return { value, end: index + 1 };
    if (char === "(") {
      const literal = readLiteral(content, index);
      value += literal.value;
      index = literal.end;
      continue;
    }
    if (char === "<") {
      const hex = readHex(content, index);
      value += hex.value;
      index = hex.end;
      continue;
    }
    index += 1;
  }
  return { value, end: index };
}

function skipDict(content: string, start: number): number {
  let index = start + 2;
  let depth = 1;
  while (index < content.length && depth > 0) {
    if (content[index] === "<" && content[index + 1] === "<") {
      depth += 1;
      index += 2;
      continue;
    }
    if (content[index] === ">" && content[index + 1] === ">") {
      depth -= 1;
      index += 2;
      continue;
    }
    if (content[index] === "(") {
      index = readLiteral(content, index).end;
      continue;
    }
    index += 1;
  }
  return index;
}

function readNumber(content: string, start: number): { value: number; end: number } | null {
  const match = /^[+-]?(?:\d+\.\d+|\d+\.|\.\d+|\d+)/.exec(content.slice(start));
  if (!match) return null;
  const value = Number(match[0]);
  if (!Number.isFinite(value)) return null;
  return { value, end: start + match[0].length };
}

function readOperator(content: string, start: number): { op: string; end: number } | null {
  const char = content[start];
  if (char === "'" || char === '"') return { op: char, end: start + 1 };
  if (!/[A-Za-z]/.test(char)) return null;
  let index = start + 1;
  while (index < content.length && /[A-Za-z*]/.test(content[index])) index += 1;
  return { op: content.slice(start, index), end: index };
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function latin1ToBytes(value: string): Uint8Array {
  const bytes = new Uint8Array(value.length);
  for (let index = 0; index < value.length; index += 1) bytes[index] = value.charCodeAt(index) & 255;
  return bytes;
}

function bytesToLatin1(bytes: Uint8Array): string {
  let value = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    value += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return value;
}
