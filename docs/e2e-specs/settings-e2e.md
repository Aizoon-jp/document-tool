# P-005 設定 E2Eテスト仕様書

生成日: 2026-04-20
対象ページ: `/settings`
ページコンポーネント: `renderer/pages/settings/index.tsx`
参考実装:
- `renderer/components/settings/SettingsCompanyTab.tsx`
- `renderer/components/settings/SettingsClientsTab.tsx`
- `renderer/components/settings/SettingsItemsTab.tsx`
- `renderer/components/settings/SettingsStampsTab.tsx`
- `renderer/components/settings/SettingsDocumentTypesTab.tsx`
- `renderer/components/documents/mockData.ts`（`MOCK_CLIENTS` 3件 / `MOCK_ITEMS` 5件 / `MOCK_STAMPS` 2件）

レイアウト: `renderer/layouts/MainLayout.tsx`
権限レベル: なし（ローカル版は認証不要 / 単一ユーザー）

---

## ユーザーゴール

1. 自社情報（会社基本情報・振込先口座）を1画面で編集・保存できる
2. 取引先マスタ・品目マスタ・印影をCRUD操作で整備できる
3. 書類種別ごとに採番フォーマット・既定オプション・定型備考文を設定できる
4. 5つのタブを切り替えてマスタ/設定領域を一元的に俯瞰できる

---

## テスト環境

```yaml
URL: http://localhost:3055/settings  （開発時Next.js devサーバー）
起動: npm run dev （Electron + Next.js）
認証: 不要（ローカル単一ユーザー）
DB: 未接続（Phase 4 時点）。各タブの初期データはハードコード定数
前提:
  - 会社基本情報: SettingsCompanyTab 内の DEFAULT_COMPANY（name=株式会社サンプル）
  - 取引先マスタ: MOCK_CLIENTS 3件（c1:株式会社サンプル / c2:有限会社テスト商事 / c3:合同会社アイゾーン）
  - 品目マスタ: MOCK_ITEMS 5件（i1〜i5。i5 会議用弁当 は taxRate=8 / isReducedTaxRate=true）
  - 印影: MOCK_STAMPS 2件（s1:角印（代表） isDefault:true / s2:角印（営業） isDefault:false）
  - 書類別設定: 5書類種別（invoice/receipt/quote/payment_request/delivery_note）ぶん buildInitial() で生成
```

### 前提条件

- Phase 4 時点では IPC 未接続のため、各タブは上記ハードコード定数でPASSすること。
- 「保存」系ボタンはすべてダミー動作: `console.log('[settings/...] save', ...)` と `alert('...を保存/追加/更新しました（ダミー動作）')`。
- 「削除」はブラウザの `window.confirm()` でOKを選んだときのみ、画面のローカル `useState` から該当行を除去する（DB未接続）。
- 印影の画像アップロードは `URL.createObjectURL()` によるブラウザローカルのプレビューのみ。実ファイルは保存されない。
- Phase 8 の API 統合後は、同一スキーマ（`Company` / `Client[]` / `Item[]` / `Stamp[]` / `DocumentSetting[]`）を返すIPCに差し替えて同じテストがPASSすることを確認する。

---

## E2Eテスト項目一覧（9項目）

