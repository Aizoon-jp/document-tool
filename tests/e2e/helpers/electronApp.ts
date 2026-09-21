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
 * Electron must be pointed at the project root (`.`), not at
 * `app/background.js` directly: `main/db/client.ts` resolves migrations as
 * `path.join(app.getAppPath(), 'main', 'db', 'migrations')`, and
 * electron-serve is configured with `directory: 'app'`. Both only resolve
 * when `getAppPath()` is the project root. package.json's `main` field
 * points Electron at `app/background.js` from there.
 */
export async function launchElectron(): Promise<LaunchResult> {
  const projectRoot = path.resolve(__dirname, '..', '..', '..')
  const mainEntry = path.join(projectRoot, 'app', 'background.js')

  if (!fs.existsSync(mainEntry)) {
    throw new Error(
      `Electron main entry not found: ${mainEntry}. Build the app first.`
    )
  }

  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jimu-e2e-'))

  const app = await electron.launch({
    args: [
      projectRoot,
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
      // ウィンドウを表示せずに実行する（main/background.ts で参照）。
      JIMU_HIDE_WINDOW: '1',
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
