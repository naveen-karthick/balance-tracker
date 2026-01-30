"use client";

interface EditCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  name: string;
  amount: number;
  isLiquid?: boolean;
  onSave: (name: string, amount: number, isLiquid?: boolean) => void;
  onDelete: () => void;
  showLiquidToggle?: boolean;
}

export default function EditCategoryModal({
  isOpen,
  onClose,
  title,
  name,
  amount,
  isLiquid = false,
  onSave,
  onDelete,
  showLiquidToggle = false,
}: EditCategoryModalProps) {
  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newName = formData.get("name") as string;
    const newAmount = parseFloat(formData.get("amount") as string);
    const newIsLiquid = showLiquidToggle ? formData.get("isLiquid") === "on" : false;
    onSave(newName, newAmount, newIsLiquid);
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

          <div className="mb-4">
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
              Amount
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
