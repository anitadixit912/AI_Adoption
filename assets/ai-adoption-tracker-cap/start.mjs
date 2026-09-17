import cds from '@sap/cds'

process.env.PORT     = process.env.PORT || '4004'
process.env.NODE_ENV = 'development'

await cds.server()
