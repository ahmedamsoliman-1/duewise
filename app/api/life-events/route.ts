import { makeCrudHandlers } from "@/lib/api/crud";
import { lifeEventSchema } from "@/lib/validators/schemas";

const handlers = makeCrudHandlers({ collection: "lifeEvents", schema: lifeEventSchema, orderBy: "date" });

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
