"use client";

import { ResourcePage } from "@/components/tables/resource-page";
import { lifeEventSchema } from "@/lib/validators/schemas";

const lifeEventTemplates = [
  {
    title: "Graduation",
    description: "Education milestone and ceremony details.",
    values: {
      title: "Graduation",
      type: "graduation",
      importance: "landmark",
      privacy: "normal",
      notes: "School or university, degree/program, ceremony details, people present, and documents to keep."
    }
  },
  {
    title: "Work change",
    description: "New job, promotion, or career shift.",
    values: {
      title: "Started a new role",
      type: "work",
      importance: "high",
      privacy: "normal",
      notes: "Company, role, start date, contract, benefits, and important onboarding details."
    }
  },
  {
    title: "National service",
    description: "Service start, completion, or related milestone.",
    values: {
      title: "National service milestone",
      type: "national service",
      importance: "landmark",
      privacy: "sensitive",
      notes: "Unit/program, start or completion date, certificates, documents, and important memories."
    }
  },
  {
    title: "Wedding",
    description: "Marriage or wedding milestone.",
    values: {
      title: "Wedding",
      type: "wedding",
      importance: "landmark",
      privacy: "normal",
      notes: "Venue, legal certificate, guests, photos, and related documents."
    }
  },
  {
    title: "Birth",
    description: "Birth event for a child or family member.",
    values: {
      title: "Birth",
      type: "birth",
      importance: "landmark",
      privacy: "sensitive",
      notes: "Hospital, birth certificate, ID/passport follow-up, medical documents, and family notes."
    }
  },
  {
    title: "Memorial",
    description: "Death or memorial record handled respectfully.",
    values: {
      title: "Memorial",
      type: "death",
      importance: "landmark",
      privacy: "sensitive",
      notes: "Important dates, certificates, estate/admin follow-up, and memories to preserve."
    }
  },
  {
    title: "Relocation",
    description: "Move to a new home, city, or country.",
    values: {
      title: "Relocation",
      type: "relocation",
      importance: "high",
      privacy: "normal",
      notes: "From/to locations, lease or property documents, utilities, registrations, and moving checklist."
    }
  },
  {
    title: "Property purchase",
    description: "Home or major property milestone.",
    values: {
      title: "Property purchase",
      type: "property",
      importance: "landmark",
      privacy: "sensitive",
      notes: "Property address, contract, title deed, mortgage, insurance, and handover details."
    }
  }
];

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
        {
          name: "familyMemberId",
          label: "Linked family member",
          type: "relation",
          relation: { endpoint: "/api/family", labelKey: "name", emptyLabel: "No linked family member", includeSelf: true }
        },
        { name: "location", label: "Location", placeholder: "City, country, venue" },
        { name: "importance", label: "Importance", type: "select", options: ["low", "medium", "high", "landmark"] },
        { name: "privacy", label: "Privacy", type: "select", options: ["normal", "sensitive"] },
        { name: "notes", label: "Story / notes", type: "textarea", placeholder: "What happened, why it mattered, or what to remember" }
      ]}
      columns={[
        { key: "title", label: "Event" },
        { key: "type", label: "Type" },
        { key: "date", label: "Date" },
        { key: "personName", label: "Person" },
        { key: "familyMemberId", label: "Family", relation: { endpoint: "/api/family", labelKey: "name", includeSelf: true } },
        { key: "location", label: "Location" },
        { key: "importance", label: "Importance" }
      ]}
      emptyTitle="No life events yet"
      emptyBody="Add the human milestones that belong beside your admin timeline: graduations, work, service, weddings, births, memorials, moves, and the big custom moments."
      templates={lifeEventTemplates}
      quickFilters={[
        { label: "Landmark", key: "importance", value: "landmark" },
        { label: "High", key: "importance", value: "high" },
        { label: "Sensitive", key: "privacy", value: "sensitive" },
        { label: "Work", key: "type", value: "work" },
        { label: "Wedding", key: "type", value: "wedding" },
        { label: "Birth", key: "type", value: "birth" },
        { label: "Property", key: "type", value: "property" }
      ]}
    />
  );
}
