export const config = {
  isProd: process.env.NODE_ENV === 'production',
  // `<実行ファイル> --mcp` で GUI なしの MCP サーバーとして起動する
  isMcp: process.argv.includes('--mcp'),
  // E2E が本番の書類フォルダへ書き込まないよう、PDF出力先を差し替える
  pdfOutputDir: process.env.JIMU_PDF_OUTPUT_DIR,
} as const
