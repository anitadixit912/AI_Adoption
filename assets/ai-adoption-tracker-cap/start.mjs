// CDS in 'development' mode automatically deploys the schema and seeds CSV data
// into db.sqlite on every startup — no manual seeding needed.
import cds from '@sap/cds'

process.env.PORT     = process.env.PORT || '4004'
process.env.NODE_ENV = 'development'

await cds.server()
