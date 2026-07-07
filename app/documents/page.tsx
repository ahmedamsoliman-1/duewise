"use client";

import { ResourcePage } from "@/components/tables/resource-page";
import { documentSchema } from "@/lib/validators/schemas";

export default function DocumentsPage() {
  return (
    <ResourcePage
      title="Documents"
      description="Keep important document metadata, expiry dates, storage paths, and private links in one vault."
      endpoint="/api/documents"
      schema={documentSchema}
      defaults={{ title: "", type: "Passport", ownerName: "", fileUrl: "", storagePath: "", expiryDate: "", tags: "", notes: "" }}
      fields={[
        { name: "title", label: "Title", placeholder: "Passport scan" },
        { name: "type", label: "Type", type: "select", options: ["Passport", "ID", "Visa", "Lease", "Insurance policy", "Medical record", "Receipt", "Warranty", "Contract", "Certificate"] },
        { name: "ownerName", label: "Owner name", placeholder: "Person or household" },
        { name: "expiryDate", label: "Expiry date", type: "date" },
        { name: "fileUrl", label: "Private file URL", type: "url", placeholder: "Firebase Storage download URL" },
        { name: "storagePath", label: "Storage path", placeholder: "users/{uid}/documents/..." },
        { name: "tags", label: "Tags", placeholder: "travel, identity" },
        { name: "notes", label: "Notes", type: "textarea" }
      ]}
      columns={[
        { key: "title", label: "Document" },
        { key: "type", label: "Type" },
        { key: "ownerName", label: "Owner" },
        { key: "expiryDate", label: "Expiry" },
        { key: "tags", label: "Tags", format: (value) => (Array.isArray(value) ? value.join(", ") : String(value ?? "-")) }
      ]}
      emptyTitle="Your vault is empty"
      emptyBody="Start with IDs, passports, visas, leases, policies, receipts, and warranties. Files stay under your user-scoped Firebase Storage path."
    />
  );
}
