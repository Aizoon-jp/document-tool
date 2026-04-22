import fs from 'fs'
import path from 'path'
import { app, Menu, protocol, session } from 'electron'
import { createWindow } from './helpers/create-window'
import { closeDatabase, initDatabase } from './db/client'
import { registerIpcHandlers } from './ipc'
import { seedDefaultDocumentSettings } from './ipc/documentSettings'
import { buildAppMenu } from './menu'

const isProd = process.env.NODE_ENV === 'production'

// Register the custom `app://` scheme as privileged BEFORE app.ready (required).
// Mirrors electron-serve defaults so existing behavior is unchanged.
if (isProd) {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'app',
      privileges: {
        standard: true,
        secure: true,
        allowServiceWorkers: true,
        supportFetchAPI: true,
        corsEnabled: true,
      },
    },
  ])
} else {
  app.setPath('userData', `${app.getPath('userData')} (development)`)
}

/**
 * Register the `app://` file protocol with a SPA-aware fallback.
 *
 * Next.js `output: 'export'` only emits `app/documents/placeholder/index.html`
 * for the `[id].tsx` dynamic route. Requests to `app://./documents/{uuid}/`
 * therefore 404 against the filesystem. We intercept those and serve the
 * placeholder HTML so React Router / Next.js can hydrate the dynamic page.
 * The `[id].tsx` component itself extracts the real UUID from
 * `window.location.pathname` (`router.query.id` is pinned to `'placeholder'`
 * by the build-time `__NEXT_DATA__`).
 */
const registerAppProtocol = (): void => {
  const appDir = path.join(app.getAppPath(), 'app')
  const indexPath = path.join(appDir, 'index.html')

  const resolveFsPath = (pathname: string): string | undefined => {
    const decoded = decodeURIComponent(pathname)
    const target = path.join(appDir, decoded)
    try {
      const stat = fs.statSync(target)
      if (stat.isFile()) return target
      if (stat.isDirectory()) {
        const htmlPath = path.join(target, 'index.html')
        if (fs.existsSync(htmlPath)) return htmlPath
      }
    } catch {
      // fall through to SPA fallback
    }
    return undefined
  }

  session.defaultSession.protocol.registerFileProtocol('app', (request, callback) => {
    const url = new URL(request.url)
    const pathname = url.pathname
    const ext = path.extname(pathname)

    // Static asset (css/js/font/image): resolve from fs or 404.
    if (ext && ext !== '.html') {
      const resolved = resolveFsPath(pathname)
      callback(resolved ? { path: resolved } : { error: -6 })
      return
    }

    // HTML / directory request: try fs, else SPA-fallback.
    const resolved = resolveFsPath(pathname)
    if (resolved) {
      callback({ path: resolved })
      return
    }

    // Dynamic document detail route — serve the placeholder HTML so the
    // client-side `[id].tsx` bundle hydrates and reads the UUID from the URL.
    if (/^\/documents\/[^/]+\/?$/.test(pathname) && !pathname.startsWith('/documents/new')) {
      const placeholder = path.join(appDir, 'documents', 'placeholder', 'index.html')
      if (fs.existsSync(placeholder)) {
        callback({ path: placeholder })
        return
      }
    }

    // Top-level SPA fallback to dashboard (preserves prior electron-serve behavior).
    callback({ path: indexPath })
  })
}

;(async () => {
  await app.whenReady()

  if (isProd) {
    registerAppProtocol()
  }

  Menu.setApplicationMenu(buildAppMenu())

  initDatabase()
  await seedDefaultDocumentSettings()
  registerIpcHandlers()

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          isProd
            ? "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'"
            : "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: http://localhost:* ws://localhost:*; img-src 'self' data: blob: http://localhost:*; connect-src 'self' http://localhost:* ws://localhost:*",
        ],
      },
    })
  })

  const mainWindow = createWindow('main', {
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  if (isProd) {
    await mainWindow.loadURL('app://./')
  } else {
    const port = process.argv[2]
    await mainWindow.loadURL(`http://localhost:${port}/`)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  }
})()

app.on('window-all-closed', () => {
  app.quit()
})

app.on('before-quit', () => {
  closeDatabase()
})