| ID | テスト項目 | フロー内容 | 期待結果 |
|----|----------|-----------|---------|
| E2E-SETTINGS-001 | 初期表示（会社基本情報タブ既定） | `/settings` にアクセス | 見出し「設定」、5タブ（会社基本情報/取引先マスタ/品目マスタ/印影管理/書類別設定）が横並びで描画、会社基本情報タブが active、「基本情報」「振込先口座」2カードが表示される |
| E2E-SETTINGS-002 | タブ切替（全5タブの表示確認） | 5タブを順にクリック | 各タブクリックで対応するパネルのみが描画される（取引先=テーブル3行 / 品目=テーブル5行 / 印影=カード2枚 / 書類別設定=5カード） |
| E2E-SETTINGS-003 | 会社基本情報の保存（ダミーalert） | 会社基本情報タブで会社名を編集 → `保存` ボタンをクリック | `alert('会社基本情報を保存しました（ダミー動作）')` が発火、accept 後もURLは `/settings` のまま（コンソールに `[settings/company] save` が出力） |
| E2E-SETTINGS-004 | 取引先マスタ：一覧＋新規追加ダイアログ | 取引先タブ表示→`新規追加`クリック→取引先名入力→`保存` | `登録取引先：3件`、テーブル3行、ダイアログタイトル `取引先を追加`、保存で `alert('取引先を追加しました（ダミー動作）')` 発火後ダイアログが閉じる |
| E2E-SETTINGS-005 | 取引先マスタ：編集ダイアログ＋削除confirm | 1行目の編集ボタン→フォームに既存値がプリフィル→キャンセル。続けて削除ボタン→confirm OK | 編集ダイアログタイトル `取引先を編集`、`取引先名` の初期値=`株式会社サンプル`。削除OK後テーブル行が2行に減る、件数表示 `登録取引先：2件` に更新 |
| E2E-SETTINGS-006 | 品目マスタ：一覧フォーマット＋軽減税率バッジ | 品目タブ表示 | 5行表示、`登録品目：5件`。単価が `￥500,000` など通貨表記、税率列が `10%`/`8%`/`0%`、5行目 `会議用弁当` の軽減列に amber バッジ `軽減`、他4行は `—` |
| E2E-SETTINGS-007 | 印影管理：一覧＋新規追加ダイアログ（画像アップロード） | 印影タブ表示→`新規追加`→名前入力→PNGファイル選択→`追加` | 初期カード2枚（1枚目に `デフォルト` バッジ）、ダイアログで PNG アップロード後プレビューサムネ表示、`追加` クリックで `alert('印影を追加しました（ダミー動作）')`、一覧カードが3枚に増える |
| E2E-SETTINGS-008 | 書類別設定：5種カード表示＋オプション切替＋保存 | 書類別設定タブ表示→請求書カードの `源泉徴収税を控除` Switch を ON→`保存` | 5カード（請求書/領収書/見積書/振込依頼書/納品書）、請求書の採番フォーマット初期値 `INV-{YYYY}-{MM}-{seq:3}`。Switch ON後 `保存` で `alert('請求書の設定を保存しました（ダミー動作）')` 発火 |
| E2E-SETTINGS-009 | 書類別設定：採番フォーマット＆定型備考の編集 | 領収書カードの採番フォーマットと定型備考文を書き換え→`保存` | Inputの値が `RCP-TEST-{YYYY}-{MM}-{seq:3}` などに更新、Textareaの値も更新、`保存`で `alert('領収書の設定を保存しました（ダミー動作）')` 発火、コンソールに編集後のオブジェクトが出力される |

---

## テストケース詳細

### TC E2E-SETTINGS-001: 初期表示（会社基本情報タブ既定）

- **目的**: `/settings` に直接アクセスした際に5タブが描画され、会社基本情報タブが active で「基本情報」「振込先口座」2カードが欠けなく表示されること
- **事前状態**: アプリ起動直後
- **手順**:
  1. `page.goto('/settings')`
  2. `page.waitForLoadState('networkidle')`
- **期待結果**:
  - `<title>` が `設定 — 事務ツール`
  - `page.getByRole('heading', { level: 1, name: '設定' })` が可視
  - 説明文 `マスタデータと共通設定を一元管理します。` が表示
  - TabsList 内に `role=tab` が5個描画される（順序: 会社基本情報 / 取引先マスタ / 品目マスタ / 印影管理 / 書類別設定）
  - `会社基本情報` タブが `data-state="active"` / `aria-selected=true`
  - 会社基本情報パネル内に `基本情報`（CardTitle）と `振込先口座`（CardTitle）の2カードが存在
  - 基本情報カードの `会社名` Inputに既定値 `株式会社サンプル` がプリフィル
  - 振込先口座カードの `口座種別` Selectの表示値が `普通`
  - フォーム末尾右下に `保存` ボタン（`type=submit`）

---

### TC E2E-SETTINGS-002: タブ切替（全5タブの表示確認）

