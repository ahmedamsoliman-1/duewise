import "server-only";

export function storageBucketName() {
  return (
    process.env.GCP_STORAGE_BUCKET ??
    process.env.FIREBASE_STORAGE_BUCKET ??
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  );
}

export function signedUrlTtlMs() {
  const seconds = Number(process.env.GCP_SIGNED_URL_TTL_SECONDS ?? 900);
  return Math.max(60, seconds) * 1000;
}
