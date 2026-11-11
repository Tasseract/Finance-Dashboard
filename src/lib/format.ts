const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const compact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

export function money(n: number): string {
  return currency.format(n);
}

/** Auto-compact: $1,284 / $12.9K / $4.2M */
export function moneyCompact(n: number): string {
  return Math.abs(n) >= 10_000 ? compact.format(n) : currency.format(n);
}

export function signed(n: number): string {
  const s = money(Math.abs(n));
  return n < 0 ? `−${s}` : `+${s}`;
}

export function pct(n: number): string {
  return `${(n * 100).toFixed(0)}%`;
}

export function todayISO(): string {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

export function shortDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function longDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
