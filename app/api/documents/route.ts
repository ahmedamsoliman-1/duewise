import { makeCrudHandlers } from "@/lib/api/crud";
import { documentSchema } from "@/lib/validators/schemas";

const handlers = makeCrudHandlers({ collection: "documents", schema: documentSchema, orderBy: "createdAt" });

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
