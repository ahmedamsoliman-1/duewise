import { extractErrorCode, isUserFacingAuthError } from "@/lib/errors/auth-messages";

/**
 * Records a client-side error where it belongs: the browser console (for local
 * debugging) and the backend log (for production visibility) — never in the UI.
 * Fire-and-forget; failures are swallowed so logging can never break a flow.
 */
export function reportClientError(context: string, error: unknown): void {
  const code = extractErrorCode(error);
  const message = error instanceof Error ? error.message : String(error);

  if (typeof console !== "undefined") {
    // eslint-disable-next-line no-console
    console.error(`[duewise:${context}]`, error);
  }

  try {
    void fetch("/api/client-errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ context, code, message }),
      keepalive: true
    }).catch(() => undefined);
  } catch {
    // ignore — logging must never throw
  }
}

/**
 * Reports only *unexpected* errors. Normal user-actionable auth outcomes
 * (wrong password, invalid code…) are handled in the UI and produce no console
 * noise or backend log — so Next's dev overlay won't pop for a plain typo.
 */
export function reportUnexpectedError(context: string, error: unknown): void {
  if (isUserFacingAuthError(error)) return;
  reportClientError(context, error);
}
