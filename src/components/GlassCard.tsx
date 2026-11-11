import type { HTMLAttributes, ReactNode } from "react";

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  strong?: boolean;
  padding?: string;
}

export function GlassCard({
  title,
  subtitle,
  action,
  strong,
  padding = "p-5 sm:p-6",
  className = "",
  children,
  ...rest
}: GlassCardProps) {
  return (
    <section className={`glass ${strong ? "glass-strong" : ""} ${padding} ${className}`} {...rest}>
      {(title || action) && (
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-[15px] font-semibold tracking-tight text-[var(--ink)]">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-[var(--ink-3)]">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
