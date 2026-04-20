# P-004 書類詳細・再発行 E2Eテスト仕様書

生成日: 2026-04-20
対象ページ: `/documents/[id]`
ページコンポーネント: `renderer/pages/documents/[id].tsx`
参考実装:
- `renderer/components/documents/DocumentPreview.tsx`（A4風プレビュー）
- `renderer/components/documents/historyMockData.ts`（`MOCK_DOCUMENT_HISTORY` = 15件）
- `renderer/components/documents/mockData.ts`（`MOCK_CLIENTS`, `MOCK_STAMPS`）

レイアウト: `renderer/layouts/MainLayout.tsx`
権限レベル: なし（ローカル版は認証不要 / 単一ユーザー）

---

## ユーザーゴール

1. 過去に発行した書類の詳細（メタ情報＋プレビュー）を1画面で確認できる
2. 必要に応じてPDFを再生成し、再送付できる
3. 既存書類をベースに複製・再発行（編集扱い）でP-002（書類作成）に進める
4. 不要になった書類を削除できる
5. 存在しないIDを踏んでも破綻せず履歴に戻れる

---

## テスト環境

```yaml
URL: http://localhost:3055/documents/{id}  （開発時Next.js devサーバー）
起動: npm run dev （Electron + Next.js）
認証: 不要（ローカル単一ユーザー）
DB: 未接続（Phase 4 時点）。書類データは renderer/components/documents/historyMockData.ts のハードコード定数
前提:
  - MOCK_DOCUMENT_HISTORY に15件（id: d001〜d015）
  - 取引先は MOCK_CLIENTS（c1:株式会社サンプル / c2:有限会社テスト商事 / c3:合同会社アイゾーン）で解決
  - 既定の stampId は null（プレビューに印影表示なし）
  - getStaticPaths で既知ID + フォールバック（not-found / zzz）を列挙済み
```

### 前提条件

- Phase 4 時点では IPC 未接続のため、`MOCK_DOCUMENT_HISTORY` 固定データでPASSすること。
- 詳細ページは `router.query.id` を使って一覧から `find()` する実装。明細は `totalAmount` から逆算して1行ぶん合成する（`toFormValues`）。
- `PDF再生成` ボタン・`この書類を削除` ボタンは現状 `alert()` + `window.confirm()` のダミー動作。Phase 8 の API 統合後に IPC 実処理へ差し替え予定。
- `履歴に戻る` / `この書類を複製` / `編集（再発行）` の3導線は Phase 4 時点でも正しく遷移すること（遷移先の画面挙動は P-002 / P-003 の仕様で担保）。
- 存在しないIDは `getStaticPaths` に `not-found` / `zzz` がフォールバック登録されているため、`/documents/zzz` で「書類が見つかりません」カードに到達できる。

---

## E2Eテスト項目一覧（9項目）

