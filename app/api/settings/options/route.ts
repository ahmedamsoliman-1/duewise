import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api/errors";
import { requireUser } from "@/lib/auth/server";
import { adminDb } from "@/lib/firebase/admin";
import { defaultWorkspaceOptions, normalizeOptionList, type WorkspaceOptions } from "@/lib/options/defaults";

const optionListSchema = z.array(z.string().trim().min(1)).optional();
const optionsSchema = z.object({
  taskCategories: optionListSchema,
  documentTypes: optionListSchema,
  subscriptionCategories: optionListSchema,
  inventoryCategories: optionListSchema
});

function mergeOptions(data?: FirebaseFirestore.DocumentData | null): WorkspaceOptions {
  return {
    taskCategories: normalizeOptionList(data?.taskCategories, defaultWorkspaceOptions.taskCategories),
    documentTypes: normalizeOptionList(data?.documentTypes, defaultWorkspaceOptions.documentTypes),
    subscriptionCategories: normalizeOptionList(data?.subscriptionCategories, defaultWorkspaceOptions.subscriptionCategories),
    inventoryCategories: normalizeOptionList(data?.inventoryCategories, defaultWorkspaceOptions.inventoryCategories)
  };
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const doc = await adminDb().collection("users").doc(user.uid).collection("settings").doc("options").get();
    return NextResponse.json({ data: mergeOptions(doc.data()) });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const payload = optionsSchema.parse(await request.json());
    const next = mergeOptions({ ...defaultWorkspaceOptions, ...payload });
    await adminDb()
      .collection("users")
      .doc(user.uid)
      .collection("settings")
      .doc("options")
      .set({ ...next, updatedAt: FieldValue.serverTimestamp() }, { merge: true });

    return NextResponse.json({ data: next });
  } catch (error) {
    return apiError(error);
  }
}
