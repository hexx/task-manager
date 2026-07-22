-- 既存の tasks テーブルに Deadline（〆切）カラムを追加する。
-- 新規データベースは schema.sql に含まれるため、このマイグレーションは既存環境向け。
-- 適用: npx wrangler d1 migrations apply task-manager-db
ALTER TABLE tasks ADD COLUMN deadline TEXT;
