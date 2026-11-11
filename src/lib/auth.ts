import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabase } from "./supabase";

/**
 * Sign-in for Lumen Finance: email + password, a one-time code (TOTP) as the second factor, and
 * trusted devices so the code is only asked for once per device.
 *
 * How the pieces fit:
 *   - The Supabase session is kept in this browser and refreshed automatically, so closing the tab
 *     does not sign you out.
 *   - A session that passed the one-time code is `aal2`. The database only serves rows to `aal2`
 *     sessions, or to sessions started on a trusted device (see supabase/schema.sql).
 *   - Trusting a device stores a random secret here; the database keeps only its hash. Signing in
 *     again on this device sends the secret once, and the new session is marked verified.
 */

export type AuthStage =
  | "loading"
  | "signed-out"
  /** Signed in, but no authenticator has been set up yet. */
  | "enroll"
  /** Signed in on a device that is not trusted: a one-time code is needed. */
  | "challenge"
  | "ready";

export interface TrustedDevice {
  id: string;
  label: string;
  created_at: string;
  last_used_at: string;
  is_current: boolean;
}

export interface Enrollment {
  factorId: string;
  /** SVG data URI. */
  qr: string;
  secret: string;
  /** otpauth:// URI; on Apple devices opening it offers to add the code to Passwords. */
  uri: string;
}

const DEVICE_KEY = "lumen:device-token";

function client(): SupabaseClient {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase is not configured");
  return sb;
}

/* ---------- device secret ---------- */

export function getDeviceToken(): string | null {
  try {
    return localStorage.getItem(DEVICE_KEY);
  } catch {
    return null;
  }
}

function setDeviceToken(token: string | null) {
  try {
    if (token) localStorage.setItem(DEVICE_KEY, token);
    else localStorage.removeItem(DEVICE_KEY);
  } catch {
    /* storage unavailable: the device simply will not be remembered */
  }
}

function newDeviceToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** A human label such as "Safari on Mac", for the trusted-devices list. */
export function describeDevice(ua: string = navigator.userAgent): string {
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Chrome\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : "Browser";
  const os = /iPhone/.test(ua)
    ? "iPhone"
    : /iPad/.test(ua)
      ? "iPad"
      : /Android/.test(ua)
        ? "Android"
        : /Mac OS X|Macintosh/.test(ua)
          ? "Mac"
          : /Windows/.test(ua)
            ? "Windows"
            : /Linux/.test(ua)
              ? "Linux"
              : "this device";
  return `${browser} on ${os}`;
}

/* ---------- errors ---------- */

/** PostgREST codes that mean supabase/schema.sql has not been run (or is out of date). */
function isSchemaMissing(error: { code?: string; message?: string }): boolean {
  return error.code === "PGRST202" || error.code === "42883" || error.code === "PGRST205";
}

export const SCHEMA_HINT =
  "The database is not set up for sign-in yet. Run supabase/schema.sql in the Supabase SQL editor, then reload.";

function message(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return fallback;
}

/* ---------- where does this session stand? ---------- */

export interface StageResult {
  stage: AuthStage;
  email: string | null;
  /** Set when the trusted-device functions are missing from the database. */
  setupWarning: string | null;
}

export async function resolveStage(): Promise<StageResult> {
  const sb = client();
  const {
    data: { session },
  } = await sb.auth.getSession();
  if (!session) return { stage: "signed-out", email: null, setupWarning: null };

  const email = session.user.email ?? null;
  const { data: aal, error } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) throw error;
  if (aal.currentLevel === "aal2") return { stage: "ready", email, setupWarning: null };

  let setupWarning: string | null = null;
  const token = getDeviceToken();
  if (token) {
    const trust = await sb.rpc("trust_session", { device_token: token });
    if (trust.error) {
      if (isSchemaMissing(trust.error)) setupWarning = SCHEMA_HINT;
    } else if (trust.data === true) {
      return { stage: "ready", email, setupWarning: null };
    } else {
      setDeviceToken(null); // revoked from another device, or it belonged to a different account
    }
  }

  return { stage: aal.nextLevel === "aal2" ? "challenge" : "enroll", email, setupWarning };
}