| ID | テスト項目 | フロー内容 | 期待結果 |
|----|----------|-----------|---------|
| E2E-DOC-DETAIL-001 | 初期表示（情報カード＋プレビュー） | `/documents/d001` にアクセス | 見出し `請求書　2026-04-003`、書類情報カードの全行表示、右ペインにA4プレビュー（`請 求 書` タイトル＋取引先＋明細＋合計）が描画される |
| E2E-DOC-DETAIL-002 | 書類種別バリエーション（全5種） | `d001`(invoice)/`d002`(quote)/`d003`(receipt)/`d004`(delivery_note)/`d005`(payment_request) を順に表示 | ヘッダ見出し・`<title>`・プレビュー見出しが種別ごとのラベルに切り替わる |
| E2E-DOC-DETAIL-003 | 履歴に戻るボタン | ヘッダ `履歴に戻る` ボタン（Linkアンカー）をクリック | URLが `/documents` に遷移する |
| E2E-DOC-DETAIL-004 | 複製 → 新規作成へ遷移 | `この書類を複製` ボタンをクリック | URLが `/documents/new?from=d001` に遷移する |
| E2E-DOC-DETAIL-005 | 編集（再発行扱い）→ 新規作成へ遷移 | `編集（再発行）` ボタンをクリック | URLが `/documents/new?base=d001` に遷移する |
| E2E-DOC-DETAIL-006 | PDF再生成（ダミーalert） | `PDF再生成` ボタンをクリック | `alert('PDF再生成（仮）: 2026-04-003')` が発火、accept 後もURLは `/documents/d001` のまま |
| E2E-DOC-DETAIL-007 | 削除（OK／キャンセル分岐） | `この書類を削除` ボタン → `window.confirm` を (a)OK / (b)キャンセル | (a) confirm → alert（`削除（仮）：コンソールに出力しました`）+ console.log、(b) 何も起きない。いずれもURLは `/documents/d001` のまま |
| E2E-DOC-DETAIL-008 | 存在しないIDのエラー画面 | `/documents/zzz` にアクセス | `書類が見つかりません` カード＋案内文＋`履歴に戻る` ボタンが表示、ボタン押下で `/documents` へ遷移 |
| E2E-DOC-DETAIL-009 | 情報カードのフォーマット検証 | `/documents/d001` 表示中、InfoRow の各値を検証 | 書類番号（font-mono）／発行日（`yyyy/MM/dd`）／合計金額（`￥1,320,000`）／作成日時・更新日時（`yyyy/MM/dd HH:mm`）／送付状態バッジが仕様通り |

---

## テストケース詳細

### TC E2E-DOC-DETAIL-001: 初期表示（情報カード＋プレビュー）

- **目的**: `/documents/d001` に直接アクセスした際に、左カラム（書類情報カード）と右カラム（書類プレビューカード）が欠けなく描画されること
- **事前状態**: アプリ起動直後
- **手順**:
  1. `page.goto('/documents/d001')`
  2. `page.waitForLoadState('networkidle')`
- **期待結果**:
  - `<title>` が `2026-04-003 — 請求書 — 事務ツール`
  - `page.getByRole('heading', { level: 1 })` のテキストに `請求書` と `2026-04-003` が含まれる
  - サブヘッダに `発行日 2026/04/18 ／ 株式会社サンプル` が表示
  - ヘッダ右に4アクションボタン: `履歴に戻る` / `この書類を複製` / `編集（再発行）` / `PDF再生成`
  - 左カラム `書類情報` カード内に以下のラベル行がすべて存在:
    - `書類種別` / `書類番号` / `発行日` / `取引先` / `合計金額` / `小計` / `消費税` / `送付状態` / `作成日時` / `更新日時`
  - 左カラム下段に `危険な操作` カード、中に `この書類を削除` ボタン（destructive スタイル）
  - 右カラム `書類プレビュー` カード内に `DocumentPreview` が描画され、`<h2>` に `請 求 書` が含まれる
  - プレビューに取引先宛名 `株式会社サンプル 御中`、明細テーブル、合計 `￥1,320,000` が表示

---

### TC E2E-DOC-DETAIL-002: 書類種別バリエーション（全5種）

- **目的**: 5種類すべての書類で見出し・タイトル・プレビュー表記が正しく切り替わること
- **事前状態**: アプリ起動直後
- **手順 & 期待結果**（パラメータ化テスト推奨）:

| 対象ID | documentType | ヘッダ見出し（含む文字列） | `<title>`（含む文字列） | プレビュー `<h2>` |
|-------|--------------|------------------------|------------------------|-------------------|
| `d001` | invoice | `請求書` | `請求書` | `請 求 書` |
| `d002` | quote | `見積書` | `見積書` | `見 積 書` |
| `d003` | receipt | `領収書` | `領収書` | `領 収 書` |
| `d004` | delivery_note | `納品書` | `納品書` | `納 品 書` |
| `d005` | payment_request | `振込依頼書` | `振込依頼書` | `振込依頼書` |

- **Playwright例**:
  ```ts
  await page.goto('/documents/d002')
  await expect(page).toHaveTitle(/見積書/)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('見積書')
  const preview = page.locator('section, div').filter({ hasText: '書類プレビュー' }).last()
  await expect(preview.locator('h2').first()).toContainText('見 積 書')
  ```
