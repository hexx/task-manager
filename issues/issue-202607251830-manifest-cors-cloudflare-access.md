---
title: "Cloudflare Access 保護下で manifest.webmanifest 取得が CORS ブロックされる問題の修正"
status: DONE
created: 2026-07-25T18:30:00+09:00
---

# Cloudflare Access 保護下で manifest.webmanifest 取得が CORS ブロックされる問題の修正

## 背景・前提条件 (Context)

### 期待される挙動 vs 実際の挙動
- **期待**: Cloudflare Access にログイン済みの状態でアプリを読み込んだとき、`manifest.webmanifest` が 200 で取得され、Console にエラーが出ず、PWA としてインストール可能である。
- **実際**: `vite-plugin-pwa` が注入する `<link rel="manifest" href="/manifest.webmanifest">` が credentialless（クッキー無し）で取得されるため、Access がログイン画面（`cloudflareaccess.com`）へ 302 リダイレクトし、リダイレクト先に `Access-Control-Allow-Origin` が無く CORS ブロックされる。ログイン済みでも Console エラーが発生し、PWA インストール可能性が損なわれる。

### エラーログ / スタックトレース

本アプリで実際に観測したログは未取得（`UNKNOWN`）。同一根本原因の先行事例 [hexx/rss-reader#302](https://github.com/hexx/rss-reader/pull/302) で報告されている形態（マニフェスト取得が CORS でブロックされる Console エラー）を想定する。本番検証時に実際のメッセージを確認し、ここへ逐語引用で追記すること。

### 再現手順
1. 本アプリを Cloudflare Access 保護下のドメインに `npm run deploy`
2. Access にログインしてアプリを開く
3. DevTools を開き、ハードリロード（Network → Disable cache 状態で再読込）
4. Console に manifest 取得の CORS エラーが出ることを確認
5. Network で `manifest.webmanifest` がログイン画面への 302 になっていることを確認

### 環境情報
- デプロイ先: Cloudflare Workers（`wrangler.toml`、`name = "task-manager"`）
- 認証: Cloudflare Access（Zero Trust）でドメイン全体を保護
- 言語/ランタイム: Node.js（`npm ci` で導入）、Vite + `vite-plugin-pwa@1.3.0`
- 起動方法（開発時）: `npm run dev`

### 関連ファイル / コード
- `vite.config.ts`（修正箇所）
```ts
VitePWA({
  registerType: 'autoUpdate',
  // useCredentials: true, ← これを追加する
  includeAssets: ['icon.svg', 'icon-192.png', 'icon-512.png'],
  manifest: { /* ... */ },
  workbox: { /* ... */ },
})
```
- ビルド済み `dist/client/index.html`（現状、`crossorigin` 無しの manifest リンクが注入される）
```html
<link rel="manifest" href="/manifest.webmanifest">
```
- `src/client/api.ts` — `/api/*` には既に `credentials: 'include'` あり（修正不要）

### 試したが駄目だったこと
- なし（未着手）。なお「Worker 側で CORS ヘッダを付与」は Access が Worker より前でリダイレクトするため無意味、「Access Bypass」はアセット公開を伴うため採用しない（根拠: `docs/adr/0001-manifest-credentials-behind-cloudflare-access.md`）。

## 解決すべきゴール (Goal)
- [ ] `vite.config.ts` の `VitePWA` オプションに `useCredentials: true` を追加する
- [ ] 変更は上記1箇所に限定する（icon / apple-touch-icon / sw / api は触らない）
- [ ] `npm run build` 後、`dist/client/index.html` の manifest リンクに `crossorigin="use-credentials"` が付くことを確認する
- [ ] 既存のテスト・型チェック・lint を壊さないこと（`npm test` / `npm run typecheck` / `npm run lint` が緑）

### 完了条件（検証方法）
- ローカル: `npm run build && grep -o '<link rel="manifest"[^>]*>' dist/client/index.html` の出力が `<link rel="manifest" href="/manifest.webmanifest" crossorigin="use-credentials">`
- 本番: `npm run deploy` 後、Access ログイン → ハードリロードで Console の manifest CORS エラーが消滅し、Network で `manifest.webmanifest` が 200 になる
- 本番検証完了後、本ファイルの `status` を `DONE` に更新する

## 補足
- 仕様: `docs/manifest-cors-spec.md`、決定経緯: `docs/adr/0001-manifest-credentials-behind-cloudflare-access.md`
- Access セッション切れ時の挙動はスコープ外（正常動作として許容）
- `useCredentials: true` は same-origin では通常不要に見えるが、削除すると本番でサイレントに再発するため、整理で消さないこと
