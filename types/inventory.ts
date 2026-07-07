export type InventoryItem = {
  id: string;
  name: string;
  category: string;
  purchaseDate?: string;
  purchasePrice?: number;
  currency: string;
  warrantyExpiryDate?: string;
  receiptDocumentId?: string;
  imageUrl?: string;
  storagePath?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};
