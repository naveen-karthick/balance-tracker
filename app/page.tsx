"use client";

import { useState, useEffect, useRef } from "react";
import { signOut } from "next-auth/react";
import { useSwipeable } from "react-swipeable";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import EditModal from "@/components/EditModal";
import AddCategoryModal from "@/components/AddCategoryModal";
import EditCategoryModal from "@/components/EditCategoryModal";
import AddLentEntryModal from "@/components/AddLentEntryModal";
import EditLentEntryModal from "@/components/EditLentEntryModal";
import AISummaryModal from "@/components/AISummaryModal";
import ConfirmModal from "@/components/ConfirmModal";
import SpotlightModal from "@/components/SpotlightModal";
import Toggle from "@/components/Toggle";
import Accordion from "@/components/Accordion";
import LoadingOverlay from "@/components/LoadingOverlay";
import { formatCurrency } from "@/lib/currency";
import { getPortfolioCategoryValue, getStockSymbols } from "@/lib/portfolioValue";
import type { StockQuote } from "@/lib/stockQuotes";
import type { AppData, PortfolioCategory, JointCategory, LentEntry, CategoryFormData } from "@/types/portfolio";

const SPOTLIGHT_KEYS = {
  portfolio: "wealth-ledger-spotlight-portfolio-seen",
  bookkeeping: "wealth-ledger-spotlight-bookkeeping-seen",
  joint: "wealth-ledger-spotlight-joint-seen",
} as const;

function getSpotlightSeen(key: keyof typeof SPOTLIGHT_KEYS): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(SPOTLIGHT_KEYS[key]) === "true";
}

function setSpotlightSeen(key: keyof typeof SPOTLIGHT_KEYS) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SPOTLIGHT_KEYS[key], "true");
}

