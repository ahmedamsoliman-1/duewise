import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/errors";
import { destroyAdminSession } from "@/lib/admin/session";

export async function POST() {
  try {
    await destroyAdminSession();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
