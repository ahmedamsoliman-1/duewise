"use client";

import { Boxes, CalendarClock, CreditCard, FileText, Waypoints } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api/client";
import type { TimelineEvent } from "@/types";

const icons = {
  task: CalendarClock,
  document: FileText,
  subscription: CreditCard,
  inventory: Boxes
};

export function TimelineClient() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<{ data: TimelineEvent[] }>("/api/timeline")
      .then((response) => setEvents(response.data))
      .catch((nextError) => setError(nextError instanceof Error ? nextError.message : "Could not load timeline."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto grid max-w-4xl gap-6">
      <header>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">Life timeline</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          A single chronological view of renewals, expiries, warranty endings, bills, and appointments.
        </p>
      </header>

      {loading ? (
        <Card>
          <div className="grid gap-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        </Card>
      ) : error ? (
        <p className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-600 dark:text-red-300">
          {error}
        </p>
      ) : events.length === 0 ? (
        <Card className="grid place-items-center py-14 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft text-brand">
            <Waypoints className="h-7 w-7" />
          </span>
          <h2 className="mt-4 font-display text-lg font-bold text-ink">No dated events yet</h2>
          <p className="mt-1 max-w-md text-sm text-muted">
            Add due dates, expiry dates, subscription renewals, and warranty endings to build your timeline.
          </p>
        </Card>
      ) : (
        <Card>
          <ol className="relative grid gap-1">
            {/* connector line */}
            <span className="absolute bottom-4 left-[27px] top-4 w-px bg-line" aria-hidden="true" />
            {events.map((event) => {
              const Icon = icons[event.source];
              return (
                <li key={event.id}>
                  <Link
                    href={event.href}
                    className="group relative grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-xl p-3 transition-colors hover:bg-brand-soft/40"
                  >
                    <span className="relative z-10 grid h-11 w-11 place-items-center rounded-xl bg-brand-soft text-brand ring-4 ring-surface">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-ink">{event.title}</span>
                      <span className="text-sm capitalize text-muted">
                        {event.source} · {event.label}
                      </span>
                    </span>
                    <Badge tone="brand">{event.date}</Badge>
                  </Link>
                </li>
              );
            })}
          </ol>
        </Card>
      )}
    </div>
  );
}
