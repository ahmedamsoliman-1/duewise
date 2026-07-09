import { compareAsc, parseISO } from "date-fns";
import type { DuewiseDocument, InventoryItem, LifeEvent, Subscription, Task, TimelineEvent } from "@/types";

export function buildTimelineEvents(input: {
  tasks: Task[];
  documents: DuewiseDocument[];
  subscriptions: Subscription[];
  inventory: InventoryItem[];
  lifeEvents?: LifeEvent[];
}) {
  const events: TimelineEvent[] = [
    ...input.tasks
      .filter((task) => task.status !== "completed")
      .map((task) => ({
        id: `task-${task.id}`,
        source: "task" as const,
        title: task.title,
        date: task.dueDate,
        label: task.category,
        href: "/tasks"
      })),
    ...input.documents
      .filter((doc) => doc.expiryDate)
      .map((doc) => ({
        id: `document-${doc.id}`,
        source: "document" as const,
        title: `${doc.title} expires`,
        date: doc.expiryDate!,
        label: doc.type,
        href: "/documents"
      })),
    ...input.subscriptions
      .filter((sub) => sub.status === "active")
      .map((sub) => ({
        id: `subscription-${sub.id}`,
        source: "subscription" as const,
        title: `${sub.name} renewal`,
        date: sub.nextBillingDate,
        label: sub.category,
        href: "/subscriptions"
      })),
    ...input.inventory
      .filter((item) => item.warrantyExpiryDate)
      .map((item) => ({
        id: `inventory-${item.id}`,
        source: "inventory" as const,
        title: `${item.name} warranty ends`,
        date: item.warrantyExpiryDate!,
        label: item.category,
        href: "/inventory"
      })),
    ...(input.lifeEvents ?? []).map((event) => ({
      id: `lifeEvent-${event.id}`,
      source: "lifeEvent" as const,
      title: event.title,
      date: event.date,
      endDate: event.endDate,
      label: event.type,
      href: "/life-events",
      importance: event.importance,
      personName: event.personName,
      location: event.location
    }))
  ];

  return events.sort((a, b) => compareAsc(parseISO(a.date), parseISO(b.date)));
}

export function monthlySpend(subscriptions: Subscription[]) {
  return subscriptions
    .filter((sub) => sub.status === "active")
    .reduce((total, sub) => {
      if (sub.billingCycle === "yearly") return total + sub.cost / 12;
      if (sub.billingCycle === "weekly") return total + sub.cost * 4.345;
      return total + sub.cost;
    }, 0);
}
