"use client";

import { ResourcePage } from "@/components/tables/resource-page";
import { subscriptionSchema } from "@/lib/validators/schemas";

function prepareSubscription(values: Record<string, unknown>) {
  const nextBillingDate = typeof values.nextBillingDate === "string" ? values.nextBillingDate : "";
  const recurrenceInterval = typeof values.recurrenceInterval === "string" ? values.recurrenceInterval : "none";
  const recurrenceEndDate = typeof values.recurrenceEndDate === "string" ? values.recurrenceEndDate : "";

  return {
    ...values,
    recurrenceInterval,
    recurrenceEndDate: recurrenceEndDate || undefined
  };
}

const subscriptionTemplates = [
  {
    title: "Cloud storage",
    description: "Monthly software/storage renewal.",
    values: {
      name: "Cloud storage",
      category: "Software",
      cost: 0,
      currency: "USD",
      billingCycle: "monthly",
      status: "active",
      notes: "Add plan name, storage limit, renewal policy, and cancellation steps."
    }
  },
  {
    title: "Streaming",
    description: "Video, music, or content subscription.",
    values: {
      name: "Streaming subscription",
      category: "Streaming",
      cost: 0,
      currency: "USD",
      billingCycle: "monthly",
      status: "active",
      notes: "Track shared users, plan tier, and whether it is still worth keeping."
    }
  },
  {
    title: "Insurance payment",
    description: "Recurring insurance premium.",
    values: {
      name: "Insurance premium",
      category: "Insurance",
      cost: 0,
      currency: "USD",
      billingCycle: "monthly",
      status: "active",
      notes: "Link policy document later and note renewal/cancellation terms."
    }
  },
  {
    title: "Membership",
    description: "Gym, club, or professional membership.",
    values: {
      name: "Membership",
      category: "Membership",
      cost: 0,
      currency: "USD",
      billingCycle: "monthly",
      status: "active",
      notes: "Add contract period, freeze policy, cancellation deadline, and benefits."
    }
  }
];

export default function SubscriptionsPage() {
  return (
    <ResourcePage
      title="Subscriptions"
      description="See recurring payments before they happen and keep cancellation links close at hand."
      endpoint="/api/subscriptions"
      schema={subscriptionSchema}
      defaults={{ name: "", category: "Software", cost: 0, currency: "USD", billingCycle: "monthly", nextBillingDate: "", recurrenceInterval: "none", recurrenceEndDate: "", cancellationUrl: "", status: "active", notes: "" }}
      fields={[
        { name: "name", label: "Name", placeholder: "Cloud storage" },
        { name: "category", label: "Category", type: "select", options: ["Software", "Streaming", "Utilities", "Insurance", "Membership", "Education", "Other"] },
        { name: "cost", label: "Cost", type: "number" },
        { name: "currency", label: "Currency", placeholder: "USD" },
        { name: "billingCycle", label: "Billing cycle", type: "select", options: ["monthly", "yearly", "weekly"] },
        { name: "nextBillingDate", label: "Next billing date", type: "date" },
        { name: "recurrenceInterval", label: "Repeat", type: "select", options: ["none", "weekly", "monthly", "yearly"] },
        { name: "recurrenceEndDate", label: "Repeat until", type: "date" },
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
      templates={subscriptionTemplates}
      prepareSubmit={prepareSubscription}
      quickFilters={[
        { label: "Active", key: "status", value: "active" },
        { label: "Paused", key: "status", value: "paused" },
        { label: "Cancelled", key: "status", value: "cancelled" },
        { label: "Monthly", key: "billingCycle", value: "monthly" },
        { label: "Yearly", key: "billingCycle", value: "yearly" },
        { label: "Software", key: "category", value: "Software" },
        { label: "Insurance", key: "category", value: "Insurance" }
      ]}
    />
  );
}
