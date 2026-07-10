import "server-only";

import { NextRequest } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { getUserMfaState } from "@/lib/firestore/users";
import { hasValidMfaSession } from "@/lib/mfa/session";

type RequireUserOptions = {
  skipMfa?: boolean;
};

export async function requireUser(request: NextRequest, options: RequireUserOptions = {}) {
  const header = request.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

  if (!token) {
    throw Object.assign(new Error("Missing auth token."), { status: 401 });
  }

  let user;
  try {
    user = await adminAuth().verifyIdToken(token);
  } catch {
    throw Object.assign(new Error("Invalid auth token."), { status: 401 });
  }

  if (!options.skipMfa) {
    const mfa = await getUserMfaState(user.uid);
    if (mfa.enabled && !hasValidMfaSession(request, user.uid)) {
      throw Object.assign(new Error("Two-factor verification required."), { status: 403, code: "mfa-required" });
    }
  }

  return user;
}
