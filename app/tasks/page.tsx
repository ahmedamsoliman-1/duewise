"use client";

import { ResourcePage } from "@/components/tables/resource-page";
import { calculateTaskStatus } from "@/lib/dates/status";
import { buildReminderDates } from "@/lib/reminders/defaults";
import { taskSchema } from "@/lib/validators/schemas";

const taskTemplates = [
  {
    title: "Passport renewal",
    description: "Identity deadline with early reminders.",
    values: {
      title: "Renew passport",
      category: "Identity",
      notes: "Check photo requirements, appointment availability, and current passport validity."
    }
  },
  {
    title: "Visa expiry",
    description: "Track visa renewal before it becomes urgent.",
    values: {
      title: "Renew visa",
      category: "Identity",
      notes: "Confirm required documents, sponsor requirements, fees, and appointment slots."
    }
  },
  {
    title: "Car registration",
    description: "Vehicle inspection, insurance, and registration.",
    values: {
      title: "Renew car registration",
      category: "Vehicle",
      notes: "Check insurance validity, fines, inspection timing, and registration fees."
    }
  },
  {
    title: "Insurance renewal",
    description: "Policy renewal with comparison time.",
    values: {
      title: "Renew insurance policy",
      category: "Insurance",
      notes: "Compare renewal offer, coverage limits, exclusions, and payment date."
    }
  },
  {
    title: "Rent payment",
    description: "Recurring housing admin deadline.",
    values: {
      title: "Pay rent",
      category: "Home",
      notes: "Confirm amount, payment method, receipt, and contract terms."
    }
  },
  {
    title: "Medical appointment",
    description: "Health visit with prep notes.",
    values: {
      title: "Medical appointment",
      category: "Health",
      notes: "Bring ID, insurance card, prior results, prescriptions, and questions."
    }
  },
  {
    title: "School payment",
    description: "Education fee or school admin task.",
    values: {
      title: "School payment deadline",
      category: "School",
      notes: "Confirm invoice, payment portal, due date, and receipt upload."
    }
  },
  {
    title: "Tax deadline",
    description: "Financial deadline with document prep.",
    values: {
      title: "Tax filing deadline",
      category: "Tax",
      notes: "Collect income documents, deductions, receipts, and filing confirmation."
    }
  }
];

function prepareTask(values: Record<string, unknown>) {
  const dueDate = typeof values.dueDate === "string" ? values.dueDate : "";
  return {
    ...values,
    reminderDates: dueDate ? buildReminderDates(dueDate) : values.reminderDates,
    status: dueDate ? calculateTaskStatus(dueDate, values.status === "completed") : values.status
  };
}

export default function TasksPage() {
  return (
    <ResourcePage
      title="Tasks"
      description="Track real-life deadlines, renewals, appointments, payments, and family admin jobs."
      endpoint="/api/tasks"
      schema={taskSchema}
      defaults={{
        title: "",
        category: "Identity",
        dueDate: "",
        reminderDates: [],
        status: "upcoming",
        notes: "",
        familyMemberId: "",
        linkedDocumentId: "",
        linkedInventoryItemId: ""
      }}
      fields={[
        { name: "title", label: "Title", placeholder: "Passport renewal" },
        { name: "category", label: "Category", type: "select", options: ["Identity", "Vehicle", "Home", "Health", "School", "Tax", "Insurance", "Other"] },
        { name: "dueDate", label: "Due date", type: "date" },
        { name: "status", label: "Status", type: "select", options: ["upcoming", "due soon", "overdue", "completed"] },
        {
          name: "familyMemberId",
          label: "Assigned family member",
          type: "relation",
          relation: { endpoint: "/api/family", labelKey: "name", emptyLabel: "Unassigned", includeSelf: true }
        },
        {
          name: "linkedDocumentId",
          label: "Linked document",
          type: "relation",
          relation: { endpoint: "/api/documents", labelKey: "title", emptyLabel: "No linked document" }
        },
        {
          name: "linkedInventoryItemId",
          label: "Linked inventory item",
          type: "relation",
          relation: { endpoint: "/api/inventory", labelKey: "name", emptyLabel: "No linked item" }
        },
        { name: "notes", label: "Notes", type: "textarea", placeholder: "Anything useful to remember" }
      ]}
      columns={[
        { key: "title", label: "Task" },
        { key: "category", label: "Category" },
        { key: "dueDate", label: "Due" },
        { key: "status", label: "Status" },
        { key: "familyMemberId", label: "Assigned", relation: { endpoint: "/api/family", labelKey: "name", includeSelf: true } },
        { key: "linkedDocumentId", label: "Document", relation: { endpoint: "/api/documents", labelKey: "title" } },
        { key: "notes", label: "Notes" }
      ]}
      emptyTitle="No deadlines yet"
      emptyBody="Add passports, registrations, insurance renewals, bills, appointments, and anything else Future You should not have to remember manually."
      templates={taskTemplates}
      prepareSubmit={prepareTask}
      quickFilters={[
        { label: "Due soon", key: "status", value: "due soon" },
        { label: "Overdue", key: "status", value: "overdue" },
        { label: "Completed", key: "status", value: "completed" },
        { label: "Identity", key: "category", value: "Identity" },
        { label: "Vehicle", key: "category", value: "Vehicle" },
        { label: "Health", key: "category", value: "Health" },
        { label: "School", key: "category", value: "School" }
      ]}
    />
  );
}
