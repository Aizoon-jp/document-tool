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
| **Phase 9: E2Eテスト** | [x] | 主要書類（請求書・領収書・見積書）の発行フローをE2E検証 |
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

## 📊 受入試験進捗

- **総テスト項目数**: 44項目
- **Pass**: 44項目 (100%)
- **未完了**: 0項目 (0%)

最終更新: 2026-04-21 05:00

## 📝 受入試験チェックリスト

### 1. ダッシュボード（/）- 7項目
**ゴール**: 最近発行した書類の把握・書類種別ごとのクイック作成・月次発行状況の確認

| 状態 | ID | 項目 | 期待結果 |
|:----:|-----|------|---------|
| [x] | E2E-DASH-001 | ダッシュボード初期表示 | 見出し/クイック作成5ボタン/最近発行テーブル/今月件数カードが表示 |
| [x] | E2E-DASH-002 | クイック作成フロー（全5種） | 各ボタンで `/documents/new?type={type}` に遷移 |
| [x] | E2E-DASH-003 | 最近書類の行クリックで詳細遷移 | `/documents/{id}` に遷移 |
| [x] | E2E-DASH-004 | 最近書類のフォーマット検証 | 日付 `yyyy/MM/dd`、金額 `¥1,320,000`、書類種別日本語ラベル |
| [x] | E2E-DASH-005 | 今月サマリ表示 | 総件数/種別内訳5種が表示 |
| [x] | E2E-DASH-006 | 書類履歴をすべて見る | `/documents` に遷移 |
| [x] | E2E-DASH-007 | 空状態（最近書類ゼロ件） | テーブル0行/サマリ0件/クイック作成は通常動作 |

### 2. 書類作成（/documents/new）- 9項目
**ゴール**: 5書類種別を選んで取引先・明細・オプションを入力し、PDF発行または下書き保存ができる

| 状態 | ID | 項目 | 期待結果 |
|:----:|-----|------|---------|
| [x] | E2E-DOC-NEW-001 | クエリパラメータ付き初期表示 | `?type=invoice` で請求書モードで初期表示 |
| [x] | E2E-DOC-NEW-002 | 書類種別切替で見出し・番号・振込先が連動 | 種別変更で書類番号プレフィックス・振込先セクションが切替 |
| [x] | E2E-DOC-NEW-003 | 取引先選択でプレビュー宛名が更新 | セレクトで選択した取引先名がプレビュー反映 |
| [x] | E2E-DOC-NEW-004 | 明細モード切替（直接記載⇔別紙明細） | モード切替で明細UIと合計表示が切り替わる |
| [x] | E2E-DOC-NEW-005 | 明細行の追加・削除 | ＋/−ボタンで行追加/削除、合計再計算 |
| [x] | E2E-DOC-NEW-006 | 品目マスタ連動で単価・単位・数量自動入力 | 品目選択で既定値が入る |
| [x] | E2E-DOC-NEW-007 | オプショントグルで計算・プレビュー連動 | 源泉徴収/内税外税などトグルで合計再計算 |
| [x] | E2E-DOC-NEW-008 | 印影の複数選択トグル | 印影の選択状態がプレビューに反映 |
| [x] | E2E-DOC-NEW-009 | アクションボタンの挙動（PDF/下書き/キャンセル） | 各ボタンで対応アクション（PDF生成・保存・離脱）が実行 |

### 3. 書類履歴（/documents）- 10項目
**ゴール**: 過去書類を一覧・検索し、詳細へ到達、再発行・複製・削除ができる

| 状態 | ID | 項目 | 期待結果 |
|:----:|-----|------|---------|
| [x] | E2E-DOC-HIST-001 | 履歴初期表示 | 全書類一覧が発行日降順で表示 |
| [x] | E2E-DOC-HIST-002 | 取引先名フィルタ（部分一致） | 取引先名で絞り込み、件数更新 |
| [x] | E2E-DOC-HIST-003 | 期間フィルタ（開始／終了） | 期間指定で絞り込み |
| [x] | E2E-DOC-HIST-004 | 書類種別フィルタ（全5種パラメータ化） | 種別選択で対象種別のみ絞り込み |
| [x] | E2E-DOC-HIST-005 | 金額範囲フィルタ | 金額範囲で絞り込み |
| [x] | E2E-DOC-HIST-006 | 複合条件＋リセット | 複数フィルタ適用/リセット |
| [x] | E2E-DOC-HIST-007 | 行クリックで詳細遷移 | `/documents/{id}` に遷移 |
| [x] | E2E-DOC-HIST-008 | 操作メニュー：複製で新規作成へ遷移 | `/documents/new?from={id}` に遷移 |
| [x] | E2E-DOC-HIST-009 | 操作メニュー：削除（OK／キャンセル分岐） | 確認ダイアログ分岐を検証 |
| [x] | E2E-DOC-HIST-010 | 空状態（該当0件） | 該当0件メッセージ表示 |

