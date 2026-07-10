import { NextRequest, NextResponse } from "next/server";
import { isBefore, isSameMonth, parseISO } from "date-fns";
import { apiError } from "@/lib/api/errors";
import { requireUser } from "@/lib/auth/server";
import { buildAttentionItems } from "@/lib/dates/attention";
import { isWithinDays } from "@/lib/dates/status";
import { buildTimelineEvents, monthlySpend } from "@/lib/dates/timeline";
import { readUserCollection } from "@/lib/firestore/readers";
import type { DuewiseDocument, FamilyMember, InventoryItem, LifeEvent, Subscription, Task } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const [tasks, documents, subscriptions, inventory, familyMembers, lifeEvents] = await Promise.all([
      readUserCollection<Task>(user.uid, "tasks"),
      readUserCollection<DuewiseDocument>(user.uid, "documents"),
      readUserCollection<Subscription>(user.uid, "subscriptions"),
      readUserCollection<InventoryItem>(user.uid, "inventory"),
      readUserCollection<FamilyMember>(user.uid, "familyMembers"),
      readUserCollection<LifeEvent>(user.uid, "lifeEvents")
    ]);

    const today = new Date();
    const events = buildTimelineEvents({ tasks, documents, subscriptions, inventory, lifeEvents });
    const upcomingDeadlines = events.filter((event) => !isBefore(parseISO(event.date), today)).slice(0, 6);
    const overdueTasks = tasks.filter((task) => task.status === "overdue");
    const documentsExpiringSoon = documents.filter((doc) => isWithinDays(doc.expiryDate, 60));
    const renewalsThisMonth = subscriptions.filter((sub) => isSameMonth(parseISO(sub.nextBillingDate), today));
    const recentDocuments = documents.slice(-5).reverse();

    return NextResponse.json({
      data: {
        upcomingDeadlines,
        attentionItems: buildAttentionItems({ tasks, documents, subscriptions, inventory, familyMembers, lifeEvents }),
        overdueTasks,
        documentsExpiringSoon,
        renewalsThisMonth,
        monthlySpend: monthlySpend(subscriptions),
        recentDocuments,
        counts: {
          tasks: tasks.length,
          documents: documents.length,
          subscriptions: subscriptions.length,
          inventory: inventory.length,
          lifeEvents: lifeEvents.length
        }
      }
    });
  } catch (error) {
    return apiError(error);
  }
}
