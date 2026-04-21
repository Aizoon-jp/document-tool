/**
 * Nextron build configuration.
 * Externalizes native/Electron-specific modules so webpack does not attempt
 * to bundle them (native .node bindings cannot be bundled).
 */
module.exports = {
  webpack: (config) => {
    const externals = Array.isArray(config.externals) ? config.externals : []
    config.externals = [
      ...externals,
      'better-sqlite3',
      'electron-serve',
      'electron-store',
    ]
    return config
  },
}
