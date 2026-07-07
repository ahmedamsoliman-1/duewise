import { makeCrudHandlers } from "@/lib/api/crud";
import { inventorySchema } from "@/lib/validators/schemas";

const handlers = makeCrudHandlers({ collection: "inventory", schema: inventorySchema, orderBy: "createdAt" });

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
