"use client";

import { useState, useEffect } from "react";
import { signOut } from "next-auth/react";
import EditModal from "@/components/EditModal";
import AddCategoryModal from "@/components/AddCategoryModal";
import EditCategoryModal from "@/components/EditCategoryModal";
import AddLentEntryModal from "@/components/AddLentEntryModal";
import EditLentEntryModal from "@/components/EditLentEntryModal";
import Toggle from "@/components/Toggle";
import Accordion from "@/components/Accordion";
import LoadingOverlay from "@/components/LoadingOverlay";
import { formatCurrency } from "@/lib/currency";
import type { AppData, PortfolioCategory, JointCategory, LentEntry } from "@/types/portfolio";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"portfolio" | "bank" | "joint">("portfolio");
  const [data, setData] = useState<AppData | null>(null);
  const [includeJointInPortfolio, setIncludeJointInPortfolio] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch("/api/portfolio");
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const [editSavingsModal, setEditSavingsModal] = useState({
    isOpen: false,
    value: 0,
  });
  
  const [addCategoryModal, setAddCategoryModal] = useState({
    isOpen: false,
    type: "" as "portfolio" | "joint" | "lent",
  });

  const [editCategoryModal, setEditCategoryModal] = useState<{
    isOpen: boolean;
    type: "portfolio" | "joint";
    category: PortfolioCategory | JointCategory | null;
  }>({
    isOpen: false,
    type: "portfolio",
    category: null,
  });

  const [addLentEntryModal, setAddLentEntryModal] = useState({
    isOpen: false,
    categoryId: "",
    categoryName: "",
  });

  const [editLentEntryModal, setEditLentEntryModal] = useState<{
    isOpen: boolean;
    entry: LentEntry | null;
  }>({
    isOpen: false,
    entry: null,
  });

  const calculateTotalPortfolio = () => {
    if (!data) return 0;
    const categoriesTotal = data.portfolioCategories.reduce((sum, cat) => sum + cat.amount, 0);
    const jointTotal = includeJointInPortfolio ? calculateTotalJoint() : 0;
    return categoriesTotal + jointTotal;
  };

  const calculateTotalLiquid = () => {
    if (!data) return 0;
    const liquidCategories = data.portfolioCategories
      .filter((cat) => cat.isLiquid)
      .reduce((sum, cat) => sum + cat.amount, 0);
    return liquidCategories;
  };

  const calculateBankBalance = () => {
    const totalLent = calculateTotalLent();
    return (data?.savingsAccount || 0) + totalLent;
  };

  const calculateTotalLent = () => {
    if (!data) return 0;
    return data.lentCategories.reduce((total, category) => {
      return total + category.entries.reduce((sum, entry) => sum + entry.amount, 0);
    }, 0);
  };

  const calculateTotalJoint = () => {
    if (!data) return 0;
    return data.jointCategories.reduce((sum, cat) => sum + cat.amount, 0);
  };

  const handleSaveSavingsAccount = async (newValue: number) => {
    setIsMutating(true);
    try {
      const response = await fetch("/api/portfolio", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: newValue }),
      });
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Failed to update savings account:", error);
    } finally {
      setIsMutating(false);
    }
  };

  const handleAddCategory = async (name: string, amount?: number, isLiquid?: boolean) => {
    setIsMutating(true);
    try {
      if (addCategoryModal.type === "portfolio") {
        const response = await fetch("/api/portfolio/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, amount: amount || 0, isLiquid: isLiquid || false }),
        });
        const result = await response.json();
        setData(result);
      } else if (addCategoryModal.type === "joint") {
        const response = await fetch("/api/joint/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, amount: amount || 0 }),
        });
        const result = await response.json();
        setData(result);
      } else if (addCategoryModal.type === "lent") {
        const response = await fetch("/api/lent/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error("Failed to add category:", error);
    } finally {
      setIsMutating(false);
    }
  };

  const handleEditCategory = async (
    categoryId: string,
    name: string,
    amount: number,
    isLiquid?: boolean
  ) => {
    setIsMutating(true);
    try {
      if (editCategoryModal.type === "portfolio") {
        const response = await fetch("/api/portfolio/categories", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: categoryId, name, amount, isLiquid: isLiquid || false }),
        });
        const result = await response.json();
        setData(result);
      } else if (editCategoryModal.type === "joint") {
        const response = await fetch("/api/joint/categories", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: categoryId, name, amount }),
        });
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error("Failed to edit category:", error);
    } finally {
      setIsMutating(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    setIsMutating(true);
    try {
      if (editCategoryModal.type === "portfolio") {
        const response = await fetch("/api/portfolio/categories", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: categoryId }),
        });
        const result = await response.json();
        setData(result);
      } else if (editCategoryModal.type === "joint") {
        const response = await fetch("/api/joint/categories", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: categoryId }),
        });
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error("Failed to delete category:", error);
    } finally {
      setIsMutating(false);
    }
  };

  const handleAddLentEntry = async (
    name: string,
    amount: number,
    date: string,
    notes: string
  ) => {
    setIsMutating(true);
    try {
      const response = await fetch("/api/lent/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          categoryId: addLentEntryModal.categoryId, 
          name, 
          amount, 
          date, 
          notes 
        }),
      });
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Failed to add lent entry:", error);
    } finally {
      setIsMutating(false);
    }
  };

  const handleEditLentEntry = async (
    id: string,
    name: string,
    amount: number,
    date: string,
    notes: string
  ) => {
    setIsMutating(true);
    try {
      const response = await fetch("/api/lent/entries", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name, amount, date, notes }),
      });
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Failed to edit lent entry:", error);
    } finally {
      setIsMutating(false);
    }
  };

  const handleDeleteLentEntry = async (id: string) => {
    setIsMutating(true);
    try {
      const response = await fetch("/api/lent/entries", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Failed to delete lent entry:", error);
    } finally {
      setIsMutating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="text-gray-600">Failed to load data</div>
      </div>
    );
  }

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-[#fafafa] pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <button
            onClick={handleReload}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            title="Reload"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-gray-700">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-black">Balance Tracker</h1>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200 sticky top-[72px] z-10">
        <div className="grid grid-cols-3">
          <button
            onClick={() => setActiveTab("portfolio")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "portfolio"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Portfolio
          </button>
          <button
            onClick={() => setActiveTab("bank")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "bank"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Bank Balance
          </button>
          <button
            onClick={() => setActiveTab("joint")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "joint"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Joint Accounts
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Portfolio Tab */}
        {activeTab === "portfolio" && (
          <div className="space-y-4">
            {/* Total Card */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white shadow-sm">
              <p className="text-sm opacity-90 mb-1">Total Portfolio</p>
              <p className="text-4xl font-bold mb-4">{formatCurrency(calculateTotalPortfolio())}</p>
            </div>

            {/* Include Joint Toggle */}
            <div className="flex justify-center">
              <Toggle
                enabled={includeJointInPortfolio}
                onChange={setIncludeJointInPortfolio}
                label="Include Joint Accounts"
              />
            </div>

            {/* Portfolio Categories */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
              {data.portfolioCategories.map((category) => (
                <div
                  key={category.id}
                  className="flex justify-between items-center p-4 hover:bg-gray-50 transition-colors"
                  onClick={() =>
                    setEditCategoryModal({
                      isOpen: true,
                      type: "portfolio",
                      category,
                    })
                  }
                >
                  <div>
                    <p className="font-medium text-black">{category.name}</p>
                    {category.isLiquid && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                        Liquid
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-semibold text-gray-900">
                      {formatCurrency(category.amount)}
                    </p>
                    <svg
                      className="w-5 h-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              ))}
            </div>

            {/* Joint Categories (if toggle is on) */}
            {includeJointInPortfolio && data.jointCategories.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="font-semibold text-black">Joint Accounts</h3>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                    {formatCurrency(calculateTotalJoint())}
                  </span>
                </div>
                <div className="space-y-2">
                  {data.jointCategories.map((category) => (
                    <div
                      key={category.id}
                      className="flex justify-between items-center p-3 bg-blue-50 rounded-lg"
                    >
                      <p className="font-medium text-gray-900">{category.name}</p>
                      <p className="text-lg font-semibold text-blue-700">
                        {formatCurrency(category.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add Category Button */}
            <button
              onClick={() => setAddCategoryModal({ isOpen: true, type: "portfolio" })}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-indigo-600 hover:text-indigo-600 transition-colors font-medium"
            >
              + Add Portfolio Category
            </button>
          </div>
        )}

        {/* Bank Balance Tab */}
        {activeTab === "bank" && (
          <div className="space-y-4">
            {/* Total Card */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-6 text-white shadow-sm">
              <p className="text-sm opacity-90 mb-1">Total Bank Balance</p>
              <p className="text-4xl font-bold">{formatCurrency(calculateBankBalance())}</p>
            </div>

            {/* Savings Account Balance */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <h3 className="font-semibold text-black">Savings Account</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Your current bank balance</p>
                </div>
                <button
                  onClick={() =>
                    setEditSavingsModal({ isOpen: true, value: data.savingsAccount })
                  }
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  Update Balance
                </button>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-3xl font-bold text-gray-900">
                  {formatCurrency(data.savingsAccount)}
                </p>
              </div>
            </div>

            {/* Money Lent */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="font-semibold text-black mb-3">
                Money Lent Out ({formatCurrency(calculateTotalLent())})
              </h3>
              <div className="space-y-1">
                {data.lentCategories.map((category) => {
                  const categoryTotal = category.entries.reduce((sum, entry) => sum + entry.amount, 0);
                  return (
                    <Accordion
                      key={category.id}
                      title={category.name}
                      badge={formatCurrency(categoryTotal)}
                      defaultOpen={false}
                    >
                      <div className="space-y-2">
                        {category.entries.map((entry) => (
                          <div 
                            key={entry.id} 
                            onClick={() => setEditLentEntryModal({ isOpen: true, entry })}
                            className="flex justify-between items-start text-sm bg-gray-50 p-3 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{entry.name}</p>
                              <p className="text-xs text-gray-500 mt-0.5">{entry.notes}</p>
                            </div>
                            <div className="text-right ml-3">
                              <p className="font-semibold text-gray-900">
                                {formatCurrency(entry.amount)}
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {new Date(entry.date).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        ))}
                        <button
                          onClick={() =>
                            setAddLentEntryModal({
                              isOpen: true,
                              categoryId: category.id,
                              categoryName: category.name,
                            })
                          }
                          className="w-full py-2 border border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-green-600 hover:text-green-600 transition-colors text-xs font-medium mt-2"
                        >
                          + Add Entry
                        </button>
                      </div>
                    </Accordion>
                  );
                })}
              </div>
              <button
                onClick={() => setAddCategoryModal({ isOpen: true, type: "lent" })}
                className="w-full mt-4 py-2 border border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-green-600 hover:text-green-600 transition-colors text-sm font-medium"
              >
                + Add Lent Category
              </button>
            </div>
          </div>
        )}

        {/* Joint Accounts Tab */}
        {activeTab === "joint" && (
          <div className="space-y-4">
            {/* Total Card */}
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl p-6 text-white shadow-sm">
              <p className="text-sm opacity-90 mb-1">Total Value</p>
              <p className="text-4xl font-bold">{formatCurrency(calculateTotalJoint())}</p>
            </div>

            {/* Joint Categories */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
              {data.jointCategories.map((category) => (
                <div
                  key={category.id}
                  className="flex justify-between items-center p-4 hover:bg-gray-50 transition-colors"
                  onClick={() =>
                    setEditCategoryModal({
                      isOpen: true,
                      type: "joint",
                      category,
                    })
                  }
                >
                  <div>
                    <p className="font-medium text-black">{category.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-semibold text-gray-900">
                      {formatCurrency(category.amount)}
                    </p>
                    <svg
                      className="w-5 h-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Category Button */}
            <button
              onClick={() => setAddCategoryModal({ isOpen: true, type: "joint" })}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-blue-600 hover:text-blue-600 transition-colors font-medium"
            >
              + Add Joint Account Category
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      <EditModal
        isOpen={editSavingsModal.isOpen}
        onClose={() => setEditSavingsModal({ ...editSavingsModal, isOpen: false })}
        title="Update Bank Balance (Savings Account)"
        value={editSavingsModal.value}
        onSave={handleSaveSavingsAccount}
      />

      <AddCategoryModal
        isOpen={addCategoryModal.isOpen}
        onClose={() => setAddCategoryModal({ ...addCategoryModal, isOpen: false })}
        title={`Add ${addCategoryModal.type === "portfolio" ? "Portfolio" : addCategoryModal.type === "joint" ? "Joint" : "Lent"} Category`}
        onAdd={handleAddCategory}
        showAmount={addCategoryModal.type !== "lent"}
        showLiquidToggle={addCategoryModal.type === "portfolio"}
      />

      {editCategoryModal.isOpen && editCategoryModal.category && (
        <EditCategoryModal
          isOpen={editCategoryModal.isOpen}
          onClose={() => setEditCategoryModal({ ...editCategoryModal, isOpen: false })}
          title={`Edit ${editCategoryModal.category.name}`}
          name={editCategoryModal.category.name}
          amount={editCategoryModal.category.amount}
          isLiquid={"isLiquid" in editCategoryModal.category ? editCategoryModal.category.isLiquid : false}
          onSave={(name, amount, isLiquid) =>
            handleEditCategory(editCategoryModal.category!.id, name, amount, isLiquid)
          }
          onDelete={() => handleDeleteCategory(editCategoryModal.category!.id)}
          showLiquidToggle={editCategoryModal.type === "portfolio"}
        />
      )}

      <AddLentEntryModal
        isOpen={addLentEntryModal.isOpen}
        onClose={() => setAddLentEntryModal({ ...addLentEntryModal, isOpen: false })}
        categoryName={addLentEntryModal.categoryName}
        onAdd={handleAddLentEntry}
      />

      <EditLentEntryModal
        isOpen={editLentEntryModal.isOpen}
        onClose={() => setEditLentEntryModal({ isOpen: false, entry: null })}
        entry={editLentEntryModal.entry}
        onSave={handleEditLentEntry}
        onDelete={handleDeleteLentEntry}
      />

      {isMutating && <LoadingOverlay />}
    </div>
  );
}
