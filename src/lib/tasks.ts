import { supabase } from "./supabase";

export type TaskStatus = "todo" | "in_progress" | "done";

export type Task = {
  id: string;
  title: string;
  assignee: string | null;
  due_date: string | null;
  status: TaskStatus;
  parent_id: string | null;
  created_by: string | null;
  created_at: string;
};

// Japanese labels for each status (DB stores the English id).
export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "未着手",
  in_progress: "進行中",
  done: "完了",
};

export const STATUS_ORDER: TaskStatus[] = ["todo", "in_progress", "done"];

/** Fetch all tasks, oldest first. */
export async function listTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Task[];
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
    })
    .select()
    .single();
  if (error) throw error;
  return data as Task;
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
    .update({ status })
    .eq("id", id);
  if (error) throw error;
}
