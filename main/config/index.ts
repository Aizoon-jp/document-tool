export const config = {
  isProd: process.env.NODE_ENV === 'production',
  // E2E が本番の書類フォルダへ書き込まないよう、PDF出力先を差し替える
  pdfOutputDir: process.env.JIMU_PDF_OUTPUT_DIR,
} as const
