// Start script: builds React UI, seeds the database, then starts the CAP server
import { execSync } from 'child_process'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync, unlinkSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dbFile    = resolve(__dirname, 'db.sqlite')
const distDir   = resolve(__dirname, 'app/react-ui/dist')
const viteBin   = resolve(__dirname, 'app/react-ui/node_modules/.bin/vite')
const rootVite  = resolve(__dirname, 'node_modules/.bin/vite')

process.env.PORT = process.env.PORT || '4004'

// Step 1: Build React UI
console.log('[start] Building React UI...')
try {
  // Install react-ui dependencies first if needed
  if (!existsSync(viteBin)) {
    console.log('[start] Installing react-ui dependencies...')
    execSync('npm install', {
      cwd: resolve(__dirname, 'app/react-ui'),
      stdio: 'inherit'
    })
  }
  const vite = existsSync(viteBin) ? viteBin : rootVite
  execSync(`node ${vite} build`, {
    cwd: resolve(__dirname, 'app/react-ui'),
    stdio: 'inherit'
  })
  console.log('[start] UI build complete.')
} catch (e) {
  console.warn('[start] UI build failed:', e.message)
  console.warn('[start] Continuing without UI rebuild.')
}

// Step 2: Seed the database from CSV files (always fresh)
console.log('[start] Seeding database from CSV data...')
try {
  if (existsSync(dbFile)) unlinkSync(dbFile)
  const cdsBin = resolve(__dirname, 'node_modules/.bin/cds')
  execSync(`node ${cdsBin} deploy --to sqlite:${dbFile}`, {
    cwd: __dirname,
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development' }
  })
  console.log('[start] Database seeded successfully.')
} catch (e) {
  console.error('[start] Database seeding failed:', e.message)
}

// Step 3: Start CDS server
console.log('[start] Starting CDS server on port ' + process.env.PORT + '...')
process.env.NODE_ENV = 'production'
const cds = (await import('@sap/cds')).default
await cds.server()
