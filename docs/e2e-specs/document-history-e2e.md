# P-003 書類履歴 E2Eテスト仕様書

生成日: 2026-04-20
対象ページ: `/documents`
ページコンポーネント: `renderer/pages/documents/index.tsx`
参考実装:
- `renderer/components/documents/DocumentHistoryTable.tsx`
- `renderer/components/documents/DocumentHistoryFilter.tsx`
- `renderer/components/documents/historyMockData.ts`（`MOCK_DOCUMENT_HISTORY` = 15件）

レイアウト: `renderer/layouts/MainLayout.tsx`
権限レベル: なし（ローカル版は認証不要 / 単一ユーザー）

---

## ユーザーゴール

1. 発行済み書類を発行日の新しい順で俯瞰し、目当ての書類に素早くたどり着ける
2. 取引先名・期間・書類種別・金額範囲で絞り込み、条件を組み合わせて再検索できる
3. 行クリックで詳細（P-004）に進める
4. 操作メニューから書類を複製（P-002へ流用）／PDF再ダウンロード／削除できる

---

## テスト環境

```yaml
URL: http://localhost:3055/documents  （開発時Next.js devサーバー）
起動: npm run dev （Electron + Next.js）
認証: 不要（ローカル単一ユーザー）
DB: 未接続（Phase 4 時点）。履歴は renderer/components/documents/historyMockData.ts のハードコード定数
前提:
  - MOCK_DOCUMENT_HISTORY に15件（2026-01〜2026-04、5書類種別が混在）
  - 取引先名は MOCK_CLIENTS（c1/c2/c3）で名寄せされる（株式会社サンプル / 有限会社テスト商事 / 合同会社アイゾーン）
  - 発行日降順がデフォルト並び（ヘッダークリックによるソート切替は未実装）
```

### 前提条件

- Phase 4 時点では IPC 未接続のため、`MOCK_DOCUMENT_HISTORY` 固定データでPASSすること。
- 操作メニューの `PDF再ダウンロード` は `console.log('[history] download pdf', id)` のダミー動作（IPC未接続）。
- `削除` は `window.confirm()` でOKを選んだときに `console.log('[history] delete', id)` が走るのみで、一覧からは消えない（DB未接続のため）。将来 AlertDialog + IPC に差し替え予定。
- Phase 8 の API 統合後は、同一スキーマ（`Document[]`）を返すIPCに差し替えて同じテストがPASSすることを確認する。

---

## E2Eテスト項目一覧（10項目）

| ID | テスト項目 | フロー内容 | 期待結果 |
|----|----------|-----------|---------|
| E2E-DOC-HIST-001 | 初期表示（一覧・件数・並び順） | `/documents` にアクセス | 見出し「書類履歴」、6列テーブル、15行が発行日降順で表示、件数表示 `15件中 15件を表示`、並び順ラベル `並び順: 発行日（降順）` |
| E2E-DOC-HIST-002 | 取引先名フィルタ（部分一致） | 取引先名欄に `サンプル` を入力 | 「株式会社サンプル」分のみ抽出され、件数表示が `15件中 5件を表示` に更新される |
| E2E-DOC-HIST-003 | 期間フィルタ（開始／終了） | 期間の開始日 `2026-03-01` / 終了日 `2026-03-31` を入力 | 2026年3月発行の5件のみ表示、件数表示 `15件中 5件を表示`、先頭行が `2026/03/31`（d006） |
| E2E-DOC-HIST-004 | 書類種別フィルタ（全5種パラメータ化） | 種別セレクトで各書類種別を順に選択 | 選択種別の件数と一致する行のみ表示（`全て`に戻すと15件） |
| E2E-DOC-HIST-005 | 金額範囲フィルタ | 下限 `500000` / 上限 `1500000` を入力 | 合計金額が 500,000円以上 1,500,000円以下 の行のみ表示、件数表示が `15件中 N件を表示` に更新される |
| E2E-DOC-HIST-006 | 複合条件＋リセット | 取引先名 `アイゾーン` + 種別 `請求書` を適用 → `リセット` ボタンをクリック | 絞り込み中は合致行のみ表示、リセット後は15件に戻り全入力欄が初期値に戻る |
| E2E-DOC-HIST-007 | 行クリックで詳細遷移 | 先頭行（`2026/04/18` 株式会社サンプル）をクリック | `/documents/d001` に遷移する |
| E2E-DOC-HIST-008 | 操作メニュー：複製で新規作成へ遷移 | 先頭行の操作メニューを開き `複製` を選択 | `/documents/new?from=d001` に遷移する。行クリック遷移は発火しない |
| E2E-DOC-HIST-009 | 操作メニュー：削除（OK／キャンセル分岐） | 操作メニューから `削除` を選択 → window.confirm を (a)OK / (b)キャンセル | (a) コンソールに `[history] delete {id}` が出力、(b) 何も出力されない。いずれも URL は `/documents` のまま |
| E2E-DOC-HIST-010 | 空状態（該当0件） | 取引先名欄に `該当しない文字列` を入力 | テーブルが消え、破線枠カードに `該当する書類がありません` + 副文 `検索条件を変更するか、リセットしてください。` が表示、件数表示は `15件中 0件を表示` |

