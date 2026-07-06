"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  createTask,
  listTasks,
  STATUS_LABELS,
  STATUS_ORDER,
  type Task,
  type TaskStatus,
} from "@/lib/tasks";

// Badge colors per status.
const STATUS_STYLE: Record<TaskStatus, string> = {
  todo: "bg-zinc-100 text-zinc-600",
  in_progress: "bg-blue-100 text-blue-700",
  done: "bg-green-100 text-green-700",
};

function formatDue(due: string | null): string {
  return due ? due.replaceAll("-", "/") : "期限なし";
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    listTasks()
      .then(setTasks)
      .catch((err) => {
        console.error(err);
        setError("タスクの読み込みに失敗しました。");
      })
      .finally(() => setLoaded(true));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(undefined);
    try {
      const created = await createTask({
        title: title.trim(),
        assignee: assignee.trim(),
        dueDate,
        status,
      });
      setTasks((prev) => [...prev, created]);
      // Reset the form (keep the chosen status for quick repeated entry).
      setTitle("");
      setAssignee("");
      setDueDate("");
    } catch (err) {
      console.error(err);
      setError("登録に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900">進捗管理</h1>
        <Link href="/" className="text-sm text-zinc-500 hover:underline">
          ← トップに戻る
        </Link>
      </div>

      {/* Registration form */}
      <form
        onSubmit={onSubmit}
        className="mb-8 flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-md ring-1 ring-black/5"
      >
        <h2 className="text-lg font-semibold text-zinc-800">タスクを登録</h2>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-zinc-700">内容</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="例：ログイン画面の設計"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
          />
        </label>

        <div className="flex flex-col gap-4 sm:flex-row">
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-sm font-medium text-zinc-700">担当者</span>
            <input
              type="text"
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              placeholder="例：畠山"
              className="rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
            />
          </label>

          <label className="flex flex-1 flex-col gap-1">
            <span className="text-sm font-medium text-zinc-700">期限</span>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
            />
          </label>

          <label className="flex flex-1 flex-col gap-1">
            <span className="text-sm font-medium text-zinc-700">状態</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
            >
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={saving || !title.trim()}
          className="self-start rounded-lg bg-zinc-900 px-5 py-2 font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50"
        >
          {saving ? "登録中…" : "登録する"}
        </button>
      </form>

      {/* Task list */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-zinc-800">
          タスク一覧（{tasks.length}）
        </h2>

        {!loaded ? (
          <p className="text-sm text-zinc-400">読み込み中…</p>
        ) : tasks.length === 0 ? (
          <p className="text-sm text-zinc-400">
            まだタスクがありません。上のフォームから登録してみましょう。
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {tasks.map((task) => (
              <li
                key={task.id}
                className="flex items-center justify-between gap-3 rounded-lg bg-white px-4 py-3 shadow-sm ring-1 ring-black/5"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-zinc-900">
                    {task.title}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {task.assignee || "担当者なし"} ・ {formatDue(task.due_date)}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[task.status]}`}
                >
                  {STATUS_LABELS[task.status]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