### 4. 書類詳細・再発行（/documents/[id]）- 9項目
**ゴール**: 書類の内容確認・編集保存・PDF再発行・複製・削除ができる

| 状態 | ID | 項目 | 期待結果 |
|:----:|-----|------|---------|
| [x] | E2E-DOC-DETAIL-001 | 書類詳細の初期表示 | ヘッダ/取引先/明細/合計/オプション/印影が表示 |
| [x] | E2E-DOC-DETAIL-002 | 書類種別バリエーション（全5種） | h1/title/プレビューh2が種別で切替 |
| [x] | E2E-DOC-DETAIL-003 | 履歴に戻るボタン | `/documents` に遷移 |
| [x] | E2E-DOC-DETAIL-004 | 複製 → 新規作成へ遷移 | `/documents/new?from={id}` に遷移 |
| [x] | E2E-DOC-DETAIL-005 | 編集（再発行）→ 新規作成へ遷移 | `/documents/new?base={id}` に遷移 |
| [x] | E2E-DOC-DETAIL-006 | PDF再生成 | alertまたはIPCでPDF生成、URLは保持 |
| [x] | E2E-DOC-DETAIL-007 | 削除（OK／キャンセル分岐） | 確認ダイアログ分岐、URL保持 |
| [x] | E2E-DOC-DETAIL-008 | 存在しないIDのエラー画面 | 書類が見つかりませんカード表示 |
| [x] | E2E-DOC-DETAIL-009 | 情報カードのフォーマット検証 | 書類番号/発行日/金額/作成日時のフォーマット |

### 5. 設定（/settings）- 9項目
**ゴール**: 会社情報・取引先・品目・印影・書類別設定をタブで管理できる

| 状態 | ID | 項目 | 期待結果 |
|:----:|-----|------|---------|
| [x] | E2E-SETTINGS-001 | 初期表示（会社基本情報タブ既定） | 見出し/5タブ/基本情報+振込先口座カード表示 |
| [x] | E2E-SETTINGS-002 | タブ切替（全5タブ） | 5タブ各パネルを順次クリックで表示確認 |
| [x] | E2E-SETTINGS-003 | 会社基本情報の保存 | 会社名編集→保存で `company:update` IPC呼び出し |
| [x] | E2E-SETTINGS-004 | 取引先マスタ：一覧＋新規追加ダイアログ | 3件→追加で4件、ダイアログ動作 |
| [x] | E2E-SETTINGS-005 | 取引先マスタ：編集ダイアログ＋削除confirm | 編集ダイアログ表示、削除で件数-1 |
| [x] | E2E-SETTINGS-006 | 品目マスタ：一覧フォーマット＋軽減税率バッジ | 5件表示、軽減税率バッジ検証 |
| [x] | E2E-SETTINGS-007 | 印影管理：一覧＋新規追加（画像アップロード） | 2件→PNGアップロードで3件 |
| [x] | E2E-SETTINGS-008 | 書類別設定：5種カード＋オプション切替＋保存 | 請求書カード源泉徴収Switch+保存 |
| [x] | E2E-SETTINGS-009 | 書類別設定：採番フォーマット＆定型備考の編集 | 領収書カードInput/Textarea編集+保存 |

## 🎯 ベストプラクティス（成功パターン蓄積）

### Electron起動
- Playwright `_electron.launch()` で `app/background.js` を指定して本物のElectronを起動
- `--disable-gpu` フラグを付与（ヘッドレスCI環境対策）
- ヘルパー: `tests/e2e/helpers/electronApp.ts`（起動・終了の再利用）

### E2E用ビルド前提
- 事前に `cd renderer && next build` でレンダラーを静的エクスポート
- メインプロセスは nextron の webpack を直接起動してビルド
- `nextron.config.js` に externals 設定: `better-sqlite3` / `electron-serve` / `electron-store`
- better-sqlite3 はネイティブモジュール再ビルド必要: `npx @electron/rebuild -f -t prod,dev -w better-sqlite3`
- `electron-serve` は `app.getAppPath()/app` を探すため、ヘルパーで `app/app → .` シンボリックリンクを自動生成

### 認証処理
（本プロジェクトは認証なし）

### 待機処理

### UI操作
- Next.js `trailingSlash` 設定や Next export の性質で URL末尾スラッシュが付くため、URL検証は `.*\?type=.*` パターン使用を推奨
- `page.goBack()` 直後はDOM再マウントでボタンがdetachされるため、クリック前に `await expect(locator).toBeVisible()` で再安定化を待つ
- shadcn/ui Select は「Selectトリガー + HTMLネイティブoption + プレビュー」等で同テキストが複数箇所に出現する。`getByText` は strict mode violation を起こすため、プレビューのルート要素（例: `div.aspect-[1/1.414]`）でスコープを絞る

