export type TaskStatus = "upcoming" | "due soon" | "overdue" | "completed";

export type Task = {
  id: string;
  title: string;
  category: string;
  dueDate: string;
  reminderDates: string[];
  status: TaskStatus;
  notes?: string;
  linkedDocumentId?: string;
  linkedInventoryItemId?: string;
  familyMemberId?: string;
  createdAt: string;
  updatedAt: string;
};
