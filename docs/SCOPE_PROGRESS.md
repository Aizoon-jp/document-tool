# 事務ツール 開発進捗状況

## 実装計画

BlueLampでの開発は以下のフローに沿って進行します。

### 開発フェーズ

| フェーズ | 状態 | 解説 |
|---------|:----:|------|
| **Phase 1: 要件定義** | [x] | 要件定義書・進捗管理表・CLAUDE.md作成完了 |
| **Phase 2: Git/GitHub管理** | [x] | プロジェクトリポジトリを準備し開発環境を整える |
| **Phase 3: フロントエンド基盤** | [x] | Nextron + Next.js + Tailwind + shadcn/ui 基盤構築 |
| **Phase 4: ページ実装** | [x] | 5ページ + 5書類テンプレートの実装 |
| **Phase 5: 環境構築** | [x] | better-sqlite3 + Drizzle セットアップ、初期マイグレーション |
| **Phase 6: バックエンド計画** | [x] | Electron メインプロセス（DBアクセス・PDF生成・ファイルI/O）の実装計画 |
| **Phase 7: バックエンド実装** | [x] | IPC経由でCRUDとPDF生成を実装 |
| **Phase 8: API統合** | [x] | フロントエンドとElectron IPC層の統合 |
| **Phase 9: E2Eテスト** | [ ] | 主要書類（請求書・領収書・見積書）の発行フローをE2E検証 |
| **Phase 10: ローカル動作確認** | [ ] | アプリ起動→全書類発行→PDF生成→履歴確認の通し検証 |
| **Phase 11: デプロイメント** | [ ] | electron-builder でWindows exe / Mac dmg を生成・配布 |

### サポートツール（必要に応じて使用）

| ツール | 解説 |
|---------|------|
| **機能拡張** | リリース後の新書類追加・SaaS化など |
| **デバッグ** | エラー発生時の自動解析 |
| **TypeScript型解消** | 型エラーの徹底排除 |
| **リファクタリング** | コード品質改善 |
| **ドキュメント生成** | 納品ドキュメント自動生成 |
| **相談** | プロジェクト全般の相談・サポート |

---

## ページ管理表

| ID | ページ名 | ルート | 権限 | 着手 | 完了 |
|----|---------|-------|------|------|------|
| P-001 | ダッシュボード | `/` | ユーザー | [x] | [x] |
| P-002 | 書類作成 | `/documents/new` | ユーザー | [x] | [x] |
| P-003 | 書類履歴 | `/documents` | ユーザー | [x] | [x] |
| P-004 | 書類詳細・再発行 | `/documents/[id]` | ユーザー | [x] | [x] |
| P-005 | 設定（タブUI） | `/settings` | ユーザー | [x] | [x] |

## 書類テンプレート管理表

Phase 7で 5書類種別共通の HTML テンプレートとして `main/pdf/htmlTemplate.ts` に実装済み（書類種別はタイトル差し替えで対応）。

| ID | 書類種別 | テンプレート | 着手 | 完了 |
|----|---------|------------|------|------|
| T-001 | 請求書 | `main/pdf/htmlTemplate.ts` | [x] | [x] |
| T-002 | 領収書 | `main/pdf/htmlTemplate.ts` | [x] | [x] |
| T-003 | 見積書 | `main/pdf/htmlTemplate.ts` | [x] | [x] |
| T-004 | 振込依頼書 | `main/pdf/htmlTemplate.ts` | [x] | [x] |
| T-005 | 納品書 | `main/pdf/htmlTemplate.ts` | [x] | [x] |

---

## バックエンド実装計画

### 前提
- 本プロジェクトは **Electron IPC** 通信（REST APIではない）
- 「エンドポイント」は `API_PATHS`（renderer/types/index.ts）で定義された IPC チャネル
- 認証なし（ローカル単一ユーザー）→ 認証スライス不要
- 外部API未使用 → 実装タスク表の「外部」列は全て `-`
- 型の単一真実源: `renderer/types/index.ts`
- IPC型は `shared/types/ipc.ts`（現状 `app:getVersion` のみ → Phase 7 で全チャネル追加）

