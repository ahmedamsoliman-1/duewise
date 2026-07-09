import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api/errors";
import { requireUser } from "@/lib/auth/server";
import { readUserCollection } from "@/lib/firestore/readers";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const [tasks, documents, subscriptions, inventory, familyMembers, lifeEvents] = await Promise.all([
      readUserCollection(user.uid, "tasks"),
      readUserCollection(user.uid, "documents"),
      readUserCollection(user.uid, "subscriptions"),
      readUserCollection(user.uid, "inventory"),
      readUserCollection(user.uid, "familyMembers"),
      readUserCollection(user.uid, "lifeEvents")
    ]);

    return NextResponse.json({
      exportedAt: new Date().toISOString(),
      userId: user.uid,
      data: { tasks, documents, subscriptions, inventory, familyMembers, lifeEvents }
    });
  } catch (error) {
    return apiError(error);
  }
}
