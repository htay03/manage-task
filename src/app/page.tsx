"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";

export default function HomePage() {
  const router = useRouter();
  const { session } = useAuth();

  async function onLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-4 pt-6">
      <header className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-wide text-zinc-900">
            進捗管理
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {session?.user.email} でログイン中
          </p>
        </div>
        <button
          onClick={onLogout}
          className="shrink-0 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 transition hover:bg-zinc-100"
        >
          ログアウト
        </button>
      </header>

      {/* Feature navigation (進捗管理 / AI内田さん / 植林) will be added later. */}
      <p className="mt-16 text-center text-sm text-zinc-400">
        各機能はこれから追加します。
      </p>
    </div>
  );
}
