"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  RANGES,
  cashflow,
  filterByRange,
  runningBalance,
  spendingByCategory,
  summarize,
  type RangeKey,
} from "@/lib/analytics";
import { categoryById } from "@/lib/categories";
import { money, moneyCompact, pct, shortDate, signed } from "@/lib/format";
import { SAMPLE_TRANSACTIONS } from "@/lib/sample";
import type { TransactionType } from "@/lib/types";
import { useTransactions } from "@/lib/useTransactions";
import { Background } from "./Background";
import { CashflowChart } from "./CashflowChart";
import { CategoryChart } from "./CategoryChart";
import { Constellation, type BranchSpec, type WindowSpec } from "./constellation/Constellation";
import { KpiPanel, Sparkline, SplitRow, TxPanel } from "./constellation/panels";
import { EntryForm } from "./EntryForm";
import { RangeChips } from "./RangeChips";
import { ThemeToggle } from "./ThemeToggle";
import { TransactionList } from "./TransactionList";
import { Button } from "./ui/Button";
import { Icon } from "./ui/Icon";

const RANGE_LABEL: Record<RangeKey, string> = {
  month: "this month",
  "30d": "last 30 days",
  "90d": "last 90 days",
  all: "all time",
};

const MAX_WINDOWS = 4;

interface OpenWindow {
  id: string;
  slot: number;
}

