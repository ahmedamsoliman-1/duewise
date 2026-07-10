import { redirect } from "next/navigation";

export const metadata = { title: "Duewise Admin — Sign in" };

export default async function AdminLoginPage() {
  redirect("/login");
}
