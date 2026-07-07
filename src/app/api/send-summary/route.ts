import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { buildProgressSummary } from "@/lib/summary";
import { sendMail } from "@/lib/mailer";
import type { Task } from "@/lib/tasks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabaseAdmin = getSupabaseAdmin();

  // AuthZ: allow either the scheduler's CRON_SECRET or a logged-in user's token.
  const token = (request.headers.get("authorization") ?? "").replace(
    /^Bearer\s+/i,
    "",
  );
  const cronSecret = process.env.CRON_SECRET;
  let authorized = false;
  if (cronSecret && token === cronSecret) {
    authorized = true; // called by the scheduler
  } else if (token) {
    const { data: userData } = await supabaseAdmin.auth.getUser(token);
    authorized = !!userData.user; // called by a logged-in user (test button)
  }
  if (!authorized) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { testRecipient?: string } = {};
  try {
    body = await request.json();
  } catch {
    // no body is fine
  }

  // Decide who to send to.
  let recipients: string[];
  if (body.testRecipient) {
    recipients = [body.testRecipient.trim()].filter(Boolean);
  } else {
    const { data: settings } = await supabaseAdmin
      .from("email_settings")
      .select("recipients")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    recipients = (settings?.recipients ?? "")
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean);
  }
  if (recipients.length === 0) {
    return NextResponse.json(
      { error: "送信先が設定されていません。" },
      { status: 400 },
    );
  }

  // Read all tasks (service role bypasses RLS).
  const { data: tasks, error: tasksErr } = await supabaseAdmin
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: true });
  if (tasksErr) {
    return NextResponse.json(
      { error: "タスクの取得に失敗しました。" },
      { status: 500 },
    );
  }

  const now = new Date();
  const dateLabel = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}`;
  const summary = buildProgressSummary((tasks ?? []) as Task[], dateLabel);

  try {
    await sendMail({
      to: recipients,
      subject: summary.subject,
      text: summary.text,
      html: summary.html,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "メール送信に失敗しました。SMTP設定をご確認ください。" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, sentTo: recipients });
}
