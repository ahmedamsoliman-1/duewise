export type { DuewiseDocument } from "./document";
export type { FamilyMember } from "./family";
export type { InventoryItem } from "./inventory";
export type { LifeEvent } from "./life-event";
export type { Subscription } from "./subscription";
export type { Task } from "./task";
export type { UserProfile, UserDetail, PlatformStats } from "./user";

export type TimelineEvent = {
  id: string;
  source: "task" | "document" | "subscription" | "inventory" | "lifeEvent";
  title: string;
  date: string;
  endDate?: string;
  label: string;
  href: string;
  importance?: "low" | "medium" | "high" | "landmark";
  personName?: string;
  location?: string;
};
