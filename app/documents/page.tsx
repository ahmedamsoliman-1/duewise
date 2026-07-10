"use client";

import { ResourcePage } from "@/components/tables/resource-page";
import { documentSchema } from "@/lib/validators/schemas";

const documentTemplates = [
  {
    title: "Passport",
    description: "Identity document with expiry tracking.",
    values: {
      title: "Passport",
      type: "Passport",
      tags: "identity, travel",
      notes: "Add passport number, issuing country, and renewal notes."
    }
  },
  {
    title: "National ID",
    description: "ID card or Emirates ID style record.",
    values: {
      title: "National ID",
      type: "ID",
      tags: "identity",
      notes: "Track ID number, issuing authority, and expiry."
    }
  },
  {
    title: "Visa",
    description: "Residency, work, or travel visa.",
    values: {
      title: "Visa",
      type: "Visa",
      tags: "identity, immigration",
      notes: "Add visa number, sponsor, country, renewal requirements, and expiry."
    }
  },
  {
    title: "Lease",
    description: "Home lease or tenancy contract.",
    values: {
      title: "Lease agreement",
      type: "Lease",
      ownerName: "Household",
      tags: "home, contract",
      notes: "Track landlord, renewal window, rent amount, deposits, and contract expiry."
    }
  },
  {
    title: "Insurance policy",
    description: "Health, vehicle, home, or life insurance.",
    values: {
      title: "Insurance policy",
      type: "Insurance policy",
      tags: "insurance",
      notes: "Add provider, policy number, coverage notes, exclusions, and renewal date."
    }
  },
  {
    title: "Warranty",
    description: "Warranty certificate for an item.",
    values: {
      title: "Warranty certificate",
      type: "Warranty",
      tags: "warranty, inventory",
      notes: "Link this to the inventory item once relationship pickers are enabled."
    }
  }
];

export default function DocumentsPage() {
  return (
    <ResourcePage
      title="Documents"
      description="Keep important document metadata, expiry dates, storage paths, and private links in one vault."
      endpoint="/api/documents"
      schema={documentSchema}
      defaults={{ title: "", type: "Passport", ownerName: "", fileUrl: "", storagePath: "", expiryDate: "", tags: "", notes: "", familyMemberId: "" }}
      fields={[
        { name: "title", label: "Title", placeholder: "Passport scan" },
        { name: "type", label: "Type", type: "select", options: ["Passport", "ID", "Visa", "Lease", "Insurance policy", "Medical record", "Receipt", "Warranty", "Contract", "Certificate"] },
        { name: "ownerName", label: "Owner name", placeholder: "Person or household" },
        {
          name: "familyMemberId",
          label: "Assigned family member",
          type: "relation",
          relation: { endpoint: "/api/family", labelKey: "name", emptyLabel: "Unassigned" }
        },
        { name: "expiryDate", label: "Expiry date", type: "date" },
        {
          name: "fileUpload",
          label: "File",
          type: "file",
          placeholder: "PDF, image, or document file",
          upload: {
            endpoint: "/api/documents/upload-url",
            storagePathField: "storagePath",
            urlField: "fileUrl",
            accept: "image/*,.pdf,.doc,.docx,.xls,.xlsx"
          }
        },
        { name: "tags", label: "Tags", placeholder: "travel, identity" },
        { name: "notes", label: "Notes", type: "textarea" }
      ]}
      columns={[
        { key: "title", label: "Document" },
        { key: "type", label: "Type" },
        { key: "ownerName", label: "Owner" },
        { key: "familyMemberId", label: "Family", relation: { endpoint: "/api/family", labelKey: "name" } },
        { key: "expiryDate", label: "Expiry" },
        { key: "storagePath", label: "File", format: (value) => (value ? "Uploaded" : "—") },
        { key: "tags", label: "Tags", format: (value) => (Array.isArray(value) ? value.join(", ") : String(value ?? "-")) }
      ]}
      emptyTitle="Your vault is empty"
      emptyBody="Start with IDs, passports, visas, leases, policies, receipts, and warranties. Files stay under your user-scoped Firebase Storage path."
      templates={documentTemplates}
    />
  );
}