### 垂直スライス依存関係
| 順序 | スライス名 | 主要機能 | 依存 |
|------|-----------|---------|------|
| 1-A | 会社基本情報 | company get/update（1件固定） | なし |
| 1-B | 取引先マスタ | clients CRUD | なし |
| 1-C | 品目マスタ | items CRUD | なし |
| 1-D | 印影管理 | stamps CRUD + 画像ファイルI/O | なし |
| 1-E | 書類別設定 | document_settings list/update | なし |
| 2 | 書類番号採番 | next-number（月次シーケンス生成） | 1-E |
| 3 | 書類CRUD | documents + document_lines の生成・更新・削除・複製 | 1-B, 1-C, 1-D, 2 |
| 4-A | 書類一覧・検索 | list / list-recent / search | 3 |
| 4-B | 月次サマリ | monthly-summary | 3 |
| 5 | PDF生成 | printToPDF + 角印合成 + 履歴登録 | 1-A, 1-D, 3 |

※ 番号-アルファベット表記は並列実装可能（例: 1-A〜1-E は全て同時実装可、4-A と 4-B も並列可）

### 並列実装グループ
- **グループα（マスタ系・全並列）**: 1-A / 1-B / 1-C / 1-D / 1-E
  - 同一テーブルへのマイグレーション競合なし（Phase 5で確定済）
- **グループβ（集計系・並列）**: 4-A / 4-B
  - スライス3完了後、同時着手可
- **直列必須**: 2 → 3 → 5（採番なしで書類作成不可、書類なしでPDF生成不可）

### 共通基盤（スライス着手前に整備）
| 項目 | 内容 |
|------|------|
| IPC型定義 | `shared/types/ipc.ts` に全26チャネルのシグネチャ追加 |
| preload.ts | `contextBridge` で全チャネルを白リスト公開 |
| IPC共通ラッパ | `main/ipc/index.ts` で `ipcMain.handle()` の一括登録＋エラーハンドラ |
| ID生成 | `crypto.randomUUID()` 統一（全エンティティ） |
| JSON変換 | options / defaultOptions の serialize/deserialize ヘルパ |

### エンドポイント実装タスクリスト

#### スライス1-A: 会社基本情報
| タスク | チャネル | 種別 | 実装 | Unit | 内部 | 外部 | 品質 | FE統合 |
|--------|---------|------|:----:|:----:|:----:|:----:|:----:|:------:|
| 1A.1 | `company:get` | R | [x] | [x] | [x] | - | [x] | [x] |
| 1A.2 | `company:update` | U（upsert） | [x] | [x] | [x] | - | [x] | [x] |

#### スライス1-B: 取引先マスタ
| タスク | チャネル | 種別 | 実装 | Unit | 内部 | 外部 | 品質 | FE統合 |
|--------|---------|------|:----:|:----:|:----:|:----:|:----:|:------:|
| 1B.1 | `clients:list` | R | [x] | [x] | [x] | - | [x] | [x] |
| 1B.2 | `clients:get:{id}` | R | [x] | [x] | [x] | - | [x] | [x] |
| 1B.3 | `clients:create` | C | [x] | [x] | [x] | - | [x] | [x] |
| 1B.4 | `clients:update:{id}` | U | [x] | [x] | [x] | - | [x] | [x] |
| 1B.5 | `clients:delete:{id}` | D | [x] | [x] | [x] | - | [x] | [x] |

