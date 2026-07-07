"use client";

import {
  Boxes,
  CalendarClock,
  CreditCard,
  FileText,
  Home,
  LayoutDashboard,
  LogOut,
  Settings,
  Users
} from "lucide-react";
import { signOut } from "firebase/auth";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { auth } from "@/lib/firebase/client";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/layout/auth-provider";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tasks", label: "Tasks", icon: CalendarClock },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/subscriptions", label: "Subscriptions", icon: CreditCard },
  { href: "/inventory", label: "Inventory", icon: Boxes },
  { href: "/family", label: "Family", icon: Users },
  { href: "/timeline", label: "Timeline", icon: Home },
  { href: "/settings", label: "Settings", icon: Settings }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { loading, user } = useAuth();
  const isPublic = pathname === "/login" || pathname === "/signup";

  if (isPublic) return <>{children}</>;

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-mist text-sm text-ink/60">
        Checking your secure workspace...
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-mist lg:flex">
      <aside className="border-b border-ink/10 bg-white lg:fixed lg:inset-y-0 lg:w-72 lg:border-b-0 lg:border-r">
        <div className="flex h-full flex-col p-4">
          <Link href="/dashboard" className="mb-5 flex items-center gap-3 rounded-md px-2 py-3">
            <span className="grid h-10 w-10 place-items-center rounded-md bg-ink text-white">D</span>
            <span>
              <span className="block text-lg font-semibold">Duewise</span>
              <span className="text-xs text-ink/55">Life admin command center</span>
            </span>
          </Link>
          <nav className="grid gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-ink/70 transition hover:bg-mist hover:text-ink",
                    active && "bg-skyglass text-ink"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <button
            type="button"
            onClick={() => signOut(auth)}
            className="mt-6 flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-ink/60 transition hover:bg-mist hover:text-ink lg:mt-auto"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>
      <main className="min-h-screen px-4 py-5 sm:px-6 lg:ml-72 lg:px-8">{children}</main>
    </div>
  );
}
