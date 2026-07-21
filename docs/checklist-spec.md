# チェックリスト機能 仕様（v1）

> ステータス: 確定（grill-with-docs セッション 2026-07-21 合意済み）
> 用語の定義は [CONTEXT.md](../CONTEXT.md) を参照。

## 1. 背景・目的

旅行の忘れものリストのように、**同じ項目セットを何度も使い回せるチェックリスト**が欲しい。
既存の Task は「完了したら消費される」使い切りであり、「チェックして→リセットして→また使う」サイクルを表現できない。このギャップを Checklist で埋める。

## 2. 概念モデル

| 概念 | 説明 |
|---|---|
| **Checklist** | 再利用可能な項目の集まり。Task / Folder とは無関係の独立セクション |
| **ChecklistItem** | Checklist を構成する項目。タイトルのみを持つ |
| **Reset** | 全項目のチェックを未チェックに戻す操作。再利用の唯一の手段 |

- Checklist は**利用履歴を持たない**。チェック状態は「今の一回分」のみ。
- 項目のチェックは個別に何度でも付け外しできる（トグル）。

## 3. 機能要件

### 3.1 Checklist の CRUD

| 操作 | 仕様 |
|---|---|
| 作成 | 名前（trim 必須、空は 400）。作成日時新しい順で一覧表示 |
| 名前変更 | trim。空文字は既存名を維持（既存 Task/Folder の更新パターンに準拠） |
| 削除 | **確認ダイアログあり**（項目もすべて消えるため） |

### 3.2 ChecklistItem の CRUD

| 操作 | 仕様 |
|---|---|
| 追加 | 常に**末尾に・未チェックで**追加。タイトル trim 必須、空は 400 |
| チェック切替 | 個別にトグル可能 |
| タイトル編集 | 可能（trim。空文字は既存値を維持） |
| 削除 | **確認ダイアログなし** |
| 並び順 | **挿入順（作成日時 ASC）**。手動並べ替えは v1 ではサポートしない |

### 3.3 Reset

- いつでも実行可能（全項目チェック済みでなくてもよい）。
- **確認ダイアログは 1 項目以上チェック済みのときのみ表示**。何もチェックされていなければ確認なしで実行。
- 実行後、全項目が未チェックになる。

### 3.4 進捗表示

- Checklist 一覧・詳細の両方に **「n / 全体」カウンタ**を表示（n = チェック済み数）。
- **全項目チェック済みのとき**、一覧上でチェックアイコンや色付けなどで「準備完了」状態を強調する。
- 進捗バーは表示しない。

### 3.5 v1 でやらないこと（YAGNI）

- 利用履歴（過去の利用回の記録）
- 項目の手動並べ替え、グループ化・セクション
- 項目の数量・メモ
- ChecklistItem → Task への昇格
- org-mode ユーティリティとの連携
- Checklist の Folder への所属

## 4. 画面構成

- 画面上部に **「タスク / チェックリスト」の切り替え**（セグメントコントロール等）を新設。
- **デスクトップ**：チェックリスト選択時、左サイドバー（フォルダサイドバーの位置）に Checklist 一覧（進捗カウンタ付き）、右ペインに選択中の Checklist 詳細を表示。フォルダサイドバーと入れ替わる。
- **モバイル**：既存のフォルダタブと同様のパターンで Checklist を切り替える。
- 詳細ペインの内容：項目リスト（チェックボックス・タイトル編集・削除）、項目追加フォーム、Reset ボタン、Checklist 名変更・削除。
- Checklist が 1 件もない場合は作成フォームを中心に表示（既存の空状態の扱いに準拠）。

## 5. データモデル

```sql
CREATE TABLE IF NOT EXISTS checklists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS checklist_items (
  id TEXT PRIMARY KEY,
  checklist_id TEXT NOT NULL,
  title TEXT NOT NULL,
  checked INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (checklist_id) REFERENCES checklists(id)
);

CREATE INDEX IF NOT EXISTS idx_checklist_items_checklist_id ON checklist_items(checklist_id);
```

## 6. API（既存 REST パターンに準拠）

| メソッド | パス | 内容 |
|---|---|---|
| GET | `/api/checklists` | 一覧。各 Checklist に `items`（挿入順）をネストして返す（一覧のカウンタ表示に使う） |
| POST | `/api/checklists` | 作成 `{ name }` |
| PATCH | `/api/checklists/:id` | 名前変更 `{ name }` |
| DELETE | `/api/checklists/:id` | 削除（項目もカスケード削除） |
| POST | `/api/checklists/:id/items` | 項目追加 `{ title }` |
| PATCH | `/api/checklists/:id/items/:itemId` | 項目更新 `{ title?, checked? }` |
| DELETE | `/api/checklists/:id/items/:itemId` | 項目削除 |
| POST | `/api/checklists/:id/reset` | Reset（全項目 `checked = 0`） |

## 7. 将来の拡張余地（v1 では着手しない）

- 利用履歴（Use 単位の記録）——「前回何を忘れたか」の振り返り
- 項目の並べ替え（position カラムの導入）
- プリセットチェックリスト
