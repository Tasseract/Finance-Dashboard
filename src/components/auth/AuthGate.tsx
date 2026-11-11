"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { resolveStage, signOut, type StageResult } from "@/lib/auth";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { Background } from "../Background";
import { Hero3D } from "../Hero3D";
import { Icon } from "../ui/Icon";
import { AuthScreen } from "./AuthScreen";

export interface Account {
  email: string | null;
  signOut: () => Promise<void>;
  /** Re-check whether this session is still verified (for example after removing this device). */
  refresh: () => void;
}

const AccountContext = createContext<Account | null>(null);

/** The signed-in account, or null in Local mode where there is no sign-in. */
export function useAccount(): Account | null {
  return useContext(AccountContext);
}

/**
 * Shows the dashboard only to a signed-in, verified session. Without Supabase keys the app runs
 * in Local mode on this browser's own storage, so there is nothing to protect and no gate.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  if (!isSupabaseConfigured) return <>{children}</>;
  return <SupabaseGate>{children}</SupabaseGate>;
}

const SIGNED_OUT: StageResult = { stage: "signed-out", email: null, setupWarning: null };

function SupabaseGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StageResult>({ stage: "loading", email: null, setupWarning: null });
  const [notice, setNotice] = useState<string | null>(null);

  const evaluate = useCallback(() => {
    resolveStage()
      .then((next) => {
        setState(next);
        if (next.setupWarning) setNotice(next.setupWarning);
      })
      .catch((e: unknown) => {
        setNotice(e instanceof Error ? e.message : "Could not check your session");
        setState(SIGNED_OUT);
      });
  }, []);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    let timer: number | undefined;
    // Fires once on subscribe (INITIAL_SESSION) and then on every sign-in, sign-out and MFA step.
    const { data } = sb.auth.onAuthStateChange((event, session) => {
      if (!session) {
        setState(SIGNED_OUT);
        return;
      }
      if (event === "TOKEN_REFRESHED") return;
      // supabase-js holds its auth lock while this callback runs, so calls back into it wait a tick
      window.clearTimeout(timer);
      timer = window.setTimeout(evaluate, 0);
    });
    return () => {
      window.clearTimeout(timer);
      data.subscription.unsubscribe();
    };
  }, [evaluate]);

  const account = useMemo<Account>(
    () => ({ email: state.email, signOut, refresh: evaluate }),
    [state.email, evaluate],
  );

  return (
    <>
      {state.stage === "ready" ? (
        <AccountContext.Provider value={account}>{children}</AccountContext.Provider>
      ) : state.stage === "loading" ? (
        <>
          <Background />
          <div className="grid min-h-dvh place-items-center" role="status" aria-label="Checking your session">
            <div className="relative h-32 w-32 opacity-80">
              <span className="core-pulse" />
              <Hero3D className="h-full w-full" shadow={false} />
            </div>
          </div>
        </>
      ) : (
        <AuthScreen stage={state.stage} email={state.email} onNotice={setNotice} />
      )}

      {notice && (
        <div
          role="alert"
          className="glass glass-strong flex max-w-[min(92vw,560px)] items-start gap-2 py-3 pl-4 pr-2 text-sm"
          style={{
            position: "fixed",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 70,
            borderRadius: 16,
            background: "var(--sheet)",
          }}
        >
          <Icon name="error" size={20} className="mt-0.5 shrink-0 text-[var(--critical)]" />
          <span className="min-w-0 flex-1">{notice}</span>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setNotice(null)}
            className="grid h-7 w-7 shrink-0 rotate-45 place-items-center rounded-full text-[var(--ink-2)] hover:bg-[var(--field-hover)]"
          >
            <Icon name="add" size={18} />
          </button>
        </div>
      )}
    </>
  );
}
