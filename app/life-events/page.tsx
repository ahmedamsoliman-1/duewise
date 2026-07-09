"use client";

import { ResourcePage } from "@/components/tables/resource-page";
import { lifeEventSchema } from "@/lib/validators/schemas";

export default function LifeEventsPage() {
  return (
    <ResourcePage
      title="Life Events"
      description="Capture major personal and family milestones: graduations, work changes, service, weddings, births, memorials, moves, and other life chapters."
      endpoint="/api/life-events"
      schema={lifeEventSchema}
      defaults={{
        title: "",
        type: "custom",
        date: "",
        endDate: "",
        personName: "",
        familyMemberId: "",
        location: "",
        importance: "medium",
        privacy: "normal",
        notes: ""
      }}
      fields={[
        { name: "title", label: "Title", placeholder: "Graduated from university" },
        {
          name: "type",
          label: "Type",
          type: "select",
          options: [
            "graduation",
            "work",
            "national service",
            "wedding",
            "birth",
            "death",
            "relocation",
            "medical",
            "property",
            "legal",
            "custom"
          ]
        },
        { name: "date", label: "Date", type: "date" },
        { name: "endDate", label: "End date", type: "date" },
        { name: "personName", label: "Person", placeholder: "Optional name" },
        { name: "location", label: "Location", placeholder: "City, country, venue" },
        { name: "importance", label: "Importance", type: "select", options: ["low", "medium", "high", "landmark"] },
        { name: "privacy", label: "Privacy", type: "select", options: ["normal", "sensitive"] },
        { name: "familyMemberId", label: "Family member ID", placeholder: "Optional" },
        { name: "notes", label: "Story / notes", type: "textarea", placeholder: "What happened, why it mattered, or what to remember" }
      ]}
      columns={[
        { key: "title", label: "Event" },
        { key: "type", label: "Type" },
        { key: "date", label: "Date" },
        { key: "personName", label: "Person" },
        { key: "location", label: "Location" },
        { key: "importance", label: "Importance" }
      ]}
      emptyTitle="No life events yet"
      emptyBody="Add the human milestones that belong beside your admin timeline: graduations, work, service, weddings, births, memorials, moves, and the big custom moments."
    />
  );
}
