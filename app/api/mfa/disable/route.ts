import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api/errors";
import { requireUser } from "@/lib/auth/server";
import { disableTotpMfa, getUserMfaState } from "@/lib/firestore/users";
import { clearMfaSessionCookie, clearTrustedDeviceCookie } from "@/lib/mfa/session";
import { verifyTotpCode } from "@/lib/mfa/totp";

const schema = z.object({
  code: z.string().min(6)
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request, { skipMfa: true });
    const { code } = schema.parse(await request.json());
    const state = await getUserMfaState(user.uid);

    if (!state.enabled || !state.secret) {
      throw Object.assign(new Error("Two-factor authentication is not enabled."), { status: 400 });
    }

    if (!verifyTotpCode(state.secret, code)) {
      throw Object.assign(new Error("That code didn't match. Check your authenticator app and try again."), { status: 401 });
    }

    await disableTotpMfa(user.uid);
    const response = NextResponse.json({ data: { enabled: false } });
    clearMfaSessionCookie(response);
    clearTrustedDeviceCookie(response);
    return response;
  } catch (error) {
    return apiError(error);
  }
}
