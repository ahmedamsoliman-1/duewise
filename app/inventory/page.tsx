"use client";

import { ResourcePage } from "@/components/tables/resource-page";
import { inventorySchema } from "@/lib/validators/schemas";

export default function InventoryPage() {
  return (
    <ResourcePage
      title="Inventory"
      description="Catalog valuable household items for warranties, repairs, resale, and insurance claims."
      endpoint="/api/inventory"
      schema={inventorySchema}
      defaults={{ name: "", category: "Electronics", purchaseDate: "", purchasePrice: 0, currency: "USD", warrantyExpiryDate: "", receiptDocumentId: "", imageUrl: "", storagePath: "", notes: "" }}
      fields={[
        { name: "name", label: "Name", placeholder: "Laptop" },
        { name: "category", label: "Category", type: "select", options: ["Electronics", "Appliance", "Furniture", "Jewelry", "Vehicle", "Tools", "Other"] },
        { name: "purchaseDate", label: "Purchase date", type: "date" },
        { name: "purchasePrice", label: "Purchase price", type: "number" },
        { name: "currency", label: "Currency", placeholder: "USD" },
        { name: "warrantyExpiryDate", label: "Warranty expiry", type: "date" },
        { name: "receiptDocumentId", label: "Receipt document ID" },
        { name: "imageUrl", label: "Image URL", type: "url" },
        { name: "notes", label: "Notes", type: "textarea" }
      ]}
      columns={[
        { key: "name", label: "Item" },
        { key: "category", label: "Category" },
        { key: "purchasePrice", label: "Value", format: (value, row) => `${row.currency ?? "USD"} ${Number(value ?? 0).toFixed(2)}` },
        { key: "purchaseDate", label: "Purchased" },
        { key: "warrantyExpiryDate", label: "Warranty" }
      ]}
      emptyTitle="No inventory items yet"
      emptyBody="Add appliances, electronics, furniture, jewelry, and other valuable items while the receipt and warranty details are still easy to find."
    />
  );
}
