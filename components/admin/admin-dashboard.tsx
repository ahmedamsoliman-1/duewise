"use client";

import {
  Ban,
  CheckCircle2,
  LogOut,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/badge";
import { DuewiseMark } from "@/components/ui/duewise-logo";
import type { PlatformStats, UserProfile } from "@/types";

async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? "Request failed.");
  }
  return response.json() as Promise<T>;
}

function providerLabel(user: UserProfile) {
  if (user.providerIds.includes("google.com")) return "Google";
  if (user.providerIds.includes("password")) return "Email";
  return user.providerIds[0] ?? "unknown";
}

export function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [users, setUsers] = useState<UserProfile[] | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [busyUid, setBusyUid] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const [statsRes, usersRes] = await Promise.all([
        adminFetch<{ data: PlatformStats }>("/api/admin/stats"),
        adminFetch<{ data: UserProfile[] }>("/api/admin/users")
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not load admin data.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!users) return [];
    const needle = query.trim().toLowerCase();
    if (!needle) return users;
    return users.filter((user) =>
      [user.email, user.displayName, user.uid].filter(Boolean).some((value) => value!.toLowerCase().includes(needle))
    );
  }, [users, query]);

  async function toggleDisabled(user: UserProfile) {
    setBusyUid(user.uid);
    setError("");
    try {
      const res = await adminFetch<{ data: UserProfile }>(`/api/admin/users/${user.uid}`, {
        method: "PATCH",
        body: JSON.stringify({ disabled: !user.disabled })
      });
      setUsers((current) => current?.map((item) => (item.uid === user.uid ? res.data : item)) ?? null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not update user.");
    } finally {
      setBusyUid("");
    }
  }

  async function removeUser(user: UserProfile) {
    const label = user.email || user.uid;
    if (!window.confirm(`Permanently delete ${label} and ALL their data? This cannot be undone.`)) return;
    setBusyUid(user.uid);
    setError("");
    try {
      await adminFetch(`/api/admin/users/${user.uid}`, { method: "DELETE" });
      setUsers((current) => current?.filter((item) => item.uid !== user.uid) ?? null);
      void load();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not delete user.");
    } finally {
      setBusyUid("");
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => undefined);
    router.replace("/admin/login");
    router.refresh();
  }

  const statCards = stats
    ? [
        { label: "Total users", value: stats.totalUsers, icon: Users },
        { label: "New (30 days)", value: stats.newLast30Days, icon: UserCheck },
        { label: "2FA enabled", value: stats.mfaUsers, icon: ShieldCheck },
        { label: "Disabled", value: stats.disabledUsers, icon: Ban }
      ]
    : [];

  return (
    <div className="min-h-screen bg-bg">
      {/* Admin top bar */}
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-line bg-bg/85 px-4 backdrop-blur-lg sm:px-8">
        <div className="flex items-center gap-3">
          <DuewiseMark className="h-8 w-8" />
          <div>
            <p className="font-display text-sm font-bold text-ink">Duewise Admin</p>
            <p className="text-xs text-muted">User management console</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => load()}>
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={logout}>
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Log out</span>
          </Button>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-8">
        {error && (
          <p className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-600 dark:text-red-300">
            {error}
          </p>
        )}

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats
            ? statCards.map((stat) => {
                const Icon = stat.icon;
                return (
                  <Card key={stat.label} className="p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-muted">{stat.label}</p>
                      <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-soft text-brand">
                        <Icon className="h-[18px] w-[18px]" />
                      </span>
                    </div>
                    <p className="mt-3 font-display text-3xl font-extrabold text-ink">{stat.value}</p>
                  </Card>
                );
              })
            : Array.from({ length: 4 }).map((_, index) => (
                <Card key={index} className="p-5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="mt-4 h-8 w-14" />
                </Card>
              ))}
        </div>

        {/* Provider breakdown */}
        {stats && Object.keys(stats.providers).length > 0 && (
          <Card>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-ink">Sign-in methods:</span>
              {Object.entries(stats.providers).map(([key, count]) => (
                <Badge key={key} tone="brand">
                  {key} · {count}
                </Badge>
              ))}
            </div>
          </Card>
        )}

        {/* User list */}
        <Card className="p-0">
          <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-lg font-bold text-ink">Users</h2>
              <p className="text-sm text-muted">{users ? `${filtered.length} of ${users.length}` : "Loading…"}</p>
            </div>
            <div className="relative sm:w-80">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                className="h-11 w-full rounded-xl border border-line bg-surface pl-10 pr-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                placeholder="Search email, name, or UID"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </div>

          {!users ? (
            <div className="grid gap-3 p-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="grid place-items-center gap-2 py-14 text-center">
              <Users className="h-8 w-8 text-muted" />
              <p className="text-sm text-muted">{query ? "No users match your search." : "No users yet."}</p>
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="grid gap-3 p-4 md:hidden">
                {filtered.map((user) => (
                  <div key={user.uid} className="rounded-xl border border-line bg-panel/40 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-ink">{user.displayName || "—"}</p>
                        <p className="truncate text-sm text-muted">{user.email}</p>
                      </div>
                      {user.disabled ? <Badge tone="danger">Disabled</Badge> : <Badge tone="success">Active</Badge>}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge tone="neutral">{providerLabel(user)}</Badge>
                      {user.mfaEnabled && <Badge tone="brand">2FA</Badge>}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button variant="secondary" size="sm" disabled={busyUid === user.uid} onClick={() => toggleDisabled(user)}>
                        {user.disabled ? <UserCheck className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                        {user.disabled ? "Enable" : "Disable"}
                      </Button>
                      <Button variant="danger" size="sm" disabled={busyUid === user.uid} onClick={() => removeUser(user)}>
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="border-b border-line bg-panel/50 text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th className="px-5 py-3.5 font-semibold">User</th>
                      <th className="px-5 py-3.5 font-semibold">Method</th>
                      <th className="px-5 py-3.5 font-semibold">2FA</th>
                      <th className="px-5 py-3.5 font-semibold">Status</th>
                      <th className="px-5 py-3.5 font-semibold">Joined</th>
                      <th className="px-5 py-3.5 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filtered.map((user) => (
                      <tr key={user.uid} className="transition-colors hover:bg-panel/40">
                        <td className="px-5 py-3.5">
                          <p className="font-semibold text-ink">{user.displayName || "—"}</p>
                          <p className="text-xs text-muted">{user.email}</p>
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge tone="neutral">{providerLabel(user)}</Badge>
                        </td>
                        <td className="px-5 py-3.5">
                          {user.mfaEnabled ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          {user.disabled ? <Badge tone="danger">Disabled</Badge> : <Badge tone="success">Active</Badge>}
                        </td>
                        <td className="px-5 py-3.5 text-muted">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex justify-end gap-1.5">
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={busyUid === user.uid}
                              onClick={() => toggleDisabled(user)}
                            >
                              {user.disabled ? <UserCheck className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                              {user.disabled ? "Enable" : "Disable"}
                            </Button>
                            <Button variant="danger" size="sm" disabled={busyUid === user.uid} onClick={() => removeUser(user)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
