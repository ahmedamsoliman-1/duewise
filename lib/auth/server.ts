import "server-only";

import { NextRequest } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";

export async function requireUser(request: NextRequest) {
  const header = request.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

  if (!token) {
    throw Object.assign(new Error("Missing auth token."), { status: 401 });
  }

  try {
    return await adminAuth().verifyIdToken(token);
  } catch {
    throw Object.assign(new Error("Invalid auth token."), { status: 401 });
  }
}
