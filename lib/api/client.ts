"use client";

import { auth } from "@/lib/firebase/client";

async function token() {
  const user = auth.currentUser;
  if (!user) throw new Error("You must be signed in.");
  return user.getIdToken();
}

export async function apiFetch<T>(path: string, init: RequestInit = {}) {
  const idToken = await token();
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
      ...init.headers
    }
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? "Request failed.");
  }

  return response.json() as Promise<T>;
}
