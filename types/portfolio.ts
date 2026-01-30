export interface PortfolioCategory {
  id: string;
  name: string;
  amount: number;
  isLiquid: boolean;
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
