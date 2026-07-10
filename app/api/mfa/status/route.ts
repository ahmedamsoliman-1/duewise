import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api/errors";
import { requireUser } from "@/lib/auth/server";
import { getUserMfaState } from "@/lib/firestore/users";
import { hasValidMfaSession } from "@/lib/mfa/session";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request, { skipMfa: true });
    const state = await getUserMfaState(user.uid);
    return NextResponse.json({
      data: {
        enabled: state.enabled,
        verified: !state.enabled || hasValidMfaSession(request, user.uid)
      }
    });
  } catch (error) {
    return apiError(error);
  }
}
