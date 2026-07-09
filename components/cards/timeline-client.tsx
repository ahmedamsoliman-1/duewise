"use client";

import {
  Boxes,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileText,
  Milestone,
  Search,
  Sparkles,
  Waypoints
} from "lucide-react";
import {
  addMonths,
  addYears,
  endOfMonth,
  endOfYear,
  format,
  getMonth,
  getYear,
  isBefore,
  isWithinInterval,
  parseISO,
  startOfMonth,
  startOfYear,
  subMonths,
  subYears
} from "date-fns";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api/client";
import type { TimelineEvent } from "@/types";

type ViewMode = "years" | "year" | "month" | "agenda";
type SourceFilter = TimelineEvent["source"] | "all";

const icons = {
  task: CalendarClock,
  document: FileText,
  subscription: CreditCard,
  inventory: Boxes,
  lifeEvent: Milestone
};

const sourceLabels: Record<SourceFilter, string> = {
  all: "All",
  task: "Tasks",
  document: "Documents",
  subscription: "Subscriptions",
  inventory: "Inventory",
  lifeEvent: "Life events"
};

const monthLabels = Array.from({ length: 12 }, (_, index) => format(new Date(2026, index, 1), "MMM"));
const yearWindowRadius = 7;

function eventTime(event: TimelineEvent) {
  return parseISO(event.date).getTime();
}

function eventTone(event: TimelineEvent) {
  if (event.source === "lifeEvent") {
    if (event.importance === "landmark") return "brand" as const;
    if (event.importance === "high") return "warning" as const;
  }
  if (event.source === "task") return "warning" as const;
  return "neutral" as const;
}

function sourceDot(source: TimelineEvent["source"]) {
  if (source === "lifeEvent") return "bg-brand";
  if (source === "task") return "bg-clay";
  if (source === "document") return "bg-sage";
  if (source === "subscription") return "bg-skyglass";
  return "bg-ink/45";
}

function eventMatchesPeriod(event: TimelineEvent, start: Date, end: Date) {
  const date = parseISO(event.date);
  return isWithinInterval(date, { start, end });
}

function EventCard({ event, selected, onSelect }: { event: TimelineEvent; selected?: boolean; onSelect: () => void }) {
  const Icon = icons[event.source];
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group w-full rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-soft ${
        selected ? "border-brand/40 bg-brand-soft" : "border-line bg-surface hover:border-brand/25"
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-panel text-brand">
          <Icon className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-ink">{event.title}</span>
          <span className="mt-1 block text-sm capitalize text-muted">
            {event.source === "lifeEvent" ? "Life event" : event.source} · {event.label}
          </span>
          {(event.personName || event.location) && (
            <span className="mt-2 block text-xs font-medium text-ink/55">
              {[event.personName, event.location].filter(Boolean).join(" · ")}
            </span>
          )}
        </span>
        <Badge tone={eventTone(event)}>{format(parseISO(event.date), "MMM d")}</Badge>
      </div>
    </button>
  );
}

