import { differenceInCalendarDays, isBefore, parseISO } from "date-fns";
import type { TaskStatus } from "@/types/task";

export function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function calculateTaskStatus(dueDate: string, completed = false): TaskStatus {
  if (completed) return "completed";
  const due = parseISO(dueDate);
  const today = new Date();
  if (isBefore(due, new Date(today.toDateString()))) return "overdue";
  const days = differenceInCalendarDays(due, today);
  return days <= 7 ? "due soon" : "upcoming";
}

export function isWithinDays(date: string | undefined, days: number) {
  if (!date) return false;
  const diff = differenceInCalendarDays(parseISO(date), new Date());
  return diff >= 0 && diff <= days;
}