- **目的**: 5タブがクリックで切替可能で、それぞれ対応パネルのみが描画されること
- **事前状態**: `/settings` で初期表示済
- **手順 & 期待結果**（パラメータ化テスト推奨）:

| タブラベル | クリック後に active | 対応パネルの識別マーカー |
|---------|--------------------|------------------------|
| 会社基本情報 | `会社基本情報` | `基本情報` / `振込先口座` の2カードが可視 |
| 取引先マスタ | `取引先マスタ` | `登録取引先：3件` が可視、`tbody > tr` が3行 |
| 品目マスタ | `品目マスタ` | `登録品目：5件` が可視、`tbody > tr` が5行 |
| 印影管理 | `印影管理` | `登録印影：2件（PNG/JPG、5MB以下）` が可視、印影カードが2枚 |
| 書類別設定 | `書類別設定` | `請求書` / `領収書` / `見積書` / `振込依頼書` / `納品書` の CardTitle が全て可視、計5カード |

- **Playwright例**:
  ```ts
  await page.getByRole('tab', { name: '取引先マスタ' }).click()
  await expect(page.getByText('登録取引先：3件')).toBeVisible()
  await expect(page.locator('tbody > tr')).toHaveCount(3)
  ```
- **補足**: 非activeパネルはDOMから外れる（Radix Tabs の標準挙動）。よって `tbody > tr` カウントは常に現在アクティブなタブ内に限定される。

---

### TC E2E-SETTINGS-003: 会社基本情報の保存（ダミーalert）

- **目的**: 会社基本情報タブの保存ボタンで `alert` が発火し、コンソールにフォーム値が出力されること
- **事前状態**: `/settings` で初期表示済（会社基本情報タブ active）
- **手順**:
  1. `会社名` Input（`register('name')`）をクリアし `株式会社テスト保存` を入力
  2. `page.once('dialog', (d) => { expect(d.message()).toBe('会社基本情報を保存しました（ダミー動作）'); d.accept() })` を登録
  3. フォーム末尾の `保存` ボタン（`type=submit`）をクリック
- **期待結果**:
  - `alert` ダイアログが発火し、メッセージが `会社基本情報を保存しました（ダミー動作）` に一致
  - accept 後もURLは `/settings` のまま
  - コンソール出力に `[settings/company] save` が含まれ、`values.name === '株式会社テスト保存'` である
- **補足**: Zod schemaで `name` のみ min(1) 必須。空の状態で保存すると `会社名は必須です` エラーメッセージが表示され、`alert` は発火しない（本TCでは検証範囲外。詳細はユニットテストでカバー）。

---

### TC E2E-SETTINGS-004: 取引先マスタ：一覧＋新規追加ダイアログ

- **目的**: 取引先マスタタブで一覧件数・新規追加ダイアログの開閉・保存ダミー動作が正しく動くこと
- **事前状態**: `/settings` で初期表示済
- **手順**:
  1. `取引先マスタ` タブをクリック
  2. 件数表示とテーブル行数を確認
  3. `新規追加` ボタン（`role=button`, name=`新規追加`）をクリック
  4. ダイアログ内 `取引先名` Inputに `株式会社 新規太郎` と入力
  5. `page.once('dialog', (d) => { expect(d.message()).toBe('取引先を追加しました（ダミー動作）'); d.accept() })` を登録
  6. ダイアログ右下 `保存` ボタン（`type=submit`）をクリック
- **期待結果**:
  - 手順2: `登録取引先：3件`、テーブルのヘッダが `取引先名 / 敬称 / 電話番号 / 支払条件 / 操作`、`tbody > tr` が3行
  - 手順3: DialogTitle が `取引先を追加`、DialogDescription が `書類の宛先として使用されます`
  - `敬称` Selectの初期値が `御中`、`デフォルト税区分` Selectの初期値が `課税10%`
  - 手順6後: `alert` が発火、accept 後ダイアログが閉じる（`role=dialog` が非表示になる）
  - コンソール出力 `[settings/clients] save` に `id: undefined`（新規のため）と `values.name === '株式会社 新規太郎'` が含まれる
  - Phase 4 はテーブルには反映されない（`setClients` を呼ばない実装）。DB接続後は件数4件に増える想定
