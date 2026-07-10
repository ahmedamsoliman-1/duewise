import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api/errors";
import { requireUser } from "@/lib/auth/server";
import { adminDb } from "@/lib/firebase/admin";

const preferencesSchema = z.object({
  browserPushEnabled: z.boolean().optional(),
  dailyDigestEnabled: z.boolean().optional()
});

const defaults = {
  browserPushEnabled: false,
  dailyDigestEnabled: true
};

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const doc = await adminDb().collection("users").doc(user.uid).collection("settings").doc("notifications").get();
    return NextResponse.json({ data: { ...defaults, ...(doc.data() ?? {}) } });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const payload = preferencesSchema.parse(await request.json());
    await adminDb()
      .collection("users")
      .doc(user.uid)
      .collection("settings")
      .doc("notifications")
      .set({ ...payload, updatedAt: FieldValue.serverTimestamp() }, { merge: true });

    return NextResponse.json({ data: { ...defaults, ...payload } });
  } catch (error) {
    return apiError(error);
  }
}
