import { getSupabase, isSupabaseConfigured } from "./supabase";
import type { NewTransaction, StoreSource, Transaction } from "./types";

export interface TransactionStore {
  source: StoreSource;
  list(): Promise<Transaction[]>;
  add(input: NewTransaction): Promise<Transaction>;
  remove(id: string): Promise<void>;
  clear(): Promise<void>;
}

const LOCAL_KEY = "finance-dashboard:transactions:v1";

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function sortDesc(rows: Transaction[]): Transaction[] {
  return [...rows].sort((a, b) =>
    a.date === b.date ? b.created_at.localeCompare(a.created_at) : b.date.localeCompare(a.date),
  );
}

/* ---------- Local adapter (runs before Supabase keys exist) ---------- */

function readLocal(): Transaction[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? (JSON.parse(raw) as Transaction[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(rows: Transaction[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(rows));
  } catch {
    /* storage unavailable (private mode etc.) — keep in memory only */
  }
}

const localStore: TransactionStore = {
  source: "local",
  async list() {
    return sortDesc(readLocal());
  },
  async add(input) {
    const row: Transaction = { ...input, id: uid(), created_at: new Date().toISOString() };
    writeLocal([row, ...readLocal()]);
    return row;
  },
  async remove(id) {
    writeLocal(readLocal().filter((r) => r.id !== id));
  },
  async clear() {
    writeLocal([]);
  },
};

/* ---------- Supabase adapter ---------- */

function friendly(error: { code?: string; message: string }): Error {
  if (error.code === "PGRST205") {
    return new Error(
      "Supabase is connected, but the transactions table does not exist yet. Run supabase/schema.sql in the SQL editor.",
    );
  }
  if (error.code === "42501") {
    return new Error("Supabase refused the request (row-level security). Re-run the policies in supabase/schema.sql.");
  }
  return new Error(error.message);
}

const supabaseStore: TransactionStore = {
  source: "supabase",
  async list() {
    const sb = getSupabase()!;
    const { data, error } = await sb
      .from("transactions")
      .select("*")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw friendly(error);
    return (data ?? []).map((r) => ({ ...r, amount: Number(r.amount) })) as Transaction[];
  },
  async add(input) {
    const sb = getSupabase()!;
    const { data, error } = await sb.from("transactions").insert(input).select("*").single();
    if (error) throw friendly(error);
    return { ...data, amount: Number(data.amount) } as Transaction;
  },
  async remove(id) {
    const sb = getSupabase()!;
    const { error } = await sb.from("transactions").delete().eq("id", id);
    if (error) throw friendly(error);
  },
  async clear() {
    const sb = getSupabase()!;
    const { error } = await sb.from("transactions").delete().neq("id", "");
    if (error) throw friendly(error);
  },
};

export function getStore(): TransactionStore {
  return isSupabaseConfigured ? supabaseStore : localStore;
}
