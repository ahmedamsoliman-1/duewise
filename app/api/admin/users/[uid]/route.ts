import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api/errors";
import { requireAdmin } from "@/lib/admin/session";
import { deleteUserCompletely, getUserDetailForAdmin, setUserDisabled } from "@/lib/admin/users";

type Context = { params: Promise<{ uid: string }> };

const patchSchema = z.object({ disabled: z.boolean() });

export async function GET(_request: NextRequest, { params }: Context) {
  try {
    await requireAdmin();
    const { uid } = await params;
    const detail = await getUserDetailForAdmin(uid);
    return NextResponse.json({ data: detail });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: Context) {
  try {
    await requireAdmin();
    const { uid } = await params;
    const { disabled } = patchSchema.parse(await request.json());
    const profile = await setUserDisabled(uid, disabled);
    return NextResponse.json({ data: profile });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: Context) {
  try {
    await requireAdmin();
    const { uid } = await params;
    await deleteUserCompletely(uid);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
