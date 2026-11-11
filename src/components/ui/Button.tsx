"use client";

import type { ButtonHTMLAttributes, MouseEvent } from "react";
import { spawnRipple } from "./useRipple";
import { Icon } from "./Icon";

type Variant = "filled" | "tonal" | "text" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  icon?: string;
  trailingIcon?: string;
  loading?: boolean;
}

const base =
  "ripple-host inline-flex items-center justify-center gap-2 select-none font-medium transition-[transform,box-shadow,background-color,opacity] duration-200 ease-[cubic-bezier(.2,0,0,1)] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]";

const variants: Record<Variant, string> = {
  filled:
    "h-12 px-6 rounded-full bg-[var(--primary)] text-[var(--on-primary)] elev-primary hover:brightness-110",
  tonal:
    "h-11 px-5 rounded-full bg-[var(--primary-tonal)] text-[var(--primary)] hover:bg-[var(--primary-tonal-strong)]",
  text: "h-10 px-4 rounded-full text-[var(--primary)] hover:bg-[var(--primary-tonal)]",
  icon: "h-10 w-10 rounded-full text-[var(--ink-2)] hover:bg-[var(--field-hover)]",
};

export function Button({
  variant = "filled",
  icon,
  trailingIcon,
  loading,
  className = "",
  children,
  onClick,
  ...rest
}: ButtonProps) {
  function handle(e: MouseEvent<HTMLButtonElement>) {
    spawnRipple(e);
    onClick?.(e);
  }
  return (
    <button className={`${base} ${variants[variant]} ${className}`} onClick={handle} {...rest}>
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        icon && <Icon name={icon} size={20} />
      )}
      {children}
      {trailingIcon && !loading && <Icon name={trailingIcon} size={20} />}
    </button>
  );
}
