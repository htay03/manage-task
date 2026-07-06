"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

/** Logout button. Signs out from Supabase, then returns to the login page. */
export default function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <button type="button" className={className} onClick={handleLogout}>
      ログアウト
    </button>
  );
}
