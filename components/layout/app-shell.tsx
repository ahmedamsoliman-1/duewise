"use client";

import {
  Boxes,
  CalendarClock,
  CreditCard,
  FileText,
  Milestone,
  LayoutDashboard,
  LogOut,
  MoonStar,
  MoreHorizontal,
  Settings,
  ShieldCheck,
  Radio,
  Sun,
  Users,
  Waypoints,
  X
} from "lucide-react";
import { signOut } from "firebase/auth";
import { getMessaging, isSupported, onMessage } from "firebase/messaging";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { auth, firebaseApp } from "@/lib/firebase/client";
import { ADMIN_EMAIL } from "@/lib/admin/constants";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/layout/auth-provider";
import { useTheme } from "@/components/layout/theme-provider";
import { DuewiseLogo, DuewiseMark } from "@/components/ui/duewise-logo";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  primary?: boolean;
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, primary: true },
  { href: "/stream", label: "Stream", icon: Radio, primary: true },
  { href: "/tasks", label: "Tasks", icon: CalendarClock, primary: true },
  { href: "/documents", label: "Documents", icon: FileText, primary: true },
  { href: "/subscriptions", label: "Subscriptions", icon: CreditCard },
  { href: "/inventory", label: "Inventory", icon: Boxes },
  { href: "/family", label: "Family", icon: Users },
  { href: "/life-events", label: "Life Events", icon: Milestone },
  { href: "/timeline", label: "Timeline", icon: Waypoints },
  { href: "/settings", label: "Settings", icon: Settings }
];

const primaryItems = navItems.filter((item) => item.primary);
const adminItem: NavItem = { href: "/admin", label: "Admin Console", icon: ShieldCheck };

function initialsFor(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.split("@")[0] || "";
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  const letters = (parts[0]?.[0] ?? "D") + (parts[1]?.[0] ?? "");
  return letters.toUpperCase();
}

function Avatar({ url, initials, className }: { url?: string | null; initials: string; className?: string }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className={cn("h-9 w-9 shrink-0 rounded-lg object-cover", className)} />;
  }
  return (
    <span
      className={cn(
        "grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-gradient text-sm font-bold text-white",
        className
      )}
    >
      {initials}
    </span>
  );
}

function NavLink({ item, active, onClick }: { item: NavItem; active: boolean; onClick?: () => void }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "group relative flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
        active ? "bg-brand-soft text-brand-strong" : "text-ink/65 hover:bg-ink/[0.05] hover:text-ink"
      )}
    >
      {active && <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-brand" />}
      <Icon className={cn("h-[18px] w-[18px]", active ? "text-brand" : "text-ink/50 group-hover:text-ink")} />
      {item.label}
    </Link>
  );
}

async function signOutDuewise() {
  await fetch("/api/mfa/session", { method: "DELETE" }).catch(() => undefined);
  await signOut(auth);
}

