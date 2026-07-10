"use client";

import {
  CheckCircle2,
  Copy,
  Download,
  KeyRound,
  LogOut,
  Mail,
  ShieldCheck,
  Smartphone,
  Trash2,
  UserRound
} from "lucide-react";
import {
  EmailAuthProvider,
  signOut,
  TotpMultiFactorGenerator,
  multiFactor,
  reauthenticateWithCredential,
  reload,
  updatePassword,
  updateProfile,
  type MultiFactorInfo,
  type TotpSecret
} from "firebase/auth";
import QRCode from "qrcode";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/layout/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { apiFetch } from "@/lib/api/client";
import { auth } from "@/lib/firebase/client";
import { friendlyAuthError } from "@/lib/errors/auth-messages";
import { reportUnexpectedError } from "@/lib/observability/report";

type Message = { type: "success" | "error"; text: string };

const providerLabels: Record<string, string> = {
  "google.com": "Google",
  password: "Email & password"
};

// Generic, non-leaky fallback shown when two-factor setup can't proceed
// (e.g. the provider isn't configured). The real reason is logged server-side.
const MFA_UNAVAILABLE = "Two-factor setup isn't available right now. Please try again later.";

export function ProfileClient() {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<Message | null>(null);
  const [busy, setBusy] = useState("");

  // TOTP enrollment state
  const [factors, setFactors] = useState<MultiFactorInfo[]>([]);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [totpSecret, setTotpSecret] = useState<TotpSecret | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [enrollCode, setEnrollCode] = useState("");
  const [copied, setCopied] = useState(false);

  const providerIds = useMemo(() => user?.providerData.map((provider) => provider.providerId) ?? [], [user]);
  const hasPassword = providerIds.includes("password");
  const initials = useMemo(() => {
    const source = user?.displayName?.trim() || user?.email?.split("@")[0] || "D";
    const parts = source.split(/[\s._-]+/).filter(Boolean);
    return ((parts[0]?.[0] ?? "D") + (parts[1]?.[0] ?? "")).toUpperCase();
  }, [user]);

  useEffect(() => {
    setDisplayName(user?.displayName ?? "");
    setPhotoURL(user?.photoURL ?? "");
    if (user) setFactors(multiFactor(user).enrolledFactors);
  }, [user]);

  function refreshFactors() {
    if (user) setFactors(multiFactor(user).enrolledFactors);
  }

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    if (!user) return;
    setBusy("profile");
    setMessage(null);
    try {
      await updateProfile(user, { displayName: displayName.trim(), photoURL: photoURL.trim() || null });
      await reload(user);
      // Keep the shallow profile document in sync.
      await apiFetch("/api/me", { method: "POST" }).catch(() => undefined);
      setMessage({ type: "success", text: "Profile updated." });
    } catch (error) {
      reportUnexpectedError("profile-save", error);
      setMessage({ type: "error", text: friendlyAuthError(error, "Couldn't save your profile. Please try again.") });
    } finally {
      setBusy("");
    }
  }

  async function changePassword(event: React.FormEvent) {
    event.preventDefault();
    if (!user?.email) return;
    setBusy("password");
    setMessage(null);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setMessage({ type: "success", text: "Password changed." });
    } catch (error) {
      reportUnexpectedError("password-change", error);
      setMessage({ type: "error", text: friendlyAuthError(error) });
    } finally {
      setBusy("");
    }
  }

  async function beginEnroll() {
    if (!user) return;
    setBusy("mfa-begin");
    setMessage(null);
    try {
      if (hasPassword && user.email && confirmPassword) {
        const credential = EmailAuthProvider.credential(user.email, confirmPassword);
        await reauthenticateWithCredential(user, credential);
      }
      const session = await multiFactor(user).getSession();
      const secret = await TotpMultiFactorGenerator.generateSecret(session);
      const url = secret.generateQrCodeUrl(user.email ?? user.uid, "Duewise");
      const dataUrl = await QRCode.toDataURL(url, { margin: 1, width: 240, color: { dark: "#1C1712", light: "#FFFFFF" } });
      setTotpSecret(secret);
      setQrDataUrl(dataUrl);
    } catch (error) {
      reportUnexpectedError("mfa-begin", error);
      setMessage({ type: "error", text: friendlyAuthError(error, MFA_UNAVAILABLE) });
    } finally {
      setBusy("");
    }
  }

  async function finishEnroll(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !totpSecret) return;
    setBusy("mfa-enroll");
    setMessage(null);
    try {
      const assertion = TotpMultiFactorGenerator.assertionForEnrollment(totpSecret, enrollCode.trim());
      await multiFactor(user).enroll(assertion, "Authenticator app");
      await reload(user);
      await apiFetch("/api/me", { method: "POST" }).catch(() => undefined);
      refreshFactors();
      cancelEnroll();
      setConfirmPassword("");
      setMessage({ type: "success", text: "Authenticator app enabled. You'll be asked for a code at next sign-in." });
    } catch (error) {
      reportUnexpectedError("mfa-enroll", error);
      setMessage({ type: "error", text: friendlyAuthError(error, MFA_UNAVAILABLE) });
    } finally {
      setBusy("");
    }
  }

  async function removeFactor(factor: MultiFactorInfo) {
    if (!user) return;
    setBusy(`mfa-remove-${factor.uid}`);
    setMessage(null);
    try {
      await multiFactor(user).unenroll(factor);
      await reload(user);
      await apiFetch("/api/me", { method: "POST" }).catch(() => undefined);
      refreshFactors();
      setMessage({ type: "success", text: "Two-factor method removed." });
    } catch (error) {
      reportUnexpectedError("mfa-remove", error);
      setMessage({ type: "error", text: friendlyAuthError(error, MFA_UNAVAILABLE) });
    } finally {
      setBusy("");
    }
  }

  function cancelEnroll() {
    setTotpSecret(null);
    setQrDataUrl("");
    setEnrollCode("");
    setCopied(false);
  }

  async function copySecret() {
    if (!totpSecret) return;
    await navigator.clipboard.writeText(totpSecret.secretKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  async function exportJson() {
    setBusy("export");
    try {
      const data = await apiFetch<Record<string, unknown>>("/api/export");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "duewise-export.json";
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy("");
    }
  }

  const memberSince = user?.metadata.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
    : null;

  return (
    <div className="mx-auto grid max-w-6xl gap-6 overflow-hidden">
      {/* Account hero — same branded surface as the Dashboard: onyx base + aurora overlay */}
      <header className="relative overflow-hidden rounded-3xl border border-white/5 bg-onyx p-6 text-white sm:p-8">
        <div className="brand-aurora pointer-events-none absolute inset-0 opacity-90" />
        <div className="relative flex flex-col gap-5">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-brand ring-1 ring-white/10">
            Your profile
          </span>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            {user?.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.photoURL} alt="" className="h-16 w-16 rounded-2xl object-cover ring-2 ring-white/15" />
            ) : (
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-brand-gradient text-xl font-bold text-white ring-2 ring-white/15">
                {initials}
              </span>
            )}
            <div className="min-w-0">
              <p className="font-display text-2xl font-extrabold tracking-tight">{user?.displayName || "Your account"}</p>
              <p className="flex min-w-0 items-center gap-1.5 text-sm text-white/70">
                <Mail className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 truncate">{user?.email}</span>
              </p>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                {providerIds.map((id) => (
                  <span
                    key={id}
                    className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-white ring-1 ring-white/10"
                  >
                    {providerLabels[id] ?? id}
                  </span>
                ))}
                {factors.length > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-400/20">
                    <ShieldCheck className="h-3 w-3" />
                    2FA on
                  </span>
                )}
                {memberSince && <span className="text-xs text-white/45">Member since {memberSince}</span>}
              </div>
            </div>
          </div>
        </div>
      </header>

      {message && (
        <div
          className={`flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-sm font-medium ${
            message.type === "success"
              ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "border-red-500/25 bg-red-500/10 text-red-600 dark:text-red-300"
          }`}
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          {message.text}
        </div>
      )}

      <div className="grid min-w-0 gap-6 xl:grid-cols-2">
        {/* Profile edit */}
        <Card>
          <CardHeader icon={<UserRound className="h-5 w-5" />} title="Profile details" description="How you show up in your workspace." />
          <form className="grid gap-4" onSubmit={saveProfile}>
            <Label>
              Display name
              <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Your name" />
            </Label>
            <Label>
              Photo URL
              <Input value={photoURL} onChange={(event) => setPhotoURL(event.target.value)} placeholder="https://…" />
            </Label>
            <div className="rounded-xl bg-panel/60 p-3.5 text-xs text-muted">
              <p className="break-all">UID: <strong className="text-ink">{user?.uid}</strong></p>
            </div>
            <Button disabled={busy === "profile"} type="submit" className="justify-self-start">
              {busy === "profile" ? "Saving…" : "Save profile"}
            </Button>
          </form>
        </Card>

        {/* Password (email users) or SSO note */}
        <Card>
          <CardHeader icon={<KeyRound className="h-5 w-5" />} title="Password" description="Credentials for email sign-in." />
          {hasPassword ? (
            <form className="grid gap-4" onSubmit={changePassword}>
              <Label>
                Current password
                <Input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required />
              </Label>
              <Label>
                New password
                <Input type="password" minLength={6} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required />
              </Label>
              <Button disabled={busy === "password"} type="submit" className="justify-self-start">
                {busy === "password" ? "Changing…" : "Change password"}
              </Button>
            </form>
          ) : (
            <div className="flex items-start gap-3 rounded-xl bg-panel/60 p-4 text-sm">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
              <p className="text-muted">
                You sign in with <strong className="text-ink">{providerIds.map((id) => providerLabels[id] ?? id).join(", ")}</strong>.
                There&apos;s no Duewise password to manage — your provider handles it. Your account is still fully protected, and you
                can add an authenticator app below.
              </p>
            </div>
          )}
        </Card>

        {/* Two-factor */}
        <Card>
          <CardHeader
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Two-factor authentication"
            description="Protect sign-in with an authenticator app."
            action={factors.length ? <Badge tone="success">On</Badge> : <Badge tone="warning">Off</Badge>}
          />
          {factors.length > 0 && (
            <ul className="mb-4 grid gap-2">
              {factors.map((factor) => (
                <li
                  key={factor.uid}
                  className="grid gap-2 rounded-xl border border-line bg-panel/50 px-3.5 py-2.5 sm:flex sm:items-center sm:justify-between sm:gap-3"
                >
                  <span className="flex min-w-0 items-center gap-2.5 text-sm">
                    <Smartphone className="h-4 w-4 shrink-0 text-brand" />
                    <span className="min-w-0 truncate font-medium text-ink">{factor.displayName || "Authenticator app"}</span>
                  </span>
                  <Button variant="ghost" size="sm" className="w-full sm:w-auto" disabled={busy === `mfa-remove-${factor.uid}`} onClick={() => removeFactor(factor)}>
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}
          {!totpSecret ? (
            <div className="grid gap-4">
              <p className="text-sm text-muted">
                Use Google Authenticator, 1Password, Authy, or any TOTP app. You&apos;ll enter a 6-digit code at each sign-in.
              </p>
              {hasPassword && (
                <Label>
                  Confirm current password
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Required to change security settings"
                  />
                </Label>
              )}
              <Button disabled={busy === "mfa-begin"} onClick={beginEnroll} className="justify-self-start">
                <ShieldCheck className="h-4 w-4" />
                {busy === "mfa-begin" ? "Preparing…" : factors.length ? "Add another app" : "Set up authenticator app"}
              </Button>
            </div>
          ) : (
            <form className="grid gap-4" onSubmit={finishEnroll}>
              <div className="flex flex-col items-center gap-4 rounded-2xl border border-line bg-panel/40 p-4 sm:flex-row sm:items-start">
                {qrDataUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrDataUrl} alt="Authenticator QR code" className="h-40 w-40 shrink-0 rounded-xl border border-line bg-white p-1" />
                )}
                <div className="grid gap-2 text-sm">
                  <p className="font-medium text-ink">1. Scan this QR in your authenticator app.</p>
                  <p className="text-muted">Can&apos;t scan? Enter this key manually:</p>
                  <button
                    type="button"
                    onClick={copySecret}
                    className="inline-flex items-center gap-2 self-start rounded-lg border border-line bg-surface px-3 py-2 font-mono text-xs text-ink transition hover:border-brand/40"
                  >
                    <span className="break-all">{totpSecret.secretKey}</span>
                    {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4 text-muted" />}
                  </button>
                </div>
              </div>
              <Label>
                2. Enter the 6-digit code
                <Input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="123456"
                  className="max-w-[200px] text-center text-lg font-semibold tracking-[0.35em]"
                  value={enrollCode}
                  onChange={(event) => setEnrollCode(event.target.value.replace(/\D/g, ""))}
                />
              </Label>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={busy === "mfa-enroll" || enrollCode.length < 6}>
                  {busy === "mfa-enroll" ? "Enabling…" : "Enable 2FA"}
                </Button>
                <Button type="button" variant="ghost" onClick={cancelEnroll}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </Card>

        {/* Data + account */}
        <Card>
          <CardHeader icon={<Download className="h-5 w-5" />} title="Your data" description="Export or leave your workspace." />
          <p className="text-sm text-muted">Download a JSON snapshot of everything Duewise stores for you.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={exportJson} disabled={busy === "export"}>
              <Download className="h-4 w-4" />
              {busy === "export" ? "Exporting…" : "Export JSON"}
            </Button>
            <Button variant="ghost" onClick={() => signOut(auth)}>
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
