"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import LogoutButton from "@/components/LogoutButton";
import styles from "./page.module.css";

// Sample progress data (later provided by the 進捗管理 feature; for preview now).
const SAMPLE_PROGRESS = { done: 3, total: 10 };

// A one-liner about the "forest" based on how many tasks are done (later wired to 植林).
function forestMessage(done: number): string {
  if (done <= 0) return "まだ何も植わっていません。最初のタスクを完了してみましょう。";
  if (done < 5) return "苗木がすくすく育っています。🌱";
  if (done < 10) return "若木が並び、緑がにぎやかになってきました。🌿";
  return "森が生い茂りました！みんなの頑張りの成果です。🌳";
}

// Top screen (post-login hub). Shows entries to each feature and today's status.
export default function Home() {
  const { session } = useAuth();
  // AuthGate guarantees a session here; fall back defensively just in case.
  const displayName =
    (session?.user.user_metadata?.name as string | undefined) ??
    session?.user.email ??
    "ゲスト";

  // Entry cards for each feature (placeholder destinations for now).
  const features = [
    { href: "/tasks", emoji: "✅", title: "進捗管理", desc: "タスクや作業状況を管理します。" },
    { href: "/assistant", emoji: "🤖", title: "AI内田さん", desc: "困ったときに相談できるAIです。" },
    { href: "/forest", emoji: "🌱", title: "植林", desc: "進捗が進むほど緑が育ちます。" },
  ];

  const { done, total } = SAMPLE_PROGRESS;
  const percent = Math.round((done / total) * 100);

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <span className={styles.logo}>manage-task</span>
        <div className={styles.userArea}>
          <span>{displayName} さん</span>
          <LogoutButton className={styles.logoutButton} />
        </div>
      </header>

      <section className={styles.hero}>
        <h1 className={styles.title}>ようこそ、{displayName} さん</h1>
        <p className={styles.lead}>
          今日も各機能を使ってみましょう。進捗が進むほど、みんなの森が育っていきます。
        </p>
      </section>

      {/* Entries to each feature. The whole card is a link. */}
      <section className={styles.features}>
        {features.map((f) => (
          <Link key={f.href} href={f.href} className={styles.card}>
            <span className={styles.cardEmoji}>{f.emoji}</span>
            <h2 className={styles.cardTitle}>{f.title}</h2>
            <p className={styles.cardText}>{f.desc}</p>
          </Link>
        ))}
      </section>

      {/* Bottom: current progress and forest status (sample data for now). */}
      <section className={styles.status}>
        <h2 className={styles.statusTitle}>今日のようす</h2>
        <div className={styles.statusGrid}>
          <div className={styles.statusCard}>
            <p className={styles.statusLabel}>現在の進捗</p>
            <p className={styles.statusValue}>
              {done} / {total} タスク完了（{percent}%）
            </p>
            <div className={styles.bar}>
              <div className={styles.barFill} style={{ width: `${percent}%` }} />
            </div>
          </div>
          <div className={styles.statusCard}>
            <p className={styles.statusLabel}>🌱 植林の様子</p>
            <p className={styles.statusValue}>{forestMessage(done)}</p>
          </div>
        </div>
        <p className={styles.statusNote}>
          ※ 今は仮の数値です。進捗管理・植林の機能ができると、ここに実際の状況が反映されます。
        </p>
      </section>
    </main>
  );
}
