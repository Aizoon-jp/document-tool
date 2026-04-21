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
| windows-latest | `事務ツール Setup X.Y.Z.exe`（NSIS） | GitHub Release |
| macos-latest | `事務ツール-X.Y.Z.dmg`（未署名） | GitHub Release |
| ubuntu-latest | `事務ツール-X.Y.Z.AppImage` | GitHub Release |

完了後、`https://github.com/Aizoon-jp/document-tool/releases/tag/vX.Y.Z` に各プラットフォーム向けインストーラーが揃います。

## 生成物の構造

electron-builder の設定（`electron-builder.yml`）で以下を同梱：

- `app/` — Nextronビルド成果物（Electronメイン + Next.js SSG）
- `resources/migrations/` — Drizzle マイグレーションSQL（`extraResources` で `process.resourcesPath` 配下に配置）
- `resources/icon.ico` / `icon.icns` — プラットフォーム別アイコン

## 署名について

現状 **macOS は未署名** でビルドしています（`CSC_IDENTITY_AUTO_DISCOVERY: false`）。

- 配布時、macOS では「開発元が未確認」警告が出る
- エンドユーザーは **右クリック → 開く** で起動可能
- 将来 Apple Developer Program 登録後、同workflowで署名・公証（notarization）を追加

Windows も未署名。SmartScreen警告が出る可能性あり。EV証明書購入で解消可能。

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
