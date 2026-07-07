import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { buildProgressSummary } from "@/lib/summary";
import { sendMail } from "@/lib/mailer";
import type { Task } from "@/lib/tasks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type EmailSettingsRow = {
  id: string;
  recipients: string | null;
  frequency: "daily" | "weekly";
  day_of_week: number | null;
  send_time: string; // "HH:MM:SS"
  enabled: boolean;
  last_sent_at: string | null;
};

// Current wall-clock time in JST. Read its fields with getUTC* (it is shifted +9h).
function nowJst(): Date {
  return new Date(Date.now() + 9 * 60 * 60 * 1000);
}

function minutesOfDay(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

function jstDateKey(d: Date): string {
  return `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`;
}

// Should the scheduled send fire now, given the schedule and when we last sent?
function isDue(s: EmailSettingsRow): boolean {
  if (!s.enabled) return false;
  const now = nowJst();
  // Weekly: only on the configured weekday.
  if (
    s.frequency === "weekly" &&
    s.day_of_week !== null &&
    now.getUTCDay() !== s.day_of_week
  ) {
    return false;
  }
  // At or after the configured time-of-day.
  const nowMin = now.getUTCHours() * 60 + now.getUTCMinutes();
  if (nowMin < minutesOfDay(s.send_time)) return false;
  // Not already sent today (JST).
  if (s.last_sent_at) {
    const last = new Date(new Date(s.last_sent_at).getTime() + 9 * 60 * 60 * 1000);
    if (jstDateKey(last) === jstDateKey(now)) return false;
  }
  return true;
}

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

  let body: { testRecipient?: string; scheduled?: boolean } = {};
  try {
    body = await request.json();
  } catch {
    // no body is fine
  }

  // Load the single team-wide settings row.
  const { data: settings } = await supabaseAdmin
    .from("email_settings")
    .select("id, recipients, frequency, day_of_week, send_time, enabled, last_sent_at")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Scheduled call: only proceed when it is actually due.
  if (body.scheduled) {
    if (!settings) return NextResponse.json({ skipped: "no settings" });
    if (!isDue(settings as EmailSettingsRow)) {
      return NextResponse.json({ skipped: "not due" });
    }
  }

  // Decide who to send to.
  let recipients: string[];
  if (body.testRecipient) {
    recipients = [body.testRecipient.trim()].filter(Boolean);
  } else {
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

  const jl = nowJst();
  const dateLabel = `${jl.getUTCFullYear()}/${jl.getUTCMonth() + 1}/${jl.getUTCDate()}`;
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

  // Record last_sent_at for scheduled sends to prevent duplicates.
  if (body.scheduled && settings?.id) {
    await supabaseAdmin
      .from("email_settings")
      .update({ last_sent_at: new Date().toISOString() })
      .eq("id", settings.id);
  }

  return NextResponse.json({ ok: true, sentTo: recipients });
}
