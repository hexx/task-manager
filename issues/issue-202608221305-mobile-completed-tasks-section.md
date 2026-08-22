---
title: "モバイルの完了タスク導線をリスト末尾の開閉セクションに置き換える"
status: DONE
created: 2026-08-22T13:05:00+09:00
---

# モバイルの完了タスク導線をリスト末尾の開閉セクションに置き換える

## 背景・前提条件 (Context)

### 期待される挙動 vs 実際の挙動
- **期待**: スマホでも、完了した Task を迷わず見つけて閲覧・操作できる。
- **実際**: 「完了を表示」ボタンはモバイルヘッダー右端に存在する（commit `9588cae` で `hidden md:inline-flex` を除去済み）が、アイコンなし・グレーの小さい文字だけ（`variant="ghost" size="xs"`）でタイトルや「N/M completed」に溶け込んでおり、**ボタンの場所が分からない**というフィードバックがある。全 Task 完了時は `All tasks completed.` と出るだけで、復元導線に気づけない。

### エラーログ / スタックトレース
なし（機能は正常。発見可能性（discoverability）の問題）。

### 再現手順
1. `npm run dev` でアプリを起動
2. スマホ幅（例: 375px）で DevTools のデバイスモードを開く
3. Task を 1 件完了させる
4. ヘッダー右の「完了を表示」ボタンがどこにあるか一見して分からず、完了 Task にたどり着けないことを確認
5. 全 Task を完了させると、リスト本体は空になり `All tasks completed.` だけが表示されることを確認

### 環境情報
- 言語/ランタイム: Node.js、Vite + React
- 起動方法: `npm run dev`

### 関連ファイル / コード
すべて `src/client/main.tsx` 内（App コンポーネント）。

完了タスクのフィルタとカウント（既存）:
```tsx
const [showCompleted, setShowCompleted] = useState(false); // 〜69行目付近

const totalCount = tasks.length;
const completedCount = useMemo(
  () => tasks.filter((task) => task.completed).length,
  [tasks]
);
const visibleTasks = useMemo(
  () => (showCompleted ? tasks : tasks.filter((task) => !task.completed)),
  [tasks, showCompleted]
);
```

モバイルヘッダーのトグルボタン（〜400行目付近。今回モバイルでは非表示に戻す）:
```tsx
<div className="flex items-center gap-1">
  <Button
    variant="ghost"
    size="xs"
    onClick={() => setShowCompleted(!showCompleted)}
  >
    {showCompleted ? '完了を隠す' : '完了を表示'}
  </Button>
</div>
```

Task リスト本体（空状態メッセージと `<ul>`。セクション行は `</ul>` の直後に置く）:
```tsx
<CardContent className="flex flex-col gap-4">
  {/* 〜 folderselect など */}
  {!loading && tasks.length === 0 ? (
    <p className="text-sm text-muted-foreground">
      No tasks yet. Add one above.
    </p>
  ) : null}
  {!loading && tasks.length > 0 && visibleTasks.length === 0 ? (
    <p className="text-sm text-muted-foreground">
      All tasks completed.
    </p>
  ) : null}

  <ul className="flex flex-col gap-2">
    {visibleTasks.map((task) => (
      /* 行コンポーネント。スタイルは既存のまま */
    ))}
  </ul>
  {/* ← ここにモバイル用の完了タスクセクション行を追加 */}
```

### 試したが駄目だったこと
- ヘッダーのトグルをモバイル表示にした（commit `9588cae`、v1 仕様どおり）。閲覧導線は確保できたが、**ボタンを見つけられない**という問題が残った（本イシュー）。

## 解決すべきゴール (Goal)
- [ ] モバイル（`md` 未満）で、Task リスト末尾（`</ul>` の直後、CardContent 内）に開閉セクション行を常設する
  - 閉: 「完了したタスク N 件を表示」/ 開: 「完了したタスク N 件を隠す」（N = 現在の絞り込み内の完了 Task 数。`completedCount` を流用）
  - シェブロン（`ChevronDownIcon`）を付け、開閉で回転させる。`aria-expanded` を付与
  - 完了 Task が 0 件のときは行自体を表示しない
  - `md:hidden` を付け、デスクトップで表示しない
- [ ] 展開時、現在の絞り込み内の完了 Task をセクション内に一覧表示する（既存の Task 行コンポーネントを再利用。`line-through` 等のスタイル維持、並び順は現行リストから未完了一覧を除いた順）
- [ ] セクション内の各行で、現行トグル表示時と同じ操作（チェック外し＝未完了に戻す、Folder 移動、Deadline 編集、削除）を可能にする。未完了に戻した Task は本体一覧へ即時移動し N も減る
- [ ] モバイルヘッダーの「完了を表示 / 完了を隠す」トグルをモバイルでは非表示に戻す（`hidden md:inline-flex` を再付与）。`showCompleted` 状態はデスクトップ専用とし、モバイルはセクションの開閉 state に置き換える
- [ ] 開閉状態はセッション内のみ保持し、リロードで閉じた状態に戻す（永続化しない）
- [ ] デスクトップ（`md` 以上）の見た目・挙動を一切変えない
- [ ] 既存のテスト・型チェック・lint を壊さない

### 完了条件（検証方法）
- 375px 幅で「完了したタスク N 件を表示」がリスト末尾に見え、タップで完了 Task が展開/折りたたみされること
- 完了 Task が 0 件のときセクション行が表示されないこと
- 全 Task 完了時に `All tasks completed.` の直下でセクション行から全完了 Task を閲覧できること
- 展開中にチェック外しを行うと Task が本体一覧へ移動し、N が減ること
- 768px 以上でセクション行が現れず、デスクトップのトグルが従来どおり動作すること
- `npm test` / `npm run typecheck` / `npm run lint` が緑であること

## 補足
- 仕様書: `docs/mobile-show-completed-spec.md`（v2。2026-08-22 の grill-with-docs セッションで確定。概念モデル・YAGNI 一覧・検証方法を必ず読むこと）
- 実装: `fix/mobile-completed-tasks-section` ブランチの PR（2026-08-22）で実施済み。`TaskRow` 抽出、モバイル/デスクトップのリスト分離、末尾の開閉セクション追加。
- 経緯: v1（2026-08-10）でモバイルヘッダーへトグルを追加（commit `9588cae`、issue `issues/issue-202608100028-mobile-show-completed.md` は DONE）。その後の利用で「ボタンの場所が分からない」と判明し、v2 でリスト末尾の常設セクションに置き換えることになった。
- このセッションで確定したその他の方針（本実装で変更してはならないもの）:
  - ヘッダーの「N/M completed」、空状態メッセージ（`No tasks yet.` / `All tasks completed.`）は現行維持
  - FolderPickerSheet の件数バッジは未完了のみカウントのまま（仕様として確定）
  - CONTEXT.md への用語追加はしない、ADR も作成しない
- 対象外: `issues/issue-202607281142-mobile-task-row-layout.md`（モバイルのタスク行の窮屈さ。本イシューとは独立）