import "server-only";

import crypto from "crypto";
import { cookies } from "next/headers";

const COOKIE = "dw_admin";
const MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours

type AdminSession = { sub: "admin"; iat: number; exp: number };

function unauthorized(message: string) {
  return Object.assign(new Error(message), { status: 401 });
}

/** Admin panel is only available when fully configured via environment variables. */
export function adminConfigured(): boolean {
  return Boolean(process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD && process.env.ADMIN_SESSION_SECRET);
}

function sessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw Object.assign(new Error("Admin panel is not configured."), { status: 503 });
  return secret;
}

/** Constant-time string comparison that never short-circuits on length. */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  // Compare against a same-length buffer so timing does not leak length,
  // then require the lengths to actually match.
  const reference = ab.length === bb.length ? bb : ab;
  const equal = crypto.timingSafeEqual(ab, reference);
  return equal && ab.length === bb.length;
}

export function verifyCredentials(username: string, password: string): boolean {
  const expectedUser = process.env.ADMIN_USERNAME ?? "";
  const expectedPass = process.env.ADMIN_PASSWORD ?? "";
  // Evaluate both to keep timing roughly constant.
  const userOk = safeEqual(username, expectedUser);
  const passOk = safeEqual(password, expectedPass);
  return userOk && passOk;
}

function sign(payload: AdminSession): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", sessionSecret()).update(data).digest("base64url");
  return `${data}.${signature}`;
}

function verify(token: string): AdminSession | null {
  const [data, signature] = token.split(".");
  if (!data || !signature) return null;
  const expected = crypto.createHmac("sha256", sessionSecret()).update(data).digest("base64url");
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString()) as AdminSession;
    if (!payload.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function createAdminSession(): Promise<void> {
  const now = Date.now();
  const token = sign({ sub: "admin", iat: now, exp: now + MAX_AGE_SECONDS * 1000 });
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS
  });
}

export async function destroyAdminSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  return verify(token);
}

export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) throw unauthorized("Admin authorization required.");
  return session;
}
