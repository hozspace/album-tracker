import express, { type Express } from 'express'
import path from 'node:path'
import type Database from 'better-sqlite3'
import { createLogsRouter } from './routes/logs.js'
import { createStatsRouter } from './routes/stats.js'

export function createApp(db: Database.Database): Express {
  const app = express()
  app.use(express.json())

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  app.use('/api/logs', createLogsRouter(db))
  app.use('/api/stats', createStatsRouter(db))

  if (process.env.NODE_ENV === 'production') {
    const staticDir = path.resolve(
      process.env.STATIC_DIR ?? path.join(import.meta.dirname, '../../client/dist'),
    )
    app.use(express.static(staticDir))
    app.get(/^\/(?!api).*/, (_req, res) => {
      res.sendFile(path.join(staticDir, 'index.html'))
    })
  }

  return app
}
