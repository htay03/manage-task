"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

/** Lets the logged-in user create a passkey for their account. */
export default function PasskeyRegisterButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();

  async function onRegister() {
    setLoading(true);
    setMessage(undefined);
    setError(undefined);
    try {
      const { error } = await supabase.auth.registerPasskey();
      if (error) throw error;
      setMessage("パスキーを登録しました。次回からパスキーでログインできます。");
    } catch (err) {
      console.error(err);
      setError("パスキーの登録に失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={onRegister}
        disabled={loading}
        className="rounded-full border border-[#15803d] px-4 py-1.5 text-sm font-medium text-[#15803d] transition hover:bg-[#15803d] hover:text-white disabled:opacity-50"
      >
        {loading ? "登録中…" : "🔑 パスキーを登録"}
      </button>
      {message && <p className="text-xs text-green-700">{message}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
