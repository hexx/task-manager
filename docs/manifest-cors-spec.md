# Cloudflare Access 保護下での manifest CORS ブロック対策 仕様（v1）

> ステータス: 確定（grill-with-docs セッション 2026-07-25 合意済み）
> 関連: [ADR 0001](./adr/0001-manifest-credentials-behind-cloudflare-access.md) / 実装プロンプト: `issues/issue-202607251830-manifest-cors-cloudflare-access.md`
> 参考: [hexx/rss-reader#302](https://github.com/hexx/rss-reader/pull/302)（同一問題の先行修正）

## 1. 背景・目的

本アプリは Cloudflare Workers にデプロイされ、ドメイン全体が Cloudflare Access（Zero Trust）保護下にある。
`vite-plugin-pwa` が `index.html` に注入する `<link rel="manifest" href="/manifest.webmanifest">` は、仕様上デフォルトで **credentialless**（クッキー無し）で取得される。このため Access はマニフェスト要求を未認証とみなして `cloudflareaccess.com` のログイン画面へ 302 リダイレクトし、リダイレクト先に `Access-Control-Allow-Origin` が無いため CORS ブロックされる。

結果として、**ログイン済みユーザーでも** Console にエラーが出て、PWA のインストール可能性が損なわれる（ページ本体はクッキーを送るため、このエラーだけが発生する）。

hexx/rss-reader#302 と根本原因が同一の問題であり、同 PR の修正（manifest リンクへの `crossorigin="use-credentials"` 付与）を本アプリの構成に合わせてミラーする。

## 2. 修正内容

`vite.config.ts` の `VitePWA` オプションに `useCredentials: true` を追加する（実質1行）。

```ts
VitePWA({
  registerType: 'autoUpdate',
  useCredentials: true, // ← 追加
  // ...
})
```

これにより、プラグインが注入するリンクが `<link rel="manifest" href="/manifest.webmanifest" crossorigin="use-credentials">` となり、マニフェスト fetch に same-origin の `CF_Authorization` クッキーが同梱される。ログイン済みなら Access はリダイレクトせず `manifest.webmanifest` を 200 で返す。

### 変更しないもの（調査済み・根拠あり）

| リソース | 理由 |
|---|---|
| `<link rel="icon">` / `apple-touch-icon` | 既定で認証情報付き取得（no-cors + credentials same-origin）のため Access を通過できる。CORS モード化の副作用を避けるため触らない |
| `/api/*` の fetch | `src/client/api.ts` に既に `credentials: 'include'` あり（過去修正済み） |
| SW 本体（`registerSW.js` / `sw.js`） | same-origin のスクリプト取得・`navigator.serviceWorker.register` は既定でクッキーを送るため Access を通過できる |
| Workbox precache / runtimeCaching | same-origin fetch は既定でクッキー送信。キャッシュ戦略は過去 issue（NetworkFirst 化）で対応済み |
| バンドル済みフォント（@fontsource） | same-origin の CSS サブリソース、既定でクッキー送信 |

## 3. スコープ外（許容）

- **Access セッション切れ時のエラー**。セッション切れ時はトップレベルナビゲーション自体がログイン画面へ遷移する正常動作の一部であり、本修正では扱わない。
- SW のキャッシュ戦略・`/api/*` のエラーハンドリング（過去対応済み領域）。

## 4. 却下した代替案

詳細は [ADR 0001](./adr/0001-manifest-credentials-behind-cloudflare-access.md) を参照。

- **Worker 側で CORS ヘッダを付与する** — Access は Worker より前（エッジ）でリダイレクトするため、Worker がレスポンスを触る機会すら無く無意味。
- **Access Bypass ポリシーでアセットを公開する** — マニフェスト（および関連アセット）を認証なしで公開することになり、保護の趣旨を損なうため不採用。
- **ビルド後の HTML 後処理 / index.html への手書きリンク** — ビルドごとに壊れる暗黙の依存や、manifest 情報の分裂を招くため不採用。プラグイン公式オプション `useCredentials` を採用。

## 5. 検証手順

自動テスト・CI ガードは追加しない（合意済み）。手動検証のみ。

### ローカル検証

```bash
npm run build
grep -o '<link rel="manifest"[^>]*>' dist/client/index.html
# 期待: <link rel="manifest" href="/manifest.webmanifest" crossorigin="use-credentials">
```

### 本番検証

1. `npm run deploy`（`wrangler deploy`）
2. Access にログインしてアプリを開く
3. ハードリロード（DevTools → Network → Disable cache 状態で再読込）
4. Console に manifest の CORS エラーが出ないことを確認
5. DevTools → Network で `manifest.webmanifest` が **200**（ログイン画面への 302 ではない）ことを確認

## 6. 運用上の注意

- `useCredentials: true` は same-origin には通常不要に見えるが、**削除すると本番でサイレントに再発する**（ローカルでは再現しない）。整理・lint で消さないこと。根拠: ADR 0001。
