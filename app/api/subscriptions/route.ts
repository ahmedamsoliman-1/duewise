import { makeCrudHandlers } from "@/lib/api/crud";
import { subscriptionSchema } from "@/lib/validators/schemas";

const handlers = makeCrudHandlers({ collection: "subscriptions", schema: subscriptionSchema, orderBy: "nextBillingDate" });

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
