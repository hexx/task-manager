---
status: accepted
---

# Cloudflare Access 保護下では PWA マニフェストに `crossorigin="use-credentials"` を付ける

アプリ全体が Cloudflare Access 保護下にある環境で、`vite-plugin-pwa` の `useCredentials: true` により manifest リンクに `crossorigin="use-credentials"` を付与する。マニフェスト fetch は仕様上デフォルトで credentialless のため、この属性が無いと Access が `manifest.webmanifest` をログイン画面へ 302 リダイレクトし、CORS ブロックされる（ログイン済みでも Console エラー＋PWA インストール可能性の毀損）。same-origin への `crossorigin` は通常不要に見えるが、Access 保護下ではクッキー（`CF_Authorization`）を同梱させる唯一の手段であり、**削除すると本番でだけサイレントに再発する**。

## Considered Options

- **`useCredentials: true`（採用）** — プラグイン公式オプション。実質1行で、manifest 生成と単一情報源が保たれる。
- **Worker 側で CORS ヘッダを付与** — Access は Worker より前（エッジ）でリダイレクトするため、Worker が応答を修正する機会がなく無意味。
- **Access Bypass ポリシーでアセットを公開** — マニフェスト等を認証なし公開することになり、Zero Trust 保護の趣旨を損なうため不採用。
- **ビルド後 HTML の後処理 / index.html への手書きリンク** — ビルドごとに壊れうる暗黙の依存や manifest 情報の分裂を招くため不採用。

## Consequences

- `vite.config.ts` の `useCredentials: true` は意図的な設定であり、整理・lint・依存更新時に削除してはならない（hexx/rss-reader#302 でも同一の警告を残している）。
- 回帰はローカル開発では再現せず、本番の Access 保護下でのみ発生する。検証手順は `docs/manifest-cors-spec.md` §5 を参照。
