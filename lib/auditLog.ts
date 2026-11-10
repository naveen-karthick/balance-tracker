import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { formatCurrency } from "@/lib/currency";
import { fetchPortfolioData } from "@/lib/fetchPortfolioData";

export type AuditArea = "portfolio" | "bookkeeping" | "joint";

function buildAreaSnapshot(
  area: AuditArea,
  data: Awaited<ReturnType<typeof fetchPortfolioData>>
): Prisma.InputJsonValue {
  if (area === "portfolio") {
    const categories = data.portfolioCategories.map((category) => ({
      name: category.name,
      amount: category.amount,
      isLiquid: category.isLiquid,
      isLocked: category.isLocked,
      isStock: category.isStock,
      stockSymbol: category.stockSymbol,
      stockUnits: category.stockUnits,
    }));
    const recordedTotal = categories.reduce(
      (sum, category) => sum + (category.isStock ? 0 : category.amount),
      0
    );
    return { kind: "portfolio", recordedTotal, categories };
  }

  if (area === "bookkeeping") {
    const lentCategories = data.lentCategories.map((category) => {
      const entries = category.entries.map((entry) => ({
        name: entry.name,
        amount: entry.amount,
        date: entry.date,
        notes: entry.notes,
      }));
      return {
        name: category.name,
        total: entries.reduce((sum, entry) => sum + entry.amount, 0),
        entries,
      };
    });
    const lentTotal = lentCategories.reduce((sum, category) => sum + category.total, 0);
    return {
      kind: "bookkeeping",
      savingsAccount: data.savingsAccount,
      lentTotal,
      cashAndReceivables: data.savingsAccount + lentTotal,
      lentCategories,
    };
  }

  const categories = data.jointCategories.map((category) => ({
    name: category.name,
    amount: category.amount,
  }));
  return {
    kind: "joint",
    total: categories.reduce((sum, category) => sum + category.amount, 0),
    categories,
  };
}

export async function recordAudit(input: {
  userId: number;
  area: AuditArea;
  action: string;
  entityType: string;
  entityName: string;
  summary: string;
}) {
  let snapshot: Prisma.InputJsonValue | undefined;
  try {
    const data = await fetchPortfolioData(input.userId);
    snapshot = buildAreaSnapshot(input.area, data);
  } catch (error) {
    console.error("Failed to capture audit snapshot:", error);
  }

  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId,
        area: input.area,
        action: input.action,
        entityType: input.entityType,
        entityName: input.entityName,
        summary: input.summary,
        ...(snapshot ? { snapshot } : {}),
      },
    });
  } catch (error) {
    console.error("Failed to record audit log:", error);
  }
}

export function sameMoney(a: number, b: number) {
  return Math.round(a * 100) === Math.round(b * 100);
}

function sameUnits(a: number, b: number) {
  return Math.round(a * 10000) === Math.round(b * 10000);
}

function money(amount: number) {
  return formatCurrency(amount);
}

function sentence(parts: string[]) {
  const cleaned = parts.map((part) => part.trim()).filter(Boolean);
  if (cleaned.length === 0) return "";
  return cleaned.map((part) => part.replace(/\.$/, "")).join(". ") + ".";
}

function formatUnits(units: number) {
  return Number(units.toFixed(4)).toString();
}

