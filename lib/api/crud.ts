import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/server";
import { apiError } from "@/lib/api/errors";
import { CollectionName, userCollection } from "@/lib/firestore/collections";

type CrudOptions<T extends z.AnyZodObject> = {
  collection: CollectionName;
  schema: T;
  orderBy?: string;
};

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

export function makeCrudHandlers<T extends z.AnyZodObject>({ collection, schema, orderBy = "createdAt" }: CrudOptions<T>) {
  return {
    async GET(request: NextRequest) {
      try {
        const user = await requireUser(request);
        const snapshot = await userCollection(user.uid, collection).orderBy(orderBy, "asc").get();
        return NextResponse.json({ data: snapshot.docs.map((doc) => serialize(doc.id, doc.data())) });
      } catch (error) {
        return apiError(error);
      }
    },

    async POST(request: NextRequest) {
      try {
        const user = await requireUser(request);
        const payload = clean(schema.parse(await request.json()));
        const ref = await userCollection(user.uid, collection).add({
          ...payload,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        });
        const doc = await ref.get();
        return NextResponse.json({ data: serialize(doc.id, doc.data() ?? {}) }, { status: 201 });
      } catch (error) {
        return apiError(error);
      }
    },

    async PATCH(request: NextRequest) {
      try {
        const user = await requireUser(request);
        const body = await request.json();
        const id = z.string().min(1).parse(body.id);
        const payload = clean(schema.partial().parse(body));
        delete payload.id;
        const ref = userCollection(user.uid, collection).doc(id);
        await ref.update({ ...payload, updatedAt: FieldValue.serverTimestamp() });
        const doc = await ref.get();
        return NextResponse.json({ data: serialize(doc.id, doc.data() ?? {}) });
      } catch (error) {
        return apiError(error);
      }
    },

    async DELETE(request: NextRequest) {
      try {
        const user = await requireUser(request);
        const id = z.string().min(1).parse(new URL(request.url).searchParams.get("id"));
        await userCollection(user.uid, collection).doc(id).delete();
        return NextResponse.json({ ok: true });
      } catch (error) {
        return apiError(error);
      }
    }
  };
}
