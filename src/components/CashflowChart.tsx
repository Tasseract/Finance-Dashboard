"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import type { FlowPoint } from "@/lib/analytics";
import { CURRENCY_SYMBOL, money } from "@/lib/format";

function compact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${CURRENCY_SYMBOL}${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${CURRENCY_SYMBOL}${(n / 1_000).toFixed(n % 1000 === 0 ? 0 : 1)}K`;
  return `${CURRENCY_SYMBOL}${n}`;
}

function FlowTooltip({ active, payload, label }: Partial<TooltipContentProps<number, string>>) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as FlowPoint;
  return (
    <div className="glass glass-strong rounded-2xl px-3.5 py-3 text-sm min-w-[180px]" style={{ borderRadius: 16 }}>
      <div className="mb-2 text-xs font-medium text-[var(--ink-3)]">{label}</div>
      <Row color="var(--series-income)" name="Income" value={p.income} />
      <Row color="var(--series-expense)" name="Expenses" value={p.expense} />
      <div className="mt-2 flex items-center justify-between border-t border-[var(--hairline)] pt-2">
        <span className="text-[var(--ink-2)]">Net</span>
        <span className="tabular font-semibold text-[var(--ink)]">{money(p.net)}</span>
      </div>
    </div>
  );
}

function Row({ color, name, value }: { color: string; name: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-6 py-0.5">
      <span className="inline-flex items-center gap-2 text-[var(--ink-2)]">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
        {name}
      </span>
      <span className="tabular text-[var(--ink)]">{money(value)}</span>
    </div>
  );
}

export function CashflowChart({ data }: { data: FlowPoint[] }) {
  const empty = data.every((d) => d.income === 0 && d.expense === 0);
  return (
    <div className="relative">
      <div className="mb-3 flex items-center gap-4 text-xs text-[var(--ink-2)]">
        <LegendKey color="var(--series-income)" label="Income" />
        <LegendKey color="var(--series-expense)" label="Expenses" />
      </div>
      <div className="h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--series-income)" stopOpacity={0.22} />
                <stop offset="100%" stopColor="var(--series-income)" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gExpense" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--series-expense)" stopOpacity={0.22} />
                <stop offset="100%" stopColor="var(--series-expense)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeWidth={1} />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tickMargin={10}
              minTickGap={28}
              interval="preserveStartEnd"
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tickFormatter={compact}
              width={48}
              tickMargin={6}
            />
            <Tooltip
              content={<FlowTooltip />}
              cursor={{ stroke: "var(--ink-3)", strokeWidth: 1, strokeDasharray: "0" }}
              wrapperStyle={{ outline: "none" }}
            />
            <Area
              type="monotone"
              dataKey="income"
              name="Income"
              stroke="var(--series-income)"
              strokeWidth={2}
              fill="url(#gIncome)"
              dot={false}
              activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--chart-surface)" }}
              isAnimationActive={!empty}
            />
            <Area
              type="monotone"
              dataKey="expense"
              name="Expenses"
              stroke="var(--series-expense)"
              strokeWidth={2}
              fill="url(#gExpense)"
              dot={false}
              activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--chart-surface)" }}
              isAnimationActive={!empty}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {empty && (
        <div className="pointer-events-none absolute inset-x-0 bottom-10 top-10 grid place-items-center text-sm text-[var(--ink-3)]">
          No activity in this range yet
        </div>
      )}
    </div>
  );
}

function LegendKey({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="h-0.5 w-4 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
