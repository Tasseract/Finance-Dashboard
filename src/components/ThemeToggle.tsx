"use client";

import { useSyncExternalStore } from "react";
import { Button } from "./ui/Button";

type Theme = "light" | "dark";

function subscribe(onChange: () => void) {
  const mo = new MutationObserver(onChange);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", onChange);
  return () => {
    mo.disconnect();
    mq.removeEventListener("change", onChange);
  };
}

function getSnapshot(): Theme {
  const saved = document.documentElement.getAttribute("data-theme");
  if (saved === "dark" || saved === "light") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getServerSnapshot(): Theme {
  return "dark";
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("lumen:theme", next);
    } catch {}
  }

  return (
    <Button
      variant="icon"
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      icon={theme === "dark" ? "light_mode" : "dark_mode"}
      onClick={toggle}
      className="glass-pill"
    />
  );
}
