import { AdminDashboard } from "@/components/admin/admin-dashboard";

export const metadata = { title: "Duewise Admin" };

export default async function AdminPage() {
  return <AdminDashboard />;
}
