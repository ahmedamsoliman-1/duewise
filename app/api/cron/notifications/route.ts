import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildAttentionItems } from "@/lib/dates/attention";
import { adminDb, adminMessaging } from "@/lib/firebase/admin";
import { readUserCollection } from "@/lib/firestore/readers";
import type { DuewiseDocument, FamilyMember, InventoryItem, LifeEvent, Subscription, Task } from "@/types";

type NotificationToken = {
  token: string;
  enabled?: boolean;
};

type NotificationSettings = {
  browserPushEnabled?: boolean;
  dailyDigestEnabled?: boolean;
};

const cronBodySchema = z.object({
  secret: z.string().optional()
});

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

async function cronSecretFromRequest(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const bearerSecret = auth?.startsWith("Bearer ") ? auth.slice("Bearer ".length) : undefined;
  const headerSecret = request.headers.get("x-cron-secret") ?? undefined;
  const urlSecret = new URL(request.url).searchParams.get("secret") ?? undefined;
  const bodySecret =
    request.method === "POST"
      ? cronBodySchema.safeParse(await request.json().catch(() => ({}))).data?.secret
      : undefined;

  return bearerSecret ?? headerSecret ?? urlSecret ?? bodySecret;
}

async function authorizeCron(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return { ok: false, status: 500, error: "CRON_SECRET is not configured on the server." };
  }

  const provided = await cronSecretFromRequest(request);
  if (!provided) {
    return {
      ok: false,
      status: 401,
      error: "Missing cron secret. Use ?secret=..., Authorization: Bearer ..., X-Cron-Secret, or POST JSON body."
    };
  }

  if (provided !== secret) {
    return { ok: false, status: 401, error: "Invalid cron secret." };
  }

  return { ok: true };
}

async function userAttention(uid: string) {
  const [tasks, documents, subscriptions, inventory, familyMembers, lifeEvents] = await Promise.all([
    readUserCollection<Task>(uid, "tasks"),
    readUserCollection<DuewiseDocument>(uid, "documents"),
    readUserCollection<Subscription>(uid, "subscriptions"),
    readUserCollection<InventoryItem>(uid, "inventory"),
    readUserCollection<FamilyMember>(uid, "familyMembers"),
    readUserCollection<LifeEvent>(uid, "lifeEvents")
  ]);

  return buildAttentionItems({ tasks, documents, subscriptions, inventory, familyMembers, lifeEvents }).filter(
    (item) => item.severity === "critical" || item.severity === "high" || item.daysUntil <= 7
  );
}

async function runNotifications() {
  const day = todayKey();
  const users = await adminDb().collection("users").get();
  let checked = 0;
  let sent = 0;
  let skipped = 0;

  for (const userDoc of users.docs) {
    checked += 1;
    const uid = userDoc.id;
    const settingsDoc = await adminDb().collection("users").doc(uid).collection("settings").doc("notifications").get();
    const settings = (settingsDoc.data() ?? {}) as NotificationSettings;
    if (settings.browserPushEnabled === false || settings.dailyDigestEnabled === false) {
      skipped += 1;
      continue;
    }

    const deliveryRef = adminDb().collection("users").doc(uid).collection("notificationDeliveries").doc(`daily-${day}`);
    if ((await deliveryRef.get()).exists) {
      skipped += 1;
      continue;
    }

    const attention = await userAttention(uid);
    if (attention.length === 0) {
      skipped += 1;
      continue;
    }

    const tokensSnapshot = await adminDb()
      .collection("users")
      .doc(uid)
      .collection("notificationTokens")
      .where("enabled", "==", true)
      .get();
    const tokens = tokensSnapshot.docs.map((doc) => doc.data() as NotificationToken).filter((item) => item.token);
    if (tokens.length === 0) {
      skipped += 1;
      continue;
    }

    const top = attention[0];
    const result = await adminMessaging().sendEachForMulticast({
      tokens: tokens.map((item) => item.token),
      notification: {
        title: `${attention.length} Duewise item${attention.length === 1 ? "" : "s"} need attention`,
        body: `${top.title}: ${top.reason}`
      },
      data: {
        url: top.href,
        attentionCount: String(attention.length)
      }
    });

    await deliveryRef.set({
      date: day,
      attentionCount: attention.length,
      successCount: result.successCount,
      failureCount: result.failureCount,
      createdAt: FieldValue.serverTimestamp()
    });

    sent += result.successCount;
  }

  return NextResponse.json({ ok: true, checked, sent, skipped });
}

export async function GET(request: NextRequest) {
  const auth = await authorizeCron(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  return runNotifications();
}

export async function POST(request: NextRequest) {
  const auth = await authorizeCron(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  return runNotifications();
}
