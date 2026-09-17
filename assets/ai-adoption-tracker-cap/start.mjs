// start.mjs
// KEY: process.env.NODE_ENV must be set BEFORE @sap/cds loads.
// We use dynamic import() so the assignment runs first.
// With NODE_ENV=development, @cap-js/sqlite auto-deploys schema + seeds CSV data on startup.

import { dirname }                    from 'path'
import { fileURLToPath }              from 'url'
import { existsSync, unlinkSync, readdirSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Always run from the app root so CDS finds db/, srv/, app/ correctly
process.chdir(__dirname)

process.env.PORT     = process.env.PORT || '4004'
process.env.NODE_ENV = 'development'   // must be set BEFORE the import below

console.log('[start] cwd       :', process.cwd())
console.log('[start] NODE_ENV  :', process.env.NODE_ENV)
console.log('[start] PORT      :', process.env.PORT)
console.log('[start] db/data   :', readdirSync('db/data').join(', '))

// Delete any stale db.sqlite so @cap-js/sqlite always reseeds from CSV files
if (existsSync('db.sqlite')) {
  unlinkSync('db.sqlite')
  console.log('[start] Removed stale db.sqlite — will reseed from CSV')
}

// Dynamic import: @sap/cds loads NOW with NODE_ENV=development already set.
// @cap-js/sqlite will auto-deploy schema + seed CSV data during cds.server() bootstrap.
const { default: cds } = await import('@sap/cds')
await cds.server()
