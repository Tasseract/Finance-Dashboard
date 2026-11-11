import type { Transaction } from "./types";

export type RangeKey = "month" | "30d" | "90d" | "all";

export const RANGES: { key: RangeKey; label: string }[] = [
  { key: "month", label: "This month" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
  { key: "all", label: "All time" },
];

function isoLocal(d: Date): string {
  const tz = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

export function rangeStart(key: RangeKey, now = new Date()): string | null {
  if (key === "all") return null;
  if (key === "month") return isoLocal(new Date(now.getFullYear(), now.getMonth(), 1));
  const days = key === "30d" ? 30 : 90;
  const d = new Date(now);
  d.setDate(d.getDate() - (days - 1));
  return isoLocal(d);
}

export function filterByRange(rows: Transaction[], key: RangeKey): Transaction[] {
  const start = rangeStart(key);
  return start ? rows.filter((r) => r.date >= start) : rows;
}

export interface Summary {
  income: number;
  expenses: number;
  net: number;
  savingsRate: number; // 0..1, 0 when no income
  count: number;
}

export function summarize(rows: Transaction[]): Summary {
  let income = 0;
  let expenses = 0;
  for (const r of rows) {
    if (r.type === "income") income += r.amount;
    else expenses += r.amount;
  }
  const net = income - expenses;
  return {
    income,
    expenses,
    net,
    savingsRate: income > 0 ? Math.max(0, net / income) : 0,
    count: rows.length,
  };
}

export interface FlowPoint {
  key: string; // bucket id (sortable)
  label: string;
  income: number;
  expense: number;
  net: number;
}

type Granularity = "day" | "week" | "month";

function granularityFor(range: RangeKey, rows: Transaction[]): Granularity {
  if (range === "month" || range === "30d") return "day";
  if (range === "90d") return "week";
  if (rows.length === 0) return "month";
  const first = rows.reduce((m, r) => (r.date < m ? r.date : m), rows[0].date);
  const days = (Date.now() - new Date(first).getTime()) / 86_400_000;
  return days <= 45 ? "day" : days <= 200 ? "week" : "month";
}

function parse(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function bucketOf(date: Date, g: Granularity): { key: string; label: string } {
  if (g === "day") {
    return {
      key: isoLocal(date),
      label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    };
  }
  if (g === "week") {
    const d = new Date(date);
    d.setDate(d.getDate() - d.getDay()); // week starts Sunday
    return {
      key: isoLocal(d),
      label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    };
  }
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  return {
    key: isoLocal(d).slice(0, 7),
    label: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
  };
}

/** Income vs expense per time bucket, with empty buckets filled so the line is continuous. */
export function cashflow(rows: Transaction[], range: RangeKey): FlowPoint[] {
  const g = granularityFor(range, rows);
  const map = new Map<string, FlowPoint>();

  const start = rangeStart(range);
  const first = rows.length
    ? rows.reduce((m, r) => (r.date < m ? r.date : m), rows[0].date)
    : null;
  const from = parse(start ?? first ?? isoLocal(new Date()));
  const to = new Date();

  // fill buckets
  const cursor = new Date(from);
  let guard = 0;
  while (cursor <= to && guard++ < 1000) {
    const b = bucketOf(cursor, g);
    if (!map.has(b.key)) map.set(b.key, { ...b, income: 0, expense: 0, net: 0 });
    if (g === "day") cursor.setDate(cursor.getDate() + 1);
    else if (g === "week") cursor.setDate(cursor.getDate() + 7);
    else cursor.setMonth(cursor.getMonth() + 1);
  }

  for (const r of rows) {
    const b = bucketOf(parse(r.date), g);
    const p = map.get(b.key) ?? { ...b, income: 0, expense: 0, net: 0 };
    if (r.type === "income") p.income += r.amount;
    else p.expense += r.amount;
    p.net = p.income - p.expense;
    map.set(b.key, p);
  }

  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
}

export interface CategorySlice {
  category: string;
  total: number;
  share: number;
}

export function spendingByCategory(rows: Transaction[], limit = 7): CategorySlice[] {
  const totals = new Map<string, number>();
  let all = 0;
  for (const r of rows) {
    if (r.type !== "expense") continue;
    totals.set(r.category, (totals.get(r.category) ?? 0) + r.amount);
    all += r.amount;
  }
  const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  const head = sorted.slice(0, limit);
  const tail = sorted.slice(limit);
  if (tail.length) head.push(["other", tail.reduce((s, [, v]) => s + v, 0)]);
  return head.map(([category, total]) => ({
    category,
    total,
    share: all > 0 ? total / all : 0,
  }));
}

/** Running balance, oldest → newest, for the sparkline. */
export function runningBalance(rows: Transaction[], points = 12): number[] {
  const asc = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  let bal = 0;
  const series = asc.map((r) => (bal += r.type === "income" ? r.amount : -r.amount));
  if (series.length <= points) return series;
  const step = series.length / points;
  return Array.from({ length: points }, (_, i) => series[Math.min(series.length - 1, Math.floor((i + 1) * step) - 1)]);
}
