"use client";

import type { ReactNode } from "react";
import { categoryById } from "@/lib/categories";
import { longDate, signed } from "@/lib/format";
import type { Transaction } from "@/lib/types";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";

export function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const w = 320;
  const h = 56;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - 4 - ((v - min) / span) * (h - 8)]);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} aria-hidden="true" className="h-14 w-full overflow-visible">
      <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" opacity={0.7} />
      <circle cx={lx} cy={ly} r={4} fill={color} stroke="var(--chart-surface)" strokeWidth={2} />
    </svg>
  );
}

/** Headline figure with its 3D render, followed by whatever detail the KPI needs. */
export function KpiPanel({
  art,
  value,
  hint,
  children,
}: {
  art: string;
  value: string;
  hint: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={art}
          alt=""
          draggable={false}
          className="h-24 w-24 shrink-0 scale-125 object-contain drop-shadow-[0_14px_18px_rgba(0,0,0,0.28)]"
        />
        <div className="min-w-0">
          <div className="tabular truncate text-[32px] font-semibold leading-none tracking-tight text-[var(--ink)]">
            {value}
          </div>
          <p className="mt-2 text-xs text-[var(--ink-3)]">{hint}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

/** One labelled amount with a proportional bar. */
export function SplitRow({
  label,
  value,
  share,
  color,
}: {
  label: string;
  value: string;
  share: number;
  color: string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-[13px]">
        <span className="text-[var(--ink-2)]">{label}</span>
        <span className="tabular text-[var(--ink)]">{value}</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--field)]">
        <div
          className="h-full transition-[width] duration-500"
          style={{ width: `${Math.min(100, Math.max(0, share * 100))}%`, background: color, borderRadius: "0 4px 4px 0" }}
        />
      </div>
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-[var(--hairline)] py-3 text-sm">
      <span className="text-[var(--ink-3)]">{label}</span>
      <span className="min-w-0 text-right text-[var(--ink)]">{children}</span>
    </div>
  );
}

export function TxPanel({ tx, onDelete }: { tx: Transaction; onDelete: () => void }) {
  const cat = categoryById(tx.category);
  const isIncome = tx.type === "income";
  return (
    <div>
      <div className="pb-4">
        <div className="tabular text-[32px] font-semibold leading-none tracking-tight text-[var(--ink)]">
          {signed(isIncome ? tx.amount : -tx.amount)}
        </div>
        <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-[var(--ink-2)]">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: isIncome ? "var(--series-income)" : "var(--series-expense)" }}
          />
          {isIncome ? "Income" : "Expense"}
        </p>
      </div>
      <DetailRow label="Category">
        <span className="inline-flex items-center gap-2">
          <Icon name={cat.icon} size={18} className="text-[var(--ink-2)]" />
          {cat.label}
        </span>
      </DetailRow>
      <DetailRow label="Date">{longDate(tx.date)}</DetailRow>
      {tx.note && <DetailRow label="Note">{tx.note}</DetailRow>}
      <div className="flex justify-end border-t border-[var(--hairline)] pt-3">
        <Button variant="text" icon="delete" onClick={onDelete}>
          Delete
        </Button>
      </div>
    </div>
  );
}
