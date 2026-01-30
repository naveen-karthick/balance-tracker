"use client";

interface AddCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  onAdd: (name: string, amount?: number, isLiquid?: boolean) => void;
  showAmount?: boolean;
  showLiquidToggle?: boolean;
}

export default function AddCategoryModal({
  isOpen,
  onClose,
  title,
  onAdd,
  showAmount = true,
  showLiquidToggle = false,
}: AddCategoryModalProps) {
  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const amount = showAmount ? parseFloat(formData.get("amount") as string) : 0;
    const isLiquid = showLiquidToggle ? formData.get("isLiquid") === "on" : false;
    onAdd(name, amount, isLiquid);
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
          
          {showAmount && (
            <div className="mb-4">
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                Amount
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
              onClick={onClose}
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