- **補足**: 取引先名未入力で `保存` をクリックすると `取引先名は必須です` エラーメッセージが表示され、`alert` は発火しない。

---

### TC E2E-SETTINGS-005: 取引先マスタ：編集ダイアログ＋削除confirm

- **目的**: 既存取引先の編集ダイアログがプリフィルされること、および削除confirmの OK 分岐で一覧から1件消えること
- **事前状態**: 取引先マスタタブを表示済（3件）

**(a) 編集ダイアログのプリフィル検証**
  1. 1行目（`株式会社サンプル`）の `編集` ボタン（`aria-label=編集`）をクリック
  2. DialogTitle が `取引先を編集` であることを確認
  3. `取引先名` Inputの値が `株式会社サンプル`、`電話番号` Inputの値が `03-1234-5678`、`住所` Inputの値が `東京都渋谷区神宮前1-2-3` であることを確認
  4. ダイアログ `キャンセル` ボタン（variant=outline）をクリック → ダイアログが閉じる

**(b) 削除confirm OK分岐**
  1. `page.once('dialog', async (d) => { expect(d.type()).toBe('confirm'); expect(d.message()).toBe('この取引先を削除しますか？'); await d.accept() })` を登録
  2. 1行目（`株式会社サンプル`）の `削除` ボタン（`aria-label=削除`）をクリック
- **期待結果**:
  - `tbody > tr` が **2行** に減る（`有限会社テスト商事` / `合同会社アイゾーン`）
  - 件数表示が `登録取引先：2件` に更新

**(c) 削除confirm キャンセル分岐**（任意）
  1. `page.once('dialog', (d) => d.dismiss())` を登録
  2. いずれかの行の `削除` ボタンをクリック
- **期待結果**: 行数は変化なし（DB未接続だがローカル state もそのまま）

---

### TC E2E-SETTINGS-006: 品目マスタ：一覧フォーマット＋軽減税率バッジ

- **目的**: 品目一覧の単価・税率・軽減税率表示が仕様どおりフォーマットされていること
- **事前状態**: `/settings` で初期表示済
- **手順**:
  1. `品目マスタ` タブをクリック
- **期待結果**:
  - 件数表示 `登録品目：5件`
  - テーブルヘッダ: `品目名 / 単価 / 単位 / 税率 / 軽減 / 操作`
  - `tbody > tr` が5行
  - 各行の期待値:

| 行 | 品目名 | 単価 | 単位 | 税率 | 軽減列 |
|----|-------|------|------|------|--------|
| 1 | Webサイト制作 | `￥500,000` | 式 | `10%` | `—` |
| 2 | コンサルティング費用 | `￥80,000` | 時間 | `10%` | `—` |
| 3 | 保守運用（月額） | `￥30,000` | 月 | `10%` | `—` |
| 4 | 交通費実費 | `￥0` | 式 | `10%` | `—` |
| 5 | 会議用弁当 | `￥1,200` | 個 | `8%` | amber バッジ `軽減` |

- **補足**:
  - 単価は `Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' })` により `￥` プレフィクス + 3桁区切り。
  - 軽減バッジは `bg-amber-100 text-amber-800` クラス付き `<span>`。他4行は `—`（`text-muted-foreground`）。
  - 編集/削除ボタンの挙動は TC-005 の取引先と同じパターンなので、品目側では一覧フォーマット検証に集中する。

---

### TC E2E-SETTINGS-007: 印影管理：一覧＋新規追加ダイアログ（画像アップロード）

- **目的**: 印影カード一覧の表示と、新規追加ダイアログでの画像アップロード→プレビュー→追加フローが動作すること
- **事前状態**: `/settings` で初期表示済

**(a) 一覧表示**
  1. `印影管理` タブをクリック
- **期待結果**:
  - 件数表示 `登録印影：2件（PNG/JPG、5MB以下）`
  - カードが2枚（`角印（代表）` / `角印（営業）`）
  - 1枚目（`角印（代表）`）の右上に `デフォルト` バッジ（`bg-primary/10 text-primary`）
  - 各カードに `位置 X: 140mm` / `位置 Y: 55mm` / `幅: 25mm` / `透明度: 80%` が表示
  - 画像未設定の初期状態では、破線枠内に `StampIcon` + `画像未設定` が表示

