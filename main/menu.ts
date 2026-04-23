import { app, Menu, shell, dialog, BrowserWindow, MenuItemConstructorOptions } from 'electron'

const isMac = process.platform === 'darwin'

export function buildAppMenu(): Menu {
  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' as const, label: '事務ツールについて' },
              { type: 'separator' as const },
              { role: 'services' as const, label: 'サービス' },
              { type: 'separator' as const },
              { role: 'hide' as const, label: '事務ツールを隠す' },
              { role: 'hideOthers' as const, label: 'ほかを隠す' },
              { role: 'unhide' as const, label: 'すべて表示' },
              { type: 'separator' as const },
              { role: 'quit' as const, label: '事務ツールを終了' },
            ],
          },
        ]
      : []),
    {
      label: 'ファイル',
      submenu: [
        isMac
          ? { role: 'close', label: 'ウィンドウを閉じる' }
          : { role: 'quit', label: '終了' },
      ],
    },
    {
      label: '編集',
      submenu: [
        { role: 'undo', label: '取り消し' },
        { role: 'redo', label: 'やり直し' },
        { type: 'separator' },
        { role: 'cut', label: '切り取り' },
        { role: 'copy', label: 'コピー' },
        { role: 'paste', label: '貼り付け' },
        { role: 'selectAll', label: 'すべて選択' },
      ],
    },
    {
      label: '表示',
      submenu: [
        { role: 'reload', label: '再読み込み' },
        { role: 'forceReload', label: '強制再読み込み' },
        { role: 'toggleDevTools', label: '開発者ツール' },
        { type: 'separator' },
        { role: 'resetZoom', label: '実際のサイズ' },
        { role: 'zoomIn', label: '拡大' },
        { role: 'zoomOut', label: '縮小' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'フルスクリーン' },
      ],
    },
    {
      label: 'ウィンドウ',
      submenu: [
        { role: 'minimize', label: '最小化' },
        ...(isMac
          ? [
              { type: 'separator' as const },
              { role: 'front' as const, label: 'すべてを手前に移動' },
            ]
          : [{ role: 'close' as const, label: '閉じる' }]),
      ],
    },
    {
      label: 'ヘルプ',
      submenu: [
        {
          label: '事務ツールについて',
          click: () => {
            const focused = BrowserWindow.getFocusedWindow()
            const options = {
              type: 'info' as const,
              title: '事務ツールについて',
              message: '事務ツール',
              detail: `バージョン: ${app.getVersion()}\nローカル書類作成ツール`,
              buttons: ['OK'],
            }
            if (focused) {
              dialog.showMessageBox(focused, options)
            } else {
              dialog.showMessageBox(options)
            }
          },
        },
        {
          label: 'GitHub リポジトリを開く',
          click: () => {
            shell.openExternal('https://github.com/Aizoon-jp/document-tool')
          },
        },
      ],
    },
  ]

  return Menu.buildFromTemplate(template)
}
