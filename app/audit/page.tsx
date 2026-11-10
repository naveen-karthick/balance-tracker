"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

type AuditArea = "portfolio" | "bookkeeping" | "joint";

type AuditEntry = {
  id: number;
  action: string;
  entityName: string;
  summary: string;
  createdAt: string;
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

function formatWhen(iso: string) {
  const date = new Date(iso);
  return {
    date: date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
    time: date.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }),
  };
}

function ActionBadge({ action }: { action: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
        ACTION_CLASS[action] ?? "bg-gray-100 text-gray-700"
      }`}
    >
      {ACTION_LABEL[action] ?? action}
    </span>
  );
}

export default function AuditPage() {
  const [area, setArea] = useState<AuditArea>("portfolio");
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
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
      <div className="max-w-7xl mx-auto px-4">
        <div className="py-6">
          <Link href="/" className="text-sm text-gray-500 hover:text-black">
            ← Wealth Ledger
          </Link>
          <h1 className="text-3xl font-bold text-black tracking-tight mt-2">Audit History</h1>
          <p className="text-sm text-gray-500 mt-1">
            Every change saved to your portfolio, book keeping, and joint accounts.
          </p>
        </div>

        <div className="bg-white border-b border-gray-200 sticky top-16 lg:top-0 z-10 -mx-4 px-4">
          <div className="grid grid-cols-3">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setArea(tab.id)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
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
                Saves in {TABS.find((tab) => tab.id === area)?.label} will show up here with the date and time.
              </p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-3 font-medium w-40">Date & time</th>
                      <th className="px-4 py-3 font-medium w-40">Action</th>
                      <th className="px-4 py-3 font-medium">Change</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {entries.map((entry) => {
                      const when = formatWhen(entry.createdAt);
                      return (
                        <tr key={entry.id} className="align-top">
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="font-medium text-black">{when.date}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{when.time}</div>
                          </td>
                          <td className="px-4 py-4">
                            <ActionBadge action={entry.action} />
                          </td>
                          <td className="px-4 py-4 text-gray-800 leading-relaxed">
                            {entry.summary}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {nextCursor && (
                <div className="border-t border-gray-200 p-4 text-center">
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
    </div>
  );
}
