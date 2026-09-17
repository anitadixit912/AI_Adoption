import { dirname }       from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
process.chdir(__dirname)
process.env.PORT = process.env.PORT || '4004'

const { default: cds } = await import('@sap/cds')
await cds.server()
