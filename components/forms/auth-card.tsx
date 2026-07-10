"use client";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  signInWithPopup,
  updateProfile,
  type User
} from "firebase/auth";
import { CalendarClock, FileText, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { DuewiseLogo } from "@/components/ui/duewise-logo";
import { Input, Label } from "@/components/ui/input";
import { auth, googleProvider } from "@/lib/firebase/client";
import { apiFetch } from "@/lib/api/client";
import { friendlyAuthError } from "@/lib/errors/auth-messages";
import { reportUnexpectedError } from "@/lib/observability/report";

const highlights = [
  { icon: CalendarClock, title: "Never miss a due date", body: "Renewals, bills, and appointments surfaced before they bite." },
  { icon: FileText, title: "Every document, in reach", body: "Passports, warranties, and policies organized and searchable." },
  { icon: ShieldCheck, title: "Yours alone", body: "Per-account isolation with optional authenticator-app 2FA." }
];

type MfaStatusResponse = { data: { enabled: boolean; verified: boolean } };

export function AuthCard({ mode }: { mode: "login" | "signup" }) {
  const signup = mode === "signup";
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"" | "email" | "google" | "mfa">("");

  // Second-factor (TOTP) challenge state
  const [mfaRequired, setMfaRequired] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [rememberDevice, setRememberDevice] = useState(true);

  function handleAuthError(nextError: unknown) {
    reportUnexpectedError("auth-signin", nextError);
    setError(friendlyAuthError(nextError, "We couldn't sign you in. Please try again."));
  }

  const checkMfaAfterSignIn = useCallback(async (user: User) => {
    const token = await user.getIdToken();
    const response = await fetch("/api/mfa/status", {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      }
    });
    if (!response.ok) throw new Error("We couldn't check two-factor status. Please try again.");

    const status = (await response.json()) as MfaStatusResponse;
    if (status.data.enabled && !status.data.verified) {
      window.sessionStorage.setItem("duewise:mfa-pending", "1");
      setMfaRequired(true);
      setError("");
      return;
    }

    window.sessionStorage.removeItem("duewise:mfa-pending");
    router.replace("/dashboard");
  }, [router]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user || signup) return;
    if (window.sessionStorage.getItem("duewise:mfa-pending") === "1") {
      setMfaRequired(true);
      return;
    }
    checkMfaAfterSignIn(user).catch(() => undefined);
  }, [checkMfaAfterSignIn, signup]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy("email");
    setError("");
    try {
      await fetch("/api/mfa/session", { method: "DELETE" }).catch(() => undefined);
      if (signup) {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        if (name) await updateProfile(credential.user, { displayName: name });
        router.replace("/dashboard");
      } else {
        const credential = await signInWithEmailAndPassword(auth, email, password);
        await checkMfaAfterSignIn(credential.user);
      }
    } catch (nextError) {
      handleAuthError(nextError);
    } finally {
      setBusy("");
    }
  }

  async function google() {
    setBusy("google");
    setError("");
    try {
      await fetch("/api/mfa/session", { method: "DELETE" }).catch(() => undefined);
      const credential = await signInWithPopup(auth, googleProvider);
      await checkMfaAfterSignIn(credential.user);
    } catch (nextError) {
      handleAuthError(nextError);
    } finally {
      setBusy("");
    }
  }

  async function verifyTotp(event: React.FormEvent) {
    event.preventDefault();
    setBusy("mfa");
    setError("");
    try {
      await apiFetch("/api/mfa/verify", {
        method: "POST",
        body: JSON.stringify({ code: totpCode.trim(), rememberDevice })
      });
      window.sessionStorage.removeItem("duewise:mfa-pending");
      router.replace("/dashboard");
    } catch (nextError) {
      reportUnexpectedError("mfa-signin", nextError);
      setError(nextError instanceof Error ? nextError.message : "We couldn't verify that code. Please try again.");
    } finally {
      setBusy("");
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* Brand hero */}
      <section className="relative hidden overflow-hidden bg-onyx lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="brand-aurora pointer-events-none absolute inset-0 opacity-90" />
        <div className="relative">
          <DuewiseLogo className="[&_span.text-ink]:text-white [&_span.text-muted]:text-white/60" />
        </div>
        <div className="relative max-w-md">
          <h1 className="font-display text-4xl font-extrabold leading-tight text-white">
            Stay ahead of everything that&apos;s <span className="text-brand">due</span>.
          </h1>
          <p className="mt-4 text-base text-white/70">
            Deadlines, documents, subscriptions, inventory, and family admin — one calm, confident command center.
          </p>
          <div className="mt-9 grid gap-4">
            {highlights.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-brand ring-1 ring-white/10">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-semibold text-white">{item.title}</p>
                    <p className="text-sm text-white/60">{item.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <p className="relative text-xs text-white/40">Personal life admin, handled early.</p>
      </section>

      {/* Form */}
      <section className="flex items-center justify-center bg-bg px-5 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <DuewiseLogo />
          </div>

          {mfaRequired ? (
            <div className="animate-rise">
              <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                <ShieldCheck className="h-6 w-6" />
              </span>
              <h2 className="font-display text-2xl font-bold text-ink">Two-factor verification</h2>
              <p className="mt-1.5 text-sm text-muted">
                Enter the 6-digit code from your authenticator app to finish signing in.
              </p>
              <form className="mt-6 grid gap-4" onSubmit={verifyTotp}>
                <Label>
                  Authentication code
                  <Input
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    autoFocus
                    maxLength={6}
                    placeholder="123456"
                    className="text-center text-xl font-semibold tracking-[0.4em]"
                    value={totpCode}
                    onChange={(event) => setTotpCode(event.target.value.replace(/\D/g, ""))}
                  />
                </Label>
                <label className="flex items-start gap-3 rounded-xl border border-line bg-panel/45 p-3 text-sm text-muted">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 shrink-0 accent-brand"
                    checked={rememberDevice}
                    onChange={(event) => setRememberDevice(event.target.checked)}
                  />
                  <span>
                    <span className="block font-semibold text-ink">Trust this device for 30 days</span>
                    <span className="mt-0.5 block">Skip the authenticator code here unless you sign in from a new browser or device.</span>
                  </span>
                </label>
                {error && <p className="rounded-xl bg-red-500/10 px-3.5 py-2.5 text-sm font-medium text-red-600 dark:text-red-300">{error}</p>}
                <Button size="lg" type="submit" disabled={busy === "mfa" || totpCode.length < 6}>
                  {busy === "mfa" ? "Verifying…" : "Verify & sign in"}
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setMfaRequired(false);
                    setTotpCode("");
                    setError("");
                    window.sessionStorage.removeItem("duewise:mfa-pending");
                    void signOut(auth);
                  }}
                  className="text-sm font-medium text-muted transition-colors hover:text-ink"
                >
                  Back to sign in
                </button>
              </form>
            </div>
          ) : (
            <div className="animate-rise">
              <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand-strong">
                <Sparkles className="h-3.5 w-3.5" />
                {signup ? "Create your workspace" : "Welcome back"}
              </span>
              <h2 className="font-display text-3xl font-bold text-ink">
                {signup ? "Get set up in a minute" : "Sign in to Duewise"}
              </h2>
              <p className="mt-1.5 text-sm text-muted">
                {signup ? "Start tracking what's due before it's overdue." : "Pick up right where you left off."}
              </p>

              <form className="mt-7 grid gap-4" onSubmit={submit}>
                {signup && (
                  <Label>
                    Name
                    <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" autoComplete="name" />
                  </Label>
                )}
                <Label>
                  Email
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </Label>
                <Label>
                  Password
                  <Input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={signup ? "At least 6 characters" : "Your password"}
                    autoComplete={signup ? "new-password" : "current-password"}
                  />
                </Label>
                {error && <p className="rounded-xl bg-red-500/10 px-3.5 py-2.5 text-sm font-medium text-red-600 dark:text-red-300">{error}</p>}
                <Button size="lg" type="submit" disabled={busy === "email"}>
                  {busy === "email" ? "Working…" : signup ? "Create account" : "Log in"}
                </Button>
              </form>

              <div className="my-6 flex items-center gap-3 text-xs font-medium uppercase tracking-wider text-muted">
                <span className="h-px flex-1 bg-line" />
                or
                <span className="h-px flex-1 bg-line" />
              </div>

              <Button variant="secondary" size="lg" className="w-full" onClick={google} disabled={busy === "google"}>
                <GoogleIcon />
                {busy === "google" ? "Connecting…" : "Continue with Google"}
              </Button>

              <p className="mt-7 text-center text-sm text-muted">
                {signup ? "Already have an account? " : "New to Duewise? "}
                <Link className="font-semibold text-brand-strong hover:underline" href={signup ? "/login" : "/signup"}>
                  {signup ? "Log in" : "Create one"}
                </Link>
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.7-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z" />
      <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1C3.4 21.3 7.4 24 12 24z" />
      <path fill="#FBBC05" d="M5.4 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.6.4-2.4V6.5H1.4C.5 8.2 0 10 0 12s.5 3.8 1.4 5.5l4-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4C17.9 1.2 15.2 0 12 0 7.4 0 3.4 2.7 1.4 6.5l4 3.1C6.3 6.8 8.9 4.8 12 4.8z" />
    </svg>
  );
}
