"use client";

import { onAuthStateChanged, User } from "firebase/auth";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { auth } from "@/lib/firebase/client";
import { apiFetch } from "@/lib/api/client";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  mfaPending: boolean;
};

const AuthContext = createContext<AuthContextValue>({ user: null, loading: true, mfaPending: false });

const publicPaths = ["/login", "/signup"];
const isAdminPath = (pathname: string) => pathname === "/admin" || pathname.startsWith("/admin/");

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [mfaPending, setMfaPending] = useState(false);
  const [mfaChecking, setMfaChecking] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
  }, []);

  // Ensure the shallow `users/{uid}` profile document exists / stays in sync on sign-in.
  useEffect(() => {
    if (!user) {
      setMfaPending(false);
      setMfaChecking(false);
      return;
    }

    let alive = true;
    async function checkMfa() {
      setMfaChecking(true);
      try {
        const status = await apiFetch<{ data: { enabled: boolean; verified: boolean } }>("/api/mfa/status");
        if (!alive) return;
        const pending = status.data.enabled && !status.data.verified;
        setMfaPending(pending);
        if (pending) {
          window.sessionStorage.setItem("duewise:mfa-pending", "1");
          if (pathname !== "/login") router.replace("/login");
          return;
        }
        window.sessionStorage.removeItem("duewise:mfa-pending");
        apiFetch("/api/me", { method: "POST" }).catch(() => undefined);
      } catch {
        if (alive) setMfaPending(false);
      } finally {
        if (alive) setMfaChecking(false);
      }
    }

    void checkMfa();
    return () => {
      alive = false;
    };
  }, [pathname, router, user]);

  useEffect(() => {
    if (loading || mfaChecking) return;
    // The admin console has its own auth; never redirect it through the user flow.
    if (isAdminPath(pathname)) return;
    const isPublic = publicPaths.includes(pathname);
    if (!user && !isPublic) router.replace("/login");
    if (user && isPublic && !mfaPending) router.replace("/dashboard");
  }, [loading, mfaChecking, mfaPending, pathname, router, user]);

  const value = useMemo(() => ({ user, loading: loading || mfaChecking || mfaPending, mfaPending }), [mfaChecking, mfaPending, user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
