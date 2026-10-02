# CLAUDE.md

このファイルは、このリポジトリで作業する Claude Code (claude.ai/code) 向けのガイドです。

## コマンド

- `npm run dev` — Vite の開発サーバーを起動
- `npm run build` — `dist/` に本番ビルドを出力
- `npm run preview` — ビルド済みの `dist/` を配信

テストと lint は未導入。Node は 22（`.nvmrc` と CI で揃えている）。

## アーキテクチャ

GitHub Pages 向けの静的ポートフォリオ（Vite、フレームワークなし、vanilla JS）。外部コンテンツは **Vite の設定読み込み時（dev / build のどちらでも）に取得**され、実行時の API 呼び出しはない。

- [vite.config.js](vite.config.js) が async config 内で `fetchContent()`（[scripts/fetch-content.js](scripts/fetch-content.js)）を呼ぶ。GitHub API（リポジトリ）、Qiita API、Zenn / Hatena の RSS を `Promise.allSettled` で並列取得し、`src/content.json`（gitignore 済みの生成物）に書き出す。個別ソースの失敗は warn を出して空配列として扱う。
- [src/main.js](src/main.js) が `config.js` と生成済みの `content.json` を import し、`#app` に innerHTML でページ全体を描画する。スタイルは [src/style.css](src/style.css)。
- [src/config.js](src/config.js) がサイト情報（名前・bio・各サービスのユーザー名・リンク）の唯一の設定元。fetch スクリプトと描画の両方が参照する。ユーザー名を空にすると、そのソースはスキップされる。
- `base` パスは環境変数 `GITHUB_REPOSITORY` から決まる（`*.github.io` のリポジトリ、または未設定なら `/`）。

## デプロイ

[.github/workflows/pages.yml](.github/workflows/pages.yml): `main` への push、毎日 15:00 UTC の cron、手動実行のいずれかで build → GitHub Pages へデプロイする。記事・リポジトリ一覧は再ビルド時にしか更新されないため、cron がその定期更新を担っている。

## 注意点

- 記事は Qiita / Zenn / Hatena を日付の降順でマージして上位 12 件。リポジトリは fork と archived を除き、push 日時順で上位 8 件。
- `site.hatenaBlog` は `fetchHatena` 内で URL の origin として扱われる（`${origin}/rss`）。ブログの完全な URL（例: `https://kure.hatenablog.jp/`）を設定する必要があり、ユーザー名だけでは動かない。
