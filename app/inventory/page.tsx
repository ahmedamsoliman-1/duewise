"use client";

import { ResourcePage } from "@/components/tables/resource-page";
import { defaultWorkspaceOptions } from "@/lib/options/defaults";
import { inventorySchema } from "@/lib/validators/schemas";

const inventoryTemplates = [
  {
    title: "Laptop",
    description: "Electronics item with warranty and receipt.",
    values: {
      name: "Laptop",
      category: "Electronics",
      currency: "USD",
      notes: "Add serial number, specs, purchase store, warranty terms, and repair history."
    }
  },
  {
    title: "Phone",
    description: "Mobile device with serial/IMEI notes.",
    values: {
      name: "Phone",
      category: "Electronics",
      currency: "USD",
      notes: "Add model, IMEI/serial, purchase store, warranty, and insurance notes."
    }
  },
  {
    title: "Appliance",
    description: "Home appliance warranty tracker.",
    values: {
      name: "Home appliance",
      category: "Appliance",
      currency: "USD",
      notes: "Add model, serial number, installer, warranty provider, and service contacts."
    }
  },
  {
    title: "Jewelry",
    description: "Valuable personal item for insurance.",
    values: {
      name: "Jewelry item",
      category: "Jewelry",
      currency: "USD",
      notes: "Add appraisal value, certificate details, photos, and insurance notes."
    }
  },
  {
    title: "Vehicle",
    description: "Car, motorcycle, or major vehicle asset.",
    values: {
      name: "Vehicle",
      category: "Vehicle",
      currency: "USD",
      notes: "Add VIN/chassis, registration, insurance, service schedule, and warranty details."
    }
  }
];

function prepareInventory(values: Record<string, unknown>) {
  const documentIds = Array.isArray(values.documentIds)
    ? values.documentIds.filter((value): value is string => typeof value === "string" && Boolean(value))
    : [];
  const legacyReceiptId = typeof values.receiptDocumentId === "string" && values.receiptDocumentId ? values.receiptDocumentId : "";
  const uniqueDocumentIds = Array.from(new Set(legacyReceiptId ? [...documentIds, legacyReceiptId] : documentIds));

  return {
    ...values,
    documentIds: uniqueDocumentIds,
    receiptDocumentId: uniqueDocumentIds[0] ?? ""
  };
}

export default function InventoryPage() {
  return (
    <ResourcePage
      title="Inventory"
      description="Catalog valuable household items for warranties, repairs, resale, and insurance claims."
      endpoint="/api/inventory"
      schema={inventorySchema}
      defaults={{ name: "", category: "Electronics", purchaseDate: "", purchasePrice: 0, currency: "USD", warrantyExpiryDate: "", documentIds: [], receiptDocumentId: "", notes: "" }}
      fields={[
        { name: "name", label: "Name", placeholder: "Laptop" },
        { name: "category", label: "Category", type: "select", options: defaultWorkspaceOptions.inventoryCategories, optionSetKey: "inventoryCategories", quickFilter: true },
        { name: "purchaseDate", label: "Purchase date", type: "date" },
        { name: "purchasePrice", label: "Purchase price", type: "number" },
        { name: "currency", label: "Currency", placeholder: "USD" },
        { name: "warrantyExpiryDate", label: "Warranty expiry", type: "date" },
        {
          name: "documentIds",
          label: "Linked documents",
          type: "relations",
          relation: { endpoint: "/api/documents", labelKey: "title", emptyLabel: "Create documents first, then link receipts, warranties, manuals, photos, or invoices here." }
        },
        { name: "notes", label: "Notes", type: "textarea" }
      ]}
      columns={[
        { key: "name", label: "Item" },
        { key: "category", label: "Category" },
        { key: "purchasePrice", label: "Value", format: (value, row) => `${row.currency ?? "USD"} ${Number(value ?? 0).toFixed(2)}` },
        { key: "purchaseDate", label: "Purchased" },
        { key: "warrantyExpiryDate", label: "Warranty" },
        { key: "documentIds", label: "Documents", relation: { endpoint: "/api/documents", labelKey: "title" } }
      ]}
      emptyTitle="No inventory items yet"
      emptyBody="Add appliances, electronics, furniture, jewelry, and other valuable items while the receipt and warranty details are still easy to find."
      templates={inventoryTemplates}
      prepareSubmit={prepareInventory}
      quickFilters={[
        { label: "Has warranty", key: "warrantyExpiryDate", predicate: (item) => Boolean(item.warrantyExpiryDate) },
        { label: "Docs linked", key: "documentIds", predicate: (item) => Array.isArray(item.documentIds) ? item.documentIds.length > 0 : Boolean(item.receiptDocumentId) }
      ]}
    />
  );
}
