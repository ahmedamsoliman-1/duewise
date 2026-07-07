import { makeCrudHandlers } from "@/lib/api/crud";
import { familySchema } from "@/lib/validators/schemas";

const handlers = makeCrudHandlers({ collection: "familyMembers", schema: familySchema, orderBy: "name" });

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
