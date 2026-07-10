import { NextResponse } from "next/server";
import { clearMfaSessionCookie } from "@/lib/mfa/session";

export async function DELETE() {
  const response = NextResponse.json({ data: { cleared: true } });
  clearMfaSessionCookie(response);
  return response;
}
