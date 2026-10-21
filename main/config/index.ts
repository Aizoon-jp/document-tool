export const config = {
  isProd: process.env.NODE_ENV === 'production',
  // `<実行ファイル> --mcp` で GUI なしの MCP サーバーとして起動する
  isMcp: process.argv.includes('--mcp'),
  // mcp-bridge.js が用意したソケットの名前。Windows では Electron が stdin を読めないため必須
  mcpPipe: process.argv.find((a) => a.startsWith('--mcp-pipe='))?.slice('--mcp-pipe='.length),
  // E2E が本番の書類フォルダへ書き込まないよう、PDF出力先を差し替える
  pdfOutputDir: process.env.JIMU_PDF_OUTPUT_DIR,
} as const
