/**
 * Pure geometry for the constellation: where the core, branch nodes and leaves sit,
 * and the curves ("tentacles") that join them. All values are stage-local pixels.
 */

export interface Box {
  x: number; // left
  y: number; // top
  w: number;
  h: number;
}

export interface Layout {
  mobile: boolean;
  height: number;
  core: { x: number; y: number; size: number }; // centre + diameter
  label: { x: number; y: number; w: number; compact: boolean }; // centre x, top y
  branches: Box[];
  /** Leaf boxes; each leaf's marker dot is centred on (x, y + h / 2). */
  leaves: Box[];
  trunks: string[];
  twigs: string[];
  window: { x: number; y: number; w: number; maxH: number };
}

export interface LayoutInput {
  w: number;
  /** Viewport height left for the stage. */
  vh: number;
  open: boolean;
  /** Index of the expanded branch, or -1. */
  active: number;
  branchCount: number;
  leafCount: number;
}

export const MOBILE_BREAKPOINT = 900;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const r = (n: number) => Math.round(n * 10) / 10;

/** Horizontal S-curve between two points. */
function sweep(x0: number, y0: number, x1: number, y1: number): string {
  const d = (x1 - x0) * 0.55;
  return `M${r(x0)} ${r(y0)} C${r(x0 + d)} ${r(y0)} ${r(x1 - d)} ${r(y1)} ${r(x1)} ${r(y1)}`;
}

export function computeLayout(input: LayoutInput): Layout {
  return input.w < MOBILE_BREAKPOINT ? mobileLayout(input) : desktopLayout(input);
}

function desktopLayout({ w, vh, open, active, branchCount, leafCount }: LayoutInput): Layout {
  const height = Math.max(600, vh);
  const narrow = w < 1180;

  if (!open) {
    const size = clamp(w * 0.2, 200, 264);
    const core = { x: w / 2, y: height * 0.4, size };
    return {
      mobile: false,
      height,
      core,
      label: { x: core.x, y: core.y + size * 0.78 + 6, w: Math.min(w - 32, 560), compact: false },
      branches: [],
      leaves: [],
      trunks: [],
      twigs: [],
      window: { x: 0, y: 0, w: 0, maxH: 0 },
    };
  }

  const size = narrow ? 148 : 176;
  const core = { x: clamp(w * 0.115, 118, 170), y: height / 2 - 56, size };

  const bw = narrow ? 204 : 224;
  const bh = 64;
  const bx = core.x + size / 2 + clamp(w * 0.075, 60, 116);
  const gap = clamp((height - 96 - branchCount * bh) / Math.max(1, branchCount - 1), 12, 30);
  const total = branchCount * bh + (branchCount - 1) * gap;
  const by0 = height / 2 - total / 2;
  const branches: Box[] = Array.from({ length: branchCount }, (_, i) => ({
    x: bx,
    y: by0 + i * (bh + gap),
    w: bw,
    h: bh,
  }));

  const trunks = branches.map((b) => sweep(core.x + size / 2 - 10, core.y, b.x, b.y + b.h / 2));

  const leaves: Box[] = [];
  const twigs: string[] = [];
  if (active >= 0 && leafCount > 0) {
    const from = branches[active];
    const lw = narrow ? 196 : 228;
    const lh = 46;
    const lx = bx + bw + clamp(w * 0.095, 84, 150);
    const spacing = clamp((height - 48) / leafCount, 46, 66);
    const mid = (leafCount - 1) / 2;
    for (let j = 0; j < leafCount; j++) {
      const t = mid > 0 ? (j - mid) / mid : 0;
      const cy = height / 2 + (j - mid) * spacing;
      const x = lx - 70 * t * t; // the fan bows back toward the branch at its ends
      leaves.push({ x, y: cy - lh / 2, w: lw, h: lh });
      twigs.push(sweep(from.x + from.w, from.y + from.h / 2, x, cy));
    }
  }

  const ww = clamp(w * 0.34, 360, 440);
  return {
    mobile: false,
    height,
    core,
    label: { x: core.x, y: core.y + size * 0.78 + 4, w: Math.min(2 * core.x - 16, 300), compact: true },
    branches,
    leaves,
    trunks,
    twigs,
    window: { x: w - ww - 4, y: 4, w: ww, maxH: height - 8 },
  };
}

function mobileLayout({ w, vh, open, active, branchCount, leafCount }: LayoutInput): Layout {
  if (!open) {
    const height = Math.max(500, vh);
    const size = Math.min(220, w * 0.56);
    const core = { x: w / 2, y: height * 0.34, size };
    return {
      mobile: true,
      height,
      core,
      label: { x: core.x, y: core.y + size * 0.78 + 6, w: w - 16, compact: false },
      branches: [],
      leaves: [],
      trunks: [],
      twigs: [],
      window: { x: 0, y: 0, w: 0, maxH: 0 },
    };
  }

  const size = 112;
  const core = { x: w / 2, y: 78, size };
  const labelY = core.y + size * 0.78 + 2;

  const rail = 13; // the tentacles run down this x before peeling off
  const bx = 38;
  const bw = w - bx;
  const bh = 60;
  const lx = 72;
  const lh = 48;

  const branches: Box[] = [];
  const leaves: Box[] = [];
  const twigs: string[] = [];
  let y = labelY + 96;
  for (let i = 0; i < branchCount; i++) {
    const b = { x: bx, y, w: bw, h: bh };
    branches.push(b);
    y += bh + 10;
    if (i === active && leafCount > 0) {
      const px = bx + 18;
      for (let j = 0; j < leafCount; j++) {
        const cy = y + lh / 2;
        leaves.push({ x: lx, y, w: w - lx, h: lh });
        twigs.push(`M${px} ${r(b.y + bh)} L${px} ${r(cy - 14)} Q${px} ${r(cy)} ${lx} ${r(cy)}`);
        y += lh + 6;
      }
      y += 8;
    }
  }

  const sx = core.x - size / 2 + 12;
  const sy = core.y + 14;
  const trunks = branches.map((b) => {
    const cy = b.y + b.h / 2;
    return `M${r(sx)} ${sy} C${rail} ${sy} ${rail} ${sy + 34} ${rail} ${sy + 72} L${rail} ${r(cy - 18)} Q${rail} ${r(cy)} ${b.x} ${r(cy)}`;
  });

  return {
    mobile: true,
    height: Math.max(y + 28, vh),
    core,
    label: { x: core.x, y: labelY, w: w - 16, compact: true },
    branches,
    leaves,
    trunks,
    twigs,
    window: { x: 0, y: 0, w, maxH: 0 },
  };
}
