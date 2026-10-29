'use strict'
// Mac の .app 全体を ad-hoc 署名で封印する（electron-builder の afterPack）。
// 署名を省くと実行ファイルにリンカ署名だけが残り、ダウンロードした利用者には
// 「壊れているため開けません」と出て先へ進めない。全体を封印すると
// 「システム設定 > プライバシーとセキュリティ > このまま開く」で起動できる警告に変わる。
// Developer ID で署名・公証するようになったら、このフックは外す。
const path = require('path')
const { execFileSync } = require('child_process')

exports.default = async function adhocSignMac(context) {
  if (context.electronPlatformName !== 'darwin') return
  const appPath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`)
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', appPath], { stdio: 'inherit' })
  execFileSync('codesign', ['--verify', '--deep', '--strict', appPath], { stdio: 'inherit' })
}