---

## テストケース詳細

### TC E2E-DOC-HIST-001: 初期表示（一覧・件数・並び順）

- **目的**: `/documents` に直接アクセスした際に、全15件が発行日降順で6列テーブルに表示され、件数サマリが正しく反映されること
- **事前状態**: アプリ起動直後
- **手順**:
  1. `page.goto('/documents')`
  2. `page.waitForLoadState('networkidle')`
- **期待結果**:
  - `<title>` が `書類履歴 — 事務ツール`
  - `page.getByRole('heading', { level: 1, name: '書類履歴' })` が可視
  - 説明文 `発行済み書類の検索・再発行・複製を行います。` が表示
  - 検索カード（見出し `検索`、`リセット` ボタン）が表示
  - テーブルヘッダが6列: `発行日 / 書類種別 / 取引先 / 書類番号 / 金額 / (空列＝操作メニュー)`
  - `tbody > tr` が **15行**
  - 先頭行の各セル: `2026/04/18` / `請求書` / `株式会社サンプル` / `2026-04-003`（font-mono） / `￥1,320,000`（Intl.NumberFormat ja-JP JPY）
  - 15行すべてで `issueDate` が降順に並ぶ（先頭 `2026-04-18`、末尾 `2026-01-10`）
  - 件数表示 `15件中 15件を表示` が左側、`並び順: 発行日（降順）` が右側に表示
  - 各行末の `操作メニュー` ボタン（aria-label=`操作メニュー`）が表示

---

### TC E2E-DOC-HIST-002: 取引先名フィルタ（部分一致）

- **目的**: 取引先名の部分一致（大文字小文字無視）で絞り込みできること
- **事前状態**: `/documents` で初期表示済（15件）
- **手順**:
  1. `page.locator('#f-client')` に `サンプル` を入力
- **期待結果**:
  - `tbody > tr` が **5行**（d001, d004, d007, d010, d013: すべて `株式会社サンプル`）
  - 件数表示が `15件中 5件を表示` に更新
  - 表示された全行の `取引先` セルに `株式会社サンプル` が含まれる
- **補足**:
  - `トースト` など大文字小文字混在の場合も `toLowerCase().includes()` 比較で抽出される（`applyFilters` 実装準拠）
  - 空文字に戻すと15件に復帰

---

### TC E2E-DOC-HIST-003: 期間フィルタ（開始／終了）

- **目的**: `issueDate` 文字列（`yyyy-MM-dd`）の辞書比較で期間内の書類のみ抽出できること
- **事前状態**: `/documents` で初期表示済
- **手順**:
  1. 期間の開始日 `<input type="date">` に `2026-03-01` を入力
  2. 期間の終了日 `<input type="date">` に `2026-03-31` を入力