**(b) 新規追加ダイアログ（画像アップロード）**
  1. `新規追加` ボタンをクリック
  2. DialogTitle `印影を追加` / DialogDescription `角印画像と配置座標・透明度を登録` が表示
  3. `印影名` Inputに `角印（テスト）` を入力
  4. `ファイル選択` ボタンをクリックし、hidden `<input type="file" accept="image/png,image/jpeg">` 経由で PNG ファイルを1枚アップロード
  5. アップロード後、ボタン右横に16x16のプレビューサムネ（`<img alt="preview">`）が表示される
  6. X座標`140` / Y座標`55` / 幅`25` / 透明度`0.8` の既定値が入っていること
  7. `page.once('dialog', (d) => { expect(d.message()).toBe('印影を追加しました（ダミー動作）'); d.accept() })` を登録
  8. ダイアログ `追加` ボタン（`type=submit`）をクリック
- **期待結果**:
  - `alert` が発火し、メッセージが `印影を追加しました（ダミー動作）` に一致
  - accept 後ダイアログが閉じる
  - 一覧カードが **3枚** に増える（`setStamps` によりローカル state に追加される）
  - 新規カード内のプレビュー枠に、アップロード画像が `<img src="blob:...">` で描画される
  - コンソール出力 `[settings/stamps] add` に `name: '角印（テスト）'`, `opacity: 0.8` などが含まれる

**(c) 画像バリデーション（任意）**
  - 画像以外（text/plain など）をアップロードすると `alert('PNGまたはJPG形式のみ対応')` が発火
  - 5MB超のファイルでは `alert('5MB以下のファイルを選択してください')` が発火

- **補足**:
  - Playwrightでのファイル選択は `page.setInputFiles('input[type="file"]', 'path/to/stamp.png')` で実装。要hidden input 経由のため `page.getByRole('button', { name: 'ファイル選択' }).click()` をトリガーにしてもよいが、直接 `setInputFiles` の方が安定。
  - `URL.createObjectURL()` はブラウザAPI。Electronのレンダラプロセスでも利用可。

---

### TC E2E-SETTINGS-008: 書類別設定：5種カード表示＋オプション切替＋保存

- **目的**: 書類別設定タブに5書類種別カードが並び、デフォルトオプションのSwitch切替と保存ダミー動作が動くこと
- **事前状態**: `/settings` で初期表示済
- **手順**:
  1. `書類別設定` タブをクリック
  2. 5カードが `lg:grid-cols-2` レイアウトで描画されていることを確認
  3. 請求書カード（CardTitle=`請求書`）の `採番フォーマット` Inputの値を検証
  4. 請求書カード内 `源泉徴収税を控除` Switch をクリックしてON
  5. `page.once('dialog', (d) => { expect(d.message()).toBe('請求書の設定を保存しました（ダミー動作）'); d.accept() })` を登録
  6. 請求書カード末尾右下の `保存` ボタン（size=sm）をクリック
- **期待結果**:
  - 手順2: CardTitle が `請求書` / `領収書` / `見積書` / `振込依頼書` / `納品書` の5枚。CardDescription は全て `採番・既定オプション・定型備考`
  - 手順3: 請求書の `採番フォーマット` Input初期値が `INV-{YYYY}-{MM}-{seq:3}`、ヒント文 `プレースホルダ: {YYYY} {MM} {seq:3}` が表示
  - デフォルトオプション枠内に5つのSwitchが縦並び: `消費税を計算`（ON） / `軽減税率を区別表示`（ON） / `源泉徴収税を控除`（OFF） / `備考欄を表示`（ON） / `振込先を表示`（ON）
  - 手順4後: `源泉徴収税を控除` Switch の `data-state` が `checked` に変わる
  - 手順6後: `alert` が発火しメッセージが `請求書の設定を保存しました（ダミー動作）` に一致、accept 後もURLは `/settings` のまま
  - コンソール出力 `[settings/document-types] save` に `documentType: 'invoice'`, `defaultOptions.withholdingTax: true` が含まれる

