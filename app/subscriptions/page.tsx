"use client";

import { ResourcePage } from "@/components/tables/resource-page";
import { subscriptionSchema } from "@/lib/validators/schemas";

export default function SubscriptionsPage() {
  return (
    <ResourcePage
      title="Subscriptions"
      description="See recurring payments before they happen and keep cancellation links close at hand."
      endpoint="/api/subscriptions"
      schema={subscriptionSchema}
      defaults={{ name: "", category: "Software", cost: 0, currency: "USD", billingCycle: "monthly", nextBillingDate: "", cancellationUrl: "", status: "active", notes: "" }}
      fields={[
        { name: "name", label: "Name", placeholder: "Cloud storage" },
        { name: "category", label: "Category", type: "select", options: ["Software", "Streaming", "Utilities", "Insurance", "Membership", "Education", "Other"] },
        { name: "cost", label: "Cost", type: "number" },
        { name: "currency", label: "Currency", placeholder: "USD" },
        { name: "billingCycle", label: "Billing cycle", type: "select", options: ["monthly", "yearly", "weekly"] },
        { name: "nextBillingDate", label: "Next billing date", type: "date" },
        { name: "status", label: "Status", type: "select", options: ["active", "paused", "cancelled"] },
        { name: "cancellationUrl", label: "Cancellation URL", type: "url" },
        { name: "notes", label: "Notes", type: "textarea" }
      ]}
      columns={[
        { key: "name", label: "Name" },
        { key: "category", label: "Category" },
        { key: "cost", label: "Cost", format: (value, row) => `${row.currency ?? "USD"} ${Number(value ?? 0).toFixed(2)}` },
        { key: "billingCycle", label: "Cycle" },
        { key: "nextBillingDate", label: "Next bill" },
        { key: "status", label: "Status" }
      ]}
      emptyTitle="No recurring payments tracked"
      emptyBody="Add subscriptions, memberships, insurance payments, and other repeating charges to understand your monthly spend."
    />
  );
}
