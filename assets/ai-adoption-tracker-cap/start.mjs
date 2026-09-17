// Start script: builds the React UI then starts the CAP server programmatically
import { execSync } from 'child_process'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const vitebin = resolve(__dirname, 'node_modules/.bin/vite')
const vitecfg = resolve(__dirname, 'app/react-ui/vite.config.js')

// Set port from BTP environment (BTP injects PORT automatically)
process.env.PORT = process.env.PORT || '4004'

// Build the React UI
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

// Start CDS server using programmatic API (no shell dependency)
console.log('[start] Starting CDS server on port ' + process.env.PORT + '...')
const cds = (await import('@sap/cds')).default
await cds.server()
