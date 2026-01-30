export interface LentOutEntry {
  id: string;
  name: string;
  amount: number;
  date: string;
  notes: string;
}

export interface LentOutCategory {
  category: string;
  entries: LentOutEntry[];
}

export interface Portfolio {
  savingsAccount: number;
  lentOut: LentOutCategory[];
}
