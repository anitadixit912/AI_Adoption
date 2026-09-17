// Start script: builds the React UI then starts the CAP server
import { execSync, spawn } from 'child_process'
import { existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const distDir = resolve(__dirname, 'app/react-ui/dist')
const vitebin = resolve(__dirname, 'node_modules/.bin/vite')
const vitecfg = resolve(__dirname, 'app/react-ui/vite.config.js')

// Always build the UI before serving
console.log('[start] Building React UI...')
try {
  execSync(`node ${vitebin} build --config ${vitecfg} app/react-ui`, {
    cwd: __dirname,
    stdio: 'inherit'
  })
  console.log('[start] UI build complete.')
} catch (e) {
  console.warn('[start] UI build failed, using existing dist if available.')
}

// Start CDS server
console.log('[start] Starting CDS server...')
const cds = spawn('cds', ['serve'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
})

cds.on('exit', code => process.exit(code ?? 0))
