import { STATUS_LABELS, taskProgress, type Task } from "./tasks";

export type Summary = { subject: string; text: string; html: string };

const DAY_MS = 86_400_000;

// Midnight (JST) of today, as a UTC-based Date for day math.
function jstTodayMs(): number {
  const j = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return Date.UTC(j.getUTCFullYear(), j.getUTCMonth(), j.getUTCDate());
}

// Whole-day difference between a "YYYY-MM-DD" due date and today (JST).
function dueDiffDays(due: string, todayMs: number): number {
  const [y, m, d] = due.split("-").map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - todayMs) / DAY_MS);
}

function mmdd(due: string): string {
  return due.slice(5).replaceAll("-", "/");
}

function assigneeName(a: string | null): string {
  return a && a.trim() ? a.trim() : "担当者なし";
}

function isAfter(iso: string | null, since: string): boolean {
  return !!iso && new Date(iso).getTime() > new Date(since).getTime();
}

/**
 * Build a progress-summary email. `lastSentAt` is the previous send time, used
 * for the "changes since last time" section (null on the first send).
 */
export function buildProgressSummary(
  tasks: Task[],
  opts: { dateLabel: string; lastSentAt: string | null },
): Summary {
  const { dateLabel, lastSentAt } = opts;
  const todayMs = jstTodayMs();
  const { done, total, percent } = taskProgress(tasks);

  // --- Deadlines: overdue / due today / due within 3 days (incomplete only) ---
  const deadline = tasks
    .filter((t) => t.status !== "done" && t.due_date)
    .map((t) => ({ t, diff: dueDiffDays(t.due_date as string, todayMs) }))
    .filter((x) => x.diff <= 3)
    .sort((a, b) => a.diff - b.diff)
    .map(({ t, diff }) => {
      const label =
        diff < 0 ? `${-diff}日超過` : diff === 0 ? "本日締切" : `あと${diff}日`;
      return {
        label,
        line: `[${label}] ${t.title}   担当: ${assigneeName(t.assignee)}   期限 ${mmdd(t.due_date as string)}（${STATUS_LABELS[t.status]}）`,
      };
    });

  // --- Changes since last send ---
  const completed = lastSentAt
    ? tasks.filter((t) => t.status === "done" && isAfter(t.completed_at, lastSentAt))
    : [];
  const added = lastSentAt
    ? tasks.filter((t) => isAfter(t.created_at, lastSentAt))
    : [];

  // --- Per-assignee progress ---
  const byAssignee = new Map<string, { total: number; done: number }>();
  for (const t of tasks) {
    const key = assigneeName(t.assignee);
    const cur = byAssignee.get(key) ?? { total: 0, done: 0 };
    cur.total += 1;
    if (t.status === "done") cur.done += 1;
    byAssignee.set(key, cur);
  }
  const assignees = [...byAssignee.entries()].sort((a, b) =>
    a[0] === "担当者なし" ? 1 : b[0] === "担当者なし" ? -1 : a[0].localeCompare(b[0]),
  );

  const appUrl = process.env.APP_URL ?? "https://manage-task-drab.vercel.app";

  // ---------------- Plain text ----------------
  const textLines: string[] = [
    `進捗サマリ (${dateLabel})`,
    "",
    "■ チーム全体の進捗",
    `   完了 ${done} / ${total} タスク（${percent}%）`,
    "",
    "■ 要注意（期限超過・期限が近い）",
  ];
  if (deadline.length === 0) {
    textLines.push("   期限超過・期限が近いタスクはありません");
  } else {
    for (const d of deadline) textLines.push(`   ${d.line}`);
  }
  textLines.push("", "■ 前回からの変化");
  if (!lastSentAt) {
    textLines.push("   （初回送信のため、前回からの差分はありません）");
  } else if (completed.length === 0 && added.length === 0) {
    textLines.push("   前回から変化はありません");
  } else {
    textLines.push(`   完了になった: ${completed.length}件`);
    for (const t of completed)
      textLines.push(`      ・${t.title}（担当: ${assigneeName(t.assignee)}）`);
    textLines.push(`   新しく追加: ${added.length}件`);
    for (const t of added)
      textLines.push(`      ・${t.title}（担当: ${assigneeName(t.assignee)}）`);
  }
  textLines.push("", "■ 担当者別の進捗");
  for (const [name, c] of assignees) {
    const p = c.total === 0 ? 0 : Math.round((c.done / c.total) * 100);
    textLines.push(`   ${name}   ${c.done} / ${c.total} 完了（${p}%）`);
  }
  textLines.push("", `進捗管理を開く: ${appUrl}/tasks`);
  const text = textLines.join("\n");

  // ---------------- HTML ----------------
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const deadlineHtml =
    deadline.length === 0
      ? `<p style="margin:4px 0;color:#6b7280;">期限超過・期限が近いタスクはありません</p>`
      : `<ul style="margin:4px 0;padding-left:20px;">${deadline
          .map(
            (d) =>
              `<li style="color:${d.label.includes("超過") ? "#b91c1c" : "#92400e"};">${esc(d.line)}</li>`,
          )
          .join("")}</ul>`;
  let changesHtml: string;
  if (!lastSentAt) {
    changesHtml = `<p style="margin:4px 0;color:#6b7280;">（初回送信のため、前回からの差分はありません）</p>`;
  } else if (completed.length === 0 && added.length === 0) {
    changesHtml = `<p style="margin:4px 0;color:#6b7280;">前回から変化はありません</p>`;
  } else {
    changesHtml = `
      <p style="margin:4px 0;">✅ 完了になった: <strong>${completed.length}</strong>件</p>
      <ul style="margin:0 0 8px;padding-left:20px;">${completed.map((t) => `<li>${esc(t.title)}（担当: ${esc(assigneeName(t.assignee))}）</li>`).join("")}</ul>
      <p style="margin:4px 0;">＋ 新しく追加: <strong>${added.length}</strong>件</p>
      <ul style="margin:0;padding-left:20px;">${added.map((t) => `<li>${esc(t.title)}（担当: ${esc(assigneeName(t.assignee))}）</li>`).join("")}</ul>`;
  }
  const assigneeHtml = assignees
    .map(([name, c]) => {
      const p = c.total === 0 ? 0 : Math.round((c.done / c.total) * 100);
      return `<li>${esc(name)}: <strong>${c.done} / ${c.total}</strong> 完了（${p}%）</li>`;
    })
    .join("");

  const html = `
    <div style="font-family: system-ui, sans-serif; color: #1f2937; line-height:1.6;">
      <h2 style="margin:0 0 12px;">進捗サマリ (${dateLabel})</h2>
      <h3 style="margin:16px 0 4px;">チーム全体の進捗</h3>
      <p style="margin:0;">完了 <strong>${done} / ${total}</strong> タスク（${percent}%）</p>
      <h3 style="margin:16px 0 4px;color:#b91c1c;">⚠ 要注意（期限超過・期限が近い）</h3>
      ${deadlineHtml}
      <h3 style="margin:16px 0 4px;">前回からの変化</h3>
      ${changesHtml}
      <h3 style="margin:16px 0 4px;">担当者別の進捗</h3>
      <ul style="margin:4px 0;padding-left:20px;">${assigneeHtml}</ul>
      <p style="margin:16px 0 0;"><a href="${appUrl}/tasks" style="color:#15803d;font-weight:600;">進捗管理を開く ▶</a></p>
    </div>
  `.trim();

  return { subject: `進捗サマリ (${dateLabel})`, text, html };
}