- **期待結果**:
  - `tbody > tr` が **5行**（d006 〜 d010: 2026年3月発行分）
  - 件数表示が `15件中 5件を表示`
  - 先頭行（降順）の発行日が `2026/03/31`、末尾が `2026/03/05`
- **補足**:
  - 開始日のみ入力（終了日空）／終了日のみ入力（開始日空）でも片側境界として機能する
  - 境界値（開始日・終了日と完全一致する issueDate を持つ行）は含まれる（`<` / `>` ではなく `<` 外側比較の実装）

---

### TC E2E-DOC-HIST-004: 書類種別フィルタ（全5種パラメータ化）

- **目的**: `documentType` セレクトで各書類種別に絞り込めること、および `全て` で解除できること
- **事前状態**: `/documents` で初期表示済
- **手順 & 期待結果**（パラメータ化テスト推奨）:

| 選択ラベル | `documentType` 値 | 期待表示件数 | 期待される `id` 一覧（降順） |
|----------|-------------------|-------------|---------------------------|
| 請求書 | `invoice` | 5件 | d001, d006, d009, d012, d015 |
| 領収書 | `receipt` | 3件 | d003, d008, d014 |
| 見積書 | `quote` | 3件 | d002, d007, d013 |
| 振込依頼書 | `payment_request` | 2件 | d005, d011 |
| 納品書 | `delivery_note` | 2件 | d004, d010 |
| 全て | `all` | 15件 | 全行 |

- **Playwright例**:
  ```ts
  await page.locator('#f-type').click()
  await page.getByRole('option', { name: '請求書' }).click()
  await expect(page.locator('tbody > tr')).toHaveCount(5)
  await expect(page.getByText('15件中 5件を表示')).toBeVisible()
  ```
- **補足**: `書類種別` セルに `DOCUMENT_TYPE_LABEL` 経由の日本語ラベルが表示されることを、行内で追加検証してよい

---

### TC E2E-DOC-HIST-005: 金額範囲フィルタ

- **目的**: `totalAmount` の下限／上限で絞り込めること、片側のみ入力でも動作すること
- **事前状態**: `/documents` で初期表示済
- **手順 & 期待結果**:

| 下限 | 上限 | 期待表示件数 | 期待される `id`（降順） |
|------|------|-------------|-----------------------|
| `500000` | `1500000` | 5件 | d001（1,320,000）, d005（550,000）, d006（770,000）, d013（660,000）, d015（550,000） |
| `1000000` | （空） | 3件 | d001（1,320,000）, d007（2,200,000）, d012（1,100,000） |
| （空） | `100000` | 3件 | d003（88,000）, d010（99,000）, d008（33,000）, d014（44,000） ※4件 |
| `0` | `0` | 0件 | なし |

> 上表の「上限のみ 100000」行は合致4件（d003 88,000 / d010 99,000 / d008 33,000 / d014 44,000）。期待値は `4件` が正。
>
> テスト実装時は上表の対応を 4 パターンだけ流すのではなく、「下限のみ」「上限のみ」「両方」「0指定で 0 件」を最低 1 ケースずつ網羅する。

- **Playwright例**:
  ```ts
  await page.getByPlaceholder('下限').fill('500000')
  await page.getByPlaceholder('上限').fill('1500000')
  await expect(page.locator('tbody > tr')).toHaveCount(5)
  ```
- **補足**: 非数値や空文字は `parseAmount` が `undefined` を返すため条件として無視される

---

### TC E2E-DOC-HIST-006: 複合条件＋リセット

- **目的**: 複数フィルタを同時適用して AND で絞り込みでき、`リセット` ボタンで全条件が初期値に戻ること
- **事前状態**: `/documents` で初期表示済
- **手順**:
  1. `#f-client` に `アイゾーン` を入力
  2. `#f-type` を開いて `請求書` を選択
  3. `page.getByRole('button', { name: 'リセット' })` をクリック
