// Start script: builds React UI, seeds the database, then starts the CAP server
import { execSync } from 'child_process'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync, unlinkSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const vitebin   = resolve(__dirname, 'node_modules/.bin/vite')
const vitecfg   = resolve(__dirname, 'app/react-ui/vite.config.js')
const cdsBin    = resolve(__dirname, 'node_modules/.bin/cds')
const dbFile    = resolve(__dirname, 'db.sqlite')

// Set port from BTP environment
process.env.PORT = process.env.PORT || '4004'

// Step 1: Build the React UI
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

// Step 2: Always re-seed the database from CSV files so data is always fresh
console.log('[start] Seeding database from CSV data...')
try {
  if (existsSync(dbFile)) unlinkSync(dbFile)
  execSync(`node ${cdsBin} deploy --to sqlite:db.sqlite`, {
    cwd: __dirname,
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development' }
  })
  console.log('[start] Database seeded successfully.')
} catch (e) {
  console.error('[start] Database seeding failed:', e.message)
}

// Step 3: Start CDS server pointing to the seeded SQLite file
console.log('[start] Starting CDS server on port ' + process.env.PORT + '...')
process.env.CDS_DB_KIND = 'sqlite'
process.env.CDS_DB_CREDENTIALS_URL = 'db.sqlite'
const cds = (await import('@sap/cds')).default
await cds.server()
