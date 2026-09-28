# 事務ツール


## 📌 最初に読むこと

- **`docs/` は 2026-08-01 更新だが、実装は 2026-07-23 で止まっている**（DEPLOYMENT.md、SCOPE_PROGRESS.md、claude-code-vs-bluelamp.mdほか）。
  docs は**計画**であって実装済みの記述ではない。「書いてあるから在る」と判断しない。

## 基本原則
> 「シンプルさは究極の洗練である」


## プロジェクト設定

技術スタック:
  framework: Nextron (Next.js 14 Pages Router + Electron 30)
  frontend: React 18 + TypeScript 5 + Tailwind CSS v3 + shadcn/ui
  state: Zustand + TanStack Query
  form: React Hook Form + Zod
  database: better-sqlite3 + Drizzle ORM（ローカルSQLite、将来Postgres移行可）
  pdf: Electron webContents.printToPDF()
  icons: Lucide React
  date: date-fns
  packager: electron-builder

ポート設定（開発時Next.js devサーバー）:
  frontend: 3055

## 環境変数

### ローカル版（現時点）
環境変数は最小限:
- renderer/.env.local（Next.js用、必要に応じて）
  - 設定モジュール: renderer/src/config/index.ts（process.env集約）
- main/.env.local（Electron用、APIキー等、必要に応じて）
  - 設定モジュール: main/src/config/index.ts（process.env集約）

## 命名規則

- DBテーブル: snake_case / カラム: snake_case

## 型定義

- 単一真実源: renderer/types/index.ts
- Drizzleスキーマから型を自動生成（`drizzle-orm` の InferSelectModel / InferInsertModel 活用）
- Electron IPC通信の型は `shared/types/ipc.ts` に集約

## プロジェクト構造（Nextron標準）

```
事務ツール/
├── main/                        # Electron メインプロセス
│   ├── background.ts            # エントリーポイント
│   ├── db/                      # SQLite + Drizzle
│   │   ├── schema.ts
│   │   ├── migrations/
│   │   └── client.ts
│   ├── pdf/                     # PDF生成ロジック
│   │   └── generator.ts         # printToPDF() ラッパー
│   ├── ipc/                     # IPC ハンドラ
│   │   ├── documents.ts
│   │   ├── masters.ts
│   │   └── stamps.ts
│   └── config/
│       └── index.ts
├── renderer/                    # Next.js（レンダラープロセス）
│   ├── pages/                   # Next.js Pages Router（Nextron制約）
│   ├── layouts/
│   ├── components/
│   │   └── ui/                  # shadcn/ui コンポーネント
│   ├── lib/
│   ├── hooks/
│   ├── templates/               # 書類テンプレート（HTML/React）
│   │   ├── invoice.tsx
│   │   ├── receipt.tsx
│   │   └── ...
│   ├── types/index.ts
│   ├── styles/globals.css
│   └── config/index.ts
├── shared/
│   └── types/ipc.ts             # メイン↔レンダラー共有型
├── resources/                   # アイコン、Noto Sans JP フォント等
├── docs/
│   ├── requirements.md
│   └── SCOPE_PROGRESS.md
└── CLAUDE.md
```

## 開発ルール

### Drizzle / SQLite
- スキーマ変更は `drizzle-kit generate` → `drizzle-kit migrate` の流れ
- 初回起動時に自動マイグレーション実行（main/background.ts 内）
- DBファイル: `app.getPath('userData')/data.db` に配置
- better-sqlite3 は同期API、トランザクションは `db.transaction(() => {...})()`

### PDF生成
- 非表示 BrowserWindow で書類HTMLテンプレートを描画
- `webContents.printToPDF({ pageSize: 'A4', marginsType: 0 })` で生成
- 日本語フォント Noto Sans JP は `resources/fonts/` に同梱、`@font-face` で読み込み
- PDFはユーザーが指定した保存先（デフォルト: `app.getPath('documents')/事務ツール/`）

### 角印合成
- HTML内 `<img>` + `position: absolute` + `opacity: 0.8` で実現
- 座標・サイズは mm 単位でDB保存、CSSで `mm` 指定
- アップロード画像は MIME タイプ（PNG/JPG）とサイズ（5MB以下）を検証
- ファイル保存先: `app.getPath('userData')/stamps/` に `stamp_{id}.png` で保存

### IPC 設計
- レンダラー ↔ メイン の通信は typed IPC（`shared/types/ipc.ts`）
- `ipcMain.handle()` + `ipcRenderer.invoke()` の Promise ベース
- セキュリティ: `nodeIntegration: false` + `contextIsolation: true` + preload.ts で白リスト公開

### アプリ起動
- 開発時: `npm run dev` で Electron + Next.js dev server（port 3055）同時起動
- 本番ビルド: `npm run build` → `npm run dist` で electron-builder 実行