/* ---------- password step ---------- */

export async function signIn(email: string, password: string): Promise<string | null> {
  const { error } = await client().auth.signInWithPassword({ email, password });
  return error ? message(error, "Could not sign in") : null;
}

export async function signUp(
  email: string,
  password: string,
): Promise<{ error: string | null; needsConfirmation: boolean }> {
  const { data, error } = await client().auth.signUp({
    email,
    password,
    options: { emailRedirectTo: window.location.origin },
  });
  if (error) return { error: message(error, "Could not create the account"), needsConfirmation: false };
  // With "Confirm email" on, Supabase creates the account but holds the session until the link is opened.
  return { error: null, needsConfirmation: !data.session };
}

export async function signOut(): Promise<void> {
  // "local" ends only this browser's session; other devices stay signed in
  await client().auth.signOut({ scope: "local" });
}

/* ---------- one-time code step ---------- */

let pendingEnrollment: Promise<Enrollment> | null = null;

/**
 * Start (or restart) authenticator setup. Any half-finished earlier attempt is discarded first.
 * Concurrent callers share one request, so a double-mounted setup screen cannot enroll twice.
 */
export function startEnrollment(): Promise<Enrollment> {
  pendingEnrollment ??= enroll().finally(() => {
    pendingEnrollment = null;
  });
  return pendingEnrollment;
}

async function enroll(): Promise<Enrollment> {
  const sb = client();
  const factors = await sb.auth.mfa.listFactors();
  if (factors.error) throw factors.error;
  for (const f of factors.data.all) {
    if (f.status === "unverified") await sb.auth.mfa.unenroll({ factorId: f.id });
  }
  const { data, error } = await sb.auth.mfa.enroll({
    factorType: "totp",
    issuer: "Lumen Finance",
    friendlyName: `Lumen ${new Date().toISOString()}`, // must be unique among the account's factors
  });
  if (error) throw error;
  return { factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret, uri: data.totp.uri };
}

/**
 * Check a 6-digit code. `factorId` is given during setup; at sign-in the account's verified
 * authenticator is looked up. On success the session becomes `aal2`.
 */
export async function verifyCode(code: string, factorId?: string): Promise<string | null> {
  const sb = client();
  let id = factorId;
  if (!id) {
    const factors = await sb.auth.mfa.listFactors();
    if (factors.error) return message(factors.error, "Could not load your authenticator");
    id = factors.data.totp[0]?.id;
    if (!id) return "No authenticator is set up for this account.";
  }
  const { error } = await sb.auth.mfa.challengeAndVerify({ factorId: id, code });
  return error ? message(error, "That code did not work") : null;
}

/* ---------- trusted devices ---------- */

/** Remember this browser so future sign-ins here skip the one-time code. Needs an `aal2` session. */
export async function trustThisDevice(): Promise<string | null> {
  const token = getDeviceToken() ?? newDeviceToken();
  const { error } = await client().rpc("trust_device", { device_token: token, device_label: describeDevice() });
  if (error) return isSchemaMissing(error) ? SCHEMA_HINT : message(error, "Could not trust this device");
  setDeviceToken(token);
  return null;
}

export async function listTrustedDevices(): Promise<TrustedDevice[]> {
  const { data, error } = await client().rpc("list_trusted_devices", { device_token: getDeviceToken() });
  if (error) throw new Error(isSchemaMissing(error) ? SCHEMA_HINT : message(error, "Could not load devices"));
  return (data ?? []) as TrustedDevice[];
}

export async function revokeTrustedDevice(device: TrustedDevice): Promise<void> {
  const { error } = await client().rpc("revoke_trusted_device", { device_id: device.id });
  if (error) throw new Error(message(error, "Could not remove the device"));
  if (device.is_current) setDeviceToken(null);
}
