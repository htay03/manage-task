"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [pkLoading, setPkLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(undefined);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError("メールアドレスまたはパスワードが正しくありません。");
      setLoading(false);
      return;
    }
    router.replace("/");
  }

  async function onPasskey() {
    setPkLoading(true);
    setError(undefined);
    try {
      const { error } = await supabase.auth.signInWithPasskey();
      if (error) throw error;
      router.replace("/");
    } catch (err) {
      console.error(err);
      setError("パスキーでのログインに失敗しました。");
      setPkLoading(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-center text-2xl font-bold tracking-wide text-zinc-900">
          進捗管理
        </h1>

        <form
          onSubmit={onSubmit}
          className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-md ring-1 ring-black/5"
        >
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-zinc-700">
              メールアドレス
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              className="rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-zinc-700">パスワード</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50"
          >
            {loading ? "ログイン中…" : "ログイン"}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 text-xs text-zinc-400">
            <span className="h-px flex-1 bg-zinc-200" />
            または
            <span className="h-px flex-1 bg-zinc-200" />
          </div>

          <button
            type="button"
            onClick={onPasskey}
            disabled={pkLoading}
            className="rounded-lg border border-zinc-300 px-4 py-2 font-medium text-zinc-800 transition hover:bg-zinc-100 disabled:opacity-50"
          >
            {pkLoading ? "認証中…" : "🔑 パスキーでログイン"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-zinc-600">
          アカウントをお持ちでない方は{" "}
          <Link href="/signup" className="font-medium text-zinc-900 underline">
            新規登録
          </Link>
        </p>
      </div>
    </div>
  );
}
