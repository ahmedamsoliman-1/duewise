import { z } from "zod";

const optionalText = z.string().trim().optional().or(z.literal(""));
const optionalUrl = z.string().url().optional().or(z.literal(""));
const optionalFileRef = z.string().trim().optional().or(z.literal(""));
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");
const optionalDate = date.optional().or(z.literal(""));

export const taskSchema = z.object({
  title: z.string().trim().min(1),
  category: z.string().trim().min(1),
  dueDate: date,
  reminderDates: z.array(date).default([]),
  status: z.enum(["upcoming", "due soon", "overdue", "completed"]).default("upcoming"),
  notes: optionalText,
  linkedDocumentId: optionalText,
  linkedInventoryItemId: optionalText,
  familyMemberId: optionalText
});

export const documentSchema = z.object({
  title: z.string().trim().min(1),
  type: z.string().trim().min(1),
  ownerName: z.string().trim().min(1),
  fileUrl: optionalFileRef,
  storagePath: optionalText,
  expiryDate: optionalDate,
  tags: z.preprocess(
    (value) =>
      typeof value === "string"
        ? value
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
        : value,
    z.array(z.string().trim()).default([])
  ),
  notes: optionalText,
  familyMemberId: optionalText
});

export const subscriptionSchema = z.object({
  name: z.string().trim().min(1),
  category: z.string().trim().min(1),
  cost: z.coerce.number().min(0),
  currency: z.string().trim().min(3).max(3).default("USD"),
  billingCycle: z.enum(["monthly", "yearly", "weekly"]).default("monthly"),
  nextBillingDate: date,
  cancellationUrl: optionalUrl,
  status: z.enum(["active", "paused", "cancelled"]).default("active"),
  notes: optionalText
});

export const inventorySchema = z.object({
  name: z.string().trim().min(1),
  category: z.string().trim().min(1),
  purchaseDate: optionalDate,
  purchasePrice: z.coerce.number().min(0).optional().or(z.literal("")),
  currency: z.string().trim().min(3).max(3).default("USD"),
  warrantyExpiryDate: optionalDate,
  receiptDocumentId: optionalText,
  imageUrl: optionalFileRef,
  storagePath: optionalText,
  notes: optionalText
});

export const familySchema = z.object({
  name: z.string().trim().min(1),
  relationship: z.string().trim().min(1),
  dateOfBirth: optionalDate,
  notes: optionalText
});

export const lifeEventSchema = z.object({
  title: z.string().trim().min(1),
  type: z.enum([
    "graduation",
    "work",
    "national service",
    "wedding",
    "birth",
    "death",
    "relocation",
    "medical",
    "property",
    "legal",
    "custom"
  ]),
  date,
  endDate: optionalDate,
  personName: optionalText,
  familyMemberId: optionalText,
  location: optionalText,
  importance: z.enum(["low", "medium", "high", "landmark"]).default("medium"),
  privacy: z.enum(["normal", "sensitive"]).default("normal"),
  notes: optionalText
});

export type TaskInput = z.infer<typeof taskSchema>;
export type DocumentInput = z.infer<typeof documentSchema>;
export type SubscriptionInput = z.infer<typeof subscriptionSchema>;
export type InventoryInput = z.infer<typeof inventorySchema>;
export type FamilyInput = z.infer<typeof familySchema>;
export type LifeEventInput = z.infer<typeof lifeEventSchema>;
