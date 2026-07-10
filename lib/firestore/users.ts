import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import type { UserRecord } from "firebase-admin/auth";
import { adminAuth, adminDb, adminStorage } from "@/lib/firebase/admin";
import type { CollectionName } from "@/lib/firestore/collections";
import type { UserDetail, UserProfile } from "@/types/user";

export const USER_SUBCOLLECTIONS: CollectionName[] = [
  "tasks",
  "documents",
  "subscriptions",
  "inventory",
  "familyMembers"
];

function userDoc(uid: string) {
  return adminDb().collection("users").doc(uid);
}

function appMfaEnabled(docData?: FirebaseFirestore.DocumentData | null) {
  return Boolean(docData?.mfaTotp?.enabled);
}

function toISO(value: unknown): string | null {
  if (!value) return null;
  const maybe = value as { toDate?: () => Date };
  if (typeof maybe.toDate === "function") return maybe.toDate().toISOString();
  if (typeof value === "string") return value;
  return null;
}

/** Build a normalized profile from the authoritative Auth record + mirror doc. */
export function buildProfile(record: UserRecord, docData?: FirebaseFirestore.DocumentData | null): UserProfile {
  return {
    uid: record.uid,
    email: record.email ?? null,
    displayName: record.displayName ?? null,
    photoURL: record.photoURL ?? null,
    providerIds: record.providerData.map((provider) => provider.providerId),
    emailVerified: record.emailVerified,
    mfaEnabled: appMfaEnabled(docData) || (record.multiFactor?.enrolledFactors?.length ?? 0) > 0,
    disabled: record.disabled,
    createdAt: record.metadata.creationTime
      ? new Date(record.metadata.creationTime).toISOString()
      : toISO(docData?.createdAt),
    lastLoginAt: record.metadata.lastSignInTime
      ? new Date(record.metadata.lastSignInTime).toISOString()
      : null
  };
}

/**
 * Ensure a shallow `users/{uid}` profile document exists and is in sync with
 * the authoritative Firebase Auth record. Idempotent — safe to call on every login.
 */
export async function ensureUserProfile(uid: string): Promise<UserProfile> {
  const record = await adminAuth().getUser(uid);
  const ref = userDoc(uid);
  const snapshot = await ref.get();

  const mirror = {
    uid,
    email: record.email ?? null,
    displayName: record.displayName ?? null,
    photoURL: record.photoURL ?? null,
    providerIds: record.providerData.map((provider) => provider.providerId),
    emailVerified: record.emailVerified,
    mfaEnabled: appMfaEnabled(snapshot.data()) || (record.multiFactor?.enrolledFactors?.length ?? 0) > 0,
    disabled: record.disabled,
    updatedAt: FieldValue.serverTimestamp(),
    lastLoginAt: FieldValue.serverTimestamp()
  };

  if (!snapshot.exists) {
    await ref.set({ ...mirror, createdAt: FieldValue.serverTimestamp() });
  } else {
    await ref.set(mirror, { merge: true });
  }

  return buildProfile(record, snapshot.data());
}

export async function getUserProfile(uid: string): Promise<UserProfile> {
  const [record, snapshot] = await Promise.all([adminAuth().getUser(uid), userDoc(uid).get()]);
  return buildProfile(record, snapshot.data());
}

export async function getUserMfaState(uid: string): Promise<{ enabled: boolean; secret: string | null; pendingSecret: string | null }> {
  const snapshot = await userDoc(uid).get();
  const data = snapshot.data();
  return {
    enabled: Boolean(data?.mfaTotp?.enabled),
    secret: typeof data?.mfaTotp?.secret === "string" ? data.mfaTotp.secret : null,
    pendingSecret: typeof data?.mfaTotpPending?.secret === "string" ? data.mfaTotpPending.secret : null
  };
}

export async function setPendingTotpSecret(uid: string, secret: string) {
  await userDoc(uid).set(
    {
      mfaTotpPending: {
        secret,
        createdAt: FieldValue.serverTimestamp()
      },
      updatedAt: FieldValue.serverTimestamp()
    },
    { merge: true }
  );
}

export async function enableTotpMfa(uid: string, secret: string) {
  await userDoc(uid).set(
    {
      mfaEnabled: true,
      mfaTotp: {
        enabled: true,
        secret,
        enabledAt: FieldValue.serverTimestamp()
      },
      mfaTotpPending: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp()
    },
    { merge: true }
  );
}

export async function disableTotpMfa(uid: string) {
  await userDoc(uid).set(
    {
      mfaEnabled: false,
      mfaTotp: FieldValue.delete(),
      mfaTotpPending: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp()
    },
    { merge: true }
  );
}

export async function getUserDetail(uid: string): Promise<UserDetail> {
  const [record, snapshot] = await Promise.all([adminAuth().getUser(uid), userDoc(uid).get()]);
  const counts: Record<string, number> = {};
  await Promise.all(
    USER_SUBCOLLECTIONS.map(async (name) => {
      const aggregate = await userDoc(uid).collection(name).count().get();
      counts[name] = aggregate.data().count;
    })
  );
  return { profile: buildProfile(record, snapshot.data()), counts };
}

/** Permanently wipe all of a user's Firestore data and stored files (not the Auth record). */
export async function deleteUserData(uid: string): Promise<void> {
  const db = adminDb();

  for (const name of USER_SUBCOLLECTIONS) {
    const collection = userDoc(uid).collection(name);
    // Delete in bounded chunks to avoid unbounded batch sizes.
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const snapshot = await collection.limit(300).get();
      if (snapshot.empty) break;
      const batch = db.batch();
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      if (snapshot.size < 300) break;
    }
  }

  await userDoc(uid).delete().catch(() => undefined);

  try {
    await adminStorage().bucket().deleteFiles({ prefix: `users/${uid}/` });
  } catch {
    // Storage bucket may be unconfigured in some environments; ignore.
  }
}
