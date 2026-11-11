"use client";

import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Hero3D } from "../Hero3D";
import { Icon } from "../ui/Icon";
import { FloatingWindow } from "./FloatingWindow";
import { computeLayout } from "./layout";

export type Tone = "primary" | "income" | "expense" | "net";

export interface LeafSpec {
  id: string;
  label: string;
  caption?: string;
  /** Marker: a 3D render, an icon, or (default) a glowing dot. */
  art?: string;
  icon?: string;
  tone?: Tone;
  /** True while this leaf's window is open. */
  selected?: boolean;
  onSelect: () => void;
}

export interface BranchSpec {
  id: string;
  label: string;
  caption: string;
  icon: string;
  leaves: LeafSpec[];
}

export interface WindowSpec {
  id: string;
  /** Cascade position, assigned when the window is first opened. */
  slot: number;
  title: string;
  subtitle?: string;
  icon: string;
  art?: string;
  content: ReactNode;
}

interface ConstellationProps {
  open: boolean;
  onToggle: () => void;
  active: string | null;
  onActive: (id: string | null) => void;
  branches: BranchSpec[];
  windows: WindowSpec[];
  onCloseWindow: (id: string) => void;
  onFocusWindow: (id: string) => void;
  balance: string;
  summary: string;
}

const toneVar: Record<Tone, string> = {
  primary: "var(--primary)",
  income: "var(--series-income)",
  expense: "var(--series-expense)",
  net: "var(--series-net)",
};

const spring = { type: "spring", stiffness: 260, damping: 26 } as const;

/** Stage width plus the viewport height left beneath its top edge. */
function useStageMetrics(ref: React.RefObject<HTMLDivElement | null>, open: boolean) {
  const [metrics, setMetrics] = useState<{ w: number; vh: number } | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const top = el.getBoundingClientRect().top + window.scrollY;
      const next = { w: el.clientWidth, vh: Math.floor(window.innerHeight - top - 20) };
      setMetrics((prev) => (prev && prev.w === next.w && prev.vh === next.vh ? prev : next));
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    // The observer's first callback waits for a rendered frame, which a background tab may never
    // produce, so measure once up front as well.
    measure();
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
    // re-run when the core opens or closes: the header above can change height without resizing the stage
  }, [ref, open]);
  return metrics;
}

