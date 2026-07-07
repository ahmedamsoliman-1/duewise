"use client";

import {
  Download,
  KeyRound,
  Moon,
  ShieldCheck,
  Smartphone,
  Sun,
  UploadCloud,
  UserRound
} from "lucide-react";
import {
  EmailAuthProvider,
  PhoneAuthProvider,
  PhoneMultiFactorGenerator,
  RecaptchaVerifier,
  multiFactor,
  reauthenticateWithCredential,
  reload,
  updatePassword,
  updateProfile
} from "firebase/auth";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/layout/auth-provider";
import { useTheme } from "@/components/layout/theme-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { apiFetch } from "@/lib/api/client";
import { auth } from "@/lib/firebase/client";

type Message = { type: "success" | "error"; text: string };

function friendlyError(error: unknown) {
  if (!(error instanceof Error)) return "Something went wrong.";
  return error.message.replace("Firebase: ", "").replace(/\.$/, ".");
}

export function SettingsClient() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [displayName, setDisplayName] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationId, setVerificationId] = useState("");
  const [message, setMessage] = useState<Message | null>(null);
  const [busy, setBusy] = useState("");
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);

  const enrolledFactors = useMemo(() => (user ? multiFactor(user).enrolledFactors : []), [user]);

  useEffect(() => {
    setDisplayName(user?.displayName ?? "");
    setPhotoURL(user?.photoURL ?? "");
  }, [user]);

  async function exportJson() {
    const data = await apiFetch<Record<string, unknown>>("/api/export");
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "duewise-export.json";
    link.click();
    URL.revokeObjectURL(url);
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

  function getRecaptcha() {
    if (recaptchaRef.current) return recaptchaRef.current;
    recaptchaRef.current = new RecaptchaVerifier(auth, "mfa-recaptcha", {
      size: "invisible"
    });
    return recaptchaRef.current;
  }

  async function sendMfaCode(event: React.FormEvent) {
    event.preventDefault();
    if (!user?.email) {
      setMessage({ type: "error", text: "MFA enrollment requires a signed-in email account." });
      return;
    }
    setBusy("mfa-send");
    setMessage(null);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      const session = await multiFactor(user).getSession();
      const provider = new PhoneAuthProvider(auth);
      const nextVerificationId = await provider.verifyPhoneNumber({ phoneNumber, session }, getRecaptcha());
      setVerificationId(nextVerificationId);
      setMessage({ type: "success", text: "Verification code sent." });
    } catch (error) {
      recaptchaRef.current?.clear();
      recaptchaRef.current = null;
      setMessage({ type: "error", text: friendlyError(error) });
    } finally {
      setBusy("");
    }
  }

  async function enrollMfa(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !verificationId) return;
    setBusy("mfa-enroll");
    setMessage(null);
    try {
      const credential = PhoneAuthProvider.credential(verificationId, verificationCode);
      const assertion = PhoneMultiFactorGenerator.assertion(credential);
      await multiFactor(user).enroll(assertion, "Phone");
      await reload(user);
      setVerificationCode("");
      setVerificationId("");
      setPhoneNumber("");
      setMessage({ type: "success", text: "Multi-factor authentication enabled." });
    } catch (error) {
      setMessage({ type: "error", text: friendlyError(error) });
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-6">
      <header>
        <h1 className="text-3xl font-semibold text-ink">Settings</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink/60">Profile, security, display, and data controls for your Duewise workspace.</p>
      </header>

      {message && (
        <p className={`rounded-md px-4 py-3 text-sm ${message.type === "success" ? "bg-skyglass/60 text-ink" : "bg-red-50 text-red-700 dark:bg-red-950/35 dark:text-red-200"}`}>
          {message.text}
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center gap-3">
            <UserRound className="h-5 w-5 text-sage" />
            <h2 className="text-lg font-semibold">Profile</h2>
          </div>
          <form className="grid gap-4" onSubmit={saveProfile}>
            <Label>
              Display name
              <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Your name" />
            </Label>
            <Label>
              Photo URL
              <Input value={photoURL} onChange={(event) => setPhotoURL(event.target.value)} placeholder="https://..." />
            </Label>
            <div className="rounded-md bg-mist p-3 text-sm text-ink/70">
              <p>Email: <strong>{user?.email ?? "Signed in"}</strong></p>
              <p className="mt-1 break-all">UID: <strong>{user?.uid}</strong></p>
            </div>
            <Button disabled={busy === "profile"} type="submit">
              <UserRound className="h-4 w-4" />
              {busy === "profile" ? "Saving..." : "Save profile"}
            </Button>
          </form>
        </Card>

        <Card>
          <div className="mb-4 flex items-center gap-3">
            {theme === "dark" ? <Moon className="h-5 w-5 text-sage" /> : <Sun className="h-5 w-5 text-sage" />}
            <h2 className="text-lg font-semibold">Display</h2>
          </div>
          <p className="text-sm text-ink/60">Choose the theme that feels best for focused admin work.</p>
          <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-mist p-1">
            <button
              type="button"
              onClick={() => setTheme("light")}
              className={`h-10 rounded-md text-sm font-medium transition ${theme === "light" ? "bg-white text-ink shadow-soft dark:bg-[#111817]" : "text-ink/55 hover:text-ink"}`}
            >
              Light
            </button>
            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={`h-10 rounded-md text-sm font-medium transition ${theme === "dark" ? "bg-white text-ink shadow-soft dark:bg-[#111817]" : "text-ink/55 hover:text-ink"}`}
            >
              Dark
            </button>
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex items-center gap-3">
            <KeyRound className="h-5 w-5 text-sage" />
            <h2 className="text-lg font-semibold">Password</h2>
          </div>
          <form className="grid gap-4" onSubmit={changePassword}>
            <Label>
              Current password
              <Input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required />
            </Label>
            <Label>
              New password
              <Input type="password" minLength={6} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required />
            </Label>
            <Button disabled={busy === "password"} type="submit">
              <KeyRound className="h-4 w-4" />
              {busy === "password" ? "Changing..." : "Change password"}
            </Button>
          </form>
        </Card>

        <Card>
          <div className="mb-4 flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-sage" />
            <h2 className="text-lg font-semibold">Multi-factor authentication</h2>
          </div>
          <div className="mb-4 rounded-md bg-mist p-3 text-sm text-ink/70">
            {enrolledFactors.length ? (
              <p>{enrolledFactors.length} second factor enabled.</p>
            ) : (
              <p>No second factor is currently enrolled.</p>
            )}
          </div>
          <form className="grid gap-4" onSubmit={verificationId ? enrollMfa : sendMfaCode}>
            <Label>
              Phone number
              <Input value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} placeholder="+15551234567" required />
            </Label>
            <Label>
              Current password
              <Input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required />
            </Label>
            {verificationId && (
              <Label>
                Verification code
                <Input value={verificationCode} onChange={(event) => setVerificationCode(event.target.value)} required />
              </Label>
            )}
            <div id="mfa-recaptcha" />
            <Button disabled={busy === "mfa-send" || busy === "mfa-enroll"} type="submit">
              <Smartphone className="h-4 w-4" />
              {verificationId ? (busy === "mfa-enroll" ? "Enabling..." : "Enable MFA") : busy === "mfa-send" ? "Sending..." : "Send code"}
            </Button>
          </form>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold">Data export</h2>
          <p className="mt-2 text-sm text-ink/60">Download a JSON snapshot of your user-scoped Firestore data.</p>
          <Button className="mt-4" onClick={exportJson}>
            <Download className="h-4 w-4" />
            Export JSON
          </Button>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold">Storage coordination</h2>
          <p className="mt-2 text-sm text-ink/60">The BFF exposes signed upload URL endpoints for document and inventory files, scoped under your Firebase UID.</p>
          <div className="mt-4 flex items-center gap-2 rounded-md bg-skyglass/45 p-3 text-sm text-ink/70">
            <UploadCloud className="h-4 w-4 text-sage" />
            `/api/documents/upload-url` and `/api/inventory/upload-url`
          </div>
        </Card>
      </div>
    </div>
  );
}
