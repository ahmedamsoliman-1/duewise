import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { makeCrudHandlers } from "@/lib/api/crud";
import { apiError } from "@/lib/api/errors";
import { requireUser } from "@/lib/auth/server";
import { nextOccurrenceDate, shouldCreateNextOccurrence } from "@/lib/dates/recurring";
import { userCollection } from "@/lib/firestore/collections";
import { subscriptionSchema } from "@/lib/validators/schemas";

const handlers = makeCrudHandlers({ collection: "subscriptions", schema: subscriptionSchema, orderBy: "nextBillingDate" });

async function createNextSubscriptionOccurrence(userId: string, current: Record<string, unknown>) {
  if (typeof current.id !== "string") return;
  if (typeof current.nextBillingDate !== "string" || typeof current.name !== "string") return;
  const recurrenceInterval = typeof current.recurrenceInterval === "string" ? current.recurrenceInterval : "none";
  const recurrenceEndDate = typeof current.recurrenceEndDate === "string" ? current.recurrenceEndDate : undefined;
  if (!shouldCreateNextOccurrence(current.nextBillingDate, recurrenceInterval as any, recurrenceEndDate)) return;

  const nextBillingDate = nextOccurrenceDate(current.nextBillingDate, recurrenceInterval as any);
  const ref = await userCollection(userId, "subscriptions").add({
    ...current,
    name: current.name,
    nextBillingDate,
    status: "active",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  });
  await ref.get();
}

async function patchSubscription(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const body = await request.json();
    const id = z.string().min(1).parse(body.id);
    const payload = subscriptionSchema.partial().parse(body) as Record<string, unknown>;
    const { id: _id, ...rest } = payload;
    const ref = userCollection(user.uid, "subscriptions").doc(id);
    const currentDoc = await ref.get();
    const currentData = currentDoc.data();
    const nextPayload = { ...rest, updatedAt: FieldValue.serverTimestamp() };
    await ref.update(nextPayload);

    if (currentData?.status !== "cancelled" && payload.status === "cancelled") {
      await createNextSubscriptionOccurrence(user.uid, {
        ...(currentData ?? {}),
        ...nextPayload,
        id
      });
    }

    const updatedDoc = await ref.get();
    return NextResponse.json({ data: { id, ...updatedDoc.data() } });
  } catch (error) {
    return apiError(error);
  }
}

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PATCH = patchSubscription;
export const DELETE = handlers.DELETE;
