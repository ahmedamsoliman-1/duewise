"use client";

import { Lock, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DuewiseMark } from "@/components/ui/duewise-logo";
import { Input, Label } from "@/components/ui/input";

export function AdminLoginClient({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Sign in failed.");
      }
      router.replace("/admin");
      router.refresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Sign in failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-onyx px-5">
      <div className="brand-aurora pointer-events-none fixed inset-0 opacity-70" />
      <div className="relative w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <DuewiseMark className="h-12 w-12" />
          <h1 className="mt-4 font-display text-2xl font-bold text-white">Duewise Admin</h1>
          <p className="mt-1 text-sm text-white/60">Restricted console. Authorized operators only.</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur">
          {!configured ? (
            <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
              <p>
                The admin console isn&apos;t configured. Set <code>ADMIN_USERNAME</code>, <code>ADMIN_PASSWORD</code>, and{" "}
                <code>ADMIN_SESSION_SECRET</code> in your environment, then restart.
              </p>
            </div>
          ) : (
            <form className="grid gap-4" onSubmit={submit}>
              <Label className="text-white/80">
                Username
                <Input
                  autoFocus
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="admin"
                  autoComplete="username"
                  className="border-white/15 bg-white/5 text-white placeholder:text-white/40"
                />
              </Label>
              <Label className="text-white/80">
                Password
                <Input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  className="border-white/15 bg-white/5 text-white placeholder:text-white/40"
                />
              </Label>
              {error && <p className="rounded-xl bg-red-500/15 px-3.5 py-2.5 text-sm font-medium text-red-300">{error}</p>}
              <Button size="lg" type="submit" disabled={busy || !username || !password}>
                <Lock className="h-4 w-4" />
                {busy ? "Verifying…" : "Enter console"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
