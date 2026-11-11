"use client";

import { AnimatePresence, motion } from "framer-motion";
import { categoryById } from "@/lib/categories";
import { longDate, shortDate, signed } from "@/lib/format";
import type { Transaction } from "@/lib/types";
import { Button } from "./ui/Button";
import { Icon } from "./ui/Icon";

interface Props {
  rows: Transaction[];
  onDelete: (id: string) => void;
  limit?: number;
}

export function TransactionList({ rows, onDelete, limit = 12 }: Props) {
  const shown = rows.slice(0, limit);
  if (!shown.length) {
    return (
      <div className="grid h-[160px] place-items-center text-center text-sm text-[var(--ink-3)]">
        <div>
          <Icon name="receipt_long" size={32} className="mb-2 opacity-60" />
          <p>Nothing here yet. Add your first entry from the Add branch.</p>
        </div>
      </div>
    );
  }
  return (
    <ul className="-mx-2 flex flex-col">
      <AnimatePresence initial={false}>
        {shown.map((t) => {
          const c = categoryById(t.category);
          const isIncome = t.type === "income";
          const color = isIncome ? "var(--series-income)" : "var(--series-expense)";
          return (
            <motion.li
              key={t.id}
              layout
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
              className="group flex items-center gap-3 rounded-2xl px-2 py-2.5 hover:bg-[var(--field)]"
            >
              <span
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full"
                style={{ background: `color-mix(in oklab, ${color} 16%, transparent)`, color }}
              >
                <Icon name={c.icon} size={20} filled />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-[var(--ink)]">{t.name}</div>
                <div className="truncate text-xs text-[var(--ink-3)]" title={longDate(t.date)}>
                  {c.label} · {shortDate(t.date)}
                  {t.note ? ` · ${t.note}` : ""}
                </div>
              </div>
              <div className="tabular text-sm font-semibold text-[var(--ink)]">
                {signed(isIncome ? t.amount : -t.amount)}
              </div>
              <Button
                variant="icon"
                icon="delete"
                aria-label={`Delete ${t.name}`}
                onClick={() => onDelete(t.id)}
                className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 -mr-1 h-9 w-9"
              />
            </motion.li>
          );
        })}
      </AnimatePresence>
      {rows.length > limit && (
        <li className="px-2 pt-2 text-xs text-[var(--ink-3)]">
          Showing {limit} of {rows.length}
        </li>
      )}
    </ul>
  );
}
