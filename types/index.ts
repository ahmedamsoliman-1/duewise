export type { DuewiseDocument } from "./document";
export type { FamilyMember } from "./family";
export type { InventoryItem } from "./inventory";
export type { Subscription } from "./subscription";
export type { Task } from "./task";

export type TimelineEvent = {
  id: string;
  source: "task" | "document" | "subscription" | "inventory";
  title: string;
  date: string;
  label: string;
  href: string;
};
