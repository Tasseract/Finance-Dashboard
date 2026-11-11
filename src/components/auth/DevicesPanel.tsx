"use client";

import { useEffect, useState } from "react";
import { listTrustedDevices, revokeTrustedDevice, trustThisDevice, type TrustedDevice } from "@/lib/auth";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";

function day(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/**
 * The devices that may sign in with just a password. Removing one makes its next sign-in ask for
 * a one-time code again.
 */
export function DevicesPanel({ onChanged }: { onChanged: () => void }) {
  const [devices, setDevices] = useState<TrustedDevice[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listTrustedDevices()
      .then((d) => {
        if (!cancelled) setDevices(d);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load devices");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function run(key: string, action: () => Promise<void>) {
    setBusy(key);
    setError(null);
    try {
      await action();
      setDevices(await listTrustedDevices());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  function remove(device: TrustedDevice) {
    const warning = device.is_current
      ? "Stop trusting this device? You will need a one-time code the next time you sign in here."
      : `Stop trusting ${device.label}? It will need a one-time code at its next sign-in.`;
    if (!confirm(warning)) return;
    void run(device.id, async () => {
      await revokeTrustedDevice(device);
      if (device.is_current) onChanged();
    });
  }

  function trustCurrent() {
    void run("trust", async () => {
      const failed = await trustThisDevice();
      if (failed) throw new Error(failed);
    });
  }

  if (!devices && !error) {
    return <div className="grid h-[120px] place-items-center text-sm text-[var(--ink-3)]">Loading…</div>;
  }

  const currentTrusted = devices?.some((d) => d.is_current) ?? false;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-[var(--ink-2)]">
        These devices sign in with your password alone. Any other device is asked for a one-time code.
      </p>
      {error && (
        <p role="alert" className="rounded-xl bg-[color-mix(in_oklab,var(--critical)_12%,transparent)] px-3.5 py-2.5 text-sm">
          {error}
        </p>
      )}
      {devices && devices.length === 0 && (
        <p className="py-4 text-center text-sm text-[var(--ink-3)]">No trusted devices yet.</p>
      )}
      {devices && devices.length > 0 && (
        <ul className="-mx-2 flex flex-col">
          {devices.map((d) => (
            <li key={d.id} className="flex items-center gap-3 rounded-2xl px-2 py-2.5 hover:bg-[var(--field)]">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--primary-tonal)] text-[var(--primary)]">
                <Icon name="laptop_mac" size={20} filled />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 truncate text-sm font-medium text-[var(--ink)]">
                  <span className="truncate">{d.label}</span>
                  {d.is_current && (
                    <span className="shrink-0 rounded-full bg-[var(--primary-tonal)] px-2 py-0.5 text-[11px] font-medium text-[var(--primary)]">
                      This device
                    </span>
                  )}
                </div>
                <div className="truncate text-xs text-[var(--ink-3)]">
                  Trusted {day(d.created_at)} · last sign-in {day(d.last_used_at)}
                </div>
              </div>
              <Button
                variant="icon"
                icon="delete"
                aria-label={`Stop trusting ${d.label}`}
                loading={busy === d.id}
                disabled={busy !== null}
                onClick={() => remove(d)}
                className="-mr-1 h-9 w-9"
              />
            </li>
          ))}
        </ul>
      )}
      {devices && !currentTrusted && (
        <div className="flex justify-end">
          <Button variant="tonal" icon="add" loading={busy === "trust"} disabled={busy !== null} onClick={trustCurrent}>
            Trust this device
          </Button>
        </div>
      )}
    </div>
  );
}
