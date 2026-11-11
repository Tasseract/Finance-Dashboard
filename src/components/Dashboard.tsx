"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  cashflow,
  filterByRange,
  runningBalance,
  spendingByCategory,
  summarize,
  type RangeKey,
} from "@/lib/analytics";
import { money, moneyCompact, pct } from "@/lib/format";
import { SAMPLE_TRANSACTIONS } from "@/lib/sample";
import { useTransactions } from "@/lib/useTransactions";
import { Background } from "./Background";
import { CashflowChart } from "./CashflowChart";
import { CategoryChart } from "./CategoryChart";
import { EntryForm } from "./EntryForm";
import { GlassCard } from "./GlassCard";
import { Hero3D } from "./Hero3D";
import { RangeChips } from "./RangeChips";
import { StatTile } from "./StatTile";
import { ThemeToggle } from "./ThemeToggle";
import { TransactionList } from "./TransactionList";
import { Button } from "./ui/Button";
import { Icon } from "./ui/Icon";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.2, 0, 0, 1] as const } },
};

export function Dashboard() {
  const { rows, loading, error, source, add, addMany, remove, clear } = useTransactions();
  const [range, setRange] = useState<RangeKey>("month");
  const [seeding, setSeeding] = useState(false);

  const inRange = useMemo(() => filterByRange(rows, range), [rows, range]);
  const summary = useMemo(() => summarize(inRange), [inRange]);
  const allTime = useMemo(() => summarize(rows), [rows]);
  const flow = useMemo(() => cashflow(inRange, range), [inRange, range]);
  const categories = useMemo(() => spendingByCategory(inRange), [inRange]);
  const spark = useMemo(() => runningBalance(inRange), [inRange]);

  async function loadSample() {
    setSeeding(true);
    try {
      await addMany(SAMPLE_TRANSACTIONS);
    } finally {
      setSeeding(false);
    }
  }

  const rangeLabel = { month: "this month", "30d": "last 30 days", "90d": "last 90 days", all: "all time" }[range];

  return (
    <>
      <Background />
      <div className="mx-auto w-full max-w-[1280px] px-4 pb-16 pt-5 sm:px-6 lg:px-8">
        {/* ---------- Top bar ---------- */}
        <header className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[var(--primary)] text-[var(--on-primary)] elev-primary">
              <Icon name="account_balance_wallet" size={22} filled />
            </span>
            <div>
              <h1 className="text-lg font-semibold tracking-tight leading-none">Lumen Finance</h1>
              <p className="mt-1 text-xs text-[var(--ink-3)]">Personal cash flow, at a glance</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SourceChip source={source} />
            <ThemeToggle />
          </div>
        </header>

        <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-5">
          {/* ---------- Hero ---------- */}
          <motion.section variants={item} className="glass glass-strong overflow-hidden">
            <div className="grid grid-cols-1 items-center gap-6 p-6 sm:p-8 lg:grid-cols-[1.4fr_1fr]">
              <div>
                <p className="text-sm text-[var(--ink-2)]">Total balance</p>
                <div className="mt-2 text-[48px] font-semibold leading-none tracking-tight sm:text-[64px]">
                  {money(allTime.net)}
                </div>
                <p className="mt-3 text-sm text-[var(--ink-3)]">
                  {allTime.count === 0
                    ? "Add your first transaction below to bring this to life."
                    : `${allTime.count} transactions · income ${moneyCompact(allTime.income)} · spent ${moneyCompact(allTime.expenses)}`}
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Button
                    icon="add"
                    onClick={() => {
                      document.getElementById("add")?.scrollIntoView({ behavior: "smooth", block: "start" });
                      window.setTimeout(() => document.getElementById("tx-name")?.focus({ preventScroll: true }), 450);
                    }}
                  >
                    Add transaction
                  </Button>
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
              <Hero3D className="mx-auto h-[200px] w-[200px] sm:h-[240px] sm:w-[240px] lg:h-[260px] lg:w-[260px]" />
            </div>
          </motion.section>

          {/* ---------- Filters ---------- */}
          <motion.div variants={item} className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-medium text-[var(--ink-2)]">
              Overview <span className="text-[var(--ink-3)]">· {rangeLabel}</span>
            </h2>
            <RangeChips value={range} onChange={setRange} />
          </motion.div>

          {/* ---------- KPIs ---------- */}
          <motion.div variants={item} className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile label="Net" value={money(summary.net)} icon="account_balance" accent="net" hint={rangeLabel} spark={spark} />
            <StatTile label="Income" value={money(summary.income)} icon="trending_up" accent="income" hint={rangeLabel} />
            <StatTile label="Expenses" value={money(summary.expenses)} icon="shopping_bag" accent="expense" hint={rangeLabel} />
            <StatTile
              label="Savings rate"
              value={summary.income > 0 ? pct(summary.savingsRate) : "—"}
              icon="savings"
              accent="primary"
              hint={summary.income > 0 ? "of income kept" : "no income logged"}
            />
          </motion.div>

          {/* ---------- Charts + form ---------- */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
            <motion.div variants={item} className="lg:col-span-3 flex flex-col gap-5">
              <GlassCard title="Cash flow" subtitle="Income versus expenses over time">
                <CashflowChart data={flow} />
              </GlassCard>
              <GlassCard title="Spending by category" subtitle="Where the money went">
                <CategoryChart data={categories} />
              </GlassCard>
            </motion.div>

            <motion.div variants={item} className="lg:col-span-2 flex flex-col gap-5">
              <GlassCard id="add" title="Add transaction" subtitle="Manual entry until the pipeline lands" strong>
                <EntryForm onSubmit={add} />
              </GlassCard>
              <GlassCard
                title="Recent activity"
                subtitle={rows.length ? `${rows.length} total` : undefined}
                className="min-h-[220px]"
              >
                {loading ? (
                  <div className="grid h-[160px] place-items-center text-sm text-[var(--ink-3)]">Loading…</div>
                ) : (
                  <TransactionList rows={rows} onDelete={remove} />
                )}
              </GlassCard>
            </motion.div>
          </div>
        </motion.div>

        {error && (
          <div
            role="alert"
            className="glass glass-strong fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 px-4 py-3 text-sm"
            style={{ borderRadius: 16 }}
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
      <span
        className="h-2 w-2 rounded-full"
        style={{ background: live ? "var(--good)" : "var(--ink-3)" }}
      />
      {live ? "Supabase" : "Local mode"}
    </span>
  );
}
