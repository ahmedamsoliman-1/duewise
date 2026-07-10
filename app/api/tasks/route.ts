import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { makeCrudHandlers } from "@/lib/api/crud";
import { apiError } from "@/lib/api/errors";
import { requireUser } from "@/lib/auth/server";
import { nextOccurrenceDate, shouldCreateNextOccurrence } from "@/lib/dates/recurring";
import { userCollection } from "@/lib/firestore/collections";
import { taskSchema } from "@/lib/validators/schemas";

const handlers = makeCrudHandlers({ collection: "tasks", schema: taskSchema, orderBy: "dueDate" });

async function createNextTaskOccurrence(userId: string, current: Record<string, unknown>) {
  if (typeof current.id !== "string") return;
  if (typeof current.dueDate !== "string" || typeof current.title !== "string") return;
  const recurrenceInterval = typeof current.recurrenceInterval === "string" ? current.recurrenceInterval : "none";
  const recurrenceEndDate = typeof current.recurrenceEndDate === "string" ? current.recurrenceEndDate : undefined;
  if (!shouldCreateNextOccurrence(current.dueDate, recurrenceInterval as any, recurrenceEndDate)) return;

  const nextDueDate = nextOccurrenceDate(current.dueDate, recurrenceInterval as any);
  const ref = await userCollection(userId, "tasks").add({
    ...current,
    title: current.title,
    dueDate: nextDueDate,
    reminderDates: [],
    status: "upcoming",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  });
  await ref.get();
}

async function patchTask(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const body = await request.json();
    const id = z.string().min(1).parse(body.id);
    const payload = taskSchema.partial().parse(body) as Record<string, unknown>;
    const { id: _id, ...rest } = payload;
    const ref = userCollection(user.uid, "tasks").doc(id);
    const currentDoc = await ref.get();
    const currentData = currentDoc.data();
    const nextPayload = { ...rest, updatedAt: FieldValue.serverTimestamp() };
    await ref.update(nextPayload);

    if (currentData?.status !== "completed" && payload.status === "completed") {
      await createNextTaskOccurrence(user.uid, {
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
export const PATCH = patchTask;
export const DELETE = handlers.DELETE;
