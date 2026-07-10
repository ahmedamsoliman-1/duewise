import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api/errors";
import { requireUser } from "@/lib/auth/server";
import { enableTotpMfa, getUserMfaState } from "@/lib/firestore/users";
import { setMfaSessionCookie, setTrustedDeviceCookie } from "@/lib/mfa/session";
import { verifyTotpCode } from "@/lib/mfa/totp";

const schema = z.object({
  code: z.string().min(6),
  rememberDevice: z.boolean().optional()
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request, { skipMfa: true });
    const { code, rememberDevice } = schema.parse(await request.json());
    const state = await getUserMfaState(user.uid);
    const secret = state.pendingSecret ?? state.secret;

    if (!secret || !verifyTotpCode(secret, code)) {
      throw Object.assign(new Error("That code didn't match. Check your authenticator app and try again."), { status: 401 });
    }

    if (!state.enabled) await enableTotpMfa(user.uid, secret);

    const response = NextResponse.json({ data: { verified: true, enabled: true } });
    setMfaSessionCookie(response, user.uid);
    if (rememberDevice) setTrustedDeviceCookie(response, user.uid);
    return response;
  } catch (error) {
    return apiError(error);
  }
}
