export type DuewiseDocument = {
  id: string;
  title: string;
  type: string;
  ownerName: string;
  fileUrl?: string;
  storagePath?: string;
  expiryDate?: string;
  tags: string[];
  notes?: string;
  familyMemberId?: string;
  createdAt: string;
  updatedAt: string;
};
