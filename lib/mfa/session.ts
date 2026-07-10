import "server-only";

import { createHmac, timingSafeEqual } from "crypto";
import type { NextRequest, NextResponse } from "next/server";

export const mfaCookieName = "duewise_mfa";
export const trustedDeviceCookieName = "duewise_mfa_trusted";
const sessionTtlMs = 12 * 60 * 60 * 1000;
const trustedDeviceTtlMs = 30 * 24 * 60 * 60 * 1000;

function signingSecret() {
  const secret = process.env.DUEWISE_MFA_SESSION_SECRET ?? process.env.FIREBASE_PRIVATE_KEY ?? process.env.FIREBASE_CLIENT_EMAIL;
  if (!secret) throw new Error("Missing DUEWISE_MFA_SESSION_SECRET or Firebase Admin credentials.");
  return secret.replace(/\\n/g, "\n");
}

function signature(payload: string) {
  return createHmac("sha256", signingSecret()).update(payload).digest("base64url");
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createMfaSessionToken(uid: string, ttlMs = sessionTtlMs) {
  const payload = Buffer.from(JSON.stringify({ uid, exp: Date.now() + ttlMs })).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

export function verifyMfaSessionToken(token: string | undefined, uid: string) {
  if (!token) return false;
  const [payload, tokenSignature] = token.split(".");
  if (!payload || !tokenSignature || !safeEqual(signature(payload), tokenSignature)) return false;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { uid?: string; exp?: number };
    return data.uid === uid && typeof data.exp === "number" && data.exp > Date.now();
  } catch {
    return false;
  }
}

export function hasValidMfaSession(request: NextRequest, uid: string) {
  return (
    verifyMfaSessionToken(request.cookies.get(mfaCookieName)?.value, uid) ||
    verifyMfaSessionToken(request.cookies.get(trustedDeviceCookieName)?.value, uid)
  );
}

export function setMfaSessionCookie(response: NextResponse, uid: string) {
  response.cookies.set(mfaCookieName, createMfaSessionToken(uid), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(sessionTtlMs / 1000)
  });
}

export function setTrustedDeviceCookie(response: NextResponse, uid: string) {
  response.cookies.set(trustedDeviceCookieName, createMfaSessionToken(uid, trustedDeviceTtlMs), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(trustedDeviceTtlMs / 1000)
  });
}

export function clearMfaSessionCookie(response: NextResponse) {
  response.cookies.set(mfaCookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
}

export function clearTrustedDeviceCookie(response: NextResponse) {
  response.cookies.set(trustedDeviceCookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
}
