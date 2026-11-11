"use client";

import { Icon } from "./ui/Icon";

interface StatTileProps {
  label: string;
  value: string;
  icon: string;
  accent?: "income" | "expense" | "net" | "primary";
  hint?: string;
  delta?: { text: string; good: boolean } | null;
  spark?: number[];
}

const accentVar: Record<NonNullable<StatTileProps["accent"]>, string> = {
  income: "var(--series-income)",
  expense: "var(--series-expense)",
  net: "var(--series-net)",
  primary: "var(--primary)",
};

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const w = 96;
  const h = 28;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * w,
    h - 2 - ((v - min) / span) * (h - 4),
  ]);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" className="overflow-visible">
      <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" opacity={0.6} />
      <circle cx={lx} cy={ly} r={4} fill={color} stroke="var(--chart-surface)" strokeWidth={2} />
    </svg>
  );
}

export function StatTile({ label, value, icon, accent = "primary", hint, delta, spark }: StatTileProps) {
  const color = accentVar[accent];
  return (
    <div className="glass p-5 flex flex-col gap-3 min-h-[132px]">
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-[var(--ink-2)]">{label}</span>
        <span
          className="grid h-9 w-9 place-items-center rounded-full"
          style={{ background: `color-mix(in oklab, ${color} 18%, transparent)`, color }}
        >
          <Icon name={icon} size={20} filled />
        </span>
      </div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-[26px] font-semibold tracking-tight leading-none text-[var(--ink)]">{value}</div>
          {(delta || hint) && (
            <div className="mt-2 flex items-center gap-1.5 text-xs">
              {delta && (
                <span
                  className="inline-flex items-center gap-0.5 font-medium"
                  style={{ color: delta.good ? "var(--good)" : "var(--critical)" }}
                >
                  <Icon name={delta.good ? "arrow_upward" : "arrow_downward"} size={14} />
                  {delta.text}
                </span>
              )}
              {hint && <span className="text-[var(--ink-3)]">{hint}</span>}
            </div>
          )}
        </div>
        {spark && <Sparkline data={spark} color={color} />}
      </div>
    </div>
  );
}
