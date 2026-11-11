"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  signIn,
  signOut,
  signUp,
  startEnrollment,
  trustThisDevice,
  verifyCode,
  type AuthStage,
  type Enrollment,
} from "@/lib/auth";
import { Background } from "../Background";
import { Hero3D } from "../Hero3D";
import { ThemeToggle } from "../ThemeToggle";
import { Button } from "../ui/Button";
import { TextField } from "../ui/Field";
import { Segmented } from "../ui/Segmented";

interface AuthScreenProps {
  stage: Exclude<AuthStage, "loading" | "ready">;
  email: string | null;
  /** Report a problem that should stay visible after this screen is gone. */
  onNotice: (message: string) => void;
}

const HEADINGS: Record<AuthScreenProps["stage"], { title: string; lead: string }> = {
  "signed-out": { title: "Lumen Finance", lead: "Sign in to open your dashboard." },
  enroll: { title: "Set up your one-time code", lead: "One more step keeps your money data yours alone." },
  challenge: { title: "Enter your one-time code", lead: "This device is new, so we need the code once." },
};

export function AuthScreen({ stage, email, onNotice }: AuthScreenProps) {
  const heading = HEADINGS[stage];
  return (
    <>
      <Background />
      <div className="fixed right-4 top-4 z-10 sm:right-6 sm:top-5">
        <ThemeToggle />
      </div>
      <main className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col items-center justify-center px-4 py-10">
        <div className="relative mb-7 h-28 w-28" aria-hidden="true">
          <span className="orbit orbit-a" />
          <span className="orbit orbit-b" />
          <Hero3D className="h-full w-full" shadow={false} />
        </div>
        <h1 className="text-center text-2xl font-semibold tracking-tight text-[var(--ink)]">{heading.title}</h1>
        <p className="mb-6 mt-1.5 text-center text-sm text-[var(--ink-2)]">{heading.lead}</p>
        <section className="glass glass-strong w-full p-5 sm:p-6" style={{ background: "var(--sheet)" }}>
          {stage === "signed-out" && <CredentialsForm />}
          {stage === "enroll" && <EnrollForm email={email} onNotice={onNotice} />}
          {stage === "challenge" && <ChallengeForm email={email} onNotice={onNotice} />}
        </section>
      </main>
    </>
  );
}

function ErrorNote({ children }: { children: ReactNode }) {
  return children ? (
    <p role="alert" className="rounded-xl bg-[color-mix(in_oklab,var(--critical)_12%,transparent)] px-3.5 py-2.5 text-sm text-[var(--ink)]">
      {children}
    </p>
  ) : null;
}

/* ------------------------------------------------------------------ */
/*  Step 1: email + password                                           */
/* ------------------------------------------------------------------ */

type Mode = "signin" | "register";

/**
 * A plain <form> with standard `autocomplete` tokens, so Safari offers the saved login (and
 * Touch ID / Face ID) on sign-in, and offers to create and save a strong password on registration.
 */
