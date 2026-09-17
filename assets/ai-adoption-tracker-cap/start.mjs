import { dirname }       from 'path'
import { fileURLToPath } from 'url'
import { execSync }      from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
process.chdir(__dirname)
process.env.NODE_ENV = 'development'
process.env.PORT     = process.env.PORT || '4004'

console.log('[start] cwd      :', process.cwd())
console.log('[start] NODE_ENV :', process.env.NODE_ENV)
console.log('[start] PORT     :', process.env.PORT)

// Step 1: Deploy DB schema + seed all CSV data BEFORE starting the server
console.log('[start] Deploying database...')
execSync(
  `"${process.execPath}" node_modules/@sap/cds/bin/cds.js deploy --to sqlite:db.sqlite`,
  { stdio: 'inherit', env: { ...process.env } }
)
console.log('[start] Database ready.')

// Step 2: Start CDS server — DB is already fully deployed and seeded
const { default: cds } = await import('@sap/cds')
await cds.server()
