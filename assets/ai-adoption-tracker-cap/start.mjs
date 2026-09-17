import { dirname }       from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
process.chdir(__dirname)
process.env.NODE_ENV = 'development'
process.env.PORT     = process.env.PORT || '4004'

console.log('[start] cwd      :', process.cwd())
console.log('[start] NODE_ENV :', process.env.NODE_ENV)
console.log('[start] PORT     :', process.env.PORT)

const { default: cds } = await import('@sap/cds')
await cds.server()
