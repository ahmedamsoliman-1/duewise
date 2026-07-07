"use client";

import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, updateProfile } from "firebase/auth";
import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { auth, googleProvider } from "@/lib/firebase/client";

export function AuthCard({ mode }: { mode: "login" | "signup" }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const signup = mode === "signup";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (signup) {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        if (name) await updateProfile(credential.user, { displayName: name });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-mist px-4">
      <section className="w-full max-w-md rounded-lg border border-ink/10 bg-white p-6 shadow-soft">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-md bg-ink text-white">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold text-ink">Duewise</h1>
            <p className="text-sm text-ink/55">Never miss a real-life deadline again.</p>
          </div>
        </div>
        <form className="grid gap-4" onSubmit={submit}>
          {signup && (
            <Label>
              Name
              <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" />
            </Label>
          )}
          <Label>
            Email
            <Input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
          </Label>
          <Label>
            Password
            <Input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 6 characters"
            />
          </Label>
          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <Button disabled={busy} type="submit">
            {busy ? "Working..." : signup ? "Create account" : "Log in"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => signInWithPopup(auth, googleProvider)}>
            Continue with Google
          </Button>
        </form>
        <p className="mt-5 text-center text-sm text-ink/60">
          {signup ? "Already have an account? " : "New to Duewise? "}
          <Link className="font-medium text-sage" href={signup ? "/login" : "/signup"}>
            {signup ? "Log in" : "Create one"}
          </Link>
        </p>
      </section>
    </main>
  );
}
