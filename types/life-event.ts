export type LifeEventType =
  | "graduation"
  | "work"
  | "national service"
  | "wedding"
  | "birth"
  | "death"
  | "relocation"
  | "medical"
  | "property"
  | "legal"
  | "custom";

export type LifeEventImportance = "low" | "medium" | "high" | "landmark";

export type LifeEvent = {
  id: string;
  title: string;
  type: LifeEventType;
  date: string;
  endDate?: string;
  personName?: string;
  familyMemberId?: string;
  location?: string;
  importance: LifeEventImportance;
  privacy: "normal" | "sensitive";
  notes?: string;
  createdAt: string;
  updatedAt: string;
};
