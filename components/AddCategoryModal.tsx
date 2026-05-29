"use client";

import { useState } from "react";
import type { CategoryFormData } from "@/types/portfolio";

interface AddCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  onAdd: (data: CategoryFormData) => void;
  showAmount?: boolean;
  showLiquidToggle?: boolean;
  showStockToggle?: boolean;
}

export default function AddCategoryModal({
  isOpen,
  onClose,
  title,
  onAdd,
  showAmount = true,
  showLiquidToggle = false,
  showStockToggle = false,
}: AddCategoryModalProps) {
  const [isStock, setIsStock] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const isLiquid = showLiquidToggle ? formData.get("isLiquid") === "on" : false;

    if (showStockToggle && isStock) {
      const stockSymbol = (formData.get("stockSymbol") as string).trim();
      const stockUnits = parseFloat(formData.get("stockUnits") as string);
      onAdd({ name, isLiquid, isStock: true, stockSymbol, stockUnits });
    } else {
      const amount = showAmount ? parseFloat(formData.get("amount") as string) : 0;
      onAdd({ name, amount, isLiquid, isStock: false });
    }

    setIsStock(false);
    onClose();
  };

  const handleClose = () => {
    setIsStock(false);
    onClose();
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
          
          {showAmount && !isStock && (
            <div className="mb-4">
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                Amount (₹)
              </label>
              <input
                type="number"
                id="amount"
                name="amount"
                step="0.01"
                defaultValue={0}
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
                  className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <span className="text-sm font-medium text-gray-700">Mark as Liquid Asset</span>
              </label>
              <p className="text-xs text-gray-500 mt-1 ml-7">
                Liquid assets will be included in your monthly liquid cash calculation
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
            >
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