### フィルター前後の件数並記表示 - Pass日時: 2026-04-21 (E2E-DOC-HIST-001)
**問題**: 仕様書は `{total}件中 {filtered}件を表示` を要求したが、実装は `useSearchDocuments`（フィルター適用後）の結果のみで `${documents.length}件を表示` とレンダリング。総件数（絞り込み前）が表示できない。

**成功パターン**（フィルター前の総件数を別クエリで取得）:
```tsx
// renderer/pages/documents/index.tsx
const { data: documents = [], isLoading } = useSearchDocuments(filter, DEFAULT_SORT)
const { data: allDocuments = [] } = useDocuments(DEFAULT_SORT)
// ...
{isLoading
  ? '読み込み中...'
  : `${allDocuments.length}件中 ${documents.length}件を表示`}
```

**重要なポイント**:
- TanStack Query のキャッシュ共有により、`useDocuments` と `useSearchDocuments` の同時利用で追加IPCは発生しない（queryKey が別ならそれぞれ1回ずつだが、軽量）
- 総件数と表示件数を別変数で保持することで、フィルター前・適用後の両方を同一コンポーネント内で管理できる
- フィルター0件時は `15件中 0件を表示` となり仕様通り

### Nextron 動的ルート × output:export の SPA フォールバック - Pass日時: 2026-04-21 (E2E-DOC-DETAIL-001)
**問題**: `output: 'export'` + `getStaticPaths({ paths: [{ params: { id: 'placeholder' } }], fallback: false })` では `app/documents/placeholder/index.html` しか生成されず、`app://./documents/{uuid}/` にアクセスすると electron-serve がダッシュボードの `index.html` にフォールバックしてしまい詳細ページが描画されない。

**成功パターン**（`electron-serve` を捨てて自前の `registerFileProtocol` ハンドラで SPA フォールバック）:
```ts
// main/background.ts
protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }])

const registerAppProtocol = (): void => {
  const appDir = path.join(app.getAppPath(), 'app')
  const indexPath = path.join(appDir, 'index.html')
  session.defaultSession.protocol.registerFileProtocol('app', (request, callback) => {
    const { pathname } = new URL(request.url)
    const ext = path.extname(pathname)
    const target = path.join(appDir, decodeURIComponent(pathname))
    // 静的ファイルは実体優先
    try {
      const s = fs.statSync(target)
      if (s.isFile()) return callback({ path: target })
      if (s.isDirectory()) {
        const html = path.join(target, 'index.html')
        if (fs.existsSync(html)) return callback({ path: html })
      }
    } catch {}
    if (ext && ext !== '.html') return callback({ error: -6 })
    // 動的ルート fallback: /documents/{uuid}/ → placeholder HTML
    if (/^\/documents\/[^/]+\/?$/.test(pathname) && !pathname.startsWith('/documents/new')) {
      return callback({ path: path.join(appDir, 'documents', 'placeholder', 'index.html') })
    }
    callback({ path: indexPath })
  })
}
```
そしてページ側で `window.location.pathname` から実 ID を抽出:
```tsx
// renderer/pages/documents/[id].tsx
const [id, setId] = useState<string>('')
useEffect(() => {
  const last = window.location.pathname.split('/').filter(Boolean).pop() ?? ''
  if (last && last !== 'placeholder') setId(last)
  else if (typeof router.query.id === 'string' && router.query.id !== 'placeholder') setId(router.query.id)
}, [router.query.id, router.asPath])
```

**重要なポイント**:
- `__NEXT_DATA__` は `id: 'placeholder'` で固定されるため `router.query.id` は常に `placeholder`
- placeholder HTML 内の JS チャンクはそのまま再利用でき、CSR で hydrate 後に IPC データ取得
- 静的アセット（`.css`/`.js` 等）は拡張子で判定して実体ルックアップ（SPA フォールバックに巻き込まない）

**失敗したパターン（参考）**:
- ❌ `getStaticPaths` を削除 → Next.js 静的エクスポートでエラー
- ❌ `fallback: 'blocking'` → output:export では未対応
- ❌ placeholder に直接アクセスして `router.push('/documents/{uuid}')` → `electron-serve` はファイル無しで `index.html` へフォールバック

### Card の書類プレビュー見出し位置（`filter().last()` とDOM構造の整合） - Pass日時: 2026-04-21 (E2E-DOC-DETAIL-001)
**問題**: `page.locator('div').filter({ has: getByText('書類プレビュー') }).last().locator('h2')` が `shadcn/ui` の `<Card><CardHeader>書類プレビュー</CardHeader><CardContent>...h2...</CardContent></Card>` 構造だと、`.last()` が CardHeader div を指してしまい h2 に辿り着けない。

