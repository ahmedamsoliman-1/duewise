import { makeCrudHandlers } from "@/lib/api/crud";
import { taskSchema } from "@/lib/validators/schemas";

const handlers = makeCrudHandlers({ collection: "tasks", schema: taskSchema, orderBy: "dueDate" });

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
