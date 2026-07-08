"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(undefined);
    setMessage(undefined);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name: name.trim() } },
    });
    if (error) {
      setError("登録に失敗しました。入力内容をご確認ください。");
      setLoading(false);
      return;
    }
    // When email confirmation is disabled, a session is returned right away.
    // Otherwise the user must confirm via the email link before logging in.
    if (data.session) {
      router.replace("/");
      return;
    }
    setMessage(
      "確認メールを送信しました。メール内のリンクをクリックして登録を完了してください。",
    );
    setLoading(false);
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-center text-2xl font-bold tracking-wide text-zinc-900">
          新規登録
        </h1>

        <form
          onSubmit={onSubmit}
          className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-md ring-1 ring-black/5"
        >
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-zinc-700">表示名</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例：畠山"
              required
              className="rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
            />
            <span className="text-xs text-zinc-400">
              トップ画面の「ようこそ ○○さん」に表示されます
            </span>
          </label>

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
              autoComplete="new-password"
              required
              minLength={6}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
            />
            <span className="text-xs text-zinc-400">6文字以上</span>
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-green-700">{message}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50"
          >
            {loading ? "登録中…" : "登録する"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-zinc-600">
          すでにアカウントをお持ちの方は{" "}
          <Link href="/login" className="font-medium text-zinc-900 underline">
            ログイン
          </Link>
        </p>
      </div>
    </div>
  );
}
