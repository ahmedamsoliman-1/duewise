import "server-only";

import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { buildProfile, deleteUserData, getUserDetail } from "@/lib/firestore/users";
import type { PlatformStats, UserDetail, UserProfile } from "@/types/user";

export async function listAllUsers(): Promise<UserProfile[]> {
  const users: UserProfile[] = [];
  let pageToken: string | undefined;
  do {
    const result = await adminAuth().listUsers(1000, pageToken);
    for (const record of result.users) {
      const snapshot = await adminDb().collection("users").doc(record.uid).get();
      users.push(buildProfile(record, snapshot.data()));
    }
    pageToken = result.pageToken;
  } while (pageToken);
  // Newest first.
  return users.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

export async function getUserDetailForAdmin(uid: string): Promise<UserDetail> {
  return getUserDetail(uid);
}

export async function setUserDisabled(uid: string, disabled: boolean): Promise<UserProfile> {
  await adminAuth().updateUser(uid, { disabled });
  if (disabled) {
    // Immediately invalidate existing sessions so the user is locked out now.
    await adminAuth().revokeRefreshTokens(uid);
  }
  const record = await adminAuth().getUser(uid);
  return buildProfile(record);
}

/** Wipe all Firestore data + files, then remove the Auth record. */
export async function deleteUserCompletely(uid: string): Promise<void> {
  await deleteUserData(uid);
  await adminAuth().deleteUser(uid);
}

export function computeStats(users: UserProfile[]): PlatformStats {
  const providers: Record<string, number> = {};
  let disabledUsers = 0;
  let mfaUsers = 0;
  let newLast30Days = 0;
  const threshold = Date.now() - 30 * 24 * 60 * 60 * 1000;

  for (const user of users) {
    if (user.disabled) disabledUsers += 1;
    if (user.mfaEnabled) mfaUsers += 1;
    if (user.createdAt && new Date(user.createdAt).getTime() >= threshold) newLast30Days += 1;
    const key = user.providerIds.includes("google.com")
      ? "google"
      : user.providerIds.includes("password")
        ? "password"
        : user.providerIds[0] ?? "unknown";
    providers[key] = (providers[key] ?? 0) + 1;
  }

  return {
    totalUsers: users.length,
    disabledUsers,
    mfaUsers,
    newLast30Days,
    providers
  };
}
