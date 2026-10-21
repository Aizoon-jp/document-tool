'use strict'
// stdio <-> Electron の橋渡し。`ELECTRON_RUN_AS_NODE=1 <exe> mcp-bridge.js [追加引数...]` で起動される。
// Windows では Electron メインプロセスがパイプの stdin を読めない（electron/electron#4552）ため、
// Node として動くこのスクリプトが stdio を受け持ち、Electron 本体とはソケットで繋ぐ。
const net = require('net')
const os = require('os')
const path = require('path')
const crypto = require('crypto')
const fs = require('fs')
const { spawn } = require('child_process')

const CONNECT_TIMEOUT_MS = 30000
const KILL_AFTER_MS = 5000

const id = `${process.pid}-${crypto.randomBytes(4).toString('hex')}`
// macOS の sun_path 上限(104)に収めるため、POSIX は短い名前にする
const listenPath =
  process.platform === 'win32' ? `\\\\.\\pipe\\jimu-tool-mcp-${id}` : path.join(os.tmpdir(), `jimu-mcp-${id}.sock`)

let child = null
let connected = false

function cleanup() {
  if (process.platform !== 'win32') fs.rmSync(listenPath, { force: true })
}

function exit(code) {
  cleanup()
  process.exit(code)
}

const server = net.createServer((socket) => {
  if (connected) return socket.destroy()
  connected = true
  clearTimeout(connectTimer)
  process.stdin.pipe(socket)
  socket.pipe(process.stdout)
  process.stdin.on('end', () => {
    socket.end()
    setTimeout(() => child.kill(), KILL_AFTER_MS).unref()
  })
  socket.on('error', () => undefined)
})

const connectTimer = setTimeout(() => {
  process.stderr.write('Electron 側が接続してきませんでした（30秒）\n')
  if (child) child.kill()
  exit(1)
}, CONNECT_TIMEOUT_MS)

server.on('error', (e) => {
  process.stderr.write(`ブリッジの待ち受けに失敗しました: ${e.message}\n`)
  exit(1)
})

server.listen(listenPath, () => {
  const env = { ...process.env }
  delete env.ELECTRON_RUN_AS_NODE
  child = spawn(process.execPath, [...process.argv.slice(2), '--mcp', `--mcp-pipe=${listenPath}`], {
    env,
    stdio: ['ignore', 'ignore', 'inherit'],
  })
  child.on('error', (e) => {
    process.stderr.write(`Electron を起動できませんでした: ${e.message}\n`)
    exit(1)
  })
  child.on('exit', (code) => exit(code ?? 1))
})

process.on('SIGTERM', () => {
  if (child) child.kill()
  exit(143)
})
