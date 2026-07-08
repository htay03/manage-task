"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import {
  describePasskeyError,
  isPasskeySupported,
  passkeyRegisteredKey,
} from "@/lib/passkey";

/** Lets the logged-in user create a passkey for their account. */
export default function PasskeyRegisterButton() {
  const { session } = useAuth();
  const userId = session?.user.id;

  const [supported, setSupported] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();

  // Feature detection + "already registered on this device" hint. Both read
  // browser-only APIs, so they run in an effect to avoid a hydration mismatch.
  useEffect(() => {
    setSupported(isPasskeySupported());
  }, []);
  useEffect(() => {
    if (!userId) return;
    setRegistered(localStorage.getItem(passkeyRegisteredKey(userId)) === "1");
  }, [userId]);

  async function onRegister() {
    setLoading(true);
    setMessage(undefined);
    setError(undefined);
    try {
      const { error } = await supabase.auth.registerPasskey();
      if (error) throw error;
      if (userId) localStorage.setItem(passkeyRegisteredKey(userId), "1");
      setRegistered(true);
      setMessage("パスキーを登録しました。次回からパスキーでログインできます。");
    } catch (err) {
      console.error(err);
      const { canceled, message } = describePasskeyError(err);
      // Stay silent if the user simply cancelled the OS dialog.
      if (!canceled) setError(message || "パスキーの登録に失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  // Don't offer passkeys on browsers that can't do WebAuthn.
  if (!supported) return null;

  return (
    <div className="flex flex-col items-center gap-1">
      {registered && (
        <p className="text-xs text-zinc-500">✓ このデバイスで登録済み</p>
      )}
      <button
        type="button"
        onClick={onRegister}
        disabled={loading}
        className="rounded-full border border-[#15803d] px-4 py-1.5 text-sm font-medium text-[#15803d] transition hover:bg-[#15803d] hover:text-white disabled:opacity-50"
      >
        {loading
          ? "登録中…"
          : registered
            ? "🔑 パスキーを再登録"
            : "🔑 パスキーを登録"}
      </button>
      {message && <p className="text-xs text-green-700">{message}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
