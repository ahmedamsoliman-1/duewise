import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { adminConfigured, getAdminSession } from "@/lib/admin/session";

export const metadata = { title: "Duewise Admin" };

export default async function AdminPage() {
  if (!adminConfigured()) redirect("/admin/login");
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return <AdminDashboard />;
}
