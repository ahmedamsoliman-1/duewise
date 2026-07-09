/**
 * Maps auth/security errors to safe, user-facing messages.
 *
 * Only *user-actionable* problems (wrong password, bad code, cancelled popup…)
 * get a specific message. Anything else — configuration issues, internal
 * failures, unknown codes — returns a generic message so we never leak
 * implementation details (Firebase console state, provider config, etc.) into
 * the UI. Callers should log the raw error to the backend via reportClientError.
 */

export function extractErrorCode(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    return String((error as { code: unknown }).code);
  }
  if (error instanceof Error) {
    const match = error.message.match(/auth\/[a-z-]+/i);
    if (match) return match[0].toLowerCase();
  }
  return "unknown";
}

const USER_FACING: Record<string, string> = {
  "auth/invalid-credential": "Incorrect email or password.",
  "auth/wrong-password": "Incorrect email or password.",
  "auth/user-not-found": "Incorrect email or password.",
  "auth/invalid-login-credentials": "Incorrect email or password.",
  "auth/email-already-in-use": "That email already has an account.",
  "auth/invalid-email": "That email address looks invalid.",
  "auth/weak-password": "Please choose a stronger password (at least 6 characters).",
  "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
  "auth/requires-recent-login": "For your security, please sign in again to make this change.",
  "auth/invalid-verification-code": "That code didn't match. Check your authenticator app and try again.",
  "auth/missing-code": "Please enter the 6-digit code from your authenticator app.",
  "auth/popup-closed-by-user": "Sign-in was cancelled.",
  "auth/cancelled-popup-request": "Sign-in was cancelled.",
  "auth/popup-blocked": "Your browser blocked the sign-in popup. Please allow popups and try again.",
  "auth/network-request-failed": "Network problem. Check your connection and try again.",
  "auth/user-disabled": "This account has been disabled. Contact support if you think this is a mistake."
};

/**
 * True when the error is a normal, user-actionable auth outcome (wrong password,
 * bad code, cancelled popup…). These are expected and should NOT be logged as
 * system failures — only shown to the user.
 */
export function isUserFacingAuthError(error: unknown): boolean {
  return extractErrorCode(error) in USER_FACING;
}

/**
 * @param error   the caught error
 * @param fallback message shown for any non-user-actionable error (defaults to a generic one)
 */
export function friendlyAuthError(error: unknown, fallback = "Something went wrong on our end. Please try again in a moment."): string {
  return USER_FACING[extractErrorCode(error)] ?? fallback;
}
