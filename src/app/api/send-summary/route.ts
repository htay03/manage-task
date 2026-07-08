import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { buildProgressSummary } from "@/lib/summary";
import { sendMail } from "@/lib/mailer";
import { nowJst, jstMidnightInstantMs } from "@/lib/jst";
import { isDue } from "@/lib/schedule";
import type { SupabaseClient } from "@supabase/supabase-js";
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

/**
 * Atomically "claim" today's scheduled slot (1-4). The UPDATE only matches when
 * we have not sent since JST midnight, so if two cron runs overlap, exactly one
 * update affects a row and only that run proceeds to send. Returns whether this
 * run won the claim.
 */
async function claimDailySlot(
  admin: SupabaseClient,
  id: string,
  nowMs: number,
): Promise<boolean> {
  const boundaryIso = new Date(jstMidnightInstantMs(nowMs)).toISOString();
  const { data, error } = await admin
    .from("email_settings")
    .update({ last_sent_at: new Date(nowMs).toISOString() })
    .eq("id", id)
    .or(`last_sent_at.is.null,last_sent_at.lt.${boundaryIso}`)
    .select("id");
  if (error) throw error;
  return (data?.length ?? 0) > 0;
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
  let requesterEmail: string | null = null;
  if (cronSecret && token === cronSecret) {
    authorized = true; // called by the scheduler
  } else if (token) {
    const { data: userData, error: userErr } =
      await supabaseAdmin.auth.getUser(token);
    if (userErr) console.error("getUser failed:", userErr);
    authorized = !!userData?.user; // called by a logged-in user (test button)
    requesterEmail = userData?.user?.email ?? null;
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

  // Load the single team-wide settings row. Distinguish a DB error (500) from a
  // genuinely-missing row (null), so a DB outage isn't mistaken for "no settings".
  const { data: settings, error: settingsErr } = await supabaseAdmin
    .from("email_settings")
    .select(
      "id, recipients, frequency, day_of_week, send_time, enabled, last_sent_at",
    )
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle<EmailSettingsRow>();
  if (settingsErr) {
    console.error("load email_settings failed:", settingsErr);
    return NextResponse.json(
      { error: "設定の取得に失敗しました。" },
      { status: 500 },
    );
  }

  // Remember the previous send time BEFORE we claim (claiming overwrites it, but
  // the summary's "changes since last time" needs the real previous value).
  const prevLastSentAt = settings?.last_sent_at ?? null;

  // Scheduled call: only proceed when it is actually due, then atomically claim
  // today's slot so overlapping runs can't double-send.
  let claimed = false;
  if (body.scheduled) {
    if (!settings) return NextResponse.json({ skipped: "no settings" });
    if (!isDue(settings)) return NextResponse.json({ skipped: "not due" });
    claimed = await claimDailySlot(supabaseAdmin, settings.id, Date.now());
    if (!claimed) {
      return NextResponse.json({ skipped: "already sent today" });
    }
  }

  // Decide who to send to. A test send may only target the requester's own
  // address, so the endpoint can't be used to send to arbitrary recipients.
  let recipients: string[];
  if (body.testRecipient) {
    const target = body.testRecipient.trim().toLowerCase();
    if (requesterEmail && target !== requesterEmail.toLowerCase()) {
      return NextResponse.json(
        { error: "テスト送信は自分のアドレス宛てのみ可能です。" },
        { status: 403 },
      );
    }
    recipients = [body.testRecipient.trim()].filter(Boolean);
  } else {
    recipients = (settings?.recipients ?? "")
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean);
  }
  if (recipients.length === 0) {
    if (claimed) await releaseClaim(supabaseAdmin, settings!.id, prevLastSentAt);
    return NextResponse.json(
      { error: "送信先が設定されていません。" },
      { status: 400 },
    );
  }

  // Read all tasks (service role bypasses RLS).
  const { data: tasks, error: tasksErr } = await supabaseAdmin
    .from("tasks")
    .select(
      "id, title, assignee, due_date, status, parent_id, created_by, created_at, completed_at",
    )
    .order("created_at", { ascending: true });
  if (tasksErr) {
    console.error("load tasks failed:", tasksErr);
    if (claimed) await releaseClaim(supabaseAdmin, settings!.id, prevLastSentAt);
    return NextResponse.json(
      { error: "タスクの取得に失敗しました。" },
      { status: 500 },
    );
  }

  const jl = nowJst();
  const dateLabel = `${jl.getUTCFullYear()}/${jl.getUTCMonth() + 1}/${jl.getUTCDate()}`;
  const summary = buildProgressSummary((tasks ?? []) as Task[], {
    dateLabel,
    lastSentAt: prevLastSentAt,
  });

  try {
    await sendMail({
      to: recipients,
      subject: summary.subject,
      text: summary.text,
      html: summary.html,
    });
  } catch (err) {
    console.error("sendMail failed:", err);
    // Release the claim so the next scheduled run retries today's send.
    if (claimed) await releaseClaim(supabaseAdmin, settings!.id, prevLastSentAt);
    return NextResponse.json(
      { error: "メール送信に失敗しました。SMTP設定をご確認ください。" },
      { status: 500 },
    );
  }

  // Success. For scheduled sends the claim already recorded last_sent_at.
  return NextResponse.json({ ok: true, sentTo: recipients });
}

/** Undo a claim (restore the previous last_sent_at) when the send didn't happen. */
async function releaseClaim(
  admin: SupabaseClient,
  id: string,
  prev: string | null,
): Promise<void> {
  const { error } = await admin
    .from("email_settings")
    .update({ last_sent_at: prev })
    .eq("id", id);
  if (error) console.error("releaseClaim failed:", error);
}
