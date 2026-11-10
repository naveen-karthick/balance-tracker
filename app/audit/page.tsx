"use client";

import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/currency";

type AuditArea = "portfolio" | "bookkeeping" | "joint";

type AuditEntry = {
  id: number;
  action: string;
  entityType: string;
  entityName: string;
  summary: string;
  snapshot: unknown;
  createdAt: string;
};

type PortfolioSnapshot = {
  kind: "portfolio";
  recordedTotal: number;
  categories: {
    name: string;
    amount: number;
    isLiquid: boolean;
    isLocked: boolean;
    isStock: boolean;
    stockSymbol: string | null;
    stockUnits: number | null;
  }[];
};

type BookkeepingSnapshot = {
  kind: "bookkeeping";
  savingsAccount: number;
  lentTotal: number;
  cashAndReceivables: number;
  lentCategories: {
    name: string;
    total: number;
    entries: { name: string; amount: number; date: string; notes: string }[];
  }[];
};

type JointSnapshot = {
  kind: "joint";
  total: number;
  categories: { name: string; amount: number }[];
};

const TABS: { id: AuditArea; label: string }[] = [
  { id: "portfolio", label: "Portfolio" },
  { id: "bookkeeping", label: "Book Keeping" },
  { id: "joint", label: "Joint Accounts" },
];

const ACTION_LABEL: Record<string, string> = {
  created: "Added",
  updated: "Updated",
  deleted: "Deleted",
  added_money: "Added money",
  subtracted_money: "Subtracted money",
};

const ACTION_CLASS: Record<string, string> = {
  created: "bg-green-100 text-green-800",
  updated: "bg-blue-100 text-blue-800",
  deleted: "bg-red-100 text-red-800",
  added_money: "bg-emerald-100 text-emerald-800",
  subtracted_money: "bg-amber-100 text-amber-800",
};

const DOT_CLASS: Record<string, string> = {
  created: "bg-green-500",
  updated: "bg-blue-500",
  deleted: "bg-red-500",
  added_money: "bg-emerald-500",
  subtracted_money: "bg-amber-500",
};

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function dayLabel(iso: string) {
  const date = new Date(iso);
  const diffDays = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(iso: string, withSeconds = false) {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    ...(withSeconds ? { second: "2-digit" as const } : {}),
    hour12: true,
  });
}

function formatFullWhen(iso: string) {
  const date = new Date(iso);
  const day = date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${day}, ${formatTime(iso, true)}`;
}

function splitSummary(summary: string) {
  return summary
    .split(/(?<=\.)\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function ActionBadge({ action }: { action: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
        ACTION_CLASS[action] ?? "bg-gray-100 text-gray-700"
      }`}
    >
      {ACTION_LABEL[action] ?? action}
    </span>
  );
}

function formatEntryDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function readSnapshot(value: unknown): PortfolioSnapshot | BookkeepingSnapshot | JointSnapshot | null {
  const record = asRecord(value);
  if (!record) return null;

  if (record.kind === "portfolio" && Array.isArray(record.categories)) {
    return {
      kind: "portfolio",
      recordedTotal: asNumber(record.recordedTotal),
      categories: record.categories.flatMap((item) => {
        const category = asRecord(item);
        if (!category) return [];
        return [{
          name: asString(category.name),
          amount: asNumber(category.amount),
          isLiquid: category.isLiquid === true,
          isLocked: category.isLocked === true,
          isStock: category.isStock === true,
          stockSymbol: typeof category.stockSymbol === "string" ? category.stockSymbol : null,
          stockUnits: typeof category.stockUnits === "number" ? category.stockUnits : null,
        }];
      }),
    };
  }

  if (record.kind === "bookkeeping" && Array.isArray(record.lentCategories)) {
    return {
      kind: "bookkeeping",
      savingsAccount: asNumber(record.savingsAccount),
      lentTotal: asNumber(record.lentTotal),
      cashAndReceivables: asNumber(record.cashAndReceivables),
      lentCategories: record.lentCategories.flatMap((item) => {
        const category = asRecord(item);
        if (!category || !Array.isArray(category.entries)) return [];
        return [{
          name: asString(category.name),
          total: asNumber(category.total),
          entries: category.entries.flatMap((entryItem) => {
            const entry = asRecord(entryItem);
            if (!entry) return [];
            return [{
              name: asString(entry.name),
              amount: asNumber(entry.amount),
              date: asString(entry.date),
              notes: asString(entry.notes),
            }];
          }),
        }];
      }),
    };
  }

  if (record.kind === "joint" && Array.isArray(record.categories)) {
    return {
      kind: "joint",
      total: asNumber(record.total),
      categories: record.categories.flatMap((item) => {
        const category = asRecord(item);
        if (!category) return [];
        return [{ name: asString(category.name), amount: asNumber(category.amount) }];
      }),
    };
  }

  return null;
}

