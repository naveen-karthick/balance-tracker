"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import {
  createColumnHelper,
  flexRender,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { filterPriceList, type PriceItem } from "@/lib/priceList";

const features = tableFeatures({});
const columnHelper = createColumnHelper<typeof features, PriceItem>();

const columns = columnHelper.columns([
  columnHelper.accessor("code", {
    header: "Code",
    cell: (info) => info.getValue() || "—",
  }),
  columnHelper.accessor("name", {
    header: "Product",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("usage", {
    header: "Used on",
    cell: (info) => info.getValue() || "—",
  }),
  columnHelper.accessor("rate", {
    header: "Rate",
    cell: (info) => info.getValue(),
  }),
]);

export default function PriceListModal({
  isOpen,
  onClose,
  onSelect,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: PriceItem) => void;
}) {
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const data = useMemo(() => filterPriceList(search), [search]);

  useEffect(() => {
    if (!isOpen) return;
    if (window.matchMedia("(min-width: 768px)").matches) searchRef.current?.focus();
  }, [isOpen]);
  const table = useTable({
    features,
    data,
    columns,
    getRowId: (row) => row.code || row.name,
  });

  return (
    <Transition appear show={isOpen} as={Fragment} afterLeave={() => setSearch("")}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
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
          <div className="flex min-h-full items-start justify-center p-4 sm:p-8">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
                <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4">
                  <div className="min-w-0">
                    <Dialog.Title className="text-lg font-semibold text-black">
                      Jayam Agency price list
                    </Dialog.Title>
                    <p className="mt-1 text-sm text-gray-500">
                      Click a product to fill its code and rate. If the code you need is not here, close this and type the rate yourself.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="shrink-0 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-black"
                    aria-label="Close price list"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden="true">
                      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                    </svg>
                  </button>
                </div>
                <div className="border-b border-gray-200 px-5 py-3">
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search code, product, or usage"
                    aria-label="Search price list"
                    ref={searchRef}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base text-black outline-none focus:border-black md:text-sm"
                  />
                </div>
                <div className="min-h-0 flex-1 overflow-auto">
                  <div className="md:hidden">
                    {table.getRowModel().rows.length === 0 ? (
                      <p className="px-5 py-8 text-center text-sm text-gray-500">No product matches that search.</p>
                    ) : (
                      <div className="divide-y divide-gray-200">
                        {table.getRowModel().rows.map((row) => (
                          <button
                            key={row.id}
                            type="button"
                            onClick={() => onSelect(row.original)}
                            className="w-full px-5 py-3 text-left"
                          >
                            <span className="flex items-baseline justify-between gap-3">
                              <span className="min-w-0 truncate text-base font-semibold text-black">
                                {row.original.code || row.original.name}
                              </span>
                              <span className="shrink-0 text-base tabular-nums text-black">{row.original.rate}</span>
                            </span>
                            {row.original.code ? (
                              <span className="mt-0.5 block text-sm text-gray-700">{row.original.name}</span>
                            ) : null}
                            {row.original.usage ? (
                              <span className="mt-0.5 block text-xs text-gray-500">{row.original.usage}</span>
                            ) : null}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <table className="hidden w-full table-fixed border-collapse text-sm md:table">
                    <colgroup>
                      <col style={{ width: "6rem" }} />
                      <col />
                      <col />
                      <col style={{ width: "6rem" }} />
                    </colgroup>
                    <thead className="sticky top-0">
                      {table.getHeaderGroups().map((headerGroup) => (
                        <tr key={headerGroup.id}>
                          {headerGroup.headers.map((header) => (
                            <th
                              key={header.id}
                              scope="col"
                              className={`border border-gray-300 bg-gray-100 px-3 py-2 text-xs font-semibold uppercase text-gray-600 ${
                                header.column.id === "rate" ? "text-right" : "text-left"
                              }`}
                            >
                              {flexRender(header.column.columnDef.header, header.getContext())}
                            </th>
                          ))}
                        </tr>
                      ))}
                    </thead>
                    <tbody>
                      {table.getRowModel().rows.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="border border-gray-300 px-3 py-8 text-center text-gray-500">
                            No product matches that search.
                          </td>
                        </tr>
                      ) : (
                        table.getRowModel().rows.map((row) => (
                          <tr
                            key={row.id}
                            className="cursor-pointer hover:bg-gray-50"
                            onClick={() => onSelect(row.original)}
                          >
                            {row.getAllCells().map((cell) => (
                              <td
                                key={cell.id}
                                className={`border border-gray-300 px-3 py-2 text-black ${
                                  cell.column.id === "rate" ? "text-right tabular-nums" : "text-left"
                                }`}
                              >
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </td>
                            ))}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
