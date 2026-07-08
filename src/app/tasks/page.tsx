"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  buildTaskTree,
  createTask,
  listTasks,
  taskProgress,
  updateTaskStatus,
  STATUS_META,
  STATUS_ORDER,
  type Task,
  type TaskStatus,
} from "@/lib/tasks";

function formatDue(due: string | null): string {
  return due ? due.replaceAll("-", "/") : "期限なし";
}

// A single task row (used for both parent and child rows).
// The status is a select so it can be updated inline.
function TaskRow({
  task,
  onChangeStatus,
}: {
  task: Task;
  onChangeStatus: (id: string, status: TaskStatus) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-white px-4 py-3 shadow-sm ring-1 ring-black/5">
      <div className="min-w-0">
        <p className="truncate font-medium text-zinc-900">{task.title}</p>
        <p className="mt-0.5 text-xs text-zinc-500">
          {task.assignee || "担当者なし"} ・ {formatDue(task.due_date)}
        </p>
      </div>
      <select
        value={task.status}
        onChange={(e) => onChangeStatus(task.id, e.target.value as TaskStatus)}
        aria-label="状態"
        className={`shrink-0 cursor-pointer rounded-full border-0 px-2.5 py-1 text-xs font-medium outline-none ${STATUS_META[task.status].badgeClass}`}
      >
        {STATUS_ORDER.map((s) => (
          <option key={s} value={s}>
            {STATUS_META[s].label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [parentId, setParentId] = useState<string>(""); // "" = top-level task
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
        parentId: parentId || null,
      });
      setTasks((prev) => [...prev, created]);
      // Reset the text fields; keep status/parent for quick repeated entry.
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

  async function handleStatusChange(id: string, next: TaskStatus) {
    // Optimistic update. Capture only this task's previous status so a failure
    // rolls back just this row, without clobbering other concurrent updates.
    const previous = tasks.find((t) => t.id === id)?.status;
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, status: next } : t)));
    try {
      await updateTaskStatus(id, next);
    } catch (err) {
      console.error(err);
      if (previous !== undefined) {
        setTasks((ts) =>
          ts.map((t) => (t.id === id ? { ...t, status: previous } : t)),
        );
      }
      setError("状態の更新に失敗しました。");
    }
  }

  // Only top-level tasks (no parent) can be chosen as a parent — keeps it 2 levels.
  const parentOptions = tasks.filter((t) => !t.parent_id);
  // 2-level tree; also surfaces orphans/grandchildren as roots so nothing is hidden.
  const tree = buildTaskTree(tasks);

  const progress = taskProgress(tasks);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900">進捗管理</h1>
        <Link href="/" className="text-sm text-zinc-500 hover:underline">
          ← トップに戻る
        </Link>
      </div>

      {/* Team-wide progress */}
      <div className="mb-8 rounded-2xl bg-white p-6 shadow-md ring-1 ring-black/5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold text-zinc-800">
            チーム全体の進捗
          </h2>
          <span className="text-sm text-zinc-500">
            完了 {progress.done} / {progress.total}
          </span>
        </div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-zinc-100">
          <div
            className="h-full rounded-full bg-green-600 transition-all"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
        <p className="mt-2 text-right text-sm font-medium text-zinc-700">
          {progress.percent}%
        </p>
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

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-zinc-700">親タスク</span>
          <select
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
          >
            <option value="">なし（親タスクとして登録）</option>
            {parentOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
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
                  {STATUS_META[s].label}
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

      {/* Task list (parent tasks with their children indented beneath) */}
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
          <ul className="flex flex-col gap-3">
            {tree.map(({ task: parent, children }) => {
              return (
                <li key={parent.id}>
                  <TaskRow task={parent} onChangeStatus={handleStatusChange} />
                  {children.length > 0 && (
                    <ul className="mt-2 ml-4 flex flex-col gap-2 border-l-2 border-zinc-200 pl-4">
                      {children.map((child) => (
                        <li key={child.id}>
                          <TaskRow
                            task={child}
                            onChangeStatus={handleStatusChange}
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
