import "server-only";

import { adminDb } from "@/lib/firebase/admin";

export type CollectionName = "tasks" | "documents" | "subscriptions" | "inventory" | "familyMembers";

export function userCollection(userId: string, collection: CollectionName) {
  return adminDb().collection("users").doc(userId).collection(collection);
}
