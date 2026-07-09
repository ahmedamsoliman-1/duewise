import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/errors";
import { requireAdmin } from "@/lib/admin/session";
import { computeStats, listAllUsers } from "@/lib/admin/users";

export async function GET() {
  try {
    await requireAdmin();
    const users = await listAllUsers();
    return NextResponse.json({ data: computeStats(users) });
  } catch (error) {
    return apiError(error);
  }
}
