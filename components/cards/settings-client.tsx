"use client";

import { BellRing, Info, Moon, Sun, UploadCloud, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useTheme } from "@/components/layout/theme-provider";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { apiFetch } from "@/lib/api/client";
import { requestFcmToken } from "@/lib/firebase/client";

type NotificationPreferences = {
  browserPushEnabled: boolean;
  dailyDigestEnabled: boolean;
};

export function SettingsClient() {
  const { theme, setTheme } = useTheme();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [notificationStatus, setNotificationStatus] = useState("");
  const [notificationBusy, setNotificationBusy] = useState(false);

  useEffect(() => {
    apiFetch<{ data: NotificationPreferences }>("/api/notifications/preferences")
      .then((response) => setPreferences(response.data))
      .catch(() => setPreferences({ browserPushEnabled: false, dailyDigestEnabled: true }));
  }, []);

  async function enablePush() {
    setNotificationBusy(true);
    setNotificationStatus("");
    try {
      const token = await requestFcmToken();
      if (!token) throw new Error("Could not create a browser push token.");
      await apiFetch("/api/notifications/register-token", {
        method: "POST",
        body: JSON.stringify({ token, permission: "granted" })
      });
      setPreferences({ browserPushEnabled: true, dailyDigestEnabled: true });
      setNotificationStatus("Browser push is enabled for this device.");
    } catch (error) {
      setNotificationStatus(error instanceof Error ? error.message : "Could not enable browser push.");
    } finally {
      setNotificationBusy(false);
    }
  }

  async function toggleDigest() {
    if (!preferences) return;
    const next = !preferences.dailyDigestEnabled;
    setPreferences({ ...preferences, dailyDigestEnabled: next });
    await apiFetch<{ data: NotificationPreferences }>("/api/notifications/preferences", {
      method: "PATCH",
      body: JSON.stringify({ dailyDigestEnabled: next })
    }).catch(() => setPreferences(preferences));
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-6">
      <header>
        <h1 className="font-display text-3xl font-extrabold text-ink">Settings</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Appearance and general preferences for your Duewise workspace. Looking for your account, password, or 2FA?{" "}
          <Link href="/profile" className="font-semibold text-brand-strong hover:underline">
            Go to your profile
          </Link>
          .
        </p>
      </header>

      <div className="grid gap-6 xl:grid-cols-2">
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

        {/* Account shortcut */}
        <Card>
          <CardHeader icon={<UserRound className="h-5 w-5" />} title="Account" description="Profile, password, and security." />
          <p className="text-sm text-muted">
            Your personal details, sign-in method, two-factor authentication, and data export now live on your profile page.
          </p>
          <Link href="/profile" className="mt-4 inline-block">
            <Button variant="secondary">
              <UserRound className="h-4 w-4" />
              Open profile
            </Button>
          </Link>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader
            icon={<BellRing className="h-5 w-5" />}
            title="Notifications"
            description="Free browser push via Firebase Cloud Messaging."
          />
          <div className="grid gap-4">
            <div className="rounded-xl bg-panel/50 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-ink">Browser push</p>
                  <p className="mt-1 text-sm text-muted">Get daily attention alerts on this device.</p>
                </div>
                <Button variant={preferences?.browserPushEnabled ? "secondary" : "primary"} size="sm" disabled={notificationBusy} onClick={enablePush}>
                  <BellRing className="h-4 w-4" />
                  {preferences?.browserPushEnabled ? "Refresh" : "Enable"}
                </Button>
              </div>
            </div>
            <button
              type="button"
              className="flex items-center justify-between rounded-xl border border-line bg-surface px-4 py-3 text-left"
              onClick={toggleDigest}
            >
              <span>
                <span className="block font-semibold text-ink">Daily attention digest</span>
                <span className="text-sm text-muted">One push per day when something needs attention.</span>
              </span>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${preferences?.dailyDigestEnabled ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300" : "bg-panel text-muted"}`}>
                {preferences?.dailyDigestEnabled ? "On" : "Off"}
              </span>
            </button>
            {notificationStatus && <p className="text-sm font-medium text-muted">{notificationStatus}</p>}
          </div>
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

        {/* About */}
        <Card>
          <CardHeader icon={<Info className="h-5 w-5" />} title="About Duewise" description="Your calm command center." />
          <p className="text-sm text-muted">
            Duewise keeps you ahead of every due date — deadlines, documents, subscriptions, inventory, and family admin, all in
            one place. Reminder dates are surfaced through the dashboard and timeline.
          </p>
        </Card>
      </div>
    </div>
  );
}
