import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/server";
import { apiError } from "@/lib/api/errors";
import { userCollection } from "@/lib/firestore/collections";
import { familySchema } from "@/lib/validators/schemas";
import { initRedis, getOrSet, invalidate } from "@/lib/redis/client";

// Initialize Redis on module load (non-blocking)
initRedis().catch(err => {
  console.warn('[Redis] Initialization warning:', err.message);
});

function clean(value: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== "" && item !== undefined));
}

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
    
    const data = await getOrSet(
      `family:${user.uid}`,
      async () => {
        const snapshot = await userCollection(user.uid, 'familyMembers').orderBy('name', 'asc').get();
        return snapshot.docs.map((doc) => serialize(doc.id, doc.data()));
      },
      86400 // Cache for 24 hours
    );
    
    return NextResponse.json({ data });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const payload = clean(familySchema.parse(await request.json()));
    
    const ref = await userCollection(user.uid, 'familyMembers').add({
      ...payload,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
    
    const doc = await ref.get();
    
    // Invalidate cache
    await invalidate(`family:${user.uid}`);
    
    return NextResponse.json({ data: serialize(doc.id, doc.data() ?? {}) }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const body = await request.json();
    const id = z.string().min(1).parse(body.id);
    const payload = clean(familySchema.partial().parse(body));
    delete payload.id;
    
    const ref = userCollection(user.uid, 'familyMembers').doc(id);
    await ref.update({ ...payload, updatedAt: FieldValue.serverTimestamp() });
    
    const doc = await ref.get();
    
    // Invalidate cache
    await invalidate(`family:${user.uid}`);
    
    return NextResponse.json({ data: serialize(doc.id, doc.data() ?? {}) });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const id = z.string().min(1).parse(new URL(request.url).searchParams.get("id"));
    
    await userCollection(user.uid, 'familyMembers').doc(id).delete();
    
    // Invalidate cache
    await invalidate(`family:${user.uid}`);
    
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
