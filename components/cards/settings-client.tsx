"use client";

import {
  CheckCircle2,
  Copy,
  Download,
  KeyRound,
  Moon,
  ShieldCheck,
  Smartphone,
  Sun,
  Trash2,
  UploadCloud,
  UserRound
} from "lucide-react";
import {
  EmailAuthProvider,
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
import { useTheme } from "@/components/layout/theme-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { apiFetch } from "@/lib/api/client";

type Message = { type: "success" | "error"; text: string };

function friendlyError(error: unknown) {
  if (!(error instanceof Error)) return "Something went wrong.";
  const message = error.message.replace("Firebase: ", "");
  if (message.includes("auth/requires-recent-login"))
    return "Please re-enter your password to confirm this security change.";
  if (message.includes("auth/invalid-verification-code") || message.includes("totp"))
    return "That code didn't match. Check your authenticator app and try again.";
  if (message.includes("auth/operation-not-allowed"))
    return "TOTP two-factor auth isn't enabled for this project yet (enable it in the Firebase console).";
  return message.replace(/\(auth.*\)\.?/, "").trim() || "Something went wrong.";
}

export function SettingsClient() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
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

  const hasPassword = useMemo(
    () => Boolean(user?.providerData.some((provider) => provider.providerId === "password")),
    [user]
  );

  useEffect(() => {
    setDisplayName(user?.displayName ?? "");
    setPhotoURL(user?.photoURL ?? "");
    if (user) setFactors(multiFactor(user).enrolledFactors);
  }, [user]);

  function refreshFactors() {
    if (user) setFactors(multiFactor(user).enrolledFactors);
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

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    if (!user) return;
    setBusy("profile");
    setMessage(null);
    try {
      await updateProfile(user, { displayName: displayName.trim(), photoURL: photoURL.trim() || null });
      await reload(user);
      setMessage({ type: "success", text: "Profile updated." });
    } catch (error) {
      setMessage({ type: "error", text: friendlyError(error) });
    } finally {
      setBusy("");
    }
  }

  async function changePassword(event: React.FormEvent) {
    event.preventDefault();
    if (!user?.email) {
      setMessage({ type: "error", text: "Password changes require an email/password account." });
      return;
    }
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
      setMessage({ type: "error", text: friendlyError(error) });
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
      setMessage({ type: "error", text: friendlyError(error) });
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
      refreshFactors();
      cancelEnroll();
      setConfirmPassword("");
      setMessage({ type: "success", text: "Authenticator app enabled. You'll be asked for a code at next sign-in." });
    } catch (error) {
      setMessage({ type: "error", text: friendlyError(error) });
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
      refreshFactors();
      setMessage({ type: "success", text: "Two-factor method removed." });
    } catch (error) {
      setMessage({ type: "error", text: friendlyError(error) });
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

  return (
    <div className="mx-auto grid max-w-6xl gap-6">
      <header>
        <h1 className="font-display text-3xl font-extrabold text-ink">Settings</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Profile, security, appearance, and data controls for your Duewise workspace.
        </p>
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

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Profile */}
        <Card>
          <CardHeader icon={<UserRound className="h-5 w-5" />} title="Profile" description="How you show up in your workspace." />
          <form className="grid gap-4" onSubmit={saveProfile}>
            <Label>
              Display name
              <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Your name" />
            </Label>
            <Label>
              Photo URL
              <Input value={photoURL} onChange={(event) => setPhotoURL(event.target.value)} placeholder="https://…" />
            </Label>
            <div className="rounded-xl bg-panel/60 p-3.5 text-sm text-muted">
              <p>
                Email: <strong className="text-ink">{user?.email ?? "Signed in"}</strong>
              </p>
              <p className="mt-1 break-all">
                UID: <strong className="text-ink">{user?.uid}</strong>
              </p>
            </div>
            <Button disabled={busy === "profile"} type="submit" className="justify-self-start">
              {busy === "profile" ? "Saving…" : "Save profile"}
            </Button>
          </form>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader
            icon={theme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            title="Appearance"
            description="Pick the theme that feels best for focused admin."
          />
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-panel/60 p-1">
            {(["light", "dark"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setTheme(option)}
                className={`h-11 rounded-lg text-sm font-semibold capitalize transition ${
                  theme === option ? "bg-surface text-ink shadow-card" : "text-muted hover:text-ink"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </Card>

        {/* Password */}
        <Card>
          <CardHeader icon={<KeyRound className="h-5 w-5" />} title="Password" description="Update the password for email sign-in." />
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
        </Card>

        {/* MFA — TOTP */}
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
                  className="flex items-center justify-between gap-3 rounded-xl border border-line bg-panel/50 px-3.5 py-2.5"
                >
                  <span className="flex items-center gap-2.5 text-sm">
                    <Smartphone className="h-4 w-4 text-brand" />
                    <span className="font-medium text-ink">{factor.displayName || "Authenticator app"}</span>
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy === `mfa-remove-${factor.uid}`}
                    onClick={() => removeFactor(factor)}
                  >
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
                  <img
                    src={qrDataUrl}
                    alt="Authenticator QR code"
                    className="h-40 w-40 shrink-0 rounded-xl border border-line bg-white p-1"
                  />
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

        {/* Data export */}
        <Card>
          <CardHeader icon={<Download className="h-5 w-5" />} title="Data export" description="Download everything Duewise stores for you." />
          <p className="text-sm text-muted">A JSON snapshot of your user-scoped Firestore data.</p>
          <Button className="mt-4 justify-self-start" variant="secondary" onClick={exportJson} disabled={busy === "export"}>
            <Download className="h-4 w-4" />
            {busy === "export" ? "Exporting…" : "Export JSON"}
          </Button>
        </Card>

        {/* Storage */}
        <Card>
          <CardHeader icon={<UploadCloud className="h-5 w-5" />} title="Storage coordination" description="Signed upload URLs, scoped to your UID." />
          <p className="text-sm text-muted">The BFF exposes signed upload URL endpoints for document and inventory files.</p>
          <div className="mt-4 grid gap-2">
            <code className="rounded-lg bg-panel/60 px-3 py-2 text-xs text-ink/80">/api/documents/upload-url</code>
            <code className="rounded-lg bg-panel/60 px-3 py-2 text-xs text-ink/80">/api/inventory/upload-url</code>
          </div>
        </Card>
      </div>
    </div>
  );
}