export function dateKey(value: Date | string) {
  if (typeof value === "string") return value.slice(0, 10);
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDay(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function clip(text: string, max = 80) {
  const compact = text.trim().replace(/\s+/g, " ");
  if (compact.length <= max) return compact;
  return compact.slice(0, max - 1) + "…";
}

export type PortfolioSnap = {
  name: string;
  amount: number;
  isLiquid: boolean;
  isLocked: boolean;
  isStock: boolean;
  stockSymbol: string | null;
  stockUnits: number | null;
};

export function describePortfolioCreate(data: PortfolioSnap) {
  const flags = [
    data.isLiquid ? "Marked as liquid" : "",
    data.isLocked ? "Marked as locked" : "",
  ];
  const main = data.isStock
    ? `Added stock "${data.name}" — ${formatUnits(data.stockUnits ?? 0)} units of ${data.stockSymbol}`
    : `Added "${data.name}" with a balance of ${money(data.amount)}`;
  return sentence([main, ...flags]);
}

export function describePortfolioDelete(data: PortfolioSnap) {
  if (data.isStock) {
    return `Deleted stock "${data.name}" (${formatUnits(data.stockUnits ?? 0)} × ${data.stockSymbol}).`;
  }
  return `Deleted "${data.name}" (${money(data.amount)}).`;
}

export function describePortfolioUpdate(before: PortfolioSnap, after: PortfolioSnap) {
  const changes: string[] = [];

  if (before.name !== after.name) {
    changes.push(`Renamed from "${before.name}" to "${after.name}"`);
  }

  if (before.isStock !== after.isStock) {
    changes.push(
      after.isStock
        ? `Converted to stock ${after.stockSymbol}, ${formatUnits(after.stockUnits ?? 0)} units`
        : `Converted from stock to a balance of ${money(after.amount)}`
    );
  } else if (after.isStock) {
    if ((before.stockSymbol ?? "") !== (after.stockSymbol ?? "")) {
      changes.push(`Symbol ${before.stockSymbol || "none"} → ${after.stockSymbol || "none"}`);
    }
    if (!sameUnits(before.stockUnits ?? 0, after.stockUnits ?? 0)) {
      changes.push(
        `Units ${formatUnits(before.stockUnits ?? 0)} → ${formatUnits(after.stockUnits ?? 0)}`
      );
    }
  } else if (!sameMoney(before.amount, after.amount)) {
    changes.push(`Balance ${money(before.amount)} → ${money(after.amount)}`);
  }

  if (before.isLiquid !== after.isLiquid) {
    changes.push(after.isLiquid ? "Marked as liquid" : "Marked as not liquid");
  }
  if (before.isLocked !== after.isLocked) {
    changes.push(after.isLocked ? "Marked as locked" : "Marked as unlocked");
  }

  if (changes.length === 0) return "";
  return sentence([`Updated "${after.name}"`, ...changes]);
}

export function describeSavingsUpdate(before: number, after: number) {
  if (sameMoney(before, after)) return "";
  return `Updated savings account balance from ${money(before)} to ${money(after)}.`;
}

export function describeLentCategoryDelete(category: {
  name: string;
  entries: { name: string; amount: number }[];
}) {
  if (category.entries.length === 0) {
    return `Deleted lent category "${category.name}".`;
  }

  const total = category.entries.reduce((sum, entry) => sum + entry.amount, 0);
  const shown = category.entries.slice(0, 6);
  const list = shown.map((entry) => `${entry.name} (${money(entry.amount)})`).join(", ");
  const extra =
    category.entries.length > shown.length
      ? `, and ${category.entries.length - shown.length} more`
      : "";
  const noun = category.entries.length === 1 ? "entry" : "entries";

  return `Deleted lent category "${category.name}" and ${category.entries.length} ${noun}: ${list}${extra}. Total ${money(total)}.`;
}

export function describeLentEntryCreate(input: {
  name: string;
  categoryName: string;
  amount: number;
  date: string;
  notes: string;
  savingsBefore: number;
  savingsAfter: number;
}) {
  const parts = [
    `Added ${money(input.amount)} lent to "${input.name}" in ${input.categoryName} on ${formatDay(input.date)}`,
  ];
  if (input.notes.trim()) {
    parts.push(`Notes: "${clip(input.notes)}"`);
  }
  if (!sameMoney(input.savingsBefore, input.savingsAfter)) {
    parts.push(
      `Savings account ${money(input.savingsBefore)} → ${money(input.savingsAfter)}`
    );
  }
  return sentence(parts);
}

export function describeLentEntryDelete(input: {
  name: string;
  categoryName: string;
  amount: number;
  savingsBefore: number;
  savingsAfter: number;
}) {
  const parts = [
    `Deleted lent entry "${input.name}" (${money(input.amount)}) from ${input.categoryName}`,
  ];
  if (!sameMoney(input.savingsBefore, input.savingsAfter)) {
    parts.push(
      `Savings account ${money(input.savingsBefore)} → ${money(input.savingsAfter)}`
    );
  }
  return sentence(parts);
}

export function describeLentEntryUpdate(input: {
  beforeName: string;
  afterName: string;
  categoryName: string;
  beforeAmount: number;
  afterAmount: number;
  beforeDate: string;
  afterDate: string;
  beforeNotes: string;
  afterNotes: string;
  addMoney: number;
  subtractMoney: number;
  savingsBefore: number;
  savingsAfter: number;
}): { action: string; summary: string } | null {
  const addMoney = input.addMoney > 0 ? input.addMoney : 0;
  const subtractMoney = input.subtractMoney > 0 ? input.subtractMoney : 0;
  const directBase = input.afterAmount - addMoney + subtractMoney;
  const amountEdited = !sameMoney(directBase, input.beforeAmount);
  const amountChanged = !sameMoney(input.afterAmount, input.beforeAmount);
  const notesBefore = input.beforeNotes.trim();
  const notesAfter = input.afterNotes.trim();
  const renamed = input.beforeName !== input.afterName;
  const dateChanged = input.beforeDate !== input.afterDate;
  const notesChanged = notesBefore !== notesAfter;

  const parts: string[] = [];
  if (renamed) {
    parts.push(`Renamed from "${input.beforeName}" to "${input.afterName}"`);
  }
  if (addMoney > 0 || subtractMoney > 0) {
    if (amountEdited) parts.push(`Set balance to ${money(directBase)}`);
    if (addMoney > 0) parts.push(`Added ${money(addMoney)}`);
    if (subtractMoney > 0) parts.push(`Subtracted ${money(subtractMoney)}`);
    if (amountChanged) {
      parts.push(`Balance ${money(input.beforeAmount)} → ${money(input.afterAmount)}`);
    }
  } else if (amountChanged) {
    parts.push(`Balance ${money(input.beforeAmount)} → ${money(input.afterAmount)}`);
  }
  if (dateChanged) {
    parts.push(`Date ${formatDay(input.beforeDate)} → ${formatDay(input.afterDate)}`);
  }
  if (notesChanged) {
    if (!notesAfter) parts.push("Cleared notes");
    else if (!notesBefore) parts.push(`Added notes: "${clip(notesAfter)}"`);
    else parts.push(`Updated notes: "${clip(notesAfter)}"`);
  }
  if (!sameMoney(input.savingsBefore, input.savingsAfter)) {
    parts.push(
      `Savings account ${money(input.savingsBefore)} → ${money(input.savingsAfter)}`
    );
  }

  if (parts.length === 0) return null;

  const onlyMoney =
    !renamed && !dateChanged && !notesChanged && !amountEdited;
  const action =
    onlyMoney && addMoney > 0 && subtractMoney <= 0
      ? "added_money"
      : onlyMoney && subtractMoney > 0 && addMoney <= 0
        ? "subtracted_money"
        : "updated";

  if (action === "added_money") {
    return {
      action,
      summary: sentence([
        `Added ${money(addMoney)} to ${input.beforeName} in ${input.categoryName}`,
        ...parts.filter((part) => !part.startsWith("Added ")),
      ]),
    };
  }

  if (action === "subtracted_money") {
    return {
      action,
      summary: sentence([
        `Subtracted ${money(subtractMoney)} from ${input.beforeName} in ${input.categoryName}`,
        ...parts.filter((part) => !part.startsWith("Subtracted ")),
      ]),
    };
  }

  return {
    action,
    summary: sentence([
      `Updated ${input.afterName} in ${input.categoryName}`,
      ...parts,
    ]),
  };
}

export function describeJointCreate(name: string, amount: number) {
  return `Added joint account "${name}" with a balance of ${money(amount)}.`;
}

export function describeJointDelete(name: string, amount: number) {
  return `Deleted joint account "${name}" (${money(amount)}).`;
}

export function describeJointUpdate(
  before: { name: string; amount: number },
  after: { name: string; amount: number }
) {
  const changes: string[] = [];
  if (before.name !== after.name) {
    changes.push(`Renamed from "${before.name}" to "${after.name}"`);
  }
  if (!sameMoney(before.amount, after.amount)) {
    changes.push(`Balance ${money(before.amount)} → ${money(after.amount)}`);
  }
  if (changes.length === 0) return "";
  return sentence([`Updated joint account "${after.name}"`, ...changes]);
}
