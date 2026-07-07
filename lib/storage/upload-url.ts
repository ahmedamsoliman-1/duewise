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

export function makeUploadUrlHandler(kind: "documents" | "inventory") {
  return async function POST(request: NextRequest) {
    try {
      const user = await requireUser(request);
      const { fileName, contentType } = uploadSchema.parse(await request.json());
      const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
      const itemId = randomUUID();
      const storagePath = `users/${user.uid}/${kind}/${itemId}/${safeName}`;
      const file = adminStorage().bucket().file(storagePath);
      const [uploadUrl] = await file.getSignedUrl({
        action: "write",
        contentType,
        expires: Date.now() + 15 * 60 * 1000
      });

      return NextResponse.json({ data: { uploadUrl, storagePath, itemId } });
    } catch (error) {
      return apiError(error);
    }
  };
}
