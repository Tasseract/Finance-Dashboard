import { Suspense } from "react";
import { AuthGate } from "@/components/auth/AuthGate";
import { Background } from "@/components/Background";
import { Dashboard } from "@/components/Dashboard";

/* The dashboard reads the clock and browser storage, so it streams in behind a Suspense boundary
   while the aurora background is served from the static shell. */
export default function Home() {
  return (
    <Suspense fallback={<Background />}>
      <AuthGate>
        <Dashboard />
      </AuthGate>
    </Suspense>
  );
}
