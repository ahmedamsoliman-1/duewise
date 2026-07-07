import { subDays } from "date-fns";
import { toIsoDate } from "@/lib/dates/status";

const OFFSETS = [90, 60, 30, 7, 1, 0];

export function buildReminderDates(date: string) {
  const base = new Date(`${date}T12:00:00`);
  return OFFSETS.map((days) => toIsoDate(subDays(base, days)));
}
