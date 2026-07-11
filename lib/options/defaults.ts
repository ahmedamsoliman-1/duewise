export const defaultWorkspaceOptions = {
  taskCategories: ["Identity", "Vehicle", "Home", "Health", "School", "Tax", "Insurance", "Other"],
  documentTypes: ["Passport", "ID", "Visa", "Lease", "Insurance policy", "Medical record", "Receipt", "Warranty", "Contract", "Certificate"],
  subscriptionCategories: ["Software", "Streaming", "Utilities", "Insurance", "Membership", "Education", "Other"],
  inventoryCategories: ["Electronics", "Appliance", "Furniture", "Jewelry", "Vehicle", "Tools", "Other"]
};

export type WorkspaceOptionSetKey = keyof typeof defaultWorkspaceOptions;
export type WorkspaceOptions = Record<WorkspaceOptionSetKey, string[]>;

export const workspaceOptionGroups: Array<{
  key: WorkspaceOptionSetKey;
  title: string;
  description: string;
}> = [
  {
    key: "taskCategories",
    title: "Task categories",
    description: "Used in Tasks dropdowns and quick filters."
  },
  {
    key: "documentTypes",
    title: "Document types",
    description: "Used in Documents type dropdowns and quick filters."
  },
  {
    key: "subscriptionCategories",
    title: "Subscription categories",
    description: "Used in Subscriptions category dropdowns and quick filters."
  },
  {
    key: "inventoryCategories",
    title: "Inventory categories",
    description: "Used in Inventory category dropdowns and quick filters."
  }
];

export function normalizeOptionList(values: unknown, fallback: string[]) {
  if (!Array.isArray(values)) return fallback;
  const next = values
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);
  return Array.from(new Set(next)).length ? Array.from(new Set(next)) : fallback;
}