function SortableCategoryWrapper({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
      {children}
    </div>
  );
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<"portfolio" | "bank" | "joint">("portfolio");
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);
  const [data, setData] = useState<AppData | null>(null);
  const [includeJointInPortfolio, setIncludeJointInPortfolio] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [spotlightTab, setSpotlightTab] = useState<"portfolio" | "bookkeeping" | "joint" | null>(null);
  const [portfolioIntroDone, setPortfolioIntroDone] = useState(false);
  const [stockQuotes, setStockQuotes] = useState<Record<string, StockQuote>>({});
  const [stockQuotesLoading, setStockQuotesLoading] = useState(false);
  const driverRef = useRef<ReturnType<typeof driver> | null>(null);
  
  const [aiSummaryModal, setAiSummaryModal] = useState({
    isOpen: false,
    summary: "",
  });

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, []);

  // Fetch live stock quotes for portfolio stock categories
  useEffect(() => {
    if (!data) return;

    const symbols = getStockSymbols(data.portfolioCategories);
    if (symbols.length === 0) {
      setStockQuotes({});
      return;
    }

    let cancelled = false;
    setStockQuotesLoading(true);

    fetch("/api/stock/quotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbols }),
    })
      .then((response) => response.json())
      .then((result) => {
        if (!cancelled && result.quotes) {
          setStockQuotes(result.quotes);
        }
      })
      .catch((error) => {
        console.error("Failed to fetch stock quotes:", error);
      })
      .finally(() => {
        if (!cancelled) setStockQuotesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [data?.portfolioCategories]);

  // Show portfolio spotlight on first visit (when landing on Wealth Ledger / Portfolio)
  useEffect(() => {
    if (loading || !data || activeTab !== "portfolio") return;
    if (!getSpotlightSeen("portfolio")) setSpotlightTab("portfolio");
  }, [loading, data, activeTab]);

  // Show Book Keeping or Joint Accounts spotlight when user switches to that tab (only if no other spotlight is open)
  useEffect(() => {
    if (spotlightTab !== null) return;
    if (activeTab === "bank" && !getSpotlightSeen("bookkeeping")) setSpotlightTab("bookkeeping");
    if (activeTab === "joint" && !getSpotlightSeen("joint")) setSpotlightTab("joint");
  }, [activeTab, spotlightTab]);

  // Run driver.js spotlight when tab is set (for bookkeeping/joint immediately; for portfolio after intro modal is dismissed)
  useEffect(() => {
    const tab = spotlightTab;
    const runForPortfolio = tab === "portfolio" && portfolioIntroDone;
    const runForOther = tab === "bookkeeping" || tab === "joint";
    if (!runForPortfolio && !runForOther) return;

    const steps = (() => {
      if (tab === "portfolio") {
        return [
          {
            element: "#wealth-ledger-tab-portfolio",
            popover: {
              title: "Portfolio",
              description:
                "Add your assets (stocks, funds, property, etc.) and see your total portfolio value. You can toggle to include joint accounts in the total.",
              side: "bottom" as const,
              align: "center" as const,
              showButtons: ["close" as const],
              doneBtnText: "Got it",
            },
          },
        ];
      }
      if (tab === "bookkeeping") {
        return [
          {
            element: "#wealth-ledger-tab-bookkeeping",
            popover: {
              title: "Book Keeping",
              description:
                "Track your bank balance and money lent out. Savings Account is your current bank balance; Money Lent Out lets you add categories and entries. The top total is Cash & Receivables (bank + lent).",
              side: "bottom" as const,
              align: "center" as const,
              showButtons: ["close" as const],
              doneBtnText: "Got it",
            },
          },
        ];
      }
      if (tab === "joint") {
        return [
          {
            element: "#wealth-ledger-tab-joint",
            popover: {
              title: "Joint Accounts",
              description:
                "Track shared accounts (e.g. with spouse or family). Add categories with amounts. You can include joint totals in your Portfolio view using the toggle on the Portfolio tab.",
              side: "bottom" as const,
              align: "center" as const,
              showButtons: ["close" as const],
              doneBtnText: "Got it",
            },
          },
        ];
      }
      return [];
    })();

    if (steps.length === 0) return;

    const driverObj = driver({
      showProgress: false,
      animate: true,
      allowClose: true,
      overlayOpacity: 0.6,
      steps,
      onDestroyed: () => {
        if (tab) {
          setSpotlightSeen(tab);
          setSpotlightTab(null);
        }
        setPortfolioIntroDone(false);
        driverRef.current = null;
      },
    });
    driverRef.current = driverObj;
    const t = setTimeout(() => driverObj.drive(), 50);
    return () => {
      clearTimeout(t);
      if (driverRef.current?.isActive()) driverRef.current.destroy();
    };
  }, [spotlightTab, portfolioIntroDone]);

  const handleDismissSpotlight = () => {
    if (spotlightTab === "portfolio") {
      setPortfolioIntroDone(true);
    } else if (spotlightTab) {
      setSpotlightSeen(spotlightTab);
      setSpotlightTab(null);
    }
  };

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

  const [deleteLentCategoryModal, setDeleteLentCategoryModal] = useState<{
    isOpen: boolean;
    categoryId: string;
    categoryName: string;
  }>({ isOpen: false, categoryId: "", categoryName: "" });

  /** Frontend-only: per lent entry, original amount before tracked adds and each add-on */
  const [lentEntryAddHistory, setLentEntryAddHistory] = useState<
    Record<string, { original: number; additions: number[] }>
  >({});

  const findLentEntryById = (entryId: string): LentEntry | undefined => {
    if (!data) return undefined;
    for (const cat of data.lentCategories) {
      const found = cat.entries.find((e) => e.id === entryId);
      if (found) return found;
    }
    return undefined;
  };

  // Drop history for entries that no longer exist (deleted entry/category)
  useEffect(() => {
    if (!data) return;
    const ids = new Set(data.lentCategories.flatMap((c) => c.entries.map((e) => e.id)));
    setLentEntryAddHistory((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const k of Object.keys(next)) {
        if (!ids.has(k)) {
          delete next[k];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [data]);

  const getCategoryDisplayValue = (category: PortfolioCategory) =>
    getPortfolioCategoryValue(category, stockQuotes);

  const calculateTotalPortfolio = () => {
    if (!data) return 0;
    const categoriesTotal = data.portfolioCategories.reduce(
      (sum, cat) => sum + getCategoryDisplayValue(cat),
      0
    );
    const jointTotal = includeJointInPortfolio ? calculateTotalJoint() : 0;
    return categoriesTotal + jointTotal;
  };

  const calculateTotalLiquid = () => {
    if (!data) return 0;
    const liquidCategories = data.portfolioCategories
      .filter((cat) => cat.isLiquid)
      .reduce((sum, cat) => sum + getCategoryDisplayValue(cat), 0);
    return liquidCategories;
  };

  const calculateBankBalance = () => {
    return data?.savingsAccount ?? 0;
  };

  /** Book Keeping total: bank balance (savings) + money lent out */
  const calculateCashAndReceivables = () => {
    if (!data) return 0;
    return data.savingsAccount + calculateTotalLent();
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

  const calculateCategoryBalance = (categoryName: string) => {
    if (!data) return 0;
    const category = data.lentCategories.find(
      (cat) => cat.name.toLowerCase() === categoryName.toLowerCase()
    );
    if (!category) return 0;
    return category.entries.reduce((sum, entry) => sum + entry.amount, 0);
  };

  const generateWhatsAppLink = () => {
    const familyBalance = calculateCategoryBalance("Family");
    const manojBalance = calculateCategoryBalance("Manoj");
    
    // Format the text for WhatsApp
    const text = `General Balance : ${formatCurrency(familyBalance)}\nManoj Balance : ${formatCurrency(manojBalance)}`;
    
    // Encode the text for URL
    const encodedText = encodeURIComponent(text);
    const whatsappUrl = `https://api.whatsapp.com/send/?phone=918667649058&text=${encodedText}&type=phone_number&app_absent=0`;
    
    return whatsappUrl;
  };

  /** WhatsApp text with base + each add => total for Family (General) and Manoj lent categories */
  const generateLentAddsWhatsAppLink = () => {
    const buildLine = (categoryName: string, label: string) => {
      const category = data?.lentCategories.find(
        (c) => c.name.toLowerCase() === categoryName.toLowerCase()
      );
      if (!category) return `${label} : ${formatCurrency(0)}`;

      let baseSum = 0;
      const addParts: number[] = [];
      for (const e of category.entries) {
        const h = lentEntryAddHistory[e.id];
        if (h && h.additions.length > 0) {
          baseSum += h.original;
          addParts.push(...h.additions);
        } else {
          baseSum += e.amount;
        }
      }

      const total = calculateCategoryBalance(categoryName);
      if (addParts.length === 0) {
        return `${label} : ${formatCurrency(total)}`;
      }
      const addsStr = addParts.map((a) => formatCurrency(a)).join(" + ");
      return `${label} : ${formatCurrency(baseSum)} + ${addsStr} => ${formatCurrency(total)}`;
    };

    const text = `${buildLine("Family", "General Balance")}\n${buildLine("Manoj", "Manoj Balance")}`;
    const encodedText = encodeURIComponent(text);
    return `https://api.whatsapp.com/send/?phone=918667649058&text=${encodedText}&type=phone_number&app_absent=0`;
  };

  const hasLentAddsTracked = Object.values(lentEntryAddHistory).some((h) => h.additions.length > 0);

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

  const handleAddCategory = async (formData: CategoryFormData) => {
    setIsMutating(true);
    try {
      if (addCategoryModal.type === "portfolio") {
        const response = await fetch("/api/portfolio/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        const result = await response.json();
        setData(result);
      } else if (addCategoryModal.type === "joint") {
        const response = await fetch("/api/joint/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: formData.name, amount: formData.amount || 0 }),
        });
        const result = await response.json();
        setData(result);
      } else if (addCategoryModal.type === "lent") {
        const response = await fetch("/api/lent/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: formData.name }),
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

  const handleEditCategory = async (categoryId: string, formData: CategoryFormData) => {
    setIsMutating(true);
    try {
      if (editCategoryModal.type === "portfolio") {
        const response = await fetch("/api/portfolio/categories", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: categoryId, ...formData }),
        });
        const result = await response.json();
        setData(result);
      } else if (editCategoryModal.type === "joint") {
        const response = await fetch("/api/joint/categories", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: categoryId, name: formData.name, amount: formData.amount }),
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
    notes: string,
    addMoney?: number
  ) => {
    const entryBefore = findLentEntryById(id);
    setIsMutating(true);
    try {
      const response = await fetch("/api/lent/entries", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name, amount, date, notes }),
      });
      const result = await response.json();
      setData(result);
      if (response.ok && addMoney !== undefined && addMoney > 0 && entryBefore) {
        setLentEntryAddHistory((prev) => {
          const existing = prev[id];
          if (existing) {
            return {
              ...prev,
              [id]: { ...existing, additions: [...existing.additions, addMoney] },
            };
          }
          return {
            ...prev,
            [id]: { original: entryBefore.amount, additions: [addMoney] },
          };
        });
      }
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

  const handleDeleteLentCategory = async () => {
    if (!deleteLentCategoryModal.categoryId) return;
    setIsMutating(true);
    try {
      const response = await fetch("/api/lent/categories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteLentCategoryModal.categoryId }),
      });
      const result = await response.json();
      setData(result);
      setDeleteLentCategoryModal({ isOpen: false, categoryId: "", categoryName: "" });
    } catch (error) {
      console.error("Failed to delete lent category:", error);
    } finally {
      setIsMutating(false);
    }
  };

  const handleGetAISummary = async () => {
    setIsMutating(true);
    try {
      const response = await fetch("/api/ai/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ includeJointInPortfolio }),
      });
      const result = await response.json();
      
      if (result.error) {
        alert(result.error);
      } else {
        setAiSummaryModal({ isOpen: true, summary: result.summary });
      }
    } catch (error) {
      console.error("Failed to get AI summary:", error);
      alert("Failed to generate AI summary. Please try again.");
    } finally {
      setIsMutating(false);
    }
  };

  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handlePortfolioDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !data) return;
    const oldIndex = data.portfolioCategories.findIndex((c) => c.id === active.id);
    const newIndex = data.portfolioCategories.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    setData({
      ...data,
      portfolioCategories: arrayMove(data.portfolioCategories, oldIndex, newIndex),
    });
  };

  const handleLentDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !data) return;
    const oldIndex = data.lentCategories.findIndex((c) => c.id === active.id);
    const newIndex = data.lentCategories.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    setData({
      ...data,
      lentCategories: arrayMove(data.lentCategories, oldIndex, newIndex),
    });
  };

  const handleJointDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !data) return;
    const oldIndex = data.jointCategories.findIndex((c) => c.id === active.id);
    const newIndex = data.jointCategories.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    setData({
      ...data,
      jointCategories: arrayMove(data.jointCategories, oldIndex, newIndex),
    });
  };

  // Swipe handlers for tabs
  const handleSwipeLeft = () => {
    setSwipeDirection("left");
    if (activeTab === "portfolio") {
      setActiveTab("bank");
    } else if (activeTab === "bank") {
      setActiveTab("joint");
    }
  };

  const handleSwipeRight = () => {
    setSwipeDirection("right");
    if (activeTab === "joint") {
      setActiveTab("bank");
    } else if (activeTab === "bank") {
      setActiveTab("portfolio");
    }
  };

  const swipeHandlers = useSwipeable({
    onSwipedLeft: handleSwipeLeft,
    onSwipedRight: handleSwipeRight,
    trackMouse: false, // Only track touch, not mouse
    preventScrollOnSwipe: false,
    delta: 50, // Minimum swipe distance
  });

  // Reset animation after tab change
  useEffect(() => {
    if (swipeDirection) {
      const timer = setTimeout(() => setSwipeDirection(null), 300);
      return () => clearTimeout(timer);
    }
  }, [swipeDirection]);

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

  return (
    <div className="min-h-screen bg-[#fafafa] pt-16 lg:pt-0 pb-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Page Header with AI Summary */}
        <div className="flex items-center justify-between py-6">
          <h1 className="text-3xl font-bold text-black tracking-tight">Wealth Ledger</h1>
          <button
            onClick={handleGetAISummary}
            className="btn-primary px-4 py-2 rounded-lg flex items-center gap-2 text-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
            </svg>
            AI Summary
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white border-b border-gray-200 sticky top-16 lg:top-0 z-10 -mx-4 px-4">
        <div className="grid grid-cols-3">
          <button
            id="wealth-ledger-tab-portfolio"
            onClick={() => setActiveTab("portfolio")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "portfolio"
                ? "border-black text-black"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            Portfolio
          </button>
          <button
            id="wealth-ledger-tab-bookkeeping"
            onClick={() => setActiveTab("bank")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "bank"
                ? "border-black text-black"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            Book Keeping
          </button>
          <button
            id="wealth-ledger-tab-joint"
            onClick={() => setActiveTab("joint")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "joint"
                ? "border-black text-black"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            Joint Accounts
          </button>
        </div>
      </div>

      {/* Content with Swipe Support */}
      <div className="p-4" {...swipeHandlers}>
        {/* Portfolio Tab */}
        {activeTab === "portfolio" && (
          <div className={`space-y-4 ${swipeDirection === "left" ? "slide-in-right" : swipeDirection === "right" ? "slide-in-left" : ""}`}>
            {/* Total Card */}
            <div className="card p-6 bg-blue-50 border-blue-200">
              <p className="text-sm text-blue-700 font-medium mb-1">Total Portfolio</p>
              <p className="text-4xl font-bold text-blue-900 tracking-tight">{formatCurrency(calculateTotalPortfolio())}</p>
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
            <div className="card divide-y divide-gray-200">
              <DndContext
                sensors={dndSensors}
                collisionDetection={closestCenter}
                onDragEnd={handlePortfolioDragEnd}
              >
                <SortableContext
                  items={data.portfolioCategories.map((c) => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {data.portfolioCategories.map((category) => (
                    <SortableCategoryWrapper key={category.id} id={category.id}>
                      <div
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
                          <div className="flex flex-wrap items-center gap-2 mt-0.5">
                            {category.isLiquid && (
                              <span className="badge-success text-xs px-2 py-0.5 rounded-md">
                                Liquid
                              </span>
                            )}
                            {category.isStock && category.stockSymbol && category.stockUnits != null && (
                              <span className="text-xs text-gray-500">
                                {category.stockUnits} × {category.stockSymbol}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-lg font-semibold text-gray-900">
                            {category.isStock && stockQuotesLoading && !stockQuotes[category.stockSymbol?.toUpperCase() ?? ""] ? (
                              <span className="text-sm text-gray-400">Loading…</span>
                            ) : (
                              formatCurrency(getCategoryDisplayValue(category))
                            )}
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
                    </SortableCategoryWrapper>
                  ))}
                </SortableContext>
              </DndContext>
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

        {/* Book Keeping Tab */}
        {activeTab === "bank" && (
          <div className={`space-y-4 ${swipeDirection === "left" ? "slide-in-right" : swipeDirection === "right" ? "slide-in-left" : ""}`}>
            {/* Total Card: bank balance + money lent out */}
            <div className="card p-6 bg-green-50 border-green-200">
              <p className="text-sm opacity-90 mb-1">Cash & Receivables</p>
              <p className="text-4xl font-bold">{formatCurrency(calculateCashAndReceivables())}</p>
              <p className="text-xs text-gray-600 mt-1">Bank balance + money lent out</p>
            </div>

            {/* Savings Account Balance */}
            <div className="space-y-2">
              <div>
                <a
                  href={generateWhatsAppLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center justify-center gap-1"
                >
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.272-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421-7.403h-.004a9.87 9.87 0 00-4.946 1.23l-.355.192-3.674-.965.985 3.601-.233.362a9.9 9.9 0 00-1.512 5.471c0 5.476 4.441 9.926 9.906 9.926 2.662 0 5.165-.994 7.287-2.8l.323-.243 3.761.98-.997-3.636.231-.362a9.9 9.9 0 001.511-5.471c0-5.476-4.44-9.926-9.906-9.926z"/>
                  </svg>
                  WhatsApp
                </a>
              </div>
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
            </div>

            {/* Money Lent */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
                <h3 className="font-semibold text-black">
                  Money Lent Out ({formatCurrency(calculateTotalLent())})
                </h3>
                {hasLentAddsTracked && (
                  <a
                    href={generateLentAddsWhatsAppLink()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-medium flex items-center gap-1"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.272-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421-7.403h-.004a9.87 9.87 0 00-4.946 1.23l-.355.192-3.674-.965.985 3.601-.233.362a9.9 9.9 0 00-1.512 5.471c0 5.476 4.441 9.926 9.906 9.926 2.662 0 5.165-.994 7.287-2.8l.323-.243 3.761.98-.997-3.636.231-.362a9.9 9.9 0 001.511-5.471c0-5.476-4.44-9.926-9.906-9.926z" />
                    </svg>
                    Send WhatsApp
                  </a>
                )}
              </div>
              <DndContext
                sensors={dndSensors}
                collisionDetection={closestCenter}
                onDragEnd={handleLentDragEnd}
              >
                <SortableContext
                  items={data.lentCategories.map((c) => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-1">
                    {data.lentCategories.map((category) => {
                      const categoryTotal = category.entries.reduce((sum, entry) => sum + entry.amount, 0);
                      return (
                        <SortableCategoryWrapper key={category.id} id={category.id}>
                          <Accordion
                            title={category.name}
                            badge={formatCurrency(categoryTotal)}
                            defaultOpen={false}
                            actions={
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteLentCategoryModal({
                              isOpen: true,
                              categoryId: category.id,
                              categoryName: category.name,
                            });
                          }}
                          className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete category"
                          aria-label="Delete category"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      }
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
                        </SortableCategoryWrapper>
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>
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
          <div className={`space-y-4 ${swipeDirection === "left" ? "slide-in-right" : swipeDirection === "right" ? "slide-in-left" : ""}`}>
            {/* Total Card */}
            <div className="card p-6 bg-purple-50 border-purple-200">
              <p className="text-sm text-purple-700 font-medium mb-1">Total Joint Accounts</p>
              <p className="text-4xl font-bold text-purple-900 tracking-tight">{formatCurrency(calculateTotalJoint())}</p>
            </div>

            {/* Joint Categories */}
            <div className="card divide-y divide-gray-200">
              <DndContext
                sensors={dndSensors}
                collisionDetection={closestCenter}
                onDragEnd={handleJointDragEnd}
              >
                <SortableContext
                  items={data.jointCategories.map((c) => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {data.jointCategories.map((category) => (
                    <SortableCategoryWrapper key={category.id} id={category.id}>
                      <div
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
                    </SortableCategoryWrapper>
                  ))}
                </SortableContext>
              </DndContext>
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

      {/* Spotlight onboarding: Wealth Ledger intro modal (portfolio only); tab highlights via driver.js */}
      {spotlightTab === "portfolio" && !portfolioIntroDone && (
        <SpotlightModal
          isOpen={true}
          onDismiss={handleDismissSpotlight}
          title="Welcome to Wealth Ledger"
        >
          <p>Wealth Ledger helps you see and manage your money in one place—assets, bank balance, receivables, and shared accounts—so you stay on top of your finances without the guesswork.</p>
        </SpotlightModal>
      )}

      <EditModal
        isOpen={editSavingsModal.isOpen}
        onClose={() => setEditSavingsModal({ ...editSavingsModal, isOpen: false })}
        title="Update Savings Account"
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
        showStockToggle={addCategoryModal.type === "portfolio"}
      />

      {editCategoryModal.isOpen && editCategoryModal.category && (
        <EditCategoryModal
          key={editCategoryModal.category.id}
          isOpen={editCategoryModal.isOpen}
          onClose={() => setEditCategoryModal({ ...editCategoryModal, isOpen: false })}
          title={`Edit ${editCategoryModal.category.name}`}
          name={editCategoryModal.category.name}
          amount={editCategoryModal.category.amount}
          isLiquid={"isLiquid" in editCategoryModal.category ? editCategoryModal.category.isLiquid : false}
          isStock={"isStock" in editCategoryModal.category ? editCategoryModal.category.isStock : false}
          stockSymbol={"stockSymbol" in editCategoryModal.category ? editCategoryModal.category.stockSymbol : null}
          stockUnits={"stockUnits" in editCategoryModal.category ? editCategoryModal.category.stockUnits : null}
          onSave={(formData) =>
            handleEditCategory(editCategoryModal.category!.id, formData)
          }
          onDelete={() => handleDeleteCategory(editCategoryModal.category!.id)}
          showLiquidToggle={editCategoryModal.type === "portfolio"}
          showStockToggle={editCategoryModal.type === "portfolio"}
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

      <AISummaryModal
        isOpen={aiSummaryModal.isOpen}
        onClose={() => setAiSummaryModal({ isOpen: false, summary: "" })}
        summary={aiSummaryModal.summary}
      />

      <ConfirmModal
        isOpen={deleteLentCategoryModal.isOpen}
        onClose={() => setDeleteLentCategoryModal({ isOpen: false, categoryId: "", categoryName: "" })}
        title="Delete lent category"
        message={`Delete "${deleteLentCategoryModal.categoryName}" and all its entries? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDeleteLentCategory}
      />

      {isMutating && <LoadingOverlay />}
      </div>
    </div>
  );
}
