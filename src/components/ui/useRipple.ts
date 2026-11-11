"use client";

import type { MouseEvent } from "react";

/** Material-style ripple: call from onPointerDown/onClick on an element with class `ripple-host`. */
export function spawnRipple(e: MouseEvent<HTMLElement>) {
  const host = e.currentTarget;
  const rect = host.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const span = document.createElement("span");
  span.className = "ripple";
  span.style.width = span.style.height = `${size}px`;
  span.style.left = `${e.clientX - rect.left - size / 2}px`;
  span.style.top = `${e.clientY - rect.top - size / 2}px`;
  host.appendChild(span);
  span.addEventListener("animationend", () => span.remove(), { once: true });
}