function AmountRow({ label, amount, strong = false }: { label: string; amount: number; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className={strong ? "font-medium text-black" : "text-gray-700"}>{label}</span>
      <span className={`shrink-0 ${strong ? "font-semibold text-black" : "font-medium text-gray-900"}`}>
        {formatCurrency(amount)}
      </span>
    </div>
  );
}

function SnapshotView({ snapshot }: { snapshot: PortfolioSnapshot | BookkeepingSnapshot | JointSnapshot }) {
  if (snapshot.kind === "portfolio") {
    return (
      <div className="space-y-3 text-sm">
        <AmountRow label="Recorded total" amount={snapshot.recordedTotal} strong />
        {snapshot.categories.length === 0 ? (
          <p className="text-gray-500">No portfolio categories.</p>
        ) : (
          <div className="space-y-2">
            {snapshot.categories.map((category) => (
              <div key={category.name} className="rounded-lg bg-gray-50 px-3 py-2">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-medium text-black">{category.name}</p>
                  <p className="shrink-0 font-medium text-gray-900">
                    {category.isStock
                      ? `${category.stockUnits ?? 0} × ${category.stockSymbol ?? ""}`
                      : formatCurrency(category.amount)}
                  </p>
                </div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {category.isLiquid && (
                    <span className="rounded bg-green-100 px-1.5 py-0.5 text-[11px] text-green-800">Liquid</span>
                  )}
                  {category.isLocked && (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] text-amber-800">Locked</span>
                  )}
                  {category.isStock && (
                    <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[11px] text-gray-700">Stock units</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-gray-500">Stock rows show units held. Live prices are not part of the snapshot.</p>
      </div>
    );
  }

  if (snapshot.kind === "bookkeeping") {
    return (
      <div className="space-y-3 text-sm">
        <div className="space-y-1.5 rounded-lg bg-green-50 px-3 py-2">
          <AmountRow label="Cash & receivables" amount={snapshot.cashAndReceivables} strong />
          <AmountRow label="Savings account" amount={snapshot.savingsAccount} />
          <AmountRow label="Money lent out" amount={snapshot.lentTotal} />
        </div>
        {snapshot.lentCategories.length === 0 ? (
          <p className="text-gray-500">No money lent out.</p>
        ) : (
          snapshot.lentCategories.map((category) => (
            <div key={category.name} className="rounded-lg border border-gray-100 px-3 py-2">
              <AmountRow label={category.name} amount={category.total} strong />
              {category.entries.length === 0 ? (
                <p className="mt-1 text-xs text-gray-500">No open entries.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {category.entries.map((entry, index) => (
                    <li key={`${category.name}-${entry.name}-${entry.date}-${index}`}>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-gray-800">{entry.name}</span>
                        <span className="shrink-0 font-medium text-gray-900">{formatCurrency(entry.amount)}</span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {formatEntryDate(entry.date)}
                        {entry.notes ? ` · ${entry.notes}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2 text-sm">
      <AmountRow label="Joint total" amount={snapshot.total} strong />
      {snapshot.categories.length === 0 ? (
        <p className="text-gray-500">No joint accounts.</p>
      ) : (
        snapshot.categories.map((category) => (
          <div key={category.name} className="rounded-lg bg-gray-50 px-3 py-2">
            <AmountRow label={category.name} amount={category.amount} />
          </div>
        ))
      )}
    </div>
  );
}

function DetailModal({
  entry,
  onClose,
}: {
  entry: AuditEntry | null;
  onClose: () => void;
}) {
  const [snapshotOpen, setSnapshotOpen] = useState(false);
  const facts = entry ? splitSummary(entry.summary) : [];
  const snapshot = entry ? readSnapshot(entry.snapshot) : null;

  useEffect(() => {
    setSnapshotOpen(false);
  }, [entry?.id]);

  return (
    <Transition appear show={entry !== null} as={Fragment}>
      <Dialog as="div" className="relative z-[80]" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50" />
        </Transition.Child>
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-end sm:items-center justify-center sm:p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="w-full sm:max-w-md rounded-t-2xl sm:rounded-xl bg-white p-5 shadow-xl max-h-[90vh] overflow-y-auto">
                {entry && (
                  <>
                    <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-200 sm:hidden" />
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <ActionBadge action={entry.action} />
                        <Dialog.Title className="mt-2 text-lg font-semibold text-black">
                          {entry.entityName}
                        </Dialog.Title>
                        <p className="mt-1 text-sm text-gray-500">{formatFullWhen(entry.createdAt)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                        aria-label="Close"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <ul className="mt-5 space-y-3">
                      {facts.map((fact, index) => (
                        <li key={`${index}-${fact}`} className="flex gap-3 text-sm text-gray-800 leading-relaxed">
                          <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${DOT_CLASS[entry.action] ?? "bg-gray-400"}`} />
                          <span>{fact}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-5 border-t border-gray-100 pt-3">
                      <button
                        type="button"
                        aria-expanded={snapshotOpen}
                        onClick={() => setSnapshotOpen((open) => !open)}
                        className="flex w-full items-center justify-between gap-3 py-2 text-left"
                      >
                        <span className="text-sm font-medium text-black">Snapshot at this time</span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          stroke="currentColor"
                          className={`w-4 h-4 shrink-0 text-gray-400 transition-transform ${snapshotOpen ? "rotate-90" : ""}`}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                      </button>
                      {snapshotOpen && (
                        <div className="pb-1 pt-2">
                          {snapshot ? (
                            <SnapshotView snapshot={snapshot} />
                          ) : (
                            <p className="text-sm text-gray-500">
                              This change was saved before snapshots were kept, so the full picture from that moment is not available.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

export default function AuditPage() {
  const [area, setArea] = useState<AuditArea>("portfolio");
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<AuditEntry | null>(null);
  const areaRef = useRef(area);
  areaRef.current = area;

  const load = useCallback(async (nextArea: AuditArea, cursor?: number) => {
    const params = new URLSearchParams({ area: nextArea });
    if (cursor) params.set("cursor", String(cursor));
    const response = await fetch(`/api/audit?${params.toString()}`);
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "Failed to load audit history");
    }
    return result as { entries: AuditEntry[]; nextCursor: number | null };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setEntries([]);
    setNextCursor(null);
    setSelected(null);

    load(area)
      .then((result) => {
        if (cancelled) return;
        setEntries(result.entries);
        setNextCursor(result.nextCursor);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [area, load]);

  const groups = useMemo(() => {
    const grouped: { key: string; label: string; entries: AuditEntry[] }[] = [];
    for (const entry of entries) {
      const key = String(startOfDay(new Date(entry.createdAt)));
      const last = grouped[grouped.length - 1];
      if (last?.key === key) {
        last.entries.push(entry);
      } else {
        grouped.push({ key, label: dayLabel(entry.createdAt), entries: [entry] });
      }
    }
    return grouped;
  }, [entries]);

  const handleLoadMore = async () => {
    if (!nextCursor) return;
    const requestedArea = area;
    setLoadingMore(true);
    try {
      const result = await load(requestedArea, nextCursor);
      if (areaRef.current !== requestedArea) return;
      setEntries((current) => [...current, ...result.entries]);
      setNextCursor(result.nextCursor);
    } catch (err) {
      if (areaRef.current !== requestedArea) return;
      setError(err instanceof Error ? err.message : "Failed to load more");
    } finally {
      if (areaRef.current === requestedArea) setLoadingMore(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] pt-16 lg:pt-0 pb-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="py-6">
          <Link href="/" className="text-sm text-gray-500 hover:text-black">
            ← Wealth Ledger
          </Link>
          <h1 className="text-3xl font-bold text-black tracking-tight mt-2">Audit History</h1>
          <p className="text-sm text-gray-500 mt-1">
            Tap a change to see the full details.
          </p>
        </div>

        <div className="bg-white border-b border-gray-200 sticky top-16 lg:top-0 z-10 -mx-4 px-4">
          <div className="grid grid-cols-3">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setArea(tab.id)}
                className={`px-1 sm:px-4 py-3 text-[11px] leading-tight sm:text-sm sm:leading-normal font-medium border-b-2 transition-colors ${
                  area === tab.id
                    ? "border-black text-black"
                    : "border-transparent text-gray-500 hover:text-gray-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="py-4">
          {loading ? (
            <div className="card p-8 text-center text-gray-500">Loading history…</div>
          ) : error ? (
            <div className="card p-8 text-center text-red-600">{error}</div>
          ) : entries.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="font-medium text-black">No changes yet</p>
              <p className="text-sm text-gray-500 mt-1">
                Saves in {TABS.find((tab) => tab.id === area)?.label} will show up here.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {groups.map((group) => (
                <section key={group.key}>
                  <h2 className="px-1 mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {group.label}
                  </h2>
                  <div className="card divide-y divide-gray-100 overflow-hidden">
                    {group.entries.map((entry) => {
                      const preview = splitSummary(entry.summary)[0] ?? entry.summary;
                      return (
                        <button
                          key={entry.id}
                          type="button"
                          onClick={() => setSelected(entry)}
                          className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                        >
                          <div className="w-[4.5rem] shrink-0 pt-0.5">
                            <p className="text-sm font-medium text-black">{formatTime(entry.createdAt)}</p>
                          </div>
                          <div className="min-w-0 flex-1">
                            <ActionBadge action={entry.action} />
                            <p className="mt-1 text-sm text-gray-800 leading-snug line-clamp-2">
                              {preview}
                            </p>
                          </div>
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 mt-1 shrink-0 text-gray-400">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                          </svg>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
              {nextCursor && (
                <div className="text-center">
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="btn-secondary px-4 py-2 rounded-lg text-sm disabled:opacity-60"
                  >
                    {loadingMore ? "Loading…" : "Load older changes"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <DetailModal entry={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