- **補足**: `d005`（振込依頼書）はプレビュー下部の `お振込先` ブロックが表示される（`options.showBankInfo: true` のため）。他種別はデフォルト `showBankInfo: true` だが、`payment_request` / `invoice` のみが標準的に銀行情報を印字する想定。プレビュー詳細は P-002 側で担保済み。

---

### TC E2E-DOC-DETAIL-003: 履歴に戻るボタン

- **目的**: ヘッダ右の `履歴に戻る` で一覧画面に戻れること
- **事前状態**: `/documents/d001` で初期表示済
- **手順**:
  1. `page.getByRole('link', { name: /履歴に戻る/ })` をクリック
- **期待結果**:
  - URLが `/documents` に遷移する
  - 遷移後、P-003 の書類履歴ページが表示される（`getByRole('heading', { level: 1, name: '書類履歴' })` が可視）
- **補足**: 実装は `<Button asChild>` + `<Link href="/documents">` の組み合わせのため、DOM 上はアンカー要素（`role=link`）として解釈される。

---

### TC E2E-DOC-DETAIL-004: 複製 → 新規作成へ遷移

- **目的**: `この書類を複製` ボタンで書類作成画面に `from` クエリ付きで遷移できること
- **事前状態**: `/documents/d001` で初期表示済
- **手順**:
  1. `page.getByRole('button', { name: 'この書類を複製' })` をクリック
- **期待結果**:
  - URLが `/documents/new?from=d001` に遷移する
  - 遷移後、P-002 の書類作成ページが表示される（見出しに `書類作成：` が含まれる）
- **補足**: 異なるIDで開いた場合（例: `/documents/d007` → 複製）は `?from=d007` にクエリが追従する。

---

### TC E2E-DOC-DETAIL-005: 編集（再発行扱い）→ 新規作成へ遷移

- **目的**: `編集（再発行）` ボタンで書類作成画面に `base` クエリ付きで遷移できること（原本を新書類として再発行する導線）
- **事前状態**: `/documents/d001` で初期表示済
- **手順**:
  1. `page.getByRole('button', { name: /編集（再発行）/ })` をクリック
- **期待結果**:
  - URLが `/documents/new?base=d001` に遷移する
- **補足**: 複製（`?from=`）との違いは呼出側の意図のみ。P-002 側での差分ハンドリングは要件上 `base` = 再発行元参照 / `from` = 複製元参照として区別予定。Phase 4 時点ではどちらも P-002 の初期値プレフィルに使われるだけで、UI挙動は同一。

---

### TC E2E-DOC-DETAIL-006: PDF再生成（ダミーalert）

- **目的**: `PDF再生成` ボタンで書類番号入りのalertが表示されること（Phase 4 のダミー動作）
- **事前状態**: `/documents/d001` で初期表示済
- **手順**:
  1. `page.once('dialog', (d) => { expect(d.message()).toBe('PDF再生成（仮）: 2026-04-003'); d.accept() })` を登録
  2. `page.getByRole('button', { name: 'PDF再生成' })` をクリック
- **期待結果**:
  - alertダイアログが発火し、メッセージが `PDF再生成（仮）: 2026-04-003` に一致
  - accept 後もURLは `/documents/d001` のまま（遷移しない）
- **補足**: Phase 8 で IPC（`ipc.documents.regeneratePdf(id)`）に差し替えた後は、alertを出さずに成功トースト + ダウンロードダイアログを表示する想定。UI差し替え時に本ケースの手順を更新する。

---

### TC E2E-DOC-DETAIL-007: 削除（OK／キャンセル分岐）

- **目的**: `この書類を削除` ボタン押下時の `window.confirm` 分岐挙動を検証すること
- **事前状態**: `/documents/d001` で初期表示済