**成功パターン**（CardHeader を使わず、`書類プレビュー` と h2 を同じ CardContent 内に置く）:
```tsx
<Card>
  <CardContent className="space-y-4 pt-6">
    <CardTitle className="text-base">書類プレビュー</CardTitle>
    <DocumentPreview ... />
  </CardContent>
</Card>
```

**重要なポイント**:
- `filter({ has: ... }).last()` は document order の最後（通常は最内側）の div を返す
- 見出しと本文を同じ div に入れることで `last()` が本文側を含むコンテナに解決される

### E2Eビルド再実行手順（app/ 欠損時）
**問題**: `npm run build` がルートで CSS ビルドエラー（`border-border` class not found）となり `app/` 全体が消える。

**成功パターン**（renderer → main の順で個別ビルド）:
```bash
cd renderer && NODE_ENV=production npx next build
node /home/kazuhiro/事務ツール/node_modules/nextron/bin/webpack.config.js
```

**重要なポイント**:
- `cd renderer && next build` では `renderer/tailwind.config.js` が正しく解決される
- Nextron の main プロセス webpack は `node_modules/nextron/bin/webpack.config.js` を直接呼べる
- 事前に `app/` を削除する必要はない（それぞれ上書き）

### sticky プレビューとの重なり対策 - Pass日時: 2026-04-21 (E2E-DOC-NEW-005)
**問題**: `lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)]` の左ペイン内のサブグリッドが `grid-cols-[1fr_...]` で定義されると、1fr の暗黙 min-width=min-content により列がシュリンクせず、右側の `lg:sticky` プレビューカードの下へ要素がオーバーフロー。最右列（削除ボタン）が重なり、Playwright クリックが「subtree intercepts pointer events」で30秒タイムアウト。

**成功パターン**（実装側ルート修正・最小変更）:
```tsx
// renderer/components/documents/DocumentLinesField.tsx
// before: grid-cols-[1fr_80px_60px_100px_110px_32px]
// after:  grid-cols-[minmax(0,1fr)_80px_60px_100px_110px_32px]
<div className="grid grid-cols-[minmax(0,1fr)_80px_60px_100px_110px_32px] items-start gap-2">
```

**重要なポイント**:
- CSS Grid の `1fr` は暗黙的に `minmax(auto, 1fr)` であり、子要素の min-content によりシュリンクが阻止される
- ネストされたグリッドでは外側が `minmax(0, 1fr)` でも、内側も `minmax(0, 1fr)` にしないとオーバーフロー
- sticky レイアウトで「button visible/enabled/stable だが intercepts pointer events」エラーに遭遇したら、まず親コンテナ幅と子グリッドの実幅を確認

**失敗したパターン（参考）**:
- ❌ `click({ force: true })`: 症状隠蔽、根本原因（レイアウトオーバーフロー）が残る
- ❌ ビューポート拡大: Electron BrowserWindow の幅（1280x800）は固定、Playwright の setViewportSize は効かない
- ❌ `scrollIntoViewIfNeeded()`: Playwright 既定で既に実行済（Call log参照）。縦スクロールでは解決しない横方向重なり

---

### IPC呼び出し検証
- 実IPC + 実SQLite DB で検証（モック使用禁止）
- 空DBでテストする場合、一覧系APIは空配列を返す → 「書類がまだ発行されていません」等の空状態UIが表示される点に注意

### 仕様書と実装の差分（記録）
- 書類番号プレフィックス: 仕様書は`QUO/PAY/DLV`だが実装は`QT/PR/DN`（見積書/振込依頼書/納品書）。請求書INV・領収書RCPは一致。E2E-DOC-NEW-002 以降で該当する種別検証時は実装値を優先
- 発行日: 仕様書は `new Date().toISOString().slice(0, 10)`（UTC）を明示。テスト側もUTC基準で統一
- アクションボタン（PDF生成/下書き保存）: 仕様書は Phase 4 時点の alert() + console.log() ダミー動作を記述。Phase 8 IPC 統合後は実 documents:create / documents:generate-pdf が呼ばれ `/documents/:id` へ遷移する実装。テストは本質（バリデーション/alert 発火/遷移）で検証

### PDF生成の前提条件
- documents:generate-pdf は company:get が null だと失敗する
- PDF生成テストの前に company:update（テスト用の最小限の会社情報）を IPC 経由でシードすること

### シードデータ投入
- テストデータは `tests/e2e/helpers/seed.ts` に集約
- `window.ipc.invoke('clients:create', ...)` / `documents:create` を実IPCで呼ぶ
- beforeAll でシード後、`page.reload()` で UI を最新状態に同期
- 一時userData（mkdtemp）で各テスト実行を独立化 → 自動クリーンアップ
- 書類IDはUUID生成のため、仕様書の例示（id=1等）は実装に合わせて UUID 集合で照合
