import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api/errors";
import { requireUser } from "@/lib/auth/server";
import { ensureUserProfile, getUserProfile } from "@/lib/firestore/users";

/** Sync the shallow user profile document with the Firebase Auth record. */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request, { skipMfa: true });
    const profile = await ensureUserProfile(user.uid);
    return NextResponse.json({ data: profile });
  } catch (error) {
    return apiError(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request, { skipMfa: true });
    const profile = await getUserProfile(user.uid);
    return NextResponse.json({ data: profile });
  } catch (error) {
    return apiError(error);
  }
}