**パラメータ化（書類種別 × 採番フォーマット初期値 × 定型備考初期値）**:

| 書類種別 | 採番フォーマット | 定型備考文 |
|---------|----------------|-----------|
| 請求書 | `INV-{YYYY}-{MM}-{seq:3}` | `お振込手数料はお客様にてご負担ください。` |
| 領収書 | `RCP-{YYYY}-{MM}-{seq:3}` | `上記、正に領収いたしました。` |
| 見積書 | `QT-{YYYY}-{MM}-{seq:3}` | `お見積有効期限：発行日より30日間` |
| 振込依頼書 | `PR-{YYYY}-{MM}-{seq:3}` | `下記口座へお振込をお願いいたします。` |
| 納品書 | `DN-{YYYY}-{MM}-{seq:3}` | `上記の通り納品いたしました。` |

---

### TC E2E-SETTINGS-009: 書類別設定：採番フォーマット＆定型備考の編集

- **目的**: 採番フォーマットInputと定型備考Textareaの編集が state に反映され、保存時のコンソール出力に新しい値が乗ること
- **事前状態**: `書類別設定` タブ表示済
- **手順**:
  1. 領収書カード（CardTitle=`領収書`）の `採番フォーマット` Inputをクリア → `RCP-TEST-{YYYY}-{MM}-{seq:3}` を入力
  2. 領収書カードの `定型備考文` Textareaをクリア → `領収テスト備考` を入力
  3. `page.once('dialog', (d) => { expect(d.message()).toBe('領収書の設定を保存しました（ダミー動作）'); d.accept() })` を登録
  4. 領収書カード末尾の `保存` ボタンをクリック
- **期待結果**:
  - 手順1後: 領収書の `採番フォーマット` Inputの値が `RCP-TEST-{YYYY}-{MM}-{seq:3}`
  - 手順2後: 領収書の `定型備考文` Textareaの値が `領収テスト備考`
  - 手順4後: `alert('領収書の設定を保存しました（ダミー動作）')` が発火
  - コンソール出力 `[settings/document-types] save` の `numberFormat` が `RCP-TEST-{YYYY}-{MM}-{seq:3}`、`defaultRemarks` が `領収テスト備考`
- **補足**: 他の書類種別（請求書・見積書等）の state には影響しない（`update(type, patch)` で書類単位にマージされるため）。他タブの state も影響を受けないが、タブ切替でアンマウントされる（Radix Tabs挙動）ため、次回同タブを開いた際に初期値に戻る点に注意。これは Phase 4 時点の仕様。

---

## セレクタ指針

Playwright/Electronテスト実装時の推奨セレクタ:

| 要素 | 推奨セレクタ |
|-----|------------|
| ページ見出し | `page.getByRole('heading', { level: 1, name: '設定' })` |
| タブ（共通） | `page.getByRole('tab', { name: '会社基本情報' })`（他ラベルも同様） |
| 会社名Input | `page.getByLabel('会社名')` |
| 会社基本情報保存ボタン | `page.getByRole('button', { name: '保存' }).last()`（末尾のform submit） |
| 取引先タブ件数表示 | `page.getByText(/登録取引先：\d+件/)` |
| 取引先新規追加ボタン | `page.getByRole('button', { name: '新規追加' })` |
| 取引先テーブル行 | `page.locator('tbody > tr')` |
| 取引先編集ボタン | `page.getByRole('button', { name: '編集' })`（各行1つ、インデックス指定） |
| 取引先削除ボタン | `page.getByRole('button', { name: '削除' })`（各行1つ、インデックス指定） |
| ダイアログ（共通） | `page.getByRole('dialog')` |
| ダイアログ内 `取引先名` | `page.getByRole('dialog').getByLabel(/取引先名/)` |
| ダイアログ保存ボタン | `page.getByRole('dialog').getByRole('button', { name: '保存' })` |
| ダイアログキャンセル | `page.getByRole('dialog').getByRole('button', { name: 'キャンセル' })` |
| 品目テーブル | `page.getByRole('table')`（品目タブ active 時） |
| 軽減バッジ | `page.getByText('軽減', { exact: true })` |
| 印影カード | `page.locator('section, div').filter({ hasText: '角印（代表）' })`（カードラッパ指定） |
| 印影デフォルトバッジ | `page.getByText('デフォルト', { exact: true })` |
| 印影画像アップロード | `page.locator('input[type="file"]')` + `setInputFiles()` |
| 印影ダイアログ追加ボタン | `page.getByRole('dialog').getByRole('button', { name: '追加' })` |
| 書類別設定カード | `page.locator('section, div').filter({ hasText: '請求書' }).filter({ hasText: '採番・既定オプション・定型備考' })` |
| 書類別設定 採番Input | 請求書カード内の `input[placeholder="INV-{YYYY}-{MM}-{seq:3}"]` もしくは `getByLabel('採番フォーマット')` をインデックス指定 |
| Switch（書類別設定内） | カード単位にスコープして `getByText('源泉徴収税を控除').locator('..').locator('button[role=switch]')` 等 |
| 書類別設定 保存ボタン | 各カード内の `getByRole('button', { name: '保存' })` |

