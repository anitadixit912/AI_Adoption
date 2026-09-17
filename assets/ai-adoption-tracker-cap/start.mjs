// Start script: seeds the database from CSV files, then starts the CAP server
import { execSync } from 'child_process'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync, unlinkSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dbFile    = resolve(__dirname, 'db.sqlite')

// Set port from BTP environment
process.env.PORT = process.env.PORT || '4004'

// Step 1: Seed the database from CSV files (always fresh)
console.log('[start] Seeding database from CSV data...')
try {
  if (existsSync(dbFile)) unlinkSync(dbFile)

  // Find cds binary
  const cdsBin = resolve(__dirname, 'node_modules/.bin/cds')
  const cdsBinExists = existsSync(cdsBin)

  if (cdsBinExists) {
    execSync(`node ${cdsBin} deploy --to sqlite:${dbFile}`, {
      cwd: __dirname,
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'development' }
    })
  } else {
    // Fallback: use cds programmatically
    const cdsTemp = (await import('@sap/cds')).default
    process.env.NODE_ENV = 'development'
    await cdsTemp.deploy({ to: `sqlite:${dbFile}` })
  }
  console.log('[start] Database seeded successfully.')
} catch (e) {
  console.error('[start] Database seeding failed:', e.message)
  console.error('[start] Continuing anyway — will use in-memory database.')
}

// Step 2: Start CDS server pointing to the seeded SQLite file
console.log('[start] Starting CDS server on port ' + process.env.PORT + '...')
process.env.NODE_ENV = 'production'

const cds = (await import('@sap/cds')).default
await cds.server()