- **期待結果**:
  - 手順1〜2後: `tbody > tr` が **3行**（d006 / d009 / d012: すべて `合同会社アイゾーン` × `invoice`）、件数表示 `15件中 3件を表示`
  - リセット後: `tbody > tr` が **15行** に復帰、件数表示 `15件中 15件を表示`
  - `#f-client` が空、期間の両input が空、`#f-type` の表示値が `全て`、金額範囲の両Inputが空

---

### TC E2E-DOC-HIST-007: 行クリックで詳細遷移

- **目的**: 任意の行をクリックすると `/documents/{id}` に遷移すること
- **事前状態**: `/documents` で初期表示済
- **手順**:
  1. `tbody > tr` の先頭行（d001）をクリック
- **期待結果**:
  - URL が `/documents/d001` に遷移する
  - 行に `cursor-pointer` スタイルが適用されている（任意検証）
- **補足**: 行内の操作メニューセル（`<td>`）は `onClick` で `stopPropagation()` が走るため、そこをクリックした場合は遷移しないこと（TC-008 でカバー）

---

### TC E2E-DOC-HIST-008: 操作メニュー：複製で新規作成へ遷移

- **目的**: 操作メニュー経由で書類作成画面に `from` クエリ付きで遷移できること、および行クリック遷移と干渉しないこと
- **事前状態**: `/documents` で初期表示済
- **手順**:
  1. 先頭行（d001）の `操作メニュー` ボタン（`aria-label=操作メニュー`）をクリック
  2. DropdownMenu 内の `複製` 項目をクリック
- **期待結果**:
  - URL が `/documents/new?from=d001` に遷移する
  - `/documents/d001`（詳細ページ）には遷移しない（親 `<tr>` の onClick が発火しない）
- **補足**:
  - `PDF再ダウンロード` 項目をクリックした場合は遷移せず、コンソールに `[history] download pdf d001` が出力される（Phase 4 時点のダミー動作）

---

### TC E2E-DOC-HIST-009: 操作メニュー：削除（OK／キャンセル分岐）

- **目的**: 削除メニュー選択時の `window.confirm` 分岐の挙動を検証すること
- **事前状態**: `/documents` で初期表示済
- **手順 & 期待結果**:

**(a) confirm で OK**
  1. `page.on('dialog', (d) => { expect(d.message()).toBe('この書類を削除しますか？この操作は取り消せません。'); d.accept() })` を登録
  2. 先頭行の `操作メニュー` → `削除` を選択
  3. コンソール出力に `[history] delete d001` が含まれること
  4. URL は `/documents` のまま、`tbody > tr` の件数は依然 **15行**（Phase 4 は DB 未接続のため一覧からは消えない）

**(b) confirm でキャンセル**
  1. `page.on('dialog', (d) => d.dismiss())` を登録
  2. 先頭行の `操作メニュー` → `削除` を選択
  3. コンソール出力に `[history] delete` が **現れないこと**
  4. URL・件数ともに変化なし

- **補足**: dialog ハンドラは `page.once('dialog', …)` で 1 回分だけ登録すると安定する。将来 AlertDialog に差し替えられた際は本ケースの手順をモーダル操作に更新する

---

### TC E2E-DOC-HIST-010: 空状態（該当0件）

- **目的**: 絞り込み結果が0件のときにテーブルが破綻せず、案内カードが表示されること
- **事前状態**: `/documents` で初期表示済
- **手順**:
  1. `#f-client` に `該当しない文字列` を入力
- **期待結果**:
  - テーブル（`role=table`）が DOM から消える
  - 代わりに破線枠カードが表示され、以下のテキストを含む:
    - `該当する書類がありません`（`text-sm font-medium`）
    - `検索条件を変更するか、リセットしてください。`（`text-xs text-muted-foreground`）
  - 件数表示が `15件中 0件を表示`
  - `リセット` ボタンは通常どおり動作し、15件表示に復帰する

