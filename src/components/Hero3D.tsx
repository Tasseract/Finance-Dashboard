"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * Floating 3D hero. Uses a Blender-rendered PNG at /hero/coin.png when present,
 * otherwise falls back to a CSS-shaded glass orb so the layout never looks empty.
 */
export function Hero3D({ className = "" }: { className?: string }) {
  const reduce = useReducedMotion();
  const [hasRender, setHasRender] = useState<boolean | null>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setHasRender(true);
    img.onerror = () => setHasRender(false);
    img.src = "/hero/coin.png";
  }, []);

  const float = reduce
    ? {}
    : { y: [0, -14, 0], rotate: [0, 3, 0, -3, 0] };

  return (
    <div className={`relative ${className}`} aria-hidden="true">
      {/* glow puddle */}
      <div
        className="absolute left-1/2 top-1/2 h-[70%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl opacity-60"
        style={{ background: "radial-gradient(circle, var(--primary) 0%, transparent 70%)" }}
      />
      <motion.div
        className="relative h-full w-full"
        animate={float}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      >
        {hasRender ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/hero/coin.png" alt="" className="h-full w-full object-contain drop-shadow-[0_30px_40px_rgba(0,0,0,0.35)]" />
        ) : (
          <GlassOrb />
        )}
      </motion.div>
      {/* contact shadow */}
      {!reduce && (
        <motion.div
          className="absolute left-1/2 -bottom-2 h-5 w-[55%] -translate-x-1/2 rounded-full blur-xl"
          style={{ background: "rgba(0,0,0,0.35)" }}
          animate={{ scaleX: [1, 0.82, 1], opacity: [0.45, 0.25, 0.45] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
    </div>
  );
}

function GlassOrb() {
  return (
    <div className="relative h-full w-full">
      <div
        className="absolute inset-[8%] rounded-full"
        style={{
          background:
            "radial-gradient(circle at 32% 28%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.35) 12%, rgba(255,255,255,0.06) 30%, transparent 45%)," +
            "radial-gradient(circle at 70% 75%, color-mix(in oklab, var(--blob-2) 70%, white) 0%, transparent 45%)," +
            "radial-gradient(circle at 50% 50%, color-mix(in oklab, var(--primary) 55%, transparent) 0%, color-mix(in oklab, var(--primary) 25%, transparent) 60%, transparent 72%)",
          boxShadow:
            "inset 0 -18px 40px rgba(0,0,0,0.25), inset 0 12px 30px rgba(255,255,255,0.35), 0 40px 70px -30px rgba(0,0,0,0.6)",
          border: "1px solid rgba(255,255,255,0.35)",
          backdropFilter: "blur(6px)",
        }}
      />
      {/* refraction ring */}
      <div
        className="absolute inset-[8%] rounded-full"
        style={{
          background: "conic-gradient(from 210deg, transparent 0 60%, rgba(255,255,255,0.55) 72%, transparent 84%)",
          mask: "radial-gradient(circle, transparent 78%, #000 80%, #000 100%)",
          WebkitMask: "radial-gradient(circle, transparent 78%, #000 80%, #000 100%)",
        }}
      />
      {/* currency glyph */}
      <div className="absolute inset-0 grid place-items-center">
        <span
          className="text-[clamp(56px,9vw,112px)] font-semibold tracking-tight"
          style={{
            color: "rgba(255,255,255,0.92)",
            textShadow: "0 8px 30px rgba(0,0,0,0.35), 0 1px 0 rgba(255,255,255,0.6)",
          }}
        >
          $
        </span>
      </div>
    </div>
  );
}