function ForegroundNotifications() {
  useEffect(() => {
    let unsubscribe: undefined | (() => void);

    async function listen() {
      if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") return;
      if (!(await isSupported())) return;
      const messaging = getMessaging(firebaseApp);
      unsubscribe = onMessage(messaging, (payload) => {
        const title = payload.notification?.title ?? "Duewise";
        const body = payload.notification?.body ?? "You have life admin that needs attention.";
        const url = payload.data?.url ?? "/dashboard";
        const notification = new Notification(title, { body, icon: "/icon.svg" });
        notification.onclick = () => {
          window.focus();
          window.location.assign(url);
        };
      });
    }

    void listen();
    return () => unsubscribe?.();
  }, []);

  return null;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { loading, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const isPublic =
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/");

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  if (isPublic) return <>{children}</>;

  if (loading || !user) {
    return (
      <main className="grid min-h-screen place-items-center bg-bg">
        <div className="flex flex-col items-center gap-4">
          <DuewiseMark className="h-12 w-12 animate-pulse" />
          <p className="text-sm text-muted">Opening your workspace…</p>
        </div>
      </main>
    );
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const initials = initialsFor(user.displayName, user.email);
  const isAdmin = user.email?.toLowerCase() === ADMIN_EMAIL;

  return (
    <div className="min-h-screen bg-bg lg:flex">
      <ForegroundNotifications />
      {/* Desktop sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col lg:border-r lg:border-line lg:bg-surface">
        <div className="flex h-full flex-col p-4">
          <Link href="/dashboard" className="mb-6 flex items-center rounded-xl px-2 py-2">
            <DuewiseLogo />
          </Link>
          <nav className="flex flex-1 flex-col gap-1">
            {navItems.map((item) => (
              <NavLink key={item.href} item={item} active={isActive(item.href)} />
            ))}
            {isAdmin && (
              <div className="mt-3 border-t border-line pt-3">
                <NavLink item={adminItem} active={isActive(adminItem.href)} />
              </div>
            )}
          </nav>
          <div className="mt-4 border-t border-line pt-3">
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-ink/65 transition-colors hover:bg-ink/[0.05] hover:text-ink"
            >
              {theme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <MoonStar className="h-[18px] w-[18px]" />}
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </button>
            <div
              className={cn(
                "mt-2 flex items-center gap-2 rounded-xl border border-line bg-panel/60 p-2 transition-colors",
                isActive("/profile") && "border-brand/30 bg-brand-soft"
              )}
            >
              <Link
                href="/profile"
                className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-0.5 hover:opacity-90"
                title="Your profile"
              >
                <Avatar url={user.photoURL} initials={initials} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">{user.displayName || "Your account"}</span>
                  <span className="block truncate text-xs text-muted">{user.email}</span>
                </span>
              </Link>
              <button
                type="button"
                onClick={signOutDuewise}
                title="Sign out"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink/55 transition-colors hover:bg-ink/[0.06] hover:text-ink"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-bg/85 px-4 backdrop-blur-lg lg:hidden">
        <Link href="/dashboard" className="flex items-center">
          <DuewiseLogo showTagline={false} />
        </Link>
        <button
          type="button"
          onClick={toggleTheme}
          className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface text-ink/70 transition-colors hover:text-ink"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <MoonStar className="h-[18px] w-[18px]" />}
        </button>
      </header>

      {/* Main content */}
      <main className="min-h-screen px-4 pb-28 pt-5 sm:px-6 lg:ml-72 lg:px-10 lg:pb-12 lg:pt-9">
        <div className="animate-rise">{children}</div>
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg lg:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {primaryItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                  active ? "text-brand-strong" : "text-ink/55"
                )}
              >
                <Icon className={cn("h-5 w-5", active && "text-brand")} />
                {item.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-ink/55"
          >
            <MoreHorizontal className="h-5 w-5" />
            More
          </button>
        </div>
      </nav>

      {/* Mobile "More" sheet */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 animate-fade bg-black/50 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 animate-rise rounded-t-3xl border-t border-line bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
            <div className="mb-4 flex items-center justify-between">
              <Link href="/profile" className="flex min-w-0 items-center gap-3" onClick={() => setMenuOpen(false)}>
                <Avatar url={user.photoURL} initials={initials} className="h-10 w-10 rounded-xl" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{user.displayName || "Your account"}</p>
                  <p className="truncate text-xs text-muted">{user.email} · View profile</p>
                </div>
              </Link>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink/60 hover:bg-ink/[0.06]"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {isAdmin && (
                <Link
                  href={adminItem.href}
                  className={cn(
                    "col-span-2 flex items-center gap-3 rounded-xl border p-3 text-sm font-medium transition-colors",
                    isActive(adminItem.href)
                      ? "border-brand/30 bg-brand-soft text-brand-strong"
                      : "border-line bg-panel/50 text-ink/75 hover:text-ink"
                  )}
                >
                  <ShieldCheck className="h-[18px] w-[18px]" />
                  {adminItem.label}
                </Link>
              )}
              {navItems
                .filter((item) => !item.primary)
                .map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-xl border p-3 text-sm font-medium transition-colors",
                        active
                          ? "border-brand/30 bg-brand-soft text-brand-strong"
                          : "border-line bg-panel/50 text-ink/75 hover:text-ink"
                      )}
                    >
                      <Icon className="h-[18px] w-[18px]" />
                      {item.label}
                    </Link>
                  );
                })}
            </div>
            <button
              type="button"
              onClick={signOutDuewise}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-panel/50 p-3 text-sm font-semibold text-ink/75 hover:text-ink"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
