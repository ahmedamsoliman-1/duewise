import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api/errors";
import { requireUser } from "@/lib/auth/server";
import { buildTimelineEvents } from "@/lib/dates/timeline";
import { readUserCollection } from "@/lib/firestore/readers";
import type { DuewiseDocument, InventoryItem, Subscription, Task } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const [tasks, documents, subscriptions, inventory] = await Promise.all([
      readUserCollection<Task>(user.uid, "tasks"),
      readUserCollection<DuewiseDocument>(user.uid, "documents"),
      readUserCollection<Subscription>(user.uid, "subscriptions"),
      readUserCollection<InventoryItem>(user.uid, "inventory")
    ]);

    return NextResponse.json({ data: buildTimelineEvents({ tasks, documents, subscriptions, inventory }) });
  } catch (error) {
    return apiError(error);
  }
}
