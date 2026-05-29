"use client";

import { useState } from "react";
import type { CategoryFormData } from "@/types/portfolio";

interface EditCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  name: string;
  amount: number;
  isLiquid?: boolean;
  isStock?: boolean;
  stockSymbol?: string | null;
  stockUnits?: number | null;
  onSave: (data: CategoryFormData) => void;
  onDelete: () => void;
  showLiquidToggle?: boolean;
  showStockToggle?: boolean;
}

export default function EditCategoryModal({
  isOpen,
  onClose,
  title,
  name,
  amount,
  isLiquid = false,
  isStock: initialIsStock = false,
  stockSymbol,
  stockUnits,
  onSave,
  onDelete,
  showLiquidToggle = false,
  showStockToggle = false,
}: EditCategoryModalProps) {
  const [isStock, setIsStock] = useState(initialIsStock);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newName = formData.get("name") as string;
    const newIsLiquid = showLiquidToggle ? formData.get("isLiquid") === "on" : false;

    if (showStockToggle && isStock) {
      const newStockSymbol = (formData.get("stockSymbol") as string).trim();
      const newStockUnits = parseFloat(formData.get("stockUnits") as string);
      onSave({
        name: newName,
        isLiquid: newIsLiquid,
        isStock: true,
        stockSymbol: newStockSymbol,
        stockUnits: newStockUnits,
      });
    } else {
      const newAmount = parseFloat(formData.get("amount") as string);
      onSave({
        name: newName,
        amount: newAmount,
        isLiquid: newIsLiquid,
        isStock: false,
      });
    }

    onClose();
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this category?")) {
      onDelete();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md p-6">
        <h2 className="text-xl font-bold text-black mb-4">{title}</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Category Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              defaultValue={name}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black text-lg"
              required
            />
          </div>

          {showStockToggle && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Asset Type</label>
              <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsStock(false)}
                  className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                    !isStock ? "bg-indigo-600 text-white" : "bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Direct Value (₹)
                </button>
                <button
                  type="button"
                  onClick={() => setIsStock(true)}
                  className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                    isStock ? "bg-indigo-600 text-white" : "bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Stock
                </button>
              </div>
            </div>
          )}

          {!isStock && (
            <div className="mb-4">
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                Amount (₹)
              </label>
              <input
                type="number"
                id="amount"
                name="amount"
                defaultValue={amount}
                step="0.01"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black text-lg"
                required
              />
            </div>
          )}

          {showStockToggle && isStock && (
            <>
              <div className="mb-4">
                <label htmlFor="stockSymbol" className="block text-sm font-medium text-gray-700 mb-2">
                  Stock Symbol
                </label>
                <input
                  type="text"
                  id="stockSymbol"
                  name="stockSymbol"
                  defaultValue={stockSymbol ?? ""}
                  placeholder="e.g. AAPL, MSFT, GOOGL"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black text-lg uppercase"
                  required
                />
              </div>
              <div className="mb-4">
                <label htmlFor="stockUnits" className="block text-sm font-medium text-gray-700 mb-2">
                  Units / Shares
                </label>
                <input
                  type="number"
                  id="stockUnits"
                  name="stockUnits"
                  defaultValue={stockUnits ?? ""}
                  step="0.0001"
                  min="0.0001"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black text-lg"
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mb-4">
                Value is calculated live from the stock price (USD) converted to INR.
              </p>
            </>
          )}

          {showLiquidToggle && (
            <div className="mb-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="isLiquid"
                  defaultChecked={isLiquid}
                  className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <span className="text-sm font-medium text-gray-700">Mark as Liquid Asset</span>
              </label>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
              >
                Save
              </button>
            </div>
            <button
              type="button"
              onClick={handleDelete}
              className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
            >
              Delete Category
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
