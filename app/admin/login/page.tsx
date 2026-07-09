import { redirect } from "next/navigation";
import { AdminLoginClient } from "@/components/admin/admin-login-client";
import { adminConfigured, getAdminSession } from "@/lib/admin/session";

export const metadata = { title: "Duewise Admin — Sign in" };

export default async function AdminLoginPage() {
  const configured = adminConfigured();
  if (configured) {
    const session = await getAdminSession();
    if (session) redirect("/admin");
  }
  return <AdminLoginClient configured={configured} />;
}
