"use client";

import { Info, Moon, Sun, UploadCloud, UserRound } from "lucide-react";
import Link from "next/link";
import { useTheme } from "@/components/layout/theme-provider";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";

export function SettingsClient() {
  const { theme, setTheme } = useTheme();

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
