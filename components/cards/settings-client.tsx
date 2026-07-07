"use client";

import { Download, Moon, UploadCloud } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiFetch } from "@/lib/api/client";
import { auth } from "@/lib/firebase/client";

export function SettingsClient() {
  const [message, setMessage] = useState("");

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

  return (
    <div className="mx-auto grid max-w-5xl gap-6">
      <header>
        <h1 className="text-3xl font-semibold text-ink">Settings</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink/60">Account, data export, upload coordination, and deployment notes for your Duewise workspace.</p>
      </header>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold">Account</h2>
          <div className="mt-4 grid gap-2 text-sm text-ink/70">
            <p>Email: <strong>{auth.currentUser?.email ?? "Signed in"}</strong></p>
            <p>UID: <strong className="break-all">{auth.currentUser?.uid}</strong></p>
          </div>
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
        <Card>
          <h2 className="text-lg font-semibold">Display</h2>
          <p className="mt-2 text-sm text-ink/60">Dark mode is scaffolded as a product setting placeholder for the next iteration.</p>
          <Button className="mt-4" variant="secondary" onClick={() => setMessage("Dark mode can be wired to a persisted theme token next.")}>
            <Moon className="h-4 w-4" />
            Dark mode
          </Button>
          {message && <p className="mt-3 text-sm text-sage">{message}</p>}
        </Card>
      </div>
    </div>
  );
}
