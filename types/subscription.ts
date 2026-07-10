export type BillingCycle = "monthly" | "yearly" | "weekly";
export type SubscriptionStatus = "active" | "paused" | "cancelled";

export type Subscription = {
  id: string;
  name: string;
  category: string;
  cost: number;
  currency: string;
  billingCycle: BillingCycle;
  nextBillingDate: string;
  recurrenceInterval?: "none" | "weekly" | "monthly" | "yearly";
  recurrenceEndDate?: string;
  cancellationUrl?: string;
  status: SubscriptionStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};
