---
title: "選択中の Folder を再読み込み後も記憶する"
status: TODO
created: 2026-07-28T11:42:00+09:00
---

# 選択中の Folder を再読み込み後も記憶する

## 背景・前提条件 (Context)

### 期待される挙動 vs 実際の挙動
- **期待**: ある Folder を選んだ状態で画面を再読み込み（またはアプリを再起動）しても、同じ Folder が選ばれたままになる。
- **実際**: 選択状態は React の state（`selectedFolderId`）のみに保持されているため、再読み込みすると常に「すべて」に戻る。

### エラーログ / スタックトレース
なし（機能改善の要望）。

### 再現手順
1. `npm run dev` でアプリを起動
2. Tasks ビューでいずれかの Folder を選択する
3. ブラウザを再読み込みする
4. 選択が「すべて」に戻っていることを確認

### 環境情報
- 言語/ランタイム: Node.js、Vite + React
- 起動方法: `npm run dev`

### 関連ファイル / コード
- `src/client/main.tsx`
```tsx
const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
```

### 試したが駄目だったこと
- なし（未着手）。

## 解決すべきゴール (Goal)
- [ ] 選択中の Folder を再読み込み後も復元する（方式は未定。例: `sessionStorage` / `localStorage` / URL パラメータ）
- [ ] 記憶された Folder が既に削除されていた場合は「すべて」にフォールバックすること
- [ ] 「未分類」の選択状態も同様に記憶の対象とする場合は、その旨を設計時に明記すること（All と Unclassified は別の概念。定義は `CONTEXT.md` 参照）
- [ ] 既存のテスト・型チェック・lint を壊さないこと

### 完了条件（検証方法）
- Folder を選択 → 再読み込み → 同じ Folder が選択された状態で一覧が表示されること
- `npm test` / `npm run typecheck` / `npm run lint` が緑であること

## 補足
- 経緯: `docs/folder-picker-spec.md` の grill-with-docs セッション（2026-07-28）で「今回の本題（選びにくさ）からは外れる」として切り出された。
