import "server-only";

import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/server";
import { ADMIN_EMAIL } from "@/lib/admin/constants";

export async function requireAdmin(request: NextRequest) {
  const user = await requireUser(request);
  if (user.email?.toLowerCase() !== ADMIN_EMAIL) {
    throw Object.assign(new Error("Admin authorization required."), { status: 403 });
  }
  return user;
}
