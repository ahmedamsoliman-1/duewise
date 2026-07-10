import { addMonths, addWeeks, addYears, format, isBefore, parseISO } from "date-fns";

export type RecurrenceInterval = "none" | "weekly" | "monthly" | "yearly";

function toDate(value: string) {
  return parseISO(value);
}

function formatDate(value: Date) {
  return format(value, "yyyy-MM-dd");
}

export function nextOccurrenceDate(currentDate: string, interval: RecurrenceInterval) {
  const date = toDate(currentDate);
  switch (interval) {
    case "weekly":
      return formatDate(addWeeks(date, 1));
    case "monthly":
      return formatDate(addMonths(date, 1));
    case "yearly":
      return formatDate(addYears(date, 1));
    default:
      return currentDate;
  }
}

export function advanceDate(currentDate: string, interval: RecurrenceInterval, referenceDate: string) {
  const next = nextOccurrenceDate(currentDate, interval);
  const reference = toDate(referenceDate);
  const current = toDate(currentDate);
  if (interval === "none") return currentDate;
  if (reference.getTime() >= current.getTime()) {
    return next;
  }
  return next;
}

export function shouldCreateNextOccurrence(currentDate: string, interval: RecurrenceInterval, recurrenceEndDate?: string) {
  if (interval === "none") return false;
  if (!recurrenceEndDate) return true;
  const endDate = toDate(recurrenceEndDate);
  const current = toDate(currentDate);
  return !isBefore(endDate, current);
}