**(a) confirm で OK**
  1. `page.on('dialog', async (d) => { if (d.type() === 'confirm') { expect(d.message()).toBe('書類「2026-04-003」を削除しますか？'); await d.accept() } else { expect(d.message()).toBe('削除（仮）：コンソールに出力しました'); await d.accept() } })` を登録
  2. `危険な操作` カード内の `この書類を削除` ボタンをクリック
- **期待結果**:
  - confirm → alert の順に2回ダイアログが発火する
  - コンソール出力に `[detail] delete d001` が含まれる
  - URLは `/documents/d001` のまま（Phase 4 は DB 未接続のため詳細ページから消えない）

**(b) confirm でキャンセル**
  1. `page.once('dialog', (d) => d.dismiss())` を登録
  2. `この書類を削除` ボタンをクリック
- **期待結果**:
  - confirm は1回だけ発火、alert は発火しない
  - コンソールに `[detail] delete` は出力されない
  - URLは `/documents/d001` のまま

- **補足**: dialog ハンドラは `page.once('dialog', …)` で分岐ごとに登録すると安定する。将来 AlertDialog + IPC に差し替えられた際は本ケースの手順をモーダル操作に更新する。

---

### TC E2E-DOC-DETAIL-008: 存在しないIDのエラー画面

- **目的**: 存在しない書類IDでアクセスしたときに、破綻せず「書類が見つかりません」画面に誘導できること
- **事前状態**: アプリ起動直後
- **手順**:
  1. `page.goto('/documents/zzz')`
- **期待結果**:
  - `<title>` が `書類が見つかりません — 事務ツール`
  - 中央カードに見出し `書類が見つかりません` が表示
  - 説明文 `指定された書類ID「zzz」は存在しないか、削除された可能性があります。` が表示
  - `履歴に戻る` ボタン（`<Link href="/documents">`）が表示
  - 情報カード／プレビューカード／削除ボタン／PDF再生成ボタンは描画されない
  - `履歴に戻る` クリックで `/documents` に遷移する
- **補足**:
  - `getStaticPaths` に登録されたフォールバックIDは `not-found` / `zzz` の2つ。`/documents/not-found` でも同様の画面に到達できる。
  - 未登録ID（例: `/documents/unknown-xyz`）はNextronの `output:export` 制約により静的経路が存在せず、ビルド後は 404 相当になる。`getStaticPaths` に登録済みのIDのみ本TCで検証する。

---

### TC E2E-DOC-DETAIL-009: 情報カードのフォーマット検証

- **目的**: 書類情報カード内の各値が仕様どおりのフォーマットで表示されること
- **事前状態**: `/documents/d001` で初期表示済
- **期待結果**:

| ラベル | セレクタ目安 | 期待値 |
|-------|-------------|--------|
| 書類種別 | `InfoRow` 内 | `請求書`（`DOCUMENT_TYPE_LABEL`） |
| 書類番号 | `span.font-mono` | `2026-04-003` |
| 発行日 | `InfoRow` 内 | `2026/04/18` |
| 取引先 | `InfoRow` 内 | `株式会社サンプル 御中`（`client.name + client.honorific`） |
| 合計金額 | `span.text-base.font-semibold` | `￥1,320,000` |
| 小計 | `InfoRow` 内 | `￥1,200,000`（`round(1320000/1.1)`） |
| 消費税 | `InfoRow` 内 | `￥120,000`（`totalAmount - subtotal`） |
| 送付状態 | バッジ | `未送付`（`pdfFilePath: null` のため slate-100 バッジ） |
| 作成日時 | `InfoRow` 内 | `2026/04/18 09:00`（UTC→ローカルで変換。テスト時はタイムゾーン固定推奨） |
| 更新日時 | `InfoRow` 内 | `2026/04/18 09:00` |

- **補足**:
  - `withholdingTax` は MOCK では 0 のため、源泉徴収税行は非表示（条件レンダリング）。
  - `remarks` は MOCK では `null` のため、備考ブロックは非表示。
  - 作成日時 / 更新日時は `historyMockData.ts` で `${issueDate}T09:00:00Z`（UTC）を入れているため、日本時間で描画すると `18:00` になる可能性がある。テストは `page.clock` もしくは起動時 TZ を `Asia/Tokyo` に固定したうえで期待値を調整する。