export function TimelineClient() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<ViewMode>("years");
  const [cursor, setCursor] = useState(new Date());
  const [source, setSource] = useState<SourceFilter>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string>("");

  useEffect(() => {
    apiFetch<{ data: TimelineEvent[] }>("/api/timeline")
      .then((response) => setEvents(response.data))
      .catch((nextError) => setError(nextError instanceof Error ? nextError.message : "Could not load timeline."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return events.filter((event) => {
      const sourceMatch = source === "all" || event.source === source;
      const textMatch =
        !needle ||
        [event.title, event.label, event.personName, event.location, event.source].filter(Boolean).join(" ").toLowerCase().includes(needle);
      return sourceMatch && textMatch;
    });
  }, [events, query, source]);

  const period = useMemo(() => {
    if (mode === "month") return { start: startOfMonth(cursor), end: endOfMonth(cursor), label: format(cursor, "MMMM yyyy") };
    if (mode === "year") return { start: startOfYear(cursor), end: endOfYear(cursor), label: format(cursor, "yyyy") };
    if (mode === "years") {
      const center = getYear(cursor);
      return {
        start: startOfYear(new Date(center - yearWindowRadius, 0, 1)),
        end: endOfYear(new Date(center + yearWindowRadius, 0, 1)),
        label: `${center - yearWindowRadius}–${center + yearWindowRadius}`
      };
    }
    return { start: new Date(1900, 0, 1), end: new Date(2200, 11, 31), label: "Agenda" };
  }, [cursor, mode]);

  const visibleEvents = useMemo(() => {
    return filtered
      .filter((event) => mode === "agenda" || mode === "years" || eventMatchesPeriod(event, period.start, period.end))
      .sort((a, b) => eventTime(a) - eventTime(b));
  }, [filtered, mode, period.end, period.start]);

  const selectedEvent = useMemo(
    () => visibleEvents.find((event) => event.id === selectedId) ?? visibleEvents[0],
    [selectedId, visibleEvents]
  );

  function previous() {
    setCursor((current) => (mode === "month" ? subMonths(current, 1) : subYears(current, mode === "years" ? 10 : 1)));
  }

  function next() {
    setCursor((current) => (mode === "month" ? addMonths(current, 1) : addYears(current, mode === "years" ? 10 : 1)));
  }

  function jumpToYear(year: number) {
    setCursor((current) => new Date(year, getMonth(current), 1));
    setMode("year");
  }

  function zoomOut() {
    if (mode === "month") setMode("year");
    else if (mode === "year") setMode("years");
    else if (mode === "agenda") setMode("years");
  }

  const yearOptions = useMemo(() => {
    const activeYear = getYear(cursor);
    return Array.from({ length: yearWindowRadius * 2 + 1 }, (_, index) => {
      const year = activeYear - yearWindowRadius + index;
      const count = filtered.filter((event) => getYear(parseISO(event.date)) === year).length;
      return { year, count };
    });
  }, [cursor, filtered]);

  const eventYears = useMemo(() => {
    const counts = new Map<number, number>();
    filtered.forEach((event) => {
      const year = getYear(parseISO(event.date));
      counts.set(year, (counts.get(year) ?? 0) + 1);
    });
    return [...counts.entries()]
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => a.year - b.year);
  }, [filtered]);

  const yearBuckets = useMemo(() => {
    const year = getYear(cursor);
    return monthLabels.map((label, index) => {
      const monthEvents = visibleEvents.filter((event) => getYear(parseISO(event.date)) === year && getMonth(parseISO(event.date)) === index);
      return { label, index, events: monthEvents };
    });
  }, [cursor, visibleEvents]);

  const monthWindow = useMemo(() => {
    const max = Math.max(visibleEvents.length - 1, 1);
    return visibleEvents.map((event, index) => ({
      event,
      left: `${Math.max(3, Math.min(94, (index / max) * 92 + 4))}%`,
      above: index % 2 === 0
    }));
  }, [visibleEvents]);

  return (
    <div className="mx-auto grid max-w-7xl gap-6">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">Life timeline</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted">
            Browse admin deadlines and major human milestones together, with zoomable year, month, and agenda views.
          </p>
        </div>
        <div className="grid grid-cols-4 gap-2 sm:flex sm:flex-wrap sm:items-center">
          {(["years", "year", "month", "agenda"] as ViewMode[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setMode(item)}
              className={`h-10 rounded-xl px-3 text-sm font-semibold capitalize transition-colors sm:px-4 ${
                mode === item ? "bg-brand text-white" : "border border-line bg-surface text-ink/70 hover:text-ink"
              }`}
            >
              {item === "years" ? "Years" : item}
            </button>
          ))}
        </div>
      </header>

      <Card>
        <div className="grid gap-4 lg:grid-cols-[auto_1fr_auto] lg:items-center">
          <div className="order-2 flex items-center justify-center gap-2 lg:order-1 lg:justify-start">
            {mode !== "agenda" && (
              <>
                <Button variant="secondary" size="icon" onClick={previous} title="Previous period">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="secondary" size="icon" onClick={next} title="Next period">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}
            {mode !== "years" && (
              <Button variant="secondary" onClick={zoomOut}>
                Zoom out
              </Button>
            )}
            <Button variant="ghost" onClick={() => setCursor(new Date())}>
              Today
            </Button>
          </div>
          <div className="order-1 text-center lg:order-2">
            <p className="font-display text-2xl font-bold leading-tight text-ink">{period.label}</p>
            <p className="text-sm text-muted">{visibleEvents.length} visible events</p>
          </div>
          <div className="relative order-3">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input className="pl-10" placeholder="Search timeline" value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
        </div>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {(Object.keys(sourceLabels) as SourceFilter[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setSource(item)}
              className={`h-9 shrink-0 rounded-full border px-3 text-xs font-bold transition-colors ${
                source === item ? "border-brand bg-brand-soft text-brand-strong" : "border-line bg-panel/60 text-ink/65 hover:text-ink"
              }`}
            >
              {sourceLabels[item]}
            </button>
          ))}
        </div>
        {mode === "agenda" && eventYears.length > 0 ? (
          <div className="mt-4 rounded-2xl border border-line bg-panel/35 p-2">
            <div className="mb-2 px-1 text-center text-xs font-bold uppercase tracking-wide text-muted">Years with events</div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {eventYears.map((item) => (
                <button
                  key={item.year}
                  type="button"
                  onClick={() => jumpToYear(item.year)}
                  className="grid min-w-20 shrink-0 place-items-center rounded-xl border border-line bg-surface px-3 py-2 text-ink/75 transition-colors hover:border-brand/30 hover:text-ink"
                >
                  <span className="text-sm font-extrabold">{item.year}</span>
                  <span className="text-[11px] font-semibold text-muted">
                    {item.count} event{item.count === 1 ? "" : "s"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </Card>

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
            Add due dates, expiry dates, subscription renewals, warranty endings, and life events to build your timeline.
          </p>
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <Card className="min-w-0 p-3 sm:p-6">
            {mode === "years" && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
                {yearOptions.map((item) => {
                  const active = getYear(cursor) === item.year;
                  const yearEvents = filtered
                    .filter((event) => getYear(parseISO(event.date)) === item.year)
                    .sort((a, b) => eventTime(a) - eventTime(b));
                  return (
                    <button
                      key={item.year}
                      type="button"
                      onClick={() => jumpToYear(item.year)}
                      className={`min-h-36 rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-soft ${
                        active ? "border-brand/45 bg-brand-soft" : "border-line bg-panel/35 hover:border-brand/30 hover:bg-brand-soft/25"
                      }`}
                    >
                      <span className="flex items-center justify-between gap-3">
                        <span className="font-display text-2xl font-extrabold text-ink">{item.year}</span>
                        <Badge tone={item.count ? "brand" : "neutral"}>{item.count}</Badge>
                      </span>
                      <span className="mt-5 flex min-h-8 flex-wrap gap-1.5">
                        {yearEvents.slice(0, 10).map((event) => (
                          <span key={event.id} className={`h-2.5 w-2.5 rounded-full ${sourceDot(event.source)}`} title={event.title} />
                        ))}
                      </span>
                      {yearEvents[0] ? (
                        <span className="mt-4 block truncate text-sm font-semibold text-ink/75">{yearEvents[0].title}</span>
                      ) : (
                        <span className="mt-4 block text-sm font-medium text-muted">No records yet</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            {mode === "year" && (
              <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 xl:grid-cols-3">
                {yearBuckets.map((bucket) => (
                  <button
                    key={bucket.label}
                    type="button"
                    onClick={() => {
                      setMode("month");
                      setCursor(new Date(getYear(cursor), bucket.index, 1));
                    }}
                    className="min-h-24 rounded-2xl border border-line bg-panel/35 p-3 text-left transition-colors hover:border-brand/30 hover:bg-brand-soft/30 sm:min-h-32 sm:p-4"
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="font-display text-base font-bold text-ink sm:text-lg">{bucket.label}</span>
                      <Badge tone={bucket.events.length ? "brand" : "neutral"}>{bucket.events.length}</Badge>
                    </span>
                    <span className="mt-3 flex min-h-7 flex-wrap gap-1.5 sm:mt-4 sm:min-h-8">
                      {bucket.events.slice(0, 6).map((event) => (
                        <span key={event.id} className={`h-2.5 w-2.5 rounded-full ${sourceDot(event.source)}`} title={event.title} />
                      ))}
                    </span>
                    {bucket.events[0] && (
                      <span className="mt-2 block truncate text-xs font-medium text-ink/70 sm:mt-3 sm:text-sm">
                        {bucket.events[0].title}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {mode === "month" && (
              <div className="grid gap-6">
                <div className="relative hidden min-h-72 rounded-3xl border border-line bg-panel/35 p-6 md:block">
                  <div className="absolute left-8 right-8 top-1/2 h-px bg-line" />
                  {monthWindow.map(({ event, left, above }) => {
                    const Icon = icons[event.source];
                    return (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => setSelectedId(event.id)}
                        className={`absolute w-44 -translate-x-1/2 rounded-2xl border bg-surface p-3 text-left shadow-soft transition-transform hover:-translate-y-1 ${
                          above ? "bottom-1/2 mb-5" : "top-1/2 mt-5"
                        } ${selectedEvent?.id === event.id ? "border-brand/40" : "border-line"}`}
                        style={{ left }}
                      >
                        <span className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted">
                          <Icon className="h-3.5 w-3.5" />
                          {format(parseISO(event.date), "MMM d")}
                        </span>
                        <span className="line-clamp-2 text-sm font-semibold text-ink">{event.title}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="grid gap-3 md:hidden">
                  {visibleEvents.map((event) => (
                    <EventCard key={event.id} event={event} selected={selectedEvent?.id === event.id} onSelect={() => setSelectedId(event.id)} />
                  ))}
                </div>
                {visibleEvents.length === 0 && (
                  <div className="grid place-items-center rounded-3xl border border-line bg-panel/35 py-12 text-center">
                    <p className="font-semibold text-ink">No events in {format(cursor, "MMMM yyyy")}</p>
                    <p className="mt-1 text-sm text-muted">Try another month or change your filters.</p>
                  </div>
                )}
              </div>
            )}

            {mode === "agenda" && (
              <>
              <div className="grid gap-3 md:hidden">
                {visibleEvents.map((event) => (
                  <EventCard key={event.id} event={event} selected={selectedEvent?.id === event.id} onSelect={() => setSelectedId(event.id)} />
                ))}
              </div>
              <ol className="relative hidden gap-2 md:grid">
                <span className="absolute bottom-4 left-[27px] top-4 w-px bg-line" aria-hidden="true" />
                {visibleEvents.map((event) => {
                  const Icon = icons[event.source];
                  const past = isBefore(parseISO(event.date), new Date());
                  return (
                    <li key={event.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(event.id)}
                        className={`group relative grid w-full grid-cols-[auto_1fr_auto] items-center gap-4 rounded-xl p-3 text-left transition-colors hover:bg-brand-soft/40 ${
                          selectedEvent?.id === event.id ? "bg-brand-soft/70" : ""
                        }`}
                      >
                        <span className="relative z-10 grid h-11 w-11 place-items-center rounded-xl bg-brand-soft text-brand ring-4 ring-surface">
                          <Icon className="h-5 w-5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-ink">{event.title}</span>
                          <span className="text-sm capitalize text-muted">
                            {event.source === "lifeEvent" ? "Life event" : event.source} · {event.label}
                          </span>
                        </span>
                        <Badge tone={past ? "neutral" : eventTone(event)}>{format(parseISO(event.date), "MMM d, yyyy")}</Badge>
                      </button>
                    </li>
                  );
                })}
              </ol>
              </>
            )}
          </Card>

          <aside className="xl:sticky xl:top-8 xl:self-start">
            <Card>
              <CardHeader
                title={selectedEvent ? "Event focus" : "Timeline focus"}
                description={selectedEvent ? format(parseISO(selectedEvent.date), "EEEE, MMMM d, yyyy") : "Select an event to inspect it."}
              />
              {selectedEvent ? (
                <div className="grid gap-4">
                  <div className="rounded-3xl border border-line bg-panel/40 p-4">
                    <div className="mb-4 flex items-center gap-3">
                      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-soft text-brand">
                        {selectedEvent.source === "lifeEvent" ? <Sparkles className="h-6 w-6" /> : <Waypoints className="h-6 w-6" />}
                      </span>
                      <div className="min-w-0">
                        <h2 className="truncate font-display text-xl font-bold text-ink">{selectedEvent.title}</h2>
                        <p className="text-sm capitalize text-muted">
                          {selectedEvent.source === "lifeEvent" ? "Life event" : selectedEvent.source} · {selectedEvent.label}
                        </p>
                      </div>
                    </div>
                    <dl className="grid gap-2 text-sm">
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted">Date</dt>
                        <dd className="font-semibold text-ink">{format(parseISO(selectedEvent.date), "MMM d, yyyy")}</dd>
                      </div>
                      {selectedEvent.endDate && (
                        <div className="flex justify-between gap-3">
                          <dt className="text-muted">End</dt>
                          <dd className="font-semibold text-ink">{format(parseISO(selectedEvent.endDate), "MMM d, yyyy")}</dd>
                        </div>
                      )}
                      {selectedEvent.personName && (
                        <div className="flex justify-between gap-3">
                          <dt className="text-muted">Person</dt>
                          <dd className="font-semibold text-ink">{selectedEvent.personName}</dd>
                        </div>
                      )}
                      {selectedEvent.location && (
                        <div className="flex justify-between gap-3">
                          <dt className="text-muted">Location</dt>
                          <dd className="font-semibold text-ink">{selectedEvent.location}</dd>
                        </div>
                      )}
                    </dl>
                  </div>
                  <Link href={selectedEvent.href}>
                    <Button className="w-full">Open source record</Button>
                  </Link>
                </div>
              ) : (
                <p className="text-sm text-muted">No events match this view yet.</p>
              )}
            </Card>
          </aside>
        </div>
      )}
    </div>
  );
}
