export interface PortfolioCategory {
  id: string;
  name: string;
  amount: number;
  isLiquid: boolean;
  isStock: boolean;
  stockSymbol: string | null;
  stockUnits: number | null;
}

export interface CategoryFormData {
  name: string;
  amount?: number;
  isLiquid?: boolean;
  isStock?: boolean;
  stockSymbol?: string;
  stockUnits?: number;
}

export interface LentEntry {
  id: string;
  name: string;
  amount: number;
  date: string;
  notes: string;
}

export interface LentCategory {
  id: string;
  name: string;
  entries: LentEntry[];
}

export interface JointCategory {
  id: string;
  name: string;
  amount: number;
}

export interface AppData {
  savingsAccount: number;
  portfolioCategories: PortfolioCategory[];
  lentCategories: LentCategory[];
  jointCategories: JointCategory[];
}
