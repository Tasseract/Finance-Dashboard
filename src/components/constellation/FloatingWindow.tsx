"use client";

import { motion, useDragControls } from "framer-motion";
import type { ReactNode, RefObject } from "react";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";

interface FloatingWindowProps {
  title: string;
  subtitle?: string;
  icon: string;
  /** Optional 3D render shown in place of the icon chip. */
  art?: string;
  children: ReactNode;
  onClose: () => void;
  onFocus: () => void;
  /** Desktop placement inside the stage; ignored for the mobile sheet. */
  x: number;
  y: number;
  width: number;
  maxHeight: number;
  zIndex: number;
  constraints: RefObject<HTMLElement | null>;
  mobile: boolean;
}

function Header({
  title,
  subtitle,
  icon,
  art,
  onClose,
}: Pick<FloatingWindowProps, "title" | "subtitle" | "icon" | "art" | "onClose">) {
  return (
    <>
      {art ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={art} alt="" draggable={false} className="-my-2 h-12 w-12 shrink-0 scale-125 object-contain" />
      ) : (
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--primary-tonal)] text-[var(--primary)]">
          <Icon name={icon} size={20} filled />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-[15px] font-semibold tracking-tight text-[var(--ink)]">{title}</h2>
        {subtitle && <p className="truncate text-xs text-[var(--ink-3)]">{subtitle}</p>}
      </div>
      {/* the icon subset has no "close" glyph, so the plus is turned 45° */}
      <Button
        variant="icon"
        icon="add"
        aria-label={`Close ${title}`}
        onClick={onClose}
        onPointerDown={(e) => e.stopPropagation()}
        className="-mr-2 shrink-0 rotate-45"
      />
    </>
  );
}

/**
 * A glass panel that floats above the constellation. On desktop it can be dragged by its
 * header and stacks with the other open windows; on phones it becomes a bottom sheet.
 */
export function FloatingWindow(props: FloatingWindowProps) {
  const { title, children, onClose, onFocus, x, y, width, maxHeight, zIndex, constraints, mobile } = props;
  const controls = useDragControls();

  if (mobile) {
    return (
      <motion.div
        className="fixed inset-0 z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <button
          type="button"
          aria-label={`Close ${title}`}
          onClick={onClose}
          className="absolute inset-0 h-full w-full cursor-default bg-black/45"
        />
        <motion.section
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="glass glass-strong flex flex-col"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            maxHeight: "86dvh",
            borderRadius: "28px 28px 0 0",
            background: "var(--sheet)",
          }}
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 320, damping: 34 }}
        >
          <span className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-[var(--hairline)]" />
          <header className="flex shrink-0 items-center gap-3 px-5 pb-3 pt-3">
            <Header {...props} />
          </header>
          <div className="scrollbar-thin overflow-y-auto overscroll-contain px-5 pb-8">{children}</div>
        </motion.section>
      </motion.div>
    );
  }

  return (
    <motion.section
      role="dialog"
      aria-label={title}
      className="glass glass-strong flex flex-col"
      style={{ position: "absolute", left: x, top: y, width, maxHeight, zIndex, background: "var(--sheet)" }}
      drag
      dragListener={false}
      dragControls={controls}
      dragConstraints={constraints}
      dragMomentum={false}
      dragElastic={0.06}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={{ type: "spring", stiffness: 340, damping: 30 }}
      onPointerDownCapture={onFocus}
    >
      <header
        onPointerDown={(e) => controls.start(e)}
        className="flex shrink-0 cursor-grab touch-none select-none items-center gap-3 px-5 pb-3 pt-4 active:cursor-grabbing"
      >
        <Header {...props} />
      </header>
      <div className="scrollbar-thin overflow-y-auto px-5 pb-5">{children}</div>
    </motion.section>
  );
}
