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
      quickFilters={[
        { label: "Parents", key: "relationship", predicate: (item) => /\b(mother|father|parent|mom|mum|dad|stepmother|stepfather)\b/i.test(String(item.relationship ?? "")) },
        { label: "Partner", key: "relationship", predicate: (item) => /\b(wife|husband|spouse|partner)\b/i.test(String(item.relationship ?? "")) },
        { label: "Children", key: "relationship", predicate: (item) => /\b(son|daughter|child|kid|children)\b/i.test(String(item.relationship ?? "")) },
        { label: "Siblings", key: "relationship", predicate: (item) => /\b(brother|sister|sibling)\b/i.test(String(item.relationship ?? "")) }
      ]}
    />
  );
}
