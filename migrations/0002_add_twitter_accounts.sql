-- Twitter の閲覧記録（LastRead）機能のテーブルを追加する（docs/twitter-spec.md）。
-- 新規データベースは schema.sql に含まれるため、このマイグレーションは既存環境向け。
-- 適用: npx wrangler d1 migrations apply task-manager-db
CREATE TABLE IF NOT EXISTS twitter_accounts (
  id TEXT PRIMARY KEY,
  handle TEXT NOT NULL UNIQUE COLLATE NOCASE,
  last_read_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