#### スライス1-C: 品目マスタ
| タスク | チャネル | 種別 | 実装 | Unit | 内部 | 外部 | 品質 | FE統合 |
|--------|---------|------|:----:|:----:|:----:|:----:|:----:|:------:|
| 1C.1 | `items:list` | R | [x] | [x] | [x] | - | [x] | [x] |
| 1C.2 | `items:get:{id}` | R | [x] | [x] | [x] | - | [x] | [x] |
| 1C.3 | `items:create` | C | [x] | [x] | [x] | - | [x] | [x] |
| 1C.4 | `items:update:{id}` | U | [x] | [x] | [x] | - | [x] | [x] |
| 1C.5 | `items:delete:{id}` | D | [x] | [x] | [x] | - | [x] | [x] |

#### スライス1-D: 印影管理
| タスク | チャネル | 種別 | 実装 | Unit | 内部 | 外部 | 品質 | FE統合 |
|--------|---------|------|:----:|:----:|:----:|:----:|:----:|:------:|
| 1D.1 | `stamps:list` | R | [x] | [x] | [x] | - | [x] | [x] |
| 1D.2 | `stamps:get:{id}` | R | [x] | [x] | [x] | - | [x] | [x] |
| 1D.3 | `stamps:create` | C + 画像保存 | [x] | [x] | [x] | - | [x] | [x] |
| 1D.4 | `stamps:update:{id}` | U + 画像差替 | [x] | [x] | [x] | - | [x] | [x] |
| 1D.5 | `stamps:delete:{id}` | D + 画像削除 | [x] | [x] | [x] | - | [x] | [x] |

※ 画像保存先: `app.getPath('userData')/stamps/stamp_{id}.png`
※ 検証: MIME（PNG/JPG）/ サイズ（≤5MB）/ path.basename で `..` 拒否

#### スライス1-E: 書類別設定
| タスク | チャネル | 種別 | 実装 | Unit | 内部 | 外部 | 品質 | FE統合 |
|--------|---------|------|:----:|:----:|:----:|:----:|:----:|:------:|
| 1E.1 | `document-settings:list` | R | [x] | [x] | [x] | - | [x] | [x] |
| 1E.2 | `document-settings:update:{type}` | U（upsert） | [x] | [x] | [x] | - | [x] | [x] |

#### スライス2: 書類番号採番
| タスク | チャネル | 種別 | 実装 | Unit | 内部 | 外部 | 品質 | FE統合 |
|--------|---------|------|:----:|:----:|:----:|:----:|:----:|:------:|
| 2.1 | `documents:next-number:{type}` | 計算 | [x] | [x] | [x] | - | [x] | [x] |

※ `numberFormat`（例: `{YYYY}-{MM}-{seq:3}`）を document_settings から取得しフォーマット
※ 同月内の最大 sequence を documents テーブルから取得して +1

#### スライス3: 書類CRUD
| タスク | チャネル | 種別 | 実装 | Unit | 内部 | 外部 | 品質 | FE統合 |
|--------|---------|------|:----:|:----:|:----:|:----:|:----:|:------:|
| 3.1 | `documents:create` | C + lines 一括挿入 | [x] | [x] | [x] | - | [x] | [x] |
| 3.2 | `documents:get:{id}` | R | [x] | [x] | [x] | - | [x] | [x] |
| 3.3 | `documents:lines:{id}` | R | [x] | [x] | [x] | - | [x] | [x] |
| 3.4 | `documents:update:{id}` | U + lines 差替 | [x] | [x] | [x] | - | [x] | [x] |
| 3.5 | `documents:delete:{id}` | D（cascade） | [x] | [x] | [x] | - | [x] | [x] |
| 3.6 | `documents:duplicate:{id}` | C（既存を複製） | [x] | [x] | [x] | - | [x] | [x] |

※ create / update / duplicate は `db.transaction()` で documents + document_lines を原子更新
※ subtotal / taxAmount / totalAmount / withholdingTax はバックエンド側で再計算（フロントの値は信頼しない）

