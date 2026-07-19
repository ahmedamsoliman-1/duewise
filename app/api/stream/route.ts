import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api/errors";
import { requireUser } from "@/lib/auth/server";
import { adminStorage } from "@/lib/firebase/admin";
import { userCollection } from "@/lib/firestore/collections";
import { storageBucketName } from "@/lib/storage/bucket";
import { streamItemSchema } from "@/lib/validators/schemas";

function serialize(id: string, data: FirebaseFirestore.DocumentData) {
  return {
    id,
    ...data,
    createdAt: data.createdAt?.toDate?.().toISOString?.() ?? data.createdAt,
    updatedAt: data.updatedAt?.toDate?.().toISOString?.() ?? data.updatedAt
  };
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const snapshot = await userCollection(user.uid, "streamItems").orderBy("createdAt", "desc").limit(200).get();
    return NextResponse.json({ data: snapshot.docs.map((doc) => serialize(doc.id, doc.data())) });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const payload = streamItemSchema.parse(await request.json());
    const ref = await userCollection(user.uid, "streamItems").add({
      ...payload,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
    const item = await ref.get();
    return NextResponse.json({ data: serialize(item.id, item.data() ?? {}) }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const id = z.string().min(1).parse(new URL(request.url).searchParams.get("id"));
    const ref = userCollection(user.uid, "streamItems").doc(id);
    const snapshot = await ref.get();
    const storagePath = snapshot.data()?.storagePath;
    await ref.delete();
    if (typeof storagePath === "string" && storagePath.startsWith(`users/${user.uid}/stream/`)) {
      const bucketName = storageBucketName();
      if (bucketName) {
        await adminStorage().bucket(bucketName).file(storagePath).delete({ ignoreNotFound: true }).catch((error) => {
          console.warn("Could not clean up deleted Stream attachment:", error);
        });
      }
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
