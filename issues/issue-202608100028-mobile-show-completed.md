---
title: "モバイルで完了タスクの表示切替（完了を表示）を使えるようにする"
status: DONE
created: 2026-08-10T00:28:00+09:00
---

# モバイルで完了タスクの表示切替（完了を表示）を使えるようにする

## 背景・前提条件 (Context)

### 期待される挙動 vs 実際の挙動
- **期待**: スマホ画面でも「完了を表示」ボタンから完了済みタスクを表示/非表示に切り替えられる。
- **実際**: 「完了を表示」ボタンに `hidden md:inline-flex` が付いており、md（768px）未満では**ボタン自体がレンダリングされない**。スマホでは完了タスクが一切見えず、「3/5 completed」のカウントだけが見える状態。

### エラーログ / スタックトレース
なし（機能は正常。UI の導線がモバイルで隠れているだけ）。

### 再現手順
1. `npm run dev` でアプリを起動
2. スマホ幅（例: 375px）で DevTools のデバイスモードを開く
3. タスクを1件完了させる
4. ヘッダーに「完了を表示」ボタンが存在せず、完了タスクを確認できないことを確認
5. 全タスクを完了させると「All tasks completed.」と表示されるだけで、完了タスクを表示する手段がない

### 環境情報
- 言語/ランタイム: Node.js、Vite + React
- 起動方法: `npm run dev`

### 関連ファイル / コード
- `src/client/main.tsx`（ヘッダーのトグルボタン部分）
```tsx
<Button
  variant="ghost"
  size="xs"
  className="hidden md:inline-flex"   // ← md 未満で非表示になる原因
  onClick={() => setShowCompleted(!showCompleted)}
>
  {showCompleted ? '完了を隠す' : '完了を表示'}
</Button>
```

補足（経緯）: 本ボタンは 2026-06-27 の変更（bec3c8a）で、それまでヘッダーにあったモバイル専用フォルダ追加ボタンと置き換わる形で導入された。モバイルでの Folder 作成はボトムシート（`src/client/FolderPickerSheet.tsx` の「新しいフォルダ」）が担うため、本ボタンをモバイル表示にしても失われる機能はない。

### 試したが駄目だったこと
- なし（未着手）。仕様は `docs/mobile-show-completed-spec.md` に確定済み（grill-with-docs セッション 2026-08-10 合意）。

## 解決すべきゴール (Goal)
- [x] 「完了を表示」ボタンを `md` 未満でもヘッダー右側に常時表示する（`hidden md:inline-flex` を外す）
- [x] デスクトップ（`md` 以上）の見た目・挙動を変えない
- [x] 既存のテスト・型チェック・lint を壊さない

### 完了条件（検証方法）
- 375px 幅で「完了を表示」ボタンが表示され、タップで完了タスクの表示/非表示が切り替わること
- `npm test` / `npm run typecheck` / `npm run lint` が緑であること

## 補足
- 経緯: 2026-08-10 の grill-with-docs セッションで仕様確定。バグ扱い（導入時 issue `issues/issue-202606272227.md` にモバイル除外の意図は記録なし）。
- 実装: commit `9588cae`（PR #117、2026-08-10 マージ）で `hidden md:inline-flex` を除去。
- 仕様書: `docs/mobile-show-completed-spec.md`（2026-08-22 の grill-with-docs セッションで v2 に改訂）。
- 後続 issue: `issues/issue-202608221305-mobile-completed-tasks-section.md`（モバイルのトグルは発見できないというフィードバックを受け、導線をリスト末尾の開閉セクションに置き換える。本イシューの実装そのものは完了済みのため DONE にする）。
- 関連 TODO: `issues/issue-202607281142-mobile-task-row-layout.md`（モバイルのタスク行の窮屈さ。本イシューとは独立）
