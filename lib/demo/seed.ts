import { addDays, formatISO } from "date-fns";
import { buildReminderDates } from "@/lib/reminders/defaults";

const date = (days: number) => formatISO(addDays(new Date(), days), { representation: "date" });

export const demoData = {
  tasks: [
    {
      title: "Renew passport",
      category: "Identity",
      dueDate: date(42),
      reminderDates: buildReminderDates(date(42)),
      status: "upcoming",
      notes: "Check photo requirements before booking."
    },
    {
      title: "Car registration",
      category: "Vehicle",
      dueDate: date(6),
      reminderDates: buildReminderDates(date(6)),
      status: "due soon",
      notes: "Inspection appointment needed."
    }
  ],
  documents: [
    {
      title: "Apartment lease",
      type: "Lease",
      ownerName: "Household",
      issueDate: date(-290),
      expiryDate: date(75),
      tags: ["home", "contract"],
      notes: "Stored copy for renewal review."
    }
  ],
  subscriptions: [
    {
      name: "Cloud storage",
      category: "Software",
      cost: 9.99,
      currency: "USD",
      billingCycle: "monthly",
      nextBillingDate: date(12),
      status: "active",
      notes: ""
    }
  ],
  inventory: [
    {
      name: "Laptop",
      category: "Electronics",
      purchaseDate: date(-280),
      purchasePrice: 1499,
      currency: "USD",
      warrantyExpiryDate: date(85),
      notes: "Serial number saved in notes."
    }
  ],
  family: [
    {
      name: "Alex",
      relationship: "Partner",
      dateOfBirth: "",
      notes: "Shared household admin."
    }
  ]
} as const;
