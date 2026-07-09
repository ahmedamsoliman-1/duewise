import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api/errors";
import { adminConfigured, createAdminSession, verifyCredentials } from "@/lib/admin/session";

const schema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

export async function POST(request: NextRequest) {
  try {
    if (!adminConfigured()) {
      return NextResponse.json(
        { error: "Admin panel is not configured. Set ADMIN_USERNAME, ADMIN_PASSWORD, and ADMIN_SESSION_SECRET." },
        { status: 503 }
      );
    }
    const { username, password } = schema.parse(await request.json());
    if (!verifyCredentials(username, password)) {
      return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
    }
    await createAdminSession();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
