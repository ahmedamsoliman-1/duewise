"use client";

import { ResourcePage } from "@/components/tables/resource-page";
import { familySchema } from "@/lib/validators/schemas";

export default function FamilyPage() {
  return (
    <ResourcePage
      title="Family"
      description="Maintain household members so tasks and documents can be assigned to the right person."
      endpoint="/api/family"
      schema={familySchema}
      defaults={{ name: "", relationship: "", dateOfBirth: "", notes: "" }}
      fields={[
        { name: "name", label: "Name", placeholder: "Alex" },
        { name: "relationship", label: "Relationship", placeholder: "Partner, child, parent" },
        { name: "dateOfBirth", label: "Date of birth", type: "date" },
        { name: "notes", label: "Notes", type: "textarea" }
      ]}
      columns={[
        { key: "name", label: "Name" },
        { key: "relationship", label: "Relationship" },
        { key: "dateOfBirth", label: "Date of birth" },
        { key: "notes", label: "Notes" }
      ]}
      emptyTitle="No family members yet"
      emptyBody="Add family or household members to make passports, appointments, school payments, and shared documents easier to organize."
      visualMode="familyTree"
    />
  );
}
