# Twitter の閲覧記録（LastRead）機能 仕様（v1）

> ステータス: 確定（grill-with-docs セッション合意済み）
> 用語の定義は [CONTEXT.md](../CONTEXT.md) を参照。

## 1. 背景・目的

Twitter をどこまで見たかを記録し、次に開いたとき「いつ以降のツイートだけ見れば良いか」を分かるようにしたい。
記録は日付時間のみで十分。スクロール位置やツイート ID は追わない。
利用者は Twitter アカウントを 2 つ持っているため、記録はアカウントごとに持つ。

## 2. 概念モデル

| 概念 | 説明 |
|---|---|
| **Account** | Twitter のアカウント。ハンドル（@xxx）で識別する |
| **LastRead** | 「この時刻までのツイートを見た」ことを示す時刻。Account ごとに 0 または 1 つ |
| **MarkAsRead** | LastRead を現在時刻で上書きする操作 |

- Account は Task / Checklist と並ぶ**独立したセクション**として扱う（Folder には属さない）。
- LastRead は**履歴を持たない**。最新値 1 件のみ。
- このアプリは Web アプリであり twitter.com 上に載らないため、閲覧の自動検出はしない。記録はすべて手動トリガー。

## 3. 機能要件

### 3.1 Account の管理

| 操作 | 仕様 |
|---|---|
| 追加 | ハンドル（@xxx）を指定して作成。作成直後の LastRead は未設定 |
| リネーム | ハンドルをいつでも変更可能 |
| 削除 | **`window.confirm` で確認**した上で削除。その Account の LastRead も同時に消える |
| ハンドルの重複 | **禁止**。大文字小文字は区別しない（バリデーションエラー） |

### 3.2 LastRead の記録（MarkAsRead）

| 操作 | 仕様 |
|---|---|
| トリガー | Account ごとの「今この瞬間まで見た」ボタン |
| 確認ダイアログ | **出さない**（押し間違いは時刻編集で回復できるため） |
| 記録される時刻 | **サーバー現在時刻（UTC）**。`datetime('now')` 流儀 |
| 意味 | 「この瞬間までのツイートは既に見た」という宣言。既存値は上書きされる |

### 3.3 LastRead の編集

- いつでも手動で時刻を変更できる（押し忘れ・日付をまたいで閲覧した等の後追い修正用）。
- 入力 UI はネイティブの **`<input type="datetime-local">`**。
- 未設定（`null`）に戻すことも可能。

### 3.4 一覧表示

- セクション内に Account ごとのカードを並べる。
- 各カードの表示内容:
  - ハンドル
  - LastRead: **絶対 + 相対の併記**（例: `7/25 18:30（3時間前）`）。表示はローカルタイムゾーン。相対表示の自動更新（再描画タイマー）はしない
  - LastRead 未設定の場合は **「未記録」**
  - 「今この瞬間まで見た」ボタン、編集・リネーム・削除の操作
- セクション上部に「アカウント追加」。
- 並び順: 作成日時 DESC（既存パターン準拠）。

## 4. データモデル・API（既存パターン準拠）

### 4.1 DB

```sql
CREATE TABLE IF NOT EXISTS twitter_accounts (
  id TEXT PRIMARY KEY,
  handle TEXT NOT NULL UNIQUE COLLATE NOCASE,
  last_read_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

- `last_read_at` は UTC の ISO 文字列（`datetime('now')` 形式）、未設定は `NULL`。

### 4.2 API

| メソッド | パス | 内容 |
|---|---|---|
| `GET` | `/api/accounts` | Account 一覧（作成日時 DESC） |
| `POST` | `/api/accounts` | 作成。`{ handle }`。重複時はエラー |
| `PATCH` | `/api/accounts/:id` | ハンドル変更 / LastRead 編集 / 未設定化。`{ handle?, lastReadAt? }` |
| `DELETE` | `/api/accounts/:id` | 削除（LastRead も消える） |
| `POST` | `/api/accounts/:id/mark-as-read` | LastRead をサーバー現在時刻で上書き |

## 5. 対象外（v1 ではやらない）

- 閲覧の自動記録（ブラウザ拡張・スクロール検出）
- LastRead の履歴・ログ
- 相対表示のリアルタイム自動更新
- 複数デバイス間の閲覧位置同期の最適化（DB 保存なので結果的には同期される）
- ハンドル以外のメタデータ（表示名、アイコン等）