#### スライス4-A: 書類一覧・検索
| タスク | チャネル | 種別 | 実装 | Unit | 内部 | 外部 | 品質 | FE統合 |
|--------|---------|------|:----:|:----:|:----:|:----:|:----:|:------:|
| 4A.1 | `documents:list` | R（全件+並替） | [x] | [x] | [x] | - | [x] | [x] |
| 4A.2 | `documents:list-recent` | R（最近5件） | [x] | [x] | [x] | - | [x] | [x] |
| 4A.3 | `documents:search` | R（DocumentFilter） | [x] | [x] | [x] | - | [x] | [x] |

※ clients との JOIN で clientName を返却（Document型に合わせる）

#### スライス4-B: 月次サマリ
| タスク | チャネル | 種別 | 実装 | Unit | 内部 | 外部 | 品質 | FE統合 |
|--------|---------|------|:----:|:----:|:----:|:----:|:----:|:------:|
| 4B.1 | `documents:monthly-summary` | 集計 | [x] | [x] | [x] | - | [x] | [x] |

#### スライス5: PDF生成
| タスク | チャネル | 種別 | 実装 | Unit | 内部 | 外部 | 品質 | FE統合 |
|--------|---------|------|:----:|:----:|:----:|:----:|:----:|:------:|
| 5.1 | `documents:generate-pdf:{id}` | PDF出力 | [x] | [x] | [x] | - | [x] | [x] |

※ 非表示 BrowserWindow で `renderer/templates/{type}.tsx` を描画 → `webContents.printToPDF({ pageSize: 'A4', marginsType: 0 })`
※ Noto Sans JP を `resources/fonts/` から `@font-face` 読込
※ 角印は `<img>` + `position:absolute` + `opacity:0.8`、座標は mm 単位
※ 保存先: `app.getPath('documents')/事務ツール/{documentNumber}.pdf`
※ 生成後 `documents.pdfFilePath` を更新

**凡例**: 実装=IPCハンドラ実装 / Unit=ユニットテスト / 内部=内部結合テスト（DB込み） / 外部=外部APIテスト / 品質=品質担保（Lint/型チェック） / FE統合=レンダラーからの呼び出し確認
**記号**: [ ]=未完了 / [x]=完了 / -=該当なし（外部API未使用）
※ Phase 7で実装〜品質まで完了、Phase 8でFE統合を実施

### 実装時の注意事項
- **トランザクション**: スライス3（書類CRUD）は必ず `db.transaction(() => {...})()` を使用
- **エラー伝播**: IPCハンドラは try/catch せず main の共通ラッパで集約（潔癖性原則）
- **金額再計算**: バックエンドで `quantity * unitPrice` → `subtotalExclTax`、税率適用 → `subtotalInclTax` を再計算
- **削除制約**: clients / items は documents から参照されていたら削除不可（FK制約確認）
- **JSON列**: `documents.options` / `document_settings.defaultOptions` は JSON シリアライズで保存
- **採番競合**: 同時生成は想定しないが、sequence 取得は単一トランザクション内で完結

### E2Eテスト仕様書との対応
| E2E仕様 | 該当スライス |
|---------|------------|
| `dashboard-e2e.md` | 4-A（list-recent）/ 4-B（monthly-summary） |
| `document-create-e2e.md` | 1-B / 1-C / 1-D / 2 / 3 / 5 |
| `document-history-e2e.md` | 4-A / 3.5 / 3.6 |
| `document-detail-e2e.md` | 3.2 / 3.3 / 3.4 / 5 |
| `settings-e2e.md` | 1-A / 1-B / 1-C / 1-D / 1-E |

---

## 付録

### 開発フロー
```
Phase 1: 要件定義 → Phase 2: Git管理 → Phase 3: フロントエンド基盤 → Phase 4: ページ実装
→ Phase 5: 環境構築 → Phase 6: バックエンド計画 → Phase 7: バックエンド実装
→ Phase 8: API統合 → Phase 9: E2Eテスト → Phase 10: ローカル動作確認 → Phase 11: デプロイメント

※ サポートツールは必要に応じて適宜使用
```

### 開始手順
開発プロンプトをクリックして「Phase 2: Git管理」を選択し、次のフェーズへ進みます。