function CredentialsForm() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setInfo(null);
    const address = email.trim();
    if (!address || !password) {
      setError("Enter your email and password.");
      return;
    }
    if (mode === "register" && password.length < 10) {
      setError("Use a password of at least 10 characters.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signin") {
        setError(await signIn(address, password));
      } else {
        const res = await signUp(address, password);
        if (res.error) setError(res.error);
        else if (res.needsConfirmation) {
          setInfo("Check your inbox for a confirmation link. Open it on this device, then sign in here.");
          setMode("signin");
          setPassword("");
        }
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} method="post" action="/" className="flex flex-col gap-4">
      <Segmented
        name="Account"
        value={mode}
        onChange={(m) => {
          setMode(m);
          setError(null);
        }}
        options={[
          { value: "signin", label: "Sign in" },
          { value: "register", label: "Create account" },
        ]}
      />
      <TextField
        id="auth-email"
        name="username"
        label="Email"
        type="email"
        inputMode="email"
        autoComplete="username"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        autoFocus
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <TextField
        id="auth-password"
        name="password"
        label={mode === "signin" ? "Password" : "Choose a password"}
        type="password"
        autoComplete={mode === "signin" ? "current-password" : "new-password"}
        required
        minLength={mode === "register" ? 10 : undefined}
        // Safari reads this when it suggests a strong password
        {...(mode === "register" ? { passwordrules: "minlength: 12;" } : {})}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <ErrorNote>{error}</ErrorNote>
      {info && (
        <p role="status" className="rounded-xl bg-[var(--primary-tonal)] px-3.5 py-2.5 text-sm text-[var(--ink)]">
          {info}
        </p>
      )}
      <Button type="submit" loading={busy} className="w-full">
        {mode === "signin" ? "Sign in" : "Create account"}
      </Button>
      <p className="text-center text-xs text-[var(--ink-3)]">
        {mode === "signin"
          ? "On a device you have already trusted, your password is all you need."
          : "Next you will set up a one-time code. Each account only ever sees its own data."}
      </p>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 2: one-time code                                              */
/* ------------------------------------------------------------------ */

function CodeFields({
  code,
  onCode,
  trust,
  onTrust,
  disabled,
}: {
  code: string;
  onCode: (v: string) => void;
  trust: boolean;
  onTrust: (v: boolean) => void;
  disabled: boolean;
}) {
  return (
    <>
      <TextField
        id="auth-otp"
        name="one-time-code"
        label="6-digit code"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={6}
        autoFocus
        required
        disabled={disabled}
        value={code}
        onChange={(e) => onCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
        className="[&_input]:tabular [&_input]:tracking-[0.3em]"
      />
      <label className="flex cursor-pointer items-start gap-3 text-sm text-[var(--ink-2)]">
        <input
          type="checkbox"
          checked={trust}
          onChange={(e) => onTrust(e.target.checked)}
          className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-[var(--primary)]"
        />
        <span>
          <span className="block font-medium text-[var(--ink)]">Trust this device</span>
          Skip the code next time you sign in here. Only tick this on a device that is yours.
        </span>
      </label>
    </>
  );
}

/** Runs the check, then (optionally) remembers the device. The gate swaps the screen on success. */
async function submitCode(
  code: string,
  trust: boolean,
  factorId: string | undefined,
  onNotice: (m: string) => void,
): Promise<string | null> {
  if (code.length !== 6) return "Enter the 6-digit code.";
  const failed = await verifyCode(code, factorId);
  if (failed) return failed;
  if (trust) {
    const trustError = await trustThisDevice();
    if (trustError) onNotice(`You are signed in, but this device was not remembered. ${trustError}`);
  }
  return null;
}

function SwitchAccount({ email }: { email: string | null }) {
  return (
    <p className="text-center text-xs text-[var(--ink-3)]">
      {email ? `Signed in as ${email}. ` : ""}
      <button
        type="button"
        onClick={() => void signOut()}
        className="font-medium text-[var(--primary)] underline-offset-2 hover:underline"
      >
        Use a different account
      </button>
    </p>
  );
}

function ChallengeForm({ email, onNotice }: { email: string | null; onNotice: (m: string) => void }) {
  const [code, setCode] = useState("");
  const [trust, setTrust] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const failed = await submitCode(code, trust, undefined, onNotice);
      if (failed) {
        setError(failed);
        setCode("");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-sm text-[var(--ink-2)]">
        Open your authenticator (or Passwords on an Apple device) and enter the current code for Lumen Finance.
      </p>
      <CodeFields code={code} onCode={setCode} trust={trust} onTrust={setTrust} disabled={busy} />
      <ErrorNote>{error}</ErrorNote>
      <Button type="submit" loading={busy} className="w-full">
        Verify
      </Button>
      <SwitchAccount email={email} />
    </form>
  );
}

function EnrollForm({ email, onNotice }: { email: string | null; onNotice: (m: string) => void }) {
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [trust, setTrust] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    startEnrollment()
      .then((e) => {
        if (!cancelled) setEnrollment(e);
      })
      .catch((e: unknown) => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Could not start setup");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy || !enrollment) return;
    setBusy(true);
    setError(null);
    try {
      const failed = await submitCode(code, trust, enrollment.factorId, onNotice);
      if (failed) {
        setError(failed);
        setCode("");
      }
    } finally {
      setBusy(false);
    }
  }

  if (loadError) {
    return (
      <div className="flex flex-col gap-4">
        <ErrorNote>{loadError}</ErrorNote>
        <SwitchAccount email={email} />
      </div>
    );
  }

  if (!enrollment) {
    return <div className="grid h-40 place-items-center text-sm text-[var(--ink-3)]">Preparing your code…</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <ol className="flex flex-col gap-4 text-sm text-[var(--ink-2)]">
        <li>
          <p className="mb-3">
            <span className="font-medium text-[var(--ink)]">1. Add Lumen Finance to an authenticator.</span> Scan the
            code, or open it directly on this device.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            {/* the QR must stay dark-on-white to scan, whatever the theme */}
            <div className="rounded-2xl bg-white p-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={enrollment.qr} alt="QR code for your authenticator app" width={148} height={148} />
            </div>
            <div className="min-w-0 flex-1 basis-40">
              <a
                href={enrollment.uri}
                className="inline-flex h-10 items-center rounded-full bg-[var(--primary-tonal)] px-4 text-sm font-medium text-[var(--primary)] hover:bg-[var(--primary-tonal-strong)]"
              >
                Open in Passwords or an app
              </a>
              <p className="mt-3 text-xs text-[var(--ink-3)]">Or type this key in by hand:</p>
              <code className="mt-1 block select-all break-all font-mono text-xs text-[var(--ink)]">
                {enrollment.secret}
              </code>
            </div>
          </div>
        </li>
        <li>
          <span className="font-medium text-[var(--ink)]">2. Enter the code it shows</span> to finish.
        </li>
      </ol>
      <CodeFields code={code} onCode={setCode} trust={trust} onTrust={setTrust} disabled={busy} />
      <ErrorNote>{error}</ErrorNote>
      <Button type="submit" loading={busy} className="w-full">
        Verify and finish
      </Button>
      <SwitchAccount email={email} />
    </form>
  );
}
