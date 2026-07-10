import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { apiError } from "@/lib/api/errors";
import { requireUser } from "@/lib/auth/server";
import { setPendingTotpSecret } from "@/lib/firestore/users";
import { generateTotpSecret, otpauthUrl } from "@/lib/mfa/totp";

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request, { skipMfa: true });
    const secret = generateTotpSecret();
    const account = user.email ?? user.uid;
    const url = otpauthUrl({ issuer: "Duewise", account, secret });
    const qrDataUrl = await QRCode.toDataURL(url, {
      margin: 1,
      width: 240,
      color: { dark: "#1C1712", light: "#FFFFFF" }
    });

    await setPendingTotpSecret(user.uid, secret);
    return NextResponse.json({ data: { secret, otpauthUrl: url, qrDataUrl } });
  } catch (error) {
    return apiError(error);
  }
}
