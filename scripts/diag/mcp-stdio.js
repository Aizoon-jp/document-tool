// 一時診断: --mcp を起動し、stdout/stderr/終了コードを記録する
const { spawn } = require('child_process')
const path = require('path')
const os = require('os')
const fs = require('fs')
const [exe, ...extra] = process.argv.slice(2)
const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jimu-diag-'))
const env = { ...process.env, ELECTRON_ENABLE_LOGGING: '1', NODE_ENV: 'production' }
if (process.env.DIAG_RUN_AS_NODE) env.ELECTRON_RUN_AS_NODE = '1'
const args = [...extra, `--user-data-dir=${userDataDir}`, '--no-sandbox']
console.log('spawn', exe, args, 'RUN_AS_NODE=', !!env.ELECTRON_RUN_AS_NODE)
const t0 = Date.now()
const cp = spawn(exe, args, { env, stdio: ['pipe', 'pipe', 'pipe'] })
cp.stdout.on('data', (d) => console.log(`[${Date.now() - t0}ms stdout]`, JSON.stringify(d.toString())))
cp.stderr.on('data', (d) => console.log(`[${Date.now() - t0}ms stderr]`, JSON.stringify(d.toString())))
cp.on('error', (e) => console.log('spawn error', e))
cp.on('exit', (code, sig) => { console.log(`[${Date.now() - t0}ms] exit code=${code} signal=${sig}`); process.exit(0) })
setTimeout(() => {
  console.log(`[${Date.now() - t0}ms] send initialize`)
  cp.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'diag', version: '0' } } }) + '\n')
}, 8000)
setTimeout(() => { console.log('timeout, killing'); cp.kill(); process.exit(0) }, 25000)
