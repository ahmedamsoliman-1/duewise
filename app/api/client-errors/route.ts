import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  context: z.string().max(120).optional(),
  code: z.string().max(120).optional(),
  message: z.string().max(2000).optional()
});

/**
 * Sink for client-side errors. Keeps the technical detail on the server
 * (hosting logs) instead of exposing it to end users. Best-effort — always
 * returns ok so the client logger stays fire-and-forget.
 */
export async function POST(request: NextRequest) {
  try {
    const body = schema.parse(await request.json().catch(() => ({})));
    // eslint-disable-next-line no-console
    console.error(
      `[client-error] context=${body.context ?? "unknown"} code=${body.code ?? "n/a"} :: ${body.message ?? ""}`
    );
  } catch {
    // Malformed payloads are ignored — never fail a logging call.
  }
  return NextResponse.json({ ok: true });
}
