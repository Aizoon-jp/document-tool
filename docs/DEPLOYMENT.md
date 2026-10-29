# デプロイ設定

事務ツールは GitHub Actions によるマトリックスビルドで Windows / macOS / Linux 向けインストーラーを自動生成します。

## リリース手順

```bash
# 1. developで開発完了 → mainへマージ
git checkout main
git merge develop --no-ff
git push origin main

# 2. タグを作成してpush（vX.Y.Z 形式）
git tag -a v0.1.0 -m "v0.1.0 初回リリース"
git push origin v0.1.0
```

タグpushにより `.github/workflows/release.yml` が起動し、以下が自動実行されます。

| ランナー | 生成物 | 配置先 |
|---------|-------|--------|
| windows-latest | `jimu-tool-setup-X.Y.Z.exe`（NSIS） | GitHub Release |
| macos-latest | `jimu-tool-X.Y.Z-arm64.dmg` / `jimu-tool-X.Y.Z-x64.dmg`（ad-hoc 署名） | GitHub Release |
| ubuntu-latest | `jimu-tool-X.Y.Z.AppImage` | GitHub Release |

ファイル名は `electron-builder.yml` の `artifactName` で英字にしている（日本語の productName は Release のアセット名から消えるため）。

完了後、`https://github.com/Aizoon-jp/document-tool/releases/tag/vX.Y.Z` に各プラットフォーム向けインストーラーが揃います。

## 生成物の構造

electron-builder の設定（`electron-builder.yml`）で以下を同梱：

- `app/` — Nextronビルド成果物（Electronメイン + Next.js SSG）
- `resources/migrations/` — Drizzle マイグレーションSQL（`extraResources` で `process.resourcesPath` 配下に配置）
- `resources/icon.ico` / `icon.icns` — プラットフォーム別アイコン

## 署名について

macOS は **Developer ID 署名・公証なし** で、`afterPack`（`scripts/adhocSignMac.js`）が .app 全体を ad-hoc 署名で封印しています（`CSC_IDENTITY_AUTO_DISCOVERY: false`）。

- 封印しないと、ブラウザでダウンロードした Mac で「壊れているため開けません」と出て開けない（v0.1.9 まで）
- 封印すると「開いていません」の警告になり、システム設定 →「プライバシーとセキュリティ」→「このまま開く」で起動できる
- Apple Developer Program 登録後は、Developer ID で署名・公証し、このフックを外す

Windows も未署名。SmartScreen 警告が出る（「詳細情報」→「実行」で起動できる）。EV 証明書でも警告は即時には消えない（Microsoft 公式）。解消するなら Microsoft Artifact Signing（日本の法人は対象）

## ネイティブモジュール

`better-sqlite3` はネイティブバイナリ（`.node`）を含むため、**ビルドはターゲットOS上で実行必須**（クロスコンパイル不可）。GitHub Actions のマトリックスビルドで各OSランナーを使う構成はこの制約への対応です。

`postinstall: electron-builder install-app-deps` が各ランナーで自動的にネイティブモジュールをElectron ABI向けにリビルドします。

## バージョニング

- `package.json` の `version` を更新
- `v{version}` 形式のタグを push

## ローカル手動ビルド（参考）

```bash
# Linux環境で
npm run dist:linux   # AppImage のみ生成可能（WSLでも動作）

# Windows/Mac は実機 or GitHub Actions 必須
```

## トラブルシューティング

### ビルドが失敗する
- `gh run list --workflow=release.yml --limit 5` で直近のRun確認
- `gh run view <run-id> --log-failed` で失敗ジョブのログ取得

### タグをやり直したい
```bash
git tag -d v0.1.0
git push origin :refs/tags/v0.1.0
# 必要に応じて GitHub Release も削除
gh release delete v0.1.0 --yes
```
