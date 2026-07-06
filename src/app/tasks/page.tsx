import Link from "next/link";

// 進捗管理 (placeholder page; the owner will build the real feature later).
export default function TasksPage() {
  return (
    <main style={{ padding: 40, fontFamily: "system-ui, sans-serif" }}>
      <h1>進捗管理（準備中）</h1>
      <p>この機能はこれから担当者が作ります。</p>
      <Link href="/">← トップに戻る</Link>
    </main>
  );
}
