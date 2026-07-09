"use client";

import { onAuthStateChanged, User } from "firebase/auth";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { auth } from "@/lib/firebase/client";
import { apiFetch } from "@/lib/api/client";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextValue>({ user: null, loading: true });

const publicPaths = ["/login", "/signup"];
const isAdminPath = (pathname: string) => pathname === "/admin" || pathname.startsWith("/admin/");

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
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
    if (!user) return;
    apiFetch("/api/me", { method: "POST" }).catch(() => undefined);
  }, [user]);

  useEffect(() => {
    if (loading) return;
    // The admin console has its own auth; never redirect it through the user flow.
    if (isAdminPath(pathname)) return;
    const isPublic = publicPaths.includes(pathname);
    if (!user && !isPublic) router.replace("/login");
    if (user && isPublic) router.replace("/dashboard");
  }, [loading, pathname, router, user]);

  const value = useMemo(() => ({ user, loading }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
