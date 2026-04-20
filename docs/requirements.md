# 事務ツール 要件定義書

## 1. プロジェクト概要

### プロジェクト名
事務ツール（ビジネス書類自動作成デスクトップアプリ）

### 目的
会社基本情報と各種マスタを一度フル登録すれば、**請求書・領収書・振込依頼書・見積書・納品書**などのビジネス書類を最小入力で自動生成できるローカル動作型デスクトップアプリ。既存の請求書レイアウトを踏襲し、明細モード切替・自動採番・履歴管理・複数印影はめ込みに対応。将来的なSaaS化を視野に入れた構成。

### 成果目標

| 指標 | 目標 |
|---|---|
| 書類1枚あたりの作成時間 | 5分 → **30秒以下** |
| 手入力項目数 | 20項目以上 → **3項目以下** |
| 対応書類種別 | **4種類以上**（将来拡張容易） |

### 定性的指標
1. マスタ一度登録で全書類に自動反映（DRY原則）
2. トグルスイッチで消費税・源泉徴収・軽減税率などを柔軟制御
3. 履歴からワンクリックで過去書類を複製して新規発行
4. 複数印影（角印・丸印・銀行印など）を書類ごとに使い分け可

---

## 2. システム全体像

### 対応書類種別（初期）
- 請求書（invoice）
- 領収書（receipt）
- 見積書（quote）
- 振込依頼書（payment_request）
- 納品書（delivery_note）

※ 書類テンプレートはHTMLテンプレート方式で拡張容易

### ユーザーロール
- 単一ユーザー（認証なし、ローカル動作前提）
- 将来SaaS化時はSupabase Authで認証追加

### データ分類
- **マスタ**: 会社基本情報 / 取引先 / 品目 / 印影 / 書類設定
- **トランザクション**: 書類履歴 / 書類明細

### 配布形態
- **Nextron**（Next.js + Electron）によるデスクトップアプリ
- Windows向けexe、Mac向けdmg を electron-builder で生成
- 非技術者がアイコンダブルクリックで起動可能

---

## 3. ページ詳細仕様

### P-001: ダッシュボード

| 項目 | 内容 |
|---|---|
| ルート | `/` |
| 目的 | 最近の書類確認と新規作成への素早いアクセス |
| 主要機能 | 最近発行書類5件表示 / 書類種別ごとのクイック作成ボタン / 月次発行件数サマリ |
| 処理フロー | 起動時に履歴DBから直近書類を取得→表示。クイック作成で P-002 へ書類種別パラメータ付き遷移 |

### P-002: 書類作成

| 項目 | 内容 |
|---|---|
| ルート | `/documents/new?type={invoice\|receipt\|quote\|payment_request\|delivery_note}` |
| 目的 | 最小入力で書類を作成しPDF出力する |
| 主要機能 | 書類種別セレクト / 取引先セレクト（マスタから） / 発行日入力（デフォルト今日） / 書類番号（自動採番） / 明細モード切替（直接記載 / 別紙明細の通り） / 明細行追加（品目マスタ連動） / オプショントグル（消費税/軽減税率/源泉徴収/備考表示/振込先表示） / 印影選択 / プレビュー（右ペイン） / PDF生成・保存・メール下書き添付 |
| 処理フロー | 1)書類種別と取引先選択 2)品目追加または一括入力 3)オプショントグル 4)プレビュー確認 5)PDF生成→履歴DB登録→ファイル保存 |

### P-003: 書類履歴

| 項目 | 内容 |
|---|---|
| ルート | `/documents` |
| 目的 | 過去書類の一覧・検索・再発行 |
| 主要機能 | 一覧表示（日付・取引先・書類種別・金額・書類番号） / 検索（取引先・期間・書類種別・金額範囲） / 書類複製（新規作成に流用） / PDF再ダウンロード / 削除 |
| 処理フロー | DB検索→一覧表示→行クリックで P-004 遷移、複製ボタンで P-002 に履歴IDを渡して新規作成 |

### P-004: 書類詳細・再発行

| 項目 | 内容 |
|---|---|
| ルート | `/documents/[id]` |
| 目的 | 個別書類の表示・再PDF化・編集 |
| 主要機能 | 書類プレビュー表示 / PDF再生成 / 編集（再発行扱いで新書類として保存推奨） / メタ情報（発行日時・送付済フラグ・備考） |
| 処理フロー | IDでDB取得→プレビュー表示→再PDF化は既存データでregenerate |

### P-005: 設定（タブUI統合）

| 項目 | 内容 |
|---|---|
| ルート | `/settings` |
| 目的 | 全マスタと共通設定の一元管理 |
| タブ構成 | 1) 会社基本情報 2) 取引先マスタ 3) 品目マスタ 4) 印影管理 5) 書類別設定 |
| 主要機能 | 各タブでCRUD（追加・編集・削除） / 印影は画像アップロード+座標/サイズ/透明度設定+プレビュー / 書類別設定では書類ごとの採番フォーマット・デフォルトオプション・定型備考文を設定 |

---

## 4. データ設計概要

### エンティティ一覧

#### companies（会社基本情報・1件固定）
- id, name, trade_name（屋号）, postal_code, address, tel, fax, email, website, representative_name, invoice_number（T始まり）, bank_name, bank_branch, bank_account_type, bank_account_number, bank_account_holder_kana, created_at, updated_at

#### clients（取引先マスタ）
- id, name, honorific（御中/様）, postal_code, address, tel, contact_person, contact_department, payment_terms, default_tax_category, notes, created_at, updated_at

