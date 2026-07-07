import "server-only";

import { CollectionName, userCollection } from "@/lib/firestore/collections";

export async function readUserCollection<T>(userId: string, collection: CollectionName) {
  const snapshot = await userCollection(userId, collection).get();
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.().toISOString?.() ?? data.createdAt,
      updatedAt: data.updatedAt?.toDate?.().toISOString?.() ?? data.updatedAt
    } as T;
  });
}
