import express, { type Express } from 'express'
import path from 'node:path'

export function createApp(): Express {
  const app = express()

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

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
