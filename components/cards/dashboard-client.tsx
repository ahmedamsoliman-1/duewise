"use client";

import { AlertTriangle, CalendarDays, CreditCard, FileText, PackageCheck, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiFetch } from "@/lib/api/client";
import type { DuewiseDocument, Subscription, Task, TimelineEvent } from "@/types";

type DashboardData = {
  upcomingDeadlines: TimelineEvent[];
  overdueTasks: Task[];
  documentsExpiringSoon: DuewiseDocument[];
  renewalsThisMonth: Subscription[];
  monthlySpend: number;
  recentDocuments: DuewiseDocument[];
  counts: Record<string, number>;
};

export function DashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<{ data: DashboardData }>("/api/dashboard")
      .then((response) => setData(response.data))
      .catch((nextError) => setError(nextError instanceof Error ? nextError.message : "Could not load dashboard."));
  }, []);

  if (error) return <p className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</p>;
  if (!data) return <p className="text-sm text-ink/60">Preparing your dashboard...</p>;

  const stats = [
    { label: "Upcoming", value: data.upcomingDeadlines.length, icon: CalendarDays },
    { label: "Overdue", value: data.overdueTasks.length, icon: AlertTriangle },
    { label: "Expiring docs", value: data.documentsExpiringSoon.length, icon: FileText },
    { label: "Monthly spend", value: `$${data.monthlySpend.toFixed(0)}`, icon: CreditCard }
  ];

  return (
    <div className="mx-auto grid max-w-7xl gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-ink">Dashboard</h1>
          <p className="mt-1 max-w-2xl text-sm text-ink/60">Your calm command center for documents, deadlines, renewals, warranties, and household admin.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            ["/tasks", "Task"],
            ["/documents", "Document"],
            ["/subscriptions", "Subscription"],
            ["/inventory", "Inventory"]
          ].map(([href, label]) => (
            <Link key={href} href={href}>
              <Button variant="secondary">
                <Plus className="h-4 w-4" />
                {label}
              </Button>
            </Link>
          ))}
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-ink/55">{stat.label}</p>
                <Icon className="h-5 w-5 text-sage" />
              </div>
              <p className="mt-3 text-3xl font-semibold">{stat.value}</p>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Upcoming life admin</h2>
          {data.upcomingDeadlines.length ? (
            <div className="grid gap-3">
              {data.upcomingDeadlines.map((event) => (
                <Link key={event.id} href={event.href} className="flex items-center justify-between rounded-md border border-ink/10 p-3 transition hover:bg-mist">
                  <span>
                    <span className="block font-medium">{event.title}</span>
                    <span className="text-sm text-ink/55">{event.label}</span>
                  </span>
                  <span className="text-sm font-medium text-sage">{event.date}</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink/60">Nothing urgent yet. Add a few tasks, documents, subscriptions, or inventory items to populate your command center.</p>
          )}
        </Card>
        <Card>
          <h2 className="mb-4 text-lg font-semibold">System health</h2>
          <div className="grid gap-3 text-sm">
            <p className="flex items-center justify-between"><span>Tasks</span><strong>{data.counts.tasks}</strong></p>
            <p className="flex items-center justify-between"><span>Documents</span><strong>{data.counts.documents}</strong></p>
            <p className="flex items-center justify-between"><span>Subscriptions</span><strong>{data.counts.subscriptions}</strong></p>
            <p className="flex items-center justify-between"><span>Inventory items</span><strong>{data.counts.inventory}</strong></p>
          </div>
          <div className="mt-5 rounded-md bg-skyglass/45 p-4">
            <PackageCheck className="mb-2 h-5 w-5 text-sage" />
            <p className="text-sm text-ink/70">Reminder dates are stored with tasks and surfaced through dashboard and timeline aggregation.</p>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Documents expiring soon</h2>
          {data.documentsExpiringSoon.length ? data.documentsExpiringSoon.map((doc) => <p key={doc.id} className="border-t border-ink/10 py-3 text-sm">{doc.title} · {doc.expiryDate}</p>) : <p className="text-sm text-ink/60">No document expiries in the next 60 days.</p>}
        </Card>
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Renewals this month</h2>
          {data.renewalsThisMonth.length ? data.renewalsThisMonth.map((sub) => <p key={sub.id} className="border-t border-ink/10 py-3 text-sm">{sub.name} · {sub.currency} {sub.cost}</p>) : <p className="text-sm text-ink/60">No subscription renewals this month.</p>}
        </Card>
      </div>
    </div>
  );
}
