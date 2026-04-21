import { _electron as electron, type ElectronApplication, type Page } from '@playwright/test'
import path from 'path'
import fs from 'fs'
import os from 'os'

export interface LaunchResult {
  app: ElectronApplication
  page: Page
  userDataDir: string
}

/**
 * Launch the Electron app (production build in `app/`).
 *
 * When launched with `electron app/background.js` from the project root,
 * `app.getAppPath()` returns `<projectRoot>/app`. The code uses:
 *   - `electron-serve({ directory: 'app' })` → resolves to `<projectRoot>/app/app`
 *   - migrations at `path.join(getAppPath(), '..', 'main/db/migrations')`
 *     → resolves to `<projectRoot>/main/db/migrations`
 *
 * The migrations path is correct, but electron-serve looks for `app/app`.
 * We satisfy it with a self-referential symlink `app/app → .` so both paths
 * resolve to valid directories.
 */
function ensureServeSymlink(projectRoot: string): void {
  const symlink = path.join(projectRoot, 'app', 'app')
  if (!fs.existsSync(symlink)) {
    fs.symlinkSync('.', symlink, 'dir')
  }
}

export async function launchElectron(): Promise<LaunchResult> {
  const projectRoot = path.resolve(__dirname, '..', '..', '..')
  const mainEntry = path.join(projectRoot, 'app', 'background.js')

  if (!fs.existsSync(mainEntry)) {
    throw new Error(
      `Electron main entry not found: ${mainEntry}. Build the app first.`
    )
  }

  ensureServeSymlink(projectRoot)

  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jimu-e2e-'))

  const app = await electron.launch({
    args: [
      mainEntry,
      `--user-data-dir=${userDataDir}`,
      '--no-sandbox',
      '--disable-gpu',
      '--disable-software-rasterizer',
    ],
    cwd: projectRoot,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      ELECTRON_DISABLE_SECURITY_WARNINGS: '1',
    },
    timeout: 60000,
  })

  app.process().stdout?.on('data', (d) => {
    process.stdout.write(`[electron stdout] ${d}`)
  })
  app.process().stderr?.on('data', (d) => {
    process.stderr.write(`[electron stderr] ${d}`)
  })

  const page = await app.firstWindow({ timeout: 60000 })
  await page.waitForLoadState('domcontentloaded')

  return { app, page, userDataDir }
}

export async function closeElectron(result: LaunchResult): Promise<void> {
  try {
    await result.app.close()
  } catch {
    // ignore
  }
  try {
    fs.rmSync(result.userDataDir, { recursive: true, force: true })
  } catch {
    // ignore
  }
}
