import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api/errors";
import { requireUser } from "@/lib/auth/server";
import { adminStorage } from "@/lib/firebase/admin";
import { signedUrlTtlMs, storageBucketName } from "@/lib/storage/bucket";

const readUrlSchema = z.object({
  storagePath: z.string().min(1)
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const { storagePath } = readUrlSchema.parse(await request.json());
    const bucketName = storageBucketName();
    if (!bucketName) {
      throw Object.assign(new Error("Missing GCP_STORAGE_BUCKET or Firebase storage bucket."), { status: 500 });
    }

    const userPrefix = `users/${user.uid}/`;
    if (!storagePath.startsWith(userPrefix) || storagePath.includes("..")) {
      throw Object.assign(new Error("This file is outside your storage area."), { status: 403 });
    }

    const [url] = await adminStorage()
      .bucket(bucketName)
      .file(storagePath)
      .getSignedUrl({
        action: "read",
        expires: Date.now() + signedUrlTtlMs()
      });

    return NextResponse.json({ data: { url } });
  } catch (error) {
    return apiError(error);
  }
}
