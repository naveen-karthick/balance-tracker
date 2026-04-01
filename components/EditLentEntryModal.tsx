"use client";

import { useState, useEffect } from "react";

interface EditLentEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    id: string,
    name: string,
    amount: number,
    date: string,
    notes: string,
    addMoney?: number
  ) => void;
  onDelete: (id: string) => void;
  entry: {
    id: string;
    name: string;
    amount: number;
    date: string;
    notes: string;
  } | null;
}

export default function EditLentEntryModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  entry,
}: EditLentEntryModalProps) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [addMoney, setAddMoney] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (entry) {
      setName(entry.name);
      setAmount(entry.amount.toString());
      setAddMoney("");
      setDate(entry.date);
      setNotes(entry.notes);
    }
  }, [entry]);

  const handleSave = () => {
    if (entry && name && amount && date) {
      const base = parseFloat(amount);
      const extraRaw = parseFloat(addMoney);
      const extra = !isNaN(extraRaw) && extraRaw > 0 ? extraRaw : 0;
      const finalAmount = (isNaN(base) ? 0 : base) + extra;
      onSave(entry.id, name, finalAmount, date, notes, extra > 0 ? extra : undefined);
      onClose();
    }
  };

  const handleDelete = () => {
    if (entry && confirm(`Are you sure you want to delete "${entry.name}"?`)) {
      onDelete(entry.id);
      onClose();
    }
  };

  if (!isOpen || !entry) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-lg">
        <h2 className="text-xl font-bold mb-4 text-black">Edit Lent Entry</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount (₹)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Add money (₹)
            </label>
            <input
              type="number"
              min={0}
              step="any"
              value={addMoney}
              onChange={(e) => setAddMoney(e.target.value)}
              placeholder="Optional — added to amount on Save"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter an amount and Save to increase this lent entry; each add is tracked for WhatsApp.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black resize-none"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            Delete
          </button>
          <div className="flex-1"></div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
