"use client";

import { ResourcePage } from "@/components/tables/resource-page";
import { taskSchema } from "@/lib/validators/schemas";

export default function TasksPage() {
  return (
    <ResourcePage
      title="Tasks"
      description="Track real-life deadlines, renewals, appointments, payments, and family admin jobs."
      endpoint="/api/tasks"
      schema={taskSchema}
      defaults={{ title: "", category: "Identity", dueDate: "", reminderDates: [], status: "upcoming", notes: "" }}
      fields={[
        { name: "title", label: "Title", placeholder: "Passport renewal" },
        { name: "category", label: "Category", type: "select", options: ["Identity", "Vehicle", "Home", "Health", "School", "Tax", "Insurance", "Other"] },
        { name: "dueDate", label: "Due date", type: "date" },
        { name: "status", label: "Status", type: "select", options: ["upcoming", "due soon", "overdue", "completed"] },
        { name: "familyMemberId", label: "Family member ID", placeholder: "Optional" },
        { name: "notes", label: "Notes", type: "textarea", placeholder: "Anything useful to remember" }
      ]}
      columns={[
        { key: "title", label: "Task" },
        { key: "category", label: "Category" },
        { key: "dueDate", label: "Due" },
        { key: "status", label: "Status" },
        { key: "notes", label: "Notes" }
      ]}
      emptyTitle="No deadlines yet"
      emptyBody="Add passports, registrations, insurance renewals, bills, appointments, and anything else Future You should not have to remember manually."
    />
  );
}
