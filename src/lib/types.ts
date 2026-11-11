export type TransactionType = "income" | "expense";

export interface Transaction {
  id: string;
  name: string;
  amount: number; // always positive; `type` carries the sign
  type: TransactionType;
  category: string;
  date: string; // ISO date, YYYY-MM-DD
  note: string | null;
  created_at: string; // ISO timestamp
}

export type NewTransaction = Omit<Transaction, "id" | "created_at">;

export type StoreSource = "supabase" | "local";
