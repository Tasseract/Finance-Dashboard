"use client";

import { motion } from "framer-motion";
import type { CategorySlice } from "@/lib/analytics";
import { categoryById } from "@/lib/categories";
import { money, pct } from "@/lib/format";
import { Icon } from "./ui/Icon";

/**
 * Spending by category as a labeled horizontal bar list.
 * One measure, one hue; identity comes from the row label and icon, not from color.
 */
export function CategoryChart({ data }: { data: CategorySlice[] }) {
  if (!data.length) {
    return (
      <div className="grid h-[200px] place-items-center text-sm text-[var(--ink-3)]">
        No expenses in this range yet
      </div>
    );
  }
  const max = Math.max(...data.map((d) => d.total));
  return (
    <ul className="flex flex-col gap-3">
      {data.map((d, i) => {
        const c = categoryById(d.category);
        return (
          <li key={d.category} className="group" title={`${c.label}: ${money(d.total)} (${pct(d.share)})`}>
            <div className="mb-1.5 flex items-center justify-between text-[13px]">
              <span className="inline-flex items-center gap-2 text-[var(--ink)]">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--field)] text-[var(--ink-2)]">
                  <Icon name={c.icon} size={15} />
                </span>
                {c.label}
              </span>
              <span className="tabular text-[var(--ink-2)]">
                {money(d.total)} <span className="text-[var(--ink-3)]">· {pct(d.share)}</span>
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--field)]">
              <motion.div
                className="h-full"
                style={{ background: "var(--series-expense)", borderRadius: "0 4px 4px 0" }}
                initial={{ width: 0 }}
                animate={{ width: `${(d.total / max) * 100}%` }}
                transition={{ duration: 0.6, delay: i * 0.05, ease: [0.2, 0, 0, 1] }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
