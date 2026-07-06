import Link from "next/link";

// 植林 (placeholder page; the owner will build the real feature later).
//
// Note for the owner: the whole screen should gradually turn greener
// (grass, trees, flowers) as more tasks are completed — an image of the
// entire view growing lush, not just a single tree. The completion count
// is meant to come from the 進捗管理 feature's data.
export default function ForestPage() {
  return (
    <main style={{ padding: 40, fontFamily: "system-ui, sans-serif" }}>
      <h1>植林（準備中）</h1>
      <p>この機能はこれから担当者が作ります。</p>
      <p>進捗が進むほど、この画面全体の緑が育っていく予定です。</p>
      <Link href="/">← トップに戻る</Link>
    </main>
  );
}