---

## セレクタ指針

Playwright/Electronテスト実装時の推奨セレクタ:

| 要素 | 推奨セレクタ |
|-----|------------|
| ページ見出し | `page.getByRole('heading', { level: 1 })`（種別ラベル＋書類番号を含む） |
| 履歴に戻る（ヘッダ） | `page.getByRole('link', { name: /履歴に戻る/ }).first()` |
| この書類を複製 | `page.getByRole('button', { name: 'この書類を複製' })` |
| 編集（再発行） | `page.getByRole('button', { name: /編集（再発行）/ })` |
| PDF再生成 | `page.getByRole('button', { name: 'PDF再生成' })` |
| この書類を削除 | `page.getByRole('button', { name: 'この書類を削除' })` |
| 書類情報カード | `page.locator('section, div').filter({ hasText: '書類情報' }).first()` |
| プレビューカード | `page.locator('section, div').filter({ hasText: '書類プレビュー' }).last()` |
| プレビュー見出し | プレビューカード内 `h2`（`請 求 書` 等） |
| 送付状態バッジ | `page.getByText(/^(送付済み|未送付)$/)` |
| エラーカード見出し | `page.getByRole('heading', { name: '書類が見つかりません' })` |
| エラーカードの履歴に戻る | `page.getByRole('link', { name: /履歴に戻る/ })` |

> 実装時にアクセシブルネーム衝突が起きたら（例: 同じ `履歴に戻る` ボタンが2か所に現れる場合）、data-testid 追加を検討し、本仕様書と同時更新する。

---

## 品質チェック

| 項目 | 状態 |
|-----|------|
| 要件定義 P-004 を確認 | OK |
| UI実装 `renderer/pages/documents/[id].tsx` を確認 | OK |
| 参考実装（`DocumentPreview`, `historyMockData`, `mockData`）を確認 | OK |
| ユーザーゴール明確化（5項目） | OK |
| フロー単位で設計（個別操作の列挙を回避） | OK |
| E2E項目数: **9項目**（5-10以内） | OK |
| 認証/バリデーション詳細/レスポンシブ/アクセシビリティを除外 | OK |
| Outside-In原則準拠（Phase 8 API統合後もそのままPASSできる粒度） | OK（`MOCK_DOCUMENT_HISTORY` と同一スキーマのIPC応答に差し替え可能） |

---

## 除外項目と将来のカバー先

| 除外項目 | 将来のカバー先 |
|---------|---------------|
| PDF再生成の実処理（printToPDF / 角印合成 / フォント埋め込み） | `tests/integration/pdf/` 内部結合テスト（Phase 8 以降） |
| 削除後の一覧からの消滅・詳細ページから `/documents` へのリダイレクト | `tests/integration/internal/` 内部結合テスト（Phase 8 以降） |
| `window.confirm` / `alert` から AlertDialog + トーストへの差し替え | UI差し替え時に TC-006 / TC-007 の手順をモーダル操作に更新 |
| 複製・再発行後の書類作成画面での初期値プレフィル（`?from=` / `?base=`） | P-002 側の E2E（書類作成）で担保、差分は `tests/integration/internal/` |
| 送付済みフラグの状態遷移（未送付→送付済み） | `tests/integration/internal/` 内部結合テスト（Phase 8 以降） |
| タイムゾーン差による `作成日時` / `更新日時` 表示ずれ | `tests/unit/documents/formatCreatedAt.ts` ユニットテスト（TZ固定テスト） |
| 未登録IDへの直アクセス（`getStaticPaths` 未登録） | Next.js 標準の 404 ページに委ねる（E2E対象外） |
| レスポンシブ（`lg:grid-cols-[...]` の1カラム崩し） | 目視確認 + Storybookビジュアル回帰 |
| アクセシビリティ（見出し階層・ラベル関連付け・キーボード操作） | `axe-core` による自動監査 |
