-- お出かけ（Errand）タブのためのフラグを tasks に追加する（docs/errand-spec.md）。
-- 新規データベースは schema.sql に含まれるため、このマイグレーションは既存環境向け。
-- 適用: npx wrangler d1 migrations apply task-manager-db
ALTER TABLE tasks ADD COLUMN errand INTEGER NOT NULL DEFAULT 0;