export function Dashboard() {
  const { rows, loading, error, source, add, addMany, remove, clear } = useTransactions();
  const [range, setRange] = useState<RangeKey>("month");
  const [seeding, setSeeding] = useState(false);

  // constellation state: is the core open, which branch is fanned out, which windows float
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [wins, setWins] = useState<OpenWindow[]>([]);

  const inRange = useMemo(() => filterByRange(rows, range), [rows, range]);
  const summary = useMemo(() => summarize(inRange), [inRange]);
  const allTime = useMemo(() => summarize(rows), [rows]);
  const flow = useMemo(() => cashflow(inRange, range), [inRange, range]);
  const categories = useMemo(() => spendingByCategory(inRange), [inRange]);
  const topCategories = useMemo(() => spendingByCategory(inRange, 99).slice(0, 6), [inRange]);
  const spark = useMemo(() => runningBalance(inRange, 24), [inRange]);
  const netByRange = useMemo(
    () =>
      Object.fromEntries(RANGES.map((r) => [r.key, summarize(filterByRange(rows, r.key)).net])) as Record<
        RangeKey,
        number
      >,
    [rows],
  );

  const rangeLabel = RANGE_LABEL[range];

  function openWindow(id: string) {
    setWins((ws) => {
      const existing = ws.find((w) => w.id === id);
      // only one entry form at a time: opening the other type replaces it
      const rest = ws.filter((w) => w.id !== id && !(id.startsWith("add:") && w.id.startsWith("add:")));
      const kept = rest.slice(-(MAX_WINDOWS - 1));
      if (existing) return [...kept, existing];
      const used = new Set(kept.map((w) => w.slot));
      let slot = 0;
      while (used.has(slot)) slot++;
      return [...kept, { id, slot }];
    });
  }

  function closeWindow(id: string) {
    setWins((ws) => ws.filter((w) => w.id !== id));
  }

  function focusWindow(id: string) {
    setWins((ws) => {
      if (ws[ws.length - 1]?.id === id) return ws;
      const hit = ws.find((w) => w.id === id);
      return hit ? [...ws.filter((w) => w.id !== id), hit] : ws;
    });
  }

  function toggleCore() {
    if (open) {
      setOpen(false);
      setActive(null);
      setWins([]);
    } else {
      setOpen(true);
    }
  }

  // Escape peels back one layer at a time: window, then branch, then the whole constellation.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (wins.length) setWins((ws) => ws.slice(0, -1));
      else if (active) setActive(null);
      else if (open) setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [wins.length, active, open]);

  async function loadSample() {
    setSeeding(true);
    try {
      await addMany(SAMPLE_TRANSACTIONS);
    } finally {
      setSeeding(false);
    }
  }

  const isOpen = (id: string) => wins.some((w) => w.id === id);

  const kpis = [
    { key: "net", label: "Net", value: money(summary.net), art: "/kpi/net.png" },
    { key: "income", label: "Income", value: money(summary.income), art: "/kpi/income.png" },
    { key: "expenses", label: "Expenses", value: money(summary.expenses), art: "/kpi/expenses.png" },
    {
      key: "savings",
      label: "Savings rate",
      value: summary.income > 0 ? pct(summary.savingsRate) : "—",
      art: "/kpi/savings.png",
    },
  ];

  /* ---------- the tree: branches and their leaves ---------- */
  const branches: BranchSpec[] = [
    {
      id: "overview",
      label: "Overview",
      caption: `4 KPIs · ${rangeLabel}`,
      icon: "account_balance",
      leaves: kpis.map((k) => ({
        id: k.key,
        label: k.label,
        caption: k.value,
        art: k.art,
        selected: isOpen(`kpi:${k.key}`),
        onSelect: () => openWindow(`kpi:${k.key}`),
      })),
    },
    {
      id: "flow",
      label: "Cash flow",
      caption: `Net ${summary.net < 0 ? "−" : "+"}${moneyCompact(Math.abs(summary.net))}`,
      icon: "trending_up",
      leaves: RANGES.map((r) => ({
        id: r.key,
        label: r.label,
        caption: `Net ${signed(netByRange[r.key])}`,
        tone: "net" as const,
        selected: range === r.key && isOpen("flow"),
        onSelect: () => {
          setRange(r.key);
          openWindow("flow");
        },
      })),
    },
    {
      id: "spending",
      label: "Spending",
      caption: summary.expenses > 0 ? `${moneyCompact(summary.expenses)} spent` : "No expenses yet",
      icon: "shopping_bag",
      leaves: [
        {
          id: "all",
          label: "All categories",
          caption: money(summary.expenses),
          icon: "shopping_bag",
          tone: "expense" as const,
          selected: isOpen("spending"),
          onSelect: () => openWindow("spending"),
        },
        ...topCategories.map((c) => {
          const cat = categoryById(c.category);
          return {
            id: c.category,
            label: cat.label,
            caption: `${moneyCompact(c.total)} · ${pct(c.share)}`,
            icon: cat.icon,
            tone: "expense" as const,
            selected: isOpen(`category:${c.category}`),
            onSelect: () => openWindow(`category:${c.category}`),
          };
        }),
      ],
    },
    {
      id: "activity",
      label: "Activity",
      caption: rows.length ? `${rows.length} transactions` : loading ? "Loading…" : "Nothing logged yet",
      icon: "receipt_long",
      leaves: [
        {
          id: "all",
          label: "All activity",
          caption: rows.length ? `${rows.length} entries` : "No entries yet",
          icon: "receipt_long",
          selected: isOpen("activity"),
          onSelect: () => openWindow("activity"),
        },
        ...rows.slice(0, 5).map((t) => ({
          id: t.id,
          label: t.name,
          caption: `${signed(t.type === "income" ? t.amount : -t.amount)} · ${shortDate(t.date)}`,
          tone: t.type === "income" ? ("income" as const) : ("expense" as const),
          selected: isOpen(`tx:${t.id}`),
          onSelect: () => openWindow(`tx:${t.id}`),
        })),
        ...(rows.length === 0 && !loading
          ? [
              {
                id: "sample",
                label: seeding ? "Loading sample…" : "Load sample data",
                caption: `${SAMPLE_TRANSACTIONS.length} example entries`,
                icon: "auto_awesome",
                onSelect: () => {
                  if (!seeding) void loadSample();
                },
              },
            ]
          : []),
      ],
    },
    {
      id: "add",
      label: "Add entry",
      caption: "Income or expense",
      icon: "add",
      leaves: [
        {
          id: "expense",
          label: "Expense",
          caption: "Money going out",
          icon: "arrow_outward",
          tone: "expense" as const,
          selected: isOpen("add:expense"),
          onSelect: () => openWindow("add:expense"),
        },
        {
          id: "income",
          label: "Income",
          caption: "Money coming in",
          icon: "arrow_downward",
          tone: "income" as const,
          selected: isOpen("add:income"),
          onSelect: () => openWindow("add:income"),
        },
      ],
    },
  ];

  /* ---------- floating windows ---------- */
  function resolveWindow(id: string): Omit<WindowSpec, "id" | "slot"> | null {
    const cut = id.indexOf(":");
    const kind = cut < 0 ? id : id.slice(0, cut);
    const param = cut < 0 ? "" : id.slice(cut + 1);
    const chips = <RangeChips value={range} onChange={setRange} />;

    switch (kind) {
      case "kpi": {
        const k = kpis.find((x) => x.key === param);
        if (!k) return null;
        const total = summary.income + summary.expenses || 1;
        const biggest = (type: TransactionType) =>
          inRange.filter((t) => t.type === type).sort((a, b) => b.amount - a.amount);
        return {
          title: k.label,
          subtitle: `Overview · ${rangeLabel}`,
          icon: "account_balance",
          content: (
            <KpiPanel art={k.art} value={k.value} hint={rangeLabel}>
              <div className="flex justify-center">{chips}</div>
              {param === "net" && (
                <>
                  <Sparkline data={spark} color="var(--series-net)" />
                  <SplitRow
                    label="Income"
                    value={money(summary.income)}
                    share={summary.income / total}
                    color="var(--series-income)"
                  />
                  <SplitRow
                    label="Expenses"
                    value={money(summary.expenses)}
                    share={summary.expenses / total}
                    color="var(--series-expense)"
                  />
                </>
              )}
              {param === "income" && (
                <div>
                  <p className="mb-1 text-xs font-medium text-[var(--ink-3)]">Largest income</p>
                  <TransactionList rows={biggest("income")} onDelete={remove} limit={4} />
                </div>
              )}
              {param === "expenses" && (
                <div>
                  <p className="mb-1 text-xs font-medium text-[var(--ink-3)]">Largest expenses</p>
                  <TransactionList rows={biggest("expense")} onDelete={remove} limit={4} />
                </div>
              )}
              {param === "savings" && (
                <>
                  <SplitRow
                    label="Kept"
                    value={money(Math.max(0, summary.net))}
                    share={summary.savingsRate}
                    color="var(--primary)"
                  />
                  <p className="text-sm text-[var(--ink-2)]">
                    {summary.income > 0
                      ? `You kept ${money(Math.max(0, summary.net))} of the ${money(summary.income)} you earned ${rangeLabel}.`
                      : `No income logged ${rangeLabel}, so there is no rate to show yet.`}
                  </p>
                </>
              )}
            </KpiPanel>
          ),
        };
      }
      case "flow":
        return {
          title: "Cash flow",
          subtitle: `Income versus expenses · ${rangeLabel}`,
          icon: "trending_up",
          content: (
            <div className="flex flex-col gap-4">
              <div className="flex justify-center">{chips}</div>
              <CashflowChart data={flow} />
            </div>
          ),
        };
      case "spending":
        return {
          title: "Spending by category",
          subtitle: `Where the money went · ${rangeLabel}`,
          icon: "shopping_bag",
          content: (
            <div className="flex flex-col gap-4">
              <div className="flex justify-center">{chips}</div>
              <CategoryChart data={categories} />
            </div>
          ),
        };
      case "category": {
        const cat = categoryById(param);
        const list = inRange.filter((t) => t.type === "expense" && t.category === param);
        const total = list.reduce((s, t) => s + t.amount, 0);
        return {
          title: cat.label,
          subtitle: `${money(total)} · ${rangeLabel}`,
          icon: cat.icon,
          content: <TransactionList rows={list} onDelete={remove} limit={20} />,
        };
      }
      case "activity":
        return {
          title: "Recent activity",
          subtitle: rows.length ? `${rows.length} total` : undefined,
          icon: "receipt_long",
          content: (
            <div>
              {loading ? (
                <div className="grid h-[160px] place-items-center text-sm text-[var(--ink-3)]">Loading…</div>
              ) : (
                <TransactionList rows={rows} onDelete={remove} limit={30} />
              )}
              <div className="mt-2 flex flex-wrap justify-end gap-2">
                {rows.length === 0 && !loading && (
                  <Button variant="tonal" icon="auto_awesome" onClick={loadSample} loading={seeding}>
                    Load sample data
                  </Button>
                )}
                {rows.length > 0 && source === "local" && (
                  <Button
                    variant="text"
                    icon="delete_sweep"
                    onClick={() => {
                      if (confirm("Clear all locally stored transactions?")) void clear();
                    }}
                  >
                    Clear local data
                  </Button>
                )}
              </div>
            </div>
          ),
        };
      case "tx": {
        const tx = rows.find((t) => t.id === param);
        if (!tx) return null;
        const cat = categoryById(tx.category);
        return {
          title: tx.name,
          subtitle: `${cat.label} · ${shortDate(tx.date)}`,
          icon: cat.icon,
          content: (
            <TxPanel
              tx={tx}
              onDelete={() => {
                closeWindow(id);
                void remove(tx.id);
              }}
            />
          ),
        };
      }
      case "add": {
        const type: TransactionType = param === "income" ? "income" : "expense";
        return {
          title: type === "income" ? "Add income" : "Add expense",
          subtitle: "Manual entry until the pipeline lands",
          icon: "add",
          content: <EntryForm key={type} initialType={type} onSubmit={add} />,
        };
      }
      default:
        return null;
    }
  }

  const windows: WindowSpec[] = wins.flatMap((w) => {
    const spec = resolveWindow(w.id);
    return spec ? [{ ...w, ...spec }] : [];
  });

  const summaryLine =
    allTime.count === 0
      ? "Open Add entry to log your first transaction"
      : `${allTime.count} transactions · ${moneyCompact(allTime.income)} in · ${moneyCompact(allTime.expenses)} out`;

  return (
    <>
      <Background />
      <div className="mx-auto w-full max-w-[1520px] px-4 pb-5 pt-5 sm:px-6 lg:px-8">
        {/* ---------- Top bar ---------- */}
        <header className="mb-3 flex min-h-[46px] flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[var(--primary)] text-[var(--on-primary)] elev-primary">
              <Icon name="account_balance_wallet" size={22} filled />
            </span>
            <div>
              <h1 className="text-lg font-semibold leading-none tracking-tight">Lumen Finance</h1>
              <p className="mt-1 text-xs text-[var(--ink-3)]">Personal cash flow, at a glance</p>
            </div>
          </div>
          <AnimatePresence>
            {open && (
              <motion.div
                className="order-last flex w-full justify-center md:order-none md:w-auto"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
              >
                <RangeChips value={range} onChange={setRange} />
              </motion.div>
            )}
          </AnimatePresence>
          <div className="flex items-center gap-2">
            <SourceChip source={source} />
            <ThemeToggle />
          </div>
        </header>

        <Constellation
          open={open}
          onToggle={toggleCore}
          active={active}
          onActive={setActive}
          branches={branches}
          windows={windows}
          onCloseWindow={closeWindow}
          onFocusWindow={focusWindow}
          balance={money(allTime.net)}
          summary={summaryLine}
        />

        {error && (
          <div
            role="alert"
            className="glass glass-strong flex items-center gap-2 px-4 py-3 text-sm"
            style={{
              position: "fixed",
              bottom: 20,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 60,
              borderRadius: 16,
            }}
          >
            <Icon name="error" size={20} className="text-[var(--critical)]" />
            {error}
          </div>
        )}
      </div>
    </>
  );
}

function SourceChip({ source }: { source: "supabase" | "local" }) {
  const live = source === "supabase";
  return (
    <span
      className="glass-pill hidden items-center gap-1.5 px-3 py-1.5 text-xs text-[var(--ink-2)] sm:inline-flex"
      title={live ? "Connected to Supabase" : "No Supabase keys yet — data is stored in this browser"}
    >
      <span className="h-2 w-2 rounded-full" style={{ background: live ? "var(--good)" : "var(--ink-3)" }} />
      {live ? "Supabase" : "Local mode"}
    </span>
  );
}