---

## セレクタ指針

Playwright/Electronテスト実装時の推奨セレクタ:

| 要素 | 推奨セレクタ |
|-----|------------|
| ページ見出し | `page.getByRole('heading', { level: 1, name: '書類履歴' })` |
| 検索カード見出し | `page.getByText('検索', { exact: true })` |
| 取引先名入力 | `page.locator('#f-client')` |
| 期間（開始日／終了日） | `page.locator('input[type="date"]').nth(0)` / `.nth(1)` |
| 書類種別セレクト | `page.locator('#f-type')` + `page.getByRole('option', { name: '請求書' })` 等 |
| 金額下限／上限 | `page.getByPlaceholder('下限')` / `page.getByPlaceholder('上限')` |
| リセットボタン | `page.getByRole('button', { name: 'リセット' })` |
| 件数表示 | `page.getByText(/\d+件中 \d+件を表示/)` |
| 並び順ラベル | `page.getByText('並び順: 発行日（降順）')` |
| 履歴テーブル | `page.getByRole('table')` |
| 履歴の行 | `page.locator('tbody > tr')`（インデックス指定） |
| 先頭行の書類番号セル | `page.locator('tbody tr').first().locator('td').nth(3)` |
| 操作メニュー開閉 | `page.getByRole('button', { name: '操作メニュー' })`（各行1つ、インデックスで指定） |
| DropdownMenu 複製 | `page.getByRole('menuitem', { name: '複製' })` |
| DropdownMenu PDF再DL | `page.getByRole('menuitem', { name: 'PDF再ダウンロード' })` |
| DropdownMenu 削除 | `page.getByRole('menuitem', { name: '削除' })` |
| 空状態カード | `page.getByText('該当する書類がありません')` |

> `#f-client` / `#f-type` ID は `<Label htmlFor>` + `<Input id>` / `<SelectTrigger id>` で実装済み。data-testid は不要と判断。必要になった時点で本仕様書と実装を同時更新する。

---

## 品質チェック

| 項目 | 状態 |
|-----|------|
| 要件定義 P-003 を確認 | OK |
| UI実装 `renderer/pages/documents/index.tsx` を確認 | OK |
| 参考実装（`DocumentHistoryTable`, `DocumentHistoryFilter`, `historyMockData`）を確認 | OK |
| ユーザーゴール明確化（4項目） | OK |
| フロー単位で設計（個別操作の列挙を回避） | OK |
| E2E項目数: **10項目**（5-10以内、上限） | OK |
| 認証/バリデーション詳細/レスポンシブ/アクセシビリティを除外 | OK |
| Outside-In原則準拠（Phase 8 API統合後もそのままPASSできる粒度） | OK（`MOCK_DOCUMENT_HISTORY` と同一スキーマのIPC応答に差し替え可能） |

---

## 除外項目と将来のカバー先

| 除外項目 | 将来のカバー先 |
|---------|---------------|
| ヘッダークリックによるソート切替（未実装） | 実装時に本仕様書へ追記 |
| `PDF再ダウンロード` の実処理（IPC未接続） | `tests/integration/pdf/` 内部結合テスト（Phase 8 以降） |
| `削除` 後の一覧からの消滅（DB未接続） | `tests/integration/internal/` 内部結合テスト（Phase 8 以降） |
| `window.confirm` から AlertDialog への差し替え | UI差し替え時に TC-009 の手順をモーダル操作に更新 |
| 金額下限＞上限などの整合性バリデーション | `tests/unit/documents/historyFilter.ts` ユニットテスト |
| ページング／仮想スクロール | 件数増加時の設計検討後に仕様追加 |
| レスポンシブ（`md:grid-cols-2 lg:grid-cols-3` 崩れ） | 目視確認 + Storybookビジュアル回帰 |
| アクセシビリティ（見出し階層・ラベル関連付け・キーボード操作） | `axe-core` による自動監査 |