export function Constellation({
  open,
  onToggle,
  active,
  onActive,
  branches,
  windows,
  onCloseWindow,
  onFocusWindow,
  balance,
  summary,
}: ConstellationProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const metrics = useStageMetrics(stageRef, open);

  const activeIndex = branches.findIndex((b) => b.id === active);
  const activeBranch = activeIndex >= 0 ? branches[activeIndex] : null;
  const leafCount = activeBranch?.leaves.length ?? 0;

  const layout = useMemo(
    () =>
      metrics
        ? computeLayout({
            w: metrics.w,
            vh: metrics.vh,
            open,
            active: activeIndex,
            branchCount: branches.length,
            leafCount,
          })
        : null,
    [metrics, open, activeIndex, branches.length, leafCount],
  );

  const from = layout && activeIndex >= 0 ? layout.branches[activeIndex] : null;
  const mobileWindow = windows[windows.length - 1];

  return (
    <MotionConfig reducedMotion="user">
      <div
        ref={stageRef}
        className="relative w-full"
        style={{
          height: layout ? layout.height : "calc(100dvh - 150px)",
          minHeight: 500,
          transition: "height 320ms cubic-bezier(0.2, 0, 0, 1)",
        }}
      >
        {layout && (
          <>
            {/* ---------- tentacles ---------- */}
            <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
              <defs>
                <linearGradient
                  id="trunk-grad"
                  gradientUnits="userSpaceOnUse"
                  x1={layout.core.x}
                  y1={0}
                  x2={layout.branches[0]?.x ?? layout.core.x + 1}
                  y2={0}
                >
                  <stop offset="0" style={{ stopColor: "var(--primary)" }} />
                  <stop offset="1" style={{ stopColor: "var(--tendril-a)" }} />
                </linearGradient>
                <linearGradient
                  id="twig-grad"
                  gradientUnits="userSpaceOnUse"
                  x1={from ? from.x + (layout.mobile ? 0 : from.w) : 0}
                  y1={0}
                  x2={layout.leaves.length ? Math.max(...layout.leaves.map((l) => l.x)) : 1}
                  y2={0}
                >
                  <stop offset="0" style={{ stopColor: "var(--primary)" }} />
                  <stop offset="1" style={{ stopColor: "var(--tendril-b)" }} />
                </linearGradient>
              </defs>
              <AnimatePresence>
                {layout.trunks.map((d, i) => (
                  <motion.path
                    key={`trunk-${i}`}
                    d={d}
                    fill="none"
                    stroke="url(#trunk-grad)"
                    strokeLinecap="round"
                    strokeWidth={i === activeIndex ? 2.25 : 1.5}
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: activeIndex < 0 || i === activeIndex ? 0.95 : 0.5 }}
                    exit={{ pathLength: 0, opacity: 0, transition: { duration: 0.2 } }}
                    transition={{ duration: 0.55, delay: i * 0.05, ease: [0.2, 0, 0, 1] }}
                  />
                ))}
                {layout.twigs.map((d, j) => (
                  <motion.path
                    key={`twig-${active}-${j}`}
                    d={d}
                    fill="none"
                    stroke="url(#twig-grad)"
                    strokeLinecap="round"
                    strokeWidth={1.5}
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 0.85 }}
                    exit={{ opacity: 0, transition: { duration: 0.12 } }}
                    transition={{ duration: 0.45, delay: j * 0.035, ease: [0.2, 0, 0, 1] }}
                  />
                ))}
              </AnimatePresence>
            </svg>

            {/* ---------- core ---------- */}
            <motion.button
              type="button"
              onClick={onToggle}
              aria-expanded={open}
              aria-label={open ? "Collapse dashboard" : "Open dashboard"}
              className="absolute rounded-full outline-none focus-visible:outline-2 focus-visible:outline-offset-[14px] focus-visible:outline-[var(--primary)]"
              style={{ x: "-50%", y: "-50%", zIndex: 12 }}
              initial={false}
              animate={{ left: layout.core.x, top: layout.core.y, width: layout.core.size, height: layout.core.size }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.94 }}
              transition={{ type: "spring", stiffness: 190, damping: 24 }}
            >
              <span className="orbit orbit-a" />
              <span className="orbit orbit-b" />
              {!open && <span className="core-pulse" />}
              <Hero3D className="h-full w-full" shadow={false} />
            </motion.button>

            <motion.div
              className="pointer-events-none absolute text-center"
              style={{ x: "-50%", zIndex: 11 }}
              initial={false}
              animate={{ left: layout.label.x, top: layout.label.y, width: layout.label.w }}
              transition={{ type: "spring", stiffness: 190, damping: 24 }}
            >
              <p className="text-xs text-[var(--ink-2)] sm:text-[13px]">Total balance</p>
              <div
                className={`tabular whitespace-nowrap font-semibold leading-tight tracking-tight text-[var(--ink)] transition-[font-size] duration-300 ${
                  layout.label.compact ? "text-[26px]" : "text-[40px] sm:text-[60px]"
                }`}
              >
                {balance}
              </div>
              <p className="mt-1 text-xs text-[var(--ink-3)] sm:text-[13px]">
                {open ? summary : "Tap the coin to open your dashboard"}
              </p>
            </motion.div>

            {/* ---------- branches ---------- */}
            <AnimatePresence>
              {layout.branches.map((box, i) => {
                const b = branches[i];
                const isActive = i === activeIndex;
                const origin = { left: layout.core.x - box.w / 2, top: layout.core.y - box.h / 2 };
                return (
                  <motion.button
                    key={b.id}
                    type="button"
                    onClick={() => onActive(isActive ? null : b.id)}
                    aria-expanded={isActive}
                    className="glass flex items-center gap-3 px-3.5 text-left outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
                    style={{
                      position: "absolute",
                      width: box.w,
                      height: box.h,
                      borderRadius: 20,
                      zIndex: 10,
                      ...(isActive && {
                        background: "var(--glass-strong)",
                        borderColor: "var(--primary)",
                        boxShadow:
                          "0 0 0 1px var(--primary), 0 16px 44px -16px color-mix(in oklab, var(--primary) 80%, transparent), inset 0 1px 0 var(--glass-inner)",
                      }),
                    }}
                    initial={{ ...origin, opacity: 0, scale: 0.4 }}
                    animate={{ left: box.x, top: box.y, opacity: 1, scale: 1 }}
                    exit={{ ...origin, opacity: 0, scale: 0.4, transition: { duration: 0.22 } }}
                    transition={{ ...spring, delay: i * 0.045 }}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <span
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full"
                      style={{
                        background: isActive ? "var(--primary)" : "var(--primary-tonal)",
                        color: isActive ? "var(--on-primary)" : "var(--primary)",
                      }}
                    >
                      <Icon name={b.icon} size={20} filled />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold tracking-tight text-[var(--ink)]">
                        {b.label}
                      </span>
                      <span className="tabular block truncate text-xs text-[var(--ink-3)]">{b.caption}</span>
                    </span>
                    {(layout.mobile || isActive) && (
                      <Icon
                        name="expand_more"
                        size={20}
                        className={`shrink-0 text-[var(--ink-3)] transition-transform duration-300 ${
                          layout.mobile ? (isActive ? "rotate-180" : "") : "-rotate-90"
                        }`}
                      />
                    )}
                  </motion.button>
                );
              })}
            </AnimatePresence>

            {/* ---------- leaves ---------- */}
            <AnimatePresence>
              {from &&
                activeBranch &&
                layout.leaves.map((box, j) => {
                  const leaf = activeBranch.leaves[j];
                  if (!leaf) return null;
                  const tone = toneVar[leaf.tone ?? "primary"];
                  const origin = {
                    left: (layout.mobile ? from.x + 4 : from.x + from.w - 28) - 14,
                    top: (layout.mobile ? from.y + from.h - box.h / 2 : from.y + from.h / 2 - box.h / 2),
                  };
                  return (
                    <motion.button
                      key={`${activeBranch.id}:${leaf.id}`}
                      type="button"
                      onClick={leaf.onSelect}
                      title={leaf.caption ? `${leaf.label} · ${leaf.caption}` : leaf.label}
                      className="group absolute flex items-center gap-2.5 rounded-full pr-4 text-left outline-none transition-colors duration-150 hover:bg-[var(--field-hover)] focus-visible:outline-2 focus-visible:outline-[var(--primary)]"
                      style={{ width: box.w, height: box.h, zIndex: 9 }}
                      initial={{ ...origin, opacity: 0, scale: 0.6 }}
                      animate={{ left: box.x - 14, top: box.y, opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.12 } }}
                      transition={{ ...spring, delay: 0.08 + j * 0.035 }}
                    >
                      <span className="relative grid h-7 w-7 shrink-0 place-items-center">
                        {leaf.art ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={leaf.art}
                            alt=""
                            draggable={false}
                            className="absolute h-11 w-11 max-w-none scale-125 object-contain drop-shadow-[0_6px_10px_rgba(0,0,0,0.3)] transition-transform duration-200 group-hover:scale-[1.4]"
                          />
                        ) : leaf.icon ? (
                          <span
                            className="grid h-7 w-7 place-items-center rounded-full"
                            style={{ background: `color-mix(in oklab, ${tone} 20%, transparent)`, color: tone }}
                          >
                            <Icon name={leaf.icon} size={16} filled />
                          </span>
                        ) : (
                          <span
                            className="h-2.5 w-2.5 rounded-full transition-transform duration-200 group-hover:scale-125"
                            style={{
                              background: tone,
                              boxShadow: `0 0 0 3px color-mix(in oklab, ${tone} 24%, transparent), 0 0 14px ${tone}`,
                            }}
                          />
                        )}
                      </span>
                      <span className={`min-w-0 flex-1 ${leaf.art ? "pl-2" : ""}`}>
                        <span
                          className={`block truncate text-[13px] font-medium leading-tight ${
                            leaf.selected ? "text-[var(--primary)]" : "text-[var(--ink)]"
                          }`}
                        >
                          {leaf.label}
                        </span>
                        {leaf.caption && (
                          <span className="tabular mt-0.5 block truncate text-[11.5px] leading-tight text-[var(--ink-3)]">
                            {leaf.caption}
                          </span>
                        )}
                      </span>
                    </motion.button>
                  );
                })}
            </AnimatePresence>

            {/* ---------- floating windows ---------- */}
            <AnimatePresence>
              {layout.mobile
                ? mobileWindow && (
                    <FloatingWindow
                      key={mobileWindow.id}
                      {...mobileWindow}
                      mobile
                      x={0}
                      y={0}
                      width={0}
                      maxHeight={0}
                      zIndex={50}
                      constraints={stageRef}
                      onClose={() => onCloseWindow(mobileWindow.id)}
                      onFocus={() => onFocusWindow(mobileWindow.id)}
                    >
                      {mobileWindow.content}
                    </FloatingWindow>
                  )
                : windows.map((win, order) => (
                    <FloatingWindow
                      key={win.id}
                      {...win}
                      mobile={false}
                      x={layout.window.x - win.slot * 26}
                      y={layout.window.y + win.slot * 38}
                      width={layout.window.w}
                      maxHeight={layout.window.maxH - win.slot * 38}
                      zIndex={40 + order}
                      constraints={stageRef}
                      onClose={() => onCloseWindow(win.id)}
                      onFocus={() => onFocusWindow(win.id)}
                    >
                      {win.content}
                    </FloatingWindow>
                  ))}
            </AnimatePresence>
          </>
        )}
      </div>
    </MotionConfig>
  );
}
