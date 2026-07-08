import { supabase } from "./supabase";

export type TaskStatus = "todo" | "in_progress" | "done";

// Single source of truth for the valid statuses. STATUS_ORDER (below) reuses
// this, and isTaskStatus() guards untrusted values (e.g. rows from the DB).
const TASK_STATUSES = ["todo", "in_progress", "done"] as const;

export function isTaskStatus(value: unknown): value is TaskStatus {
  return (
    typeof value === "string" &&
    (TASK_STATUSES as readonly string[]).includes(value)
  );
}

export type Task = {
  id: string;
  title: string;
  assignee: string | null;
  due_date: string | null;
  status: TaskStatus;
  parent_id: string | null;
  created_by: string | null;
  created_at: string;
  completed_at: string | null;
};

// Presentation metadata for each status, kept together so the label, the
// display order, and the badge color can never drift apart across files.
export const STATUS_META: Record<
  TaskStatus,
  { label: string; badgeClass: string }
> = {
  todo: { label: "未着手", badgeClass: "bg-zinc-100 text-zinc-600" },
  in_progress: { label: "進行中", badgeClass: "bg-blue-100 text-blue-700" },
  done: { label: "完了", badgeClass: "bg-green-100 text-green-700" },
};

export const STATUS_ORDER: TaskStatus[] = [...TASK_STATUSES];

// Backward-compatible label map derived from STATUS_META (other modules/branches
// still import STATUS_LABELS). STATUS_META remains the single source of truth.
export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: STATUS_META.todo.label,
  in_progress: STATUS_META.in_progress.label,
  done: STATUS_META.done.label,
};

// Columns fetched from the DB. Listing them explicitly (instead of "*") means
// the client-side Task type and the query never silently diverge.
const TASK_COLUMNS =
  "id, title, assignee, due_date, status, parent_id, created_by, created_at, completed_at";

// Normalize an untyped DB row into a Task. An unexpected status falls back to
// "todo" so an unknown value can't break status-keyed UI (labels, colors).
function normalizeTask(row: Record<string, unknown>): Task {
  return {
    id: String(row.id),
    title: typeof row.title === "string" ? row.title : "",
    assignee: typeof row.assignee === "string" ? row.assignee : null,
    due_date: typeof row.due_date === "string" ? row.due_date : null,
    status: isTaskStatus(row.status) ? row.status : "todo",
    parent_id: typeof row.parent_id === "string" ? row.parent_id : null,
    created_by: typeof row.created_by === "string" ? row.created_by : null,
    created_at: typeof row.created_at === "string" ? row.created_at : "",
    completed_at:
      typeof row.completed_at === "string" ? row.completed_at : null,
  };
}

/** Fetch all tasks, oldest first. */
export async function listTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_COLUMNS)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(normalizeTask);
}

export type NewTask = {
  title: string;
  assignee?: string;
  dueDate?: string;
  status: TaskStatus;
  parentId?: string | null;
};

/** Create a task. created_by is filled by the DB (auth.uid()). */
export async function createTask(input: NewTask): Promise<Task> {
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      title: input.title,
      assignee: input.assignee || null,
      due_date: input.dueDate || null,
      status: input.status,
      parent_id: input.parentId ?? null,
      completed_at: input.status === "done" ? new Date().toISOString() : null,
    })
    .select(TASK_COLUMNS)
    .single();
  if (error) throw error;
  return normalizeTask(data);
}

/** Team-wide progress: how many tasks are done out of all tasks. */
export function taskProgress(tasks: Task[]): {
  done: number;
  total: number;
  percent: number;
} {
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "done").length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  return { done, total, percent };
}

/** Update a task's status. */
export async function updateTaskStatus(
  id: string,
  status: TaskStatus,
): Promise<void> {
  const { error } = await supabase
    .from("tasks")
    .update({
      status,
      completed_at: status === "done" ? new Date().toISOString() : null,
    })
    .eq("id", id);
  if (error) throw error;
}

export type TaskNode = { task: Task; children: Task[] };

/**
 * Group a flat task list into a 2-level tree.
 *
 * A task becomes a root when it has no parent, when its parent is missing
 * (an orphan — e.g. the parent was deleted), or when its parent is itself a
 * child (we only render 2 levels, so a "grandchild" is surfaced as a root
 * rather than being silently dropped from the list). Every task therefore
 * appears exactly once. Input order is preserved.
 */
export function buildTaskTree(tasks: Task[]): TaskNode[] {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const childrenByParent = new Map<string, Task[]>();
  const roots: Task[] = [];

  for (const task of tasks) {
    const parent = task.parent_id ? byId.get(task.parent_id) : undefined;
    if (!parent || parent.parent_id) {
      roots.push(task);
    } else {
      const siblings = childrenByParent.get(parent.id) ?? [];
      siblings.push(task);
      childrenByParent.set(parent.id, siblings);
    }
  }

  return roots.map((task) => ({
    task,
    children: childrenByParent.get(task.id) ?? [],
  }));
}
