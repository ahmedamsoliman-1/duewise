import { createHash } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api/errors";
import { requireUser } from "@/lib/auth/server";
import { adminDb } from "@/lib/firebase/admin";

const tokenSchema = z.object({
  token: z.string().min(20),
  permission: z.enum(["granted", "denied", "default"]).default("granted")
});

function tokenId(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const { token, permission } = tokenSchema.parse(await request.json());

    await adminDb()
      .collection("users")
      .doc(user.uid)
      .collection("notificationTokens")
      .doc(tokenId(token))
      .set(
        {
          token,
          permission,
          platform: "web",
          enabled: permission === "granted",
          updatedAt: FieldValue.serverTimestamp(),
          createdAt: FieldValue.serverTimestamp()
        },
        { merge: true }
      );

    await adminDb()
      .collection("users")
      .doc(user.uid)
      .collection("settings")
      .doc("notifications")
      .set(
        {
          browserPushEnabled: permission === "granted",
          dailyDigestEnabled: true,
          updatedAt: FieldValue.serverTimestamp()
        },
        { merge: true }
      );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
