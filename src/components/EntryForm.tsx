"use client";

import { useMemo, useState, type FormEvent } from "react";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { categoriesFor } from "@/lib/categories";
import { todayISO } from "@/lib/format";
import type { NewTransaction, TransactionType } from "@/lib/types";
import { Button } from "./ui/Button";
import { SelectField, TextArea, TextField } from "./ui/Field";
import { Segmented } from "./ui/Segmented";

const schema = z.object({
  name: z.string().trim().min(1, "Give it a name").max(80, "Keep it under 80 characters"),
  amount: z
    .string()
    .trim()
    .min(1, "Enter an amount")
    .refine((v) => Number.isFinite(Number(v)) && Number(v) > 0, "Amount must be greater than 0"),
  type: z.enum(["income", "expense"]),
  category: z.string().min(1, "Pick a category"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  note: z.string().trim().max(240, "Keep notes under 240 characters"),
});

type Errors = Partial<Record<keyof z.infer<typeof schema>, string>>;

interface EntryFormProps {
  onSubmit: (t: NewTransaction) => Promise<void>;
}

export function EntryForm({ onSubmit }: EntryFormProps) {
  const [type, setType] = useState<TransactionType>("expense");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("food");
  const [date, setDate] = useState(todayISO);
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  const options = useMemo(() => categoriesFor(type), [type]);

  function switchType(next: TransactionType) {
    setType(next);
    const allowed = categoriesFor(next);
    if (!allowed.some((c) => c.id === category)) setCategory(next === "income" ? "salary" : "food");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ name, amount, type, category, date, note });
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof Errors;
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      await onSubmit({
        name: parsed.data.name,
        amount: Math.round(Number(parsed.data.amount) * 100) / 100,
        type: parsed.data.type,
        category: parsed.data.category,
        date: parsed.data.date,
        note: parsed.data.note ? parsed.data.note : null,
      });
      setSent(parsed.data.name);
      setName("");
      setAmount("");
      setNote("");
      window.setTimeout(() => setSent(null), 2400);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <Segmented
        name="Transaction type"
        value={type}
        onChange={switchType}
        options={[
          { value: "expense", label: "Expense", icon: "arrow_outward" },
          { value: "income", label: "Income", icon: "arrow_downward" },
        ]}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
        <TextField
          id="tx-name"
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          autoComplete="off"
          className="sm:col-span-3"
        />
        <TextField
          id="tx-amount"
          label="Amount"
          prefix="$"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          error={errors.amount}
          className="sm:col-span-2"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SelectField
          id="tx-category"
          label="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          error={errors.category}
        >
          {options.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </SelectField>
        <TextField
          id="tx-date"
          label="Date"
          type="date"
          value={date}
          max={todayISO()}
          onChange={(e) => setDate(e.target.value)}
          error={errors.date}
        />
      </div>

      <TextArea
        id="tx-note"
        label="Note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        error={errors.note}
      />

      <div className="flex items-center justify-between gap-3 pt-1">
        <AnimatePresence mode="wait">
          {sent ? (
            <motion.span
              key="sent"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="inline-flex items-center gap-1.5 text-sm text-[var(--ink-2)]"
            >
              <span className="msr fill" style={{ fontSize: 18, color: "var(--good)" }}>
                check_circle
              </span>
              Added “{sent}”
            </motion.span>
          ) : (
            <motion.span key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-[var(--ink-3)]">
              Press Enter or Send to add it to the dashboard
            </motion.span>
          )}
        </AnimatePresence>
        <Button type="submit" trailingIcon="send" loading={busy} className="min-w-[128px]">
          Send
        </Button>
      </div>
    </form>
  );
}
