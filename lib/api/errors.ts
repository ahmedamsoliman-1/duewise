import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function apiError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json({ error: "Validation failed.", details: error.flatten() }, { status: 422 });
  }

  const maybe = error as { message?: string; status?: number };
  return NextResponse.json(
    { error: maybe.message ?? "Something went wrong." },
    { status: maybe.status ?? 500 }
  );
}
