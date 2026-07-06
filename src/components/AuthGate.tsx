"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "./AuthProvider";

// Pages reachable without being logged in.
const PUBLIC_PATHS = ["/login"];

/** Redirects to /login when signed out, and away from /login when signed in. */
export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isPublic = PUBLIC_PATHS.includes(pathname);

  useEffect(() => {
    if (loading) return;
    if (!session && !isPublic) router.replace("/login");
    if (session && isPublic) router.replace("/");
  }, [loading, session, isPublic, router]);

  if (loading) {
    return (
      <div className="grid flex-1 place-items-center text-zinc-400">
        読み込み中…
      </div>
    );
  }
  // Avoid flashing protected content (or the login form) during a redirect.
  if (!session && !isPublic) return null;
  if (session && isPublic) return null;

  return <>{children}</>;
}
