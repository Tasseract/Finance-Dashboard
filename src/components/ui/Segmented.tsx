"use client";

import { useId } from "react";
import { motion } from "framer-motion";
import { Icon } from "./Icon";

interface Option<T extends string> {
  value: T;
  label: string;
  icon?: string;
}

interface SegmentedProps<T extends string> {
  value: T;
  onChange: (v: T) => void;
  options: Option<T>[];
  size?: "sm" | "md";
  name: string;
}

export function Segmented<T extends string>({ value, onChange, options, size = "md", name }: SegmentedProps<T>) {
  const uid = useId(); // keeps the sliding pill local when the same control is mounted twice
  const h = size === "sm" ? "h-9 text-[13px]" : "h-11 text-sm";
  return (
    <div
      role="radiogroup"
      aria-label={name}
      className={`glass-pill inline-flex p-1 gap-1 ${size === "sm" ? "" : "w-full"}`}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="radio"
            aria-checked={active}
            type="button"
            onClick={() => onChange(o.value)}
            className={`relative flex-1 ${h} px-3 sm:px-4 whitespace-nowrap rounded-full font-medium transition-colors duration-200 ${
              active ? "text-[var(--on-primary)]" : "text-[var(--ink-2)] hover:text-[var(--ink)]"
            }`}
          >
            {active && (
              <motion.span
                layoutId={`seg-${uid}`}
                className="absolute inset-0 rounded-full bg-[var(--primary)] elev-primary"
                transition={{ type: "spring", stiffness: 420, damping: 36 }}
              />
            )}
            <span className="relative z-10 inline-flex items-center justify-center gap-1.5">
              {o.icon && <Icon name={o.icon} size={18} />}
              {o.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
