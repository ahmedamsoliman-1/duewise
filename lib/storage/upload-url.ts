import "server-only";

import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api/errors";
import { requireUser } from "@/lib/auth/server";
import { adminStorage } from "@/lib/firebase/admin";

const uploadSchema = z.object({
  fileName: z.string().min(1),
  contentType: z.string().min(1)
});

function uploadBucketName() {
  return (
    process.env.GCP_STORAGE_BUCKET ??
    process.env.FIREBASE_STORAGE_BUCKET ??
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  );
}

function signedUrlTtlMs() {
  const seconds = Number(process.env.GCP_SIGNED_URL_TTL_SECONDS ?? 900);
  return Math.max(60, seconds) * 1000;
}

export function makeUploadUrlHandler(kind: "documents" | "inventory") {
  return async function POST(request: NextRequest) {
    try {
      const user = await requireUser(request);
      const { fileName, contentType } = uploadSchema.parse(await request.json());
      const bucketName = uploadBucketName();
      if (!bucketName) {
        throw Object.assign(new Error("Missing GCP_STORAGE_BUCKET or Firebase storage bucket."), { status: 500 });
      }
      const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
      const itemId = randomUUID();
      const storagePath = `users/${user.uid}/${kind}/${itemId}/${safeName}`;
      const file = adminStorage().bucket(bucketName).file(storagePath);
      const [uploadUrl] = await file.getSignedUrl({
        action: "write",
        contentType,
        expires: Date.now() + signedUrlTtlMs()
      });

      return NextResponse.json({
        data: {
          uploadUrl,
          storagePath,
          bucket: bucketName,
          fileUrl: `gs://${bucketName}/${storagePath}`,
          itemId
        }
      });
    } catch (error) {
      return apiError(error);
    }
  };
}
