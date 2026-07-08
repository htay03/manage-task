"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  getEmailSettings,
  saveEmailSettings,
  WEEKDAY_LABELS,
  type MailFrequency,
} from "@/lib/emailSettings";

export default function MailSettingsPage() {
  const { session } = useAuth();

  const [settingsId, setSettingsId] = useState<string>();
  const [recipients, setRecipients] = useState("");
  const [frequency, setFrequency] = useState<MailFrequency>("weekly");
  const [dayOfWeek, setDayOfWeek] = useState<number>(1); // Monday
  const [sendTime, setSendTime] = useState("09:00");
  const [enabled, setEnabled] = useState(true);

  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();

  // Test send: default the recipient to the logged-in user's own address.
  const [testRecipient, setTestRecipient] = useState("");
  const [testing, setTesting] = useState(false);
  const [testMessage, setTestMessage] = useState<string>();
  const [testError, setTestError] = useState<string>();

  useEffect(() => {
    if (session?.user.email && !testRecipient) {
      setTestRecipient(session.user.email);
    }
  }, [session, testRecipient]);

  async function onTestSend() {
    setTesting(true);
    setTestMessage(undefined);
    setTestError(undefined);
    try {
      const res = await fetch("/api/send-summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ testRecipient: testRecipient.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "送信に失敗しました。");
      setTestMessage(`テスト送信しました：${(data.sentTo ?? []).join(", ")}`);
    } catch (err) {
      console.error(err);
      setTestError(err instanceof Error ? err.message : "送信に失敗しました。");
    } finally {
      setTesting(false);
    }
  }

  useEffect(() => {
    getEmailSettings()
      .then((s) => {
        if (!s) return;
        setSettingsId(s.id);
        setRecipients(s.recipients);
        setFrequency(s.frequency);
        setDayOfWeek(s.day_of_week ?? 1);
        setSendTime(s.send_time.slice(0, 5)); // "HH:MM:SS" -> "HH:MM"
        setEnabled(s.enabled);
      })
      .catch((err) => {
        console.error(err);
        setError("設定の読み込みに失敗しました。");
      })
      .finally(() => setLoaded(true));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(undefined);
    setMessage(undefined);
    try {
      const saved = await saveEmailSettings(
        {
          recipients: recipients.trim(),
          frequency,
          dayOfWeek: frequency === "weekly" ? dayOfWeek : null,
          sendTime,
          enabled,
        },
        settingsId,
      );
      setSettingsId(saved.id); // keep id so the next save updates the same row
      setMessage("設定を保存しました。");
    } catch (err) {
      console.error(err);
      setError("保存に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900">メール共有の設定</h1>
        <Link href="/tasks" className="text-sm text-zinc-500 hover:underline">
          ← 進捗管理に戻る
        </Link>
      </div>

      <p className="mb-6 text-sm text-zinc-500">
        進捗サマリを定期的にメール送信するための設定です。ここで保存した送信先・頻度・時刻にしたがって、
        自動で送信されます（「自動送信を有効にする」がオンの間）。
      </p>

      {!loaded ? (
        <p className="text-sm text-zinc-400">読み込み中…</p>
      ) : (
        <form
          onSubmit={onSubmit}
          className="flex flex-col gap-5 rounded-2xl bg-white p-6 shadow-md ring-1 ring-black/5"
        >
          {/* Enabled toggle */}
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="h-4 w-4"
              />
              <span className="text-sm font-medium text-zinc-700">
                自動送信を有効にする
              </span>
            </label>
            {!enabled && (
              <p className="mt-1 text-sm text-amber-600">
                ⚠ 現在、自動送信は停止中です（設定は保存できます）。
              </p>
            )}
          </div>

          {/* Recipients */}
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-zinc-700">
              送信先アドレス（複数の場合はカンマ区切り）
            </span>
            <input
              type="text"
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
              placeholder="例：a@example.com, b@example.com"
              className="rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
            />
          </label>

          {/* Frequency */}
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-zinc-700">頻度</span>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as MailFrequency)}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
            >
              <option value="daily">毎日</option>
              <option value="weekly">毎週</option>
            </select>
          </label>

          {/* Day of week (weekly only) */}
          {frequency === "weekly" && (
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-zinc-700">曜日</span>
              <select
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(Number(e.target.value))}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
              >
                {WEEKDAY_LABELS.map((label, i) => (
                  <option key={i} value={i}>
                    {label}曜日
                  </option>
                ))}
              </select>
            </label>
          )}

          {/* Send time */}
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-zinc-700">送信時刻</span>
            <input
              type="time"
              value={sendTime}
              onChange={(e) => setSendTime(e.target.value)}
              className="w-40 rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-green-700">{message}</p>}

          <button
            type="submit"
            disabled={saving}
            className="self-start rounded-lg bg-zinc-900 px-5 py-2 font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50"
          >
            {saving ? "保存中…" : "保存する"}
          </button>
        </form>
      )}

      {/* Test send: send the current progress summary once, to confirm delivery. */}
      {loaded && (
        <div className="mt-8 rounded-2xl bg-white p-6 shadow-md ring-1 ring-black/5">
          <h2 className="text-lg font-semibold text-zinc-800">テスト送信</h2>
          <p className="mt-1 text-sm text-zinc-500">
            現在の進捗サマリを1通だけ送って、届くか確認できます。まずは自分のアドレスでお試しください。
          </p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-sm font-medium text-zinc-700">
                テスト送信先
              </span>
              <input
                type="email"
                value={testRecipient}
                onChange={(e) => setTestRecipient(e.target.value)}
                placeholder="自分のメールアドレス"
                className="rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
              />
            </label>
            <button
              type="button"
              onClick={onTestSend}
              disabled={testing || !testRecipient.trim()}
              className="rounded-lg border border-zinc-300 px-5 py-2 font-medium text-zinc-800 transition hover:bg-zinc-100 disabled:opacity-50"
            >
              {testing ? "送信中…" : "テスト送信"}
            </button>
          </div>
          {testError && <p className="mt-2 text-sm text-red-600">{testError}</p>}
          {testMessage && (
            <p className="mt-2 text-sm text-green-700">{testMessage}</p>
          )}
        </div>
      )}
    </main>
  );
}
