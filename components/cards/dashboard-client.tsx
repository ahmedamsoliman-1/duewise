"use client";

import { AlertTriangle, ArrowUpRight, CalendarDays, CreditCard, FileText, Flame, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api/client";
import type { DuewiseDocument, Subscription, Task, TimelineEvent } from "@/types";
import type { AttentionItem } from "@/lib/dates/attention";

type DashboardData = {
  upcomingDeadlines: TimelineEvent[];
  attentionItems: AttentionItem[];
  overdueTasks: Task[];
  documentsExpiringSoon: DuewiseDocument[];
  renewalsThisMonth: Subscription[];
  monthlySpend: number;
  recentDocuments: DuewiseDocument[];
  counts: Record<string, number>;
};

const quickAdds = [
  ["/tasks", "Task"],
  ["/documents", "Document"],
  ["/subscriptions", "Subscription"],
  ["/inventory", "Inventory"]
] as const;

const severityTone: Record<AttentionItem["severity"], "danger" | "warning" | "brand" | "neutral"> = {
  critical: "danger",
  high: "warning",
  medium: "brand",
  low: "neutral"
};

const severityLabel: Record<AttentionItem["severity"], string> = {
  critical: "Critical",
  high: "High",
  medium: "Watch",
  low: "Later"
};

export function DashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<{ data: DashboardData }>("/api/dashboard")
      .then((response) => setData(response.data))
      .catch((nextError) => setError(nextError instanceof Error ? nextError.message : "Could not load dashboard."));
  }, []);

  if (error)
    return (
      <p className="rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-sm font-medium text-red-600 dark:text-red-300">
        {error}
      </p>
    );

  const stats = data
    ? [
        { label: "Upcoming", value: data.upcomingDeadlines.length, icon: CalendarDays, tone: "brand" as const },
        { label: "Overdue", value: data.overdueTasks.length, icon: AlertTriangle, tone: "danger" as const },
        { label: "Expiring docs", value: data.documentsExpiringSoon.length, icon: FileText, tone: "warning" as const },
        { label: "Monthly spend", value: `$${data.monthlySpend.toFixed(0)}`, icon: CreditCard, tone: "success" as const }
      ]
    : [];

  const toneClass: Record<string, string> = {
    brand: "bg-brand-soft text-brand",
    danger: "bg-red-500/12 text-red-600 dark:text-red-300",
    warning: "bg-amber-500/14 text-amber-600 dark:text-amber-300",
    success: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-300"
  };

  return (
    <div className="mx-auto grid max-w-7xl gap-6">
      {/* Hero header */}
      <header className="relative overflow-hidden rounded-3xl border border-white/5 bg-onyx p-6 text-white sm:p-8">
        <div className="brand-aurora pointer-events-none absolute inset-0 opacity-90" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-brand ring-1 ring-white/10">
              <Sparkles className="h-3.5 w-3.5" />
              Command center
            </span>
            <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Dashboard</h1>
            <p className="mt-2 max-w-xl text-sm text-white/65">
              Everything that&apos;s due — documents, deadlines, renewals, warranties, and household admin, handled early.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {quickAdds.map(([href, label]) => (
              <Link key={href} href={href}>
                <Button
                  variant="secondary"
                  size="sm"
                  className="border-white/15 bg-white/10 text-white backdrop-blur hover:bg-white/20"
                >
                  <Plus className="h-4 w-4" />
                  {label}
                </Button>
              </Link>
            ))}
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data
          ? stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.label} className="p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-muted">{stat.label}</p>
                    <span className={`grid h-9 w-9 place-items-center rounded-xl ${toneClass[stat.tone]}`}>
                      <Icon className="h-[18px] w-[18px]" />
                    </span>
                  </div>
                  <p className="mt-3 font-display text-3xl font-extrabold text-ink">{stat.value}</p>
                </Card>
              );
            })
          : Array.from({ length: 4 }).map((_, index) => (
              <Card key={index} className="p-5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="mt-4 h-8 w-16" />
              </Card>
            ))}
      </div>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-line bg-panel/35 p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-strong">
                <Flame className="h-4 w-4" />
                Attention engine
              </span>
              <h2 className="mt-1 font-display text-xl font-extrabold text-ink">What needs your eyes first</h2>
            </div>
            {data?.attentionItems.length ? <Badge tone="warning">{data.attentionItems.length} signals</Badge> : null}
          </div>
        </div>
        {!data ? (
          <div className="grid gap-3 p-5 sm:p-6">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : data.attentionItems.length ? (
          <div className="divide-y divide-line">
            {data.attentionItems.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="group grid gap-3 p-4 transition-colors hover:bg-brand-soft/30 sm:grid-cols-[1fr_auto] sm:items-center sm:p-5"
              >
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <Badge tone={severityTone[item.severity]}>{severityLabel[item.severity]}</Badge>
                    <span className="truncate font-semibold text-ink">{item.title}</span>
                  </span>
                  <span className="mt-1 block text-sm text-muted">
                    {item.reason}
                    {item.relatedName ? ` · ${item.relatedName}` : ""}
                  </span>
                </span>
                <span className="inline-flex items-center justify-between gap-3 sm:justify-end">
                  <Badge tone={item.daysUntil < 0 ? "danger" : item.daysUntil <= 7 ? "warning" : "neutral"}>
                    {item.dueDate}
                  </Badge>
                  <ArrowUpRight className="h-4 w-4 text-muted transition-colors group-hover:text-brand" />
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-5 sm:p-6">
            <EmptyHint title="Nothing needs attention" body="No overdue, near-due, or high-importance records are asking for action." />
          </div>
        )}
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        {/* Upcoming */}
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-ink">Upcoming life admin</h2>
            <Link href="/timeline" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-strong hover:underline">
              Timeline <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          {!data ? (
            <div className="grid gap-2.5">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : data.upcomingDeadlines.length ? (
            <div className="grid gap-2.5">
              {data.upcomingDeadlines.map((event) => (
                <Link
                  key={event.id}
                  href={event.href}
                  className="group flex items-center justify-between gap-3 rounded-xl border border-line p-3.5 transition-colors hover:border-brand/30 hover:bg-brand-soft/40"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-ink">{event.title}</span>
                    <span className="text-sm text-muted">{event.label}</span>
                  </span>
                  <Badge tone="brand">{event.date}</Badge>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyHint
              title="Nothing urgent yet"
              body="Add a few tasks, documents, subscriptions, or inventory items to populate your command center."
            />
          )}
        </Card>

        {/* Snapshot */}
        <Card>
          <h2 className="mb-4 font-display text-lg font-bold text-ink">Snapshot</h2>
          <div className="grid gap-2.5 text-sm">
            {[
              ["Tasks", data?.counts.tasks],
              ["Documents", data?.counts.documents],
              ["Subscriptions", data?.counts.subscriptions],
              ["Inventory items", data?.counts.inventory]
            ].map(([label, value]) => (
              <div key={label as string} className="flex items-center justify-between rounded-xl bg-panel/50 px-3.5 py-2.5">
                <span className="text-muted">{label}</span>
                <strong className="font-display text-ink">{value ?? "—"}</strong>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-xl bg-brand-soft/60 p-4">
            <p className="text-sm text-ink/75">
              Reminder dates are stored with tasks and surfaced through dashboard and timeline aggregation.
            </p>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-display text-lg font-bold text-ink">Documents with expiries soon</h2>
          {!data ? (
            <Skeleton className="h-24 w-full rounded-xl" />
          ) : data.documentsExpiringSoon.length ? (
            <ul className="grid gap-1">
              {data.documentsExpiringSoon.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between border-t border-line py-3 text-sm first:border-t-0">
                  <span className="font-medium text-ink">{doc.title}</span>
                  <Badge tone="warning">{doc.expiryDate}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyHint title="All clear" body="No documents with expiry dates are due in the next 60 days." />
          )}
        </Card>
        <Card>
          <h2 className="mb-4 font-display text-lg font-bold text-ink">Renewals this month</h2>
          {!data ? (
            <Skeleton className="h-24 w-full rounded-xl" />
          ) : data.renewalsThisMonth.length ? (
            <ul className="grid gap-1">
              {data.renewalsThisMonth.map((sub) => (
                <li key={sub.id} className="flex items-center justify-between border-t border-line py-3 text-sm first:border-t-0">
                  <span className="font-medium text-ink">{sub.name}</span>
                  <Badge tone="brand">
                    {sub.currency} {sub.cost}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyHint title="Nothing due" body="No subscription renewals this month." />
          )}
        </Card>
      </div>
    </div>
  );
}

function EmptyHint({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-panel/30 p-5 text-center">
      <p className="font-semibold text-ink">{title}</p>
      <p className="mt-1 text-sm text-muted">{body}</p>
    </div>
  );
}