> ダイアログ内要素は必ず `page.getByRole('dialog')` でスコープしてから `getByLabel`/`getByRole` をチェーンすること。ページ本体との要素名衝突を避けられる。
> 必要になった時点で `data-testid` 追加を検討し、本仕様書とコードを同時更新する。

---

## 品質チェック

| 項目 | 状態 |
|-----|------|
| 要件定義 P-005 を確認 | OK |
| UI実装 `renderer/pages/settings/index.tsx` を確認 | OK |
| 子コンポーネント5点（`Settings*Tab.tsx`）を確認 | OK |
| ユーザーゴール明確化（4項目） | OK |
| フロー単位で設計（個別操作の列挙を回避） | OK |
| E2E項目数: **9項目**（5-10以内） | OK |
| 認証/バリデーション詳細/レスポンシブ/アクセシビリティを除外 | OK |
| Outside-In原則準拠（Phase 8 API統合後もそのままPASSできる粒度） | OK（`MOCK_CLIENTS` / `MOCK_ITEMS` / `MOCK_STAMPS` / `DEFAULT_COMPANY` と同一スキーマのIPC応答に差し替え可能） |

---

## 除外項目と将来のカバー先

| 除外項目 | 将来のカバー先 |
|---------|---------------|
| Zod各フィールドのバリデーションメッセージ詳細（`会社名は必須です` / `取引先名は必須です` / `品目名は必須です` / `印影名は必須です` / `1mm以上` 等） | `tests/unit/schemas/settings*.ts` ユニットテスト |
| 郵便番号・インボイス番号の形式バリデーション（`\d{3}-?\d{4}` / `T\d{13}`） | `tests/unit/schemas/validators.ts` ユニットテスト |
| 画像アップロードのMIME/サイズバリデーション分岐（PNG/JPG以外・5MB超） | `tests/unit/settings/stampFile.ts` ユニットテスト（TC-007(c)で軽くなぞる程度） |
| 保存後のDB反映・再読込整合性 | `tests/integration/internal/settings.ts` 内部結合テスト（Phase 8 以降） |
| 印影のデフォルト一意性制約（2つ以上 isDefault:true にならない） | `tests/integration/internal/stamps.ts` 内部結合テスト（Phase 8 以降） |
| 採番フォーマット `{YYYY}{MM}{seq:3}` の実際の採番ロジック | `tests/unit/documents/generateDocumentNumber.ts` ユニットテスト |
| タブ切替時の state 保持（現状はアンマウントにより消失） | 要件確定後にUI設計・仕様書更新 |
| `window.confirm` / `alert` から AlertDialog + トーストへの差し替え | UI差し替え時に TC-003/004/005/007 の手順をモーダル操作に更新 |
| レスポンシブ（`sm:grid-cols-2` / `lg:grid-cols-3` / `lg:grid-cols-2` 崩れ） | 目視確認 + Storybookビジュアル回帰 |
| アクセシビリティ（見出し階層・Label関連付け・キーボードでのタブ切替・Switchのフォーカスリング） | `axe-core` による自動監査 |