#### items（品目/サービスマスタ）
- id, name, unit_price, unit（式/個/時間等）, tax_rate（10/8/0）, is_reduced_tax_rate, default_quantity, notes, created_at, updated_at

#### stamps（印影）
- id, name, image_path, default_x_mm, default_y_mm, width_mm, opacity, is_default, created_at

#### document_settings（書類別設定）
- id, document_type, number_format（例: `{YYYY}-{MM}-{seq:3}`）, default_options（JSON）, default_remarks, created_at, updated_at

#### documents（書類）
- id, document_type, document_number, issue_date, client_id, subtotal, tax_amount, total_amount, withholding_tax, options（JSON: 消費税/軽減税率/源泉徴収/備考表示等）, stamp_id, detail_mode（direct/external）, remarks, pdf_file_path, created_at, updated_at

#### document_lines（書類明細）
- id, document_id, line_number, content, quantity, unit, unit_price, tax_rate, is_reduced_tax_rate, subtotal_excl_tax, subtotal_incl_tax

### バリデーション
- 会社名・取引先名: 必須、100文字以内
- 金額系: 整数 or 小数2桁、マイナス不可（返金時は別途検討）
- 郵便番号: `\d{3}-?\d{4}` 形式
- インボイス番号: `T\d{13}` 形式

---

## 5. セキュリティ要件

### ローカル版（現時点）
- **入力値サニタイゼーション**: HTMLテンプレートに流し込む際のXSS対策必須（DOMPurify or Reactデフォルトエスケープ）
- **ファイルパス検証**: 印影画像アップロード時のパストラバーサル対策（`path.basename()` 使用、`..` 拒否）
- **画像検証**: MIMEタイプチェック（PNG/JPG のみ）、ファイルサイズ上限（5MB）
- **グレースフルシャットダウン**: Electron終了時にDB接続を確実にクローズ

### SaaS化時（将来）
- Supabase Auth + RLS
- ブルートフォース対策（レート制限）
- パスワードポリシー（8文字以上、英数字混在）
- セッション管理、CSRF対策
- HTTPS強制
- ヘルスチェックエンドポイント `/api/health`

---

## 6. 技術スタック

### アプリケーションフレームワーク
- **Nextron**（Next.js 14 + Electron 30）

### フロントエンド
- React 18 + TypeScript 5
- Tailwind CSS v3 + **shadcn/ui**（Radix UI基盤）
- Zustand（軽量状態管理）
- TanStack Query（データフェッチ）
- React Hook Form + Zod（フォーム+バリデーション）
- Lucide React（アイコン）
- date-fns（日付処理）

### データストア
- **better-sqlite3**（ローカルSQLite、同期API）
- **Drizzle ORM**（SQLite↔Postgres両対応、SaaS移行時の切替容易）

### PDF生成
- **Electron `webContents.printToPDF()`**（Chromium内蔵、追加依存なし）
- 非表示BrowserWindowで書類HTMLテンプレートを描画→PDF生成

### テンプレート
- React Server Component でHTMLテンプレート実装
- 書類種別ごとにコンポーネント分割（`/templates/invoice.tsx` など）
- CSSで既存Excelレイアウト再現（Tailwind + 印刷用`@page` CSS）

### 配布
- electron-builder（Windows exe / Mac dmg）

---

## 7. 外部サービス一覧

### 現時点: なし
完全ローカル動作。ネット接続不要。

### 将来拡張候補（スコープ外）
- **国税庁法人番号API**: 取引先名から法人番号・住所自動取得（無料）
- **Supabase**: SaaS化時のAuth + Postgres
- **Vercel**: SaaS化時のホスティング
- **Resend**: SaaS化時のメール送付機能

---

## 8. AI設計

### 判定結果: AI機能なし
本ツールは純粋なCRUD + PDF生成で完結し、AI機能を要する要件はありません。

- 品質チェックループ → 不要
- 複数API連携 → 不要
- 中間結果による分岐 → 不要
- エージェント型 → 該当なし
- パイプライン型 → 該当なし

**将来的に検討可能な拡張（スコープ外）:**
- 取引先名のあいまい検索 → ベクトル検索 or 法人番号API
- 明細自動生成 → メール文面からLLM抽出
- 書類レイアウト最適化 → LLMによる提案

---

## 9. 品質基準

| 制限項目 | 値 |
|---|---|
| 行長 | 120文字 |
| 関数行数 | 100行 |
| ファイル行数 | 700行 |
| 複雑度 | 10 |

ESLint + Prettier で自動適用。`.eslintrc.json` に上記ルールを設定。

---

## 10. 実装時の注意点（Step#2調査結果より）

### PDF生成
- Electron `webContents.printToPDF()` は A4サイズ指定 + `@page` CSSで確実にレイアウト固定
- 日本語フォントは Noto Sans JP を `@font-face` で埋め込み（Webフォント不可、ローカルttf同梱）
- 書類テンプレートはブラウザDevToolsで確認しながら調整可能

### 角印合成
- **HTMLの `<img>` タグ + `position:absolute` + `opacity:0.8` で実現**
- 座標は mm 単位で保存、CSSでは `mm` 指定可能
- 推奨仕様: **透過PNG・24〜27mm角・600〜700px（600dpi相当）・朱色 R:200-220 G:20-40 B:20-40**
- スキャン画像の背景透過は事前に処理してもらう（画像処理機能は現時点で不要）

### SQLite
- better-sqlite3 は同期API、Electronメインプロセスで動作
- DBファイルは `app.getPath('userData')` 配下に配置（OS標準位置、バックアップ容易）
- マイグレーションは Drizzle Kit（将来Postgresへの移行時もスキーマ同一）
