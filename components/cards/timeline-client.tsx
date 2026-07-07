"use client";

import { Boxes, CalendarClock, CreditCard, FileText } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
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
    <div className="mx-auto grid max-w-5xl gap-6">
      <header>
        <h1 className="text-3xl font-semibold text-ink">Life Timeline</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink/60">A single chronological view of renewals, expiries, warranty endings, bills, and appointments.</p>
      </header>
      <Card>
        {loading ? (
          <p className="text-sm text-ink/60">Loading timeline...</p>
        ) : error ? (
          <p className="text-sm text-red-700">{error}</p>
        ) : events.length === 0 ? (
          <div>
            <h2 className="text-lg font-semibold">No dated events yet</h2>
            <p className="mt-1 text-sm text-ink/60">Add due dates, expiry dates, subscription renewals, and warranty endings to build your timeline.</p>
          </div>
        ) : (
          <div className="grid gap-2">
            {events.map((event) => {
              const Icon = icons[event.source];
              return (
                <Link key={event.id} href={event.href} className="grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-md border border-ink/10 p-4 transition hover:bg-mist">
                  <span className="grid h-10 w-10 place-items-center rounded-md bg-skyglass text-sage">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block font-medium">{event.title}</span>
                    <span className="text-sm capitalize text-ink/55">{event.source} · {event.label}</span>
                  </span>
                  <time className="text-sm font-medium text-sage">{event.date}</time>
                </Link>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
