import { compareAsc, differenceInCalendarDays, parseISO } from "date-fns";
import { SELF_FAMILY_MEMBER_ID, SELF_FAMILY_MEMBER_LABEL } from "@/lib/family/self";
import type { DuewiseDocument, FamilyMember, InventoryItem, LifeEvent, Subscription, Task } from "@/types";

export type AttentionSeverity = "critical" | "high" | "medium" | "low";

export type AttentionItem = {
  id: string;
  severity: AttentionSeverity;
  score: number;
  title: string;
  reason: string;
  dueDate: string;
  daysUntil: number;
  href: string;
  source: "task" | "document" | "subscription" | "inventory" | "lifeEvent";
  relatedName?: string;
};

type AttentionInput = {
  tasks: Task[];
  documents: DuewiseDocument[];
  subscriptions: Subscription[];
  inventory: InventoryItem[];
  familyMembers: FamilyMember[];
  lifeEvents: LifeEvent[];
};

function daysUntil(date: string, today: Date) {
  return differenceInCalendarDays(parseISO(date), today);
}

function dueLabel(days: number) {
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "due today";
  if (days === 1) return "due tomorrow";
  return `due in ${days}d`;
}

function severityFor(score: number): AttentionSeverity {
  if (score >= 95) return "critical";
  if (score >= 75) return "high";
  if (score >= 45) return "medium";
  return "low";
}

function scoreByWindow(days: number, maxWindow: number, overdueBoost = 0) {
  if (days < 0) return 100 + overdueBoost + Math.min(30, Math.abs(days));
  return Math.max(0, Math.round(((maxWindow - days) / maxWindow) * 70));
}

export function buildAttentionItems(input: AttentionInput, today = new Date()) {
  const normalizedToday = new Date(today.toDateString());
  const familyNames = new Map(input.familyMembers.map((member) => [member.id, member.name]));
  familyNames.set(SELF_FAMILY_MEMBER_ID, SELF_FAMILY_MEMBER_LABEL);
  const documentTitles = new Map(input.documents.map((document) => [document.id, document.title]));

  const items: AttentionItem[] = [];

  input.tasks
    .filter((task) => task.status !== "completed")
    .forEach((task) => {
      const days = daysUntil(task.dueDate, normalizedToday);
      if (days > 14 && task.status !== "overdue" && task.status !== "due soon") return;

      const score = task.status === "overdue" || days < 0 ? 110 + Math.min(25, Math.abs(days)) : 45 + scoreByWindow(days, 14);
      items.push({
        id: `task-${task.id}`,
        severity: severityFor(score),
        score,
        title: task.title,
        reason: `Task ${dueLabel(days)}`,
        dueDate: task.dueDate,
        daysUntil: days,
        href: "/tasks",
        source: "task",
        relatedName: task.familyMemberId ? familyNames.get(task.familyMemberId) : undefined
      });
    });

  input.documents
    .filter((document) => document.expiryDate)
    .forEach((document) => {
      const days = daysUntil(document.expiryDate!, normalizedToday);
      if (days > 60) return;

      const score = 35 + scoreByWindow(days, 60, 10);
      items.push({
        id: `document-${document.id}`,
        severity: severityFor(score),
        score,
        title: document.title,
        reason: `${document.type} expires ${dueLabel(days)}`,
        dueDate: document.expiryDate!,
        daysUntil: days,
        href: "/documents",
        source: "document",
        relatedName: document.familyMemberId ? familyNames.get(document.familyMemberId) : document.ownerName
      });
    });

  input.subscriptions
    .filter((subscription) => subscription.status === "active")
    .forEach((subscription) => {
      const days = daysUntil(subscription.nextBillingDate, normalizedToday);
      if (days > 14) return;

      const score = 30 + scoreByWindow(days, 14);
      items.push({
        id: `subscription-${subscription.id}`,
        severity: severityFor(score),
        score,
        title: subscription.name,
        reason: `${subscription.currency} ${subscription.cost} renewal ${dueLabel(days)}`,
        dueDate: subscription.nextBillingDate,
        daysUntil: days,
        href: "/subscriptions",
        source: "subscription"
      });
    });

  input.inventory
    .filter((item) => item.warrantyExpiryDate)
    .forEach((item) => {
      const days = daysUntil(item.warrantyExpiryDate!, normalizedToday);
      if (days > 45) return;

      const score = 25 + scoreByWindow(days, 45);
      items.push({
        id: `inventory-${item.id}`,
        severity: severityFor(score),
        score,
        title: item.name,
        reason: `Warranty ends ${dueLabel(days)}`,
        dueDate: item.warrantyExpiryDate!,
        daysUntil: days,
        href: "/inventory",
        source: "inventory",
        relatedName: item.receiptDocumentId ? documentTitles.get(item.receiptDocumentId) : undefined
      });
    });

  input.lifeEvents
    .filter((event) => event.importance === "landmark" || event.importance === "high")
    .forEach((event) => {
      const days = daysUntil(event.date, normalizedToday);
      if (days < 0 || days > 90) return;

      const importanceBoost = event.importance === "landmark" ? 20 : 10;
      const score = importanceBoost + scoreByWindow(days, 90);
      items.push({
        id: `lifeEvent-${event.id}`,
        severity: severityFor(score),
        score,
        title: event.title,
        reason: `${event.type} ${dueLabel(days)}`,
        dueDate: event.date,
        daysUntil: days,
        href: "/life-events",
        source: "lifeEvent",
        relatedName: event.familyMemberId ? familyNames.get(event.familyMemberId) : event.personName
      });
    });

  return items
    .sort((a, b) => b.score - a.score || compareAsc(parseISO(a.dueDate), parseISO(b.dueDate)))
    .slice(0, 8);
}