### エラー対応
- DB接続エラー → マイグレーション再実行、それでもダメなら初期化確認
- PDF生成エラー → BrowserWindow 状態確認、フォント読み込み確認

### デプロイ
- Windows: `npm run dist:win`（.exe 生成）
- Mac: `npm run dist:mac`（.dmg 生成、要Apple Developer署名）
- 詳細: docs/DEPLOYMENT.md（後日作成）

## Playwright

スクリーンショット保存先: /tmp/bluelamp-screenshots/

## 最新技術情報

### PDF生成の決定事項（Step#2調査結果）
- Electron内蔵のChromium `printToPDF()` を使用（Puppeteer等の追加依存不要）
- 既存Excelレイアウト再現は HTML + Tailwind CSS + `@page` ルールで実現
- 角印は `<img>` + `position:absolute` + `opacity:0.8` で自然な押印表現

### DB選定理由
- **better-sqlite3**: Electronメインプロセスで同期APIが使える、パフォーマンス良好
- **Drizzle ORM**: SQLite↔Postgres両対応、SaaS化時の移行で ORM 変更不要
- Prisma より軽量で Electron バンドルに有利

### 書類テンプレートの拡張方針
- `renderer/templates/` に書類種別ごとのReactコンポーネント
- 新書類追加時は 1) テンプレートファイル追加 2) `document_type` enum追加 3) デフォルト設定追加 の3箇所のみ
- UIへの反映は `documentTypes` 配列ベースで自動化

## 税額計算（2026-09-21 変更）

- **消費税の端数処理は四捨五入**。税率ごとに対価を合計してから1回だけ処理する
  （インボイス制度／国税庁タックスアンサー No.6371、消令70の10、消基通1-8-15）。
  行ごとに端数処理して合算してはいけない
- **2026-09-20 までに発行した書類は切り捨てで保存されている**。切り替え理由は、
  切り捨てだと税込12,000円ちょうどになる税抜額が存在しなかったため（10,909→11,999 / 10,910→12,001）
- 実装は `main/ipc/taxCalc.ts` と `renderer/components/documents/utils.ts` に**意図的に二重化**
  されている（Nextron の main/renderer は webpack が分かれ共有モジュールを跨げない）。
  片方だけ変えると `tests/unit/tax.test.ts` のズレ検出テストが落ちる
- **源泉徴収税は切り捨てのまま**（所得税法205条）。消費税額を経由せず税抜 subtotal に直接掛ける。
  「統一しよう」として四捨五入に変えてはいけない
- **税込入力で狙った税込額にできるのは1行・数量1のときだけ**。複数行では税率ごとに
  合計してから丸めるため、各行を税込で組んでも合計が狙い値からズレることがある
  （例: 税込1,003円×3行 → 3,010円。狙いは3,009円）

### 未解決: 保存値と再計算値が混在している

書類詳細画面（`renderer/pages/documents/[id].tsx:258-263`）とPDF（`main/pdf/htmlTemplate.ts:269,276`）は
**保存済みの金額**を表示する一方、消費税の行は `buildTaxBreakdown` で**その場で再計算**している。
このため切り捨て時代に保存された書類を開くと、同じ画面・同じPDFの中で
「小計＋消費税 ≠ 合計」が1円ズレうる（**開くだけで発生。保存も再発行も不要**）。

- 2026-09-21 時点の Mac のDB（書類3件）では実測で該当ゼロ。**現時点の実害はなし**
- Windows機の**未移行の書類履歴15件**には切り捨て時代のデータが残っている可能性がある。
  移行するなら先にこの問題を片付けること

## AI設計
名刺OCR（取引先マスタへの入力補助）でのみ Anthropic Claude API を単発呼び出しする。
- モデル: `claude-sonnet-5`（高解像度画像対応。Haiku 4.5 は旧字体を常用漢字へ誤変換するため不採用）
- 呼び出しは**メインプロセスから**のみ（本番CSPが `connect-src 'self'` のためレンダラーからは不可）
- APIキーは `electron-store`（app-settings）に保存。レンダラーへ実キーを渡さない（マスク済み文字列のみ）
- 読み取り結果は**自動保存しない**。必ず確認ダイアログを経由する
- 詳細: docs/requirements.md §7, §8

## CI/CD設定

### GitHub Actions（PR時に自動実行）
| チェック | 対象 | コマンド |
|---------|------|---------|
| TypeScript | ルート | `npx tsc --noEmit` |
| Lint | ルート | `npm run lint` |
| Build | ルート | `npm run build` |

### リポジトリ
- URL: https://github.com/Aizoon-jp/document-tool
- 公開設定: **Public（意図的・2026-09-28 決定）**。LP のダウンロードボタンが GitHub Release のアセットを直リンクしているため、Private にすると LP から落とせなくなる。非公開化するなら先にインストーラーを別ホストへ移す。コードは全公開なので push 前に秘密情報の混入を確認する
