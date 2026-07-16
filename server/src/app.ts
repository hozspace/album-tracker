import express, { type Express } from 'express'
import path from 'node:path'
import type Database from 'better-sqlite3'
import { createLogsRouter } from './routes/logs.js'
import { createStatsRouter } from './routes/stats.js'
import { createArtRouter } from './routes/art.js'
import { createRecsRouter, type RecsRouterOptions } from './routes/recs.js'
import { createEmailRouter, type EmailRouterOptions } from './routes/email.js'
import { ART_DIR } from './lib/dataDir.js'
import { fail } from './lib/envelope.js'

export function createApp(
  db: Database.Database,
  artDir: string = ART_DIR,
  recsOptions: RecsRouterOptions = {},
  emailOptions: EmailRouterOptions = {},
): Express {
  const app = express()
  app.use(express.json())

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  app.use('/api/logs', createLogsRouter(db, artDir))
  app.use('/api/art', createArtRouter(artDir))
  app.use('/api/stats', createStatsRouter(db))
  app.use('/api/recs', createRecsRouter(db, recsOptions))
  app.use('/api/email', createEmailRouter(db, emailOptions))

  // Any /api route that fell through the routers above is unknown — return
  // the standard envelope rather than falling into the SPA/HTML fallback.
  app.use('/api', (_req, res) => {
    res.status(404).json(fail('not found'))
  })

  // Body-parse failures (invalid JSON) throw before any route runs; without
  // this handler Express would answer with its default HTML error page
  // instead of the envelope every other error path uses.
  app.use(
    (err: Error, _req: express.Request, res: express.Response, next: express.NextFunction) => {
      if (res.headersSent) return next(err)
      if (err instanceof SyntaxError) {
        res.status(400).json(fail('invalid request body'))
        return
      }
      console.error('unhandled request error:', err)
      res.status(500).json(fail('internal error'))
    },
  )

  if (process.env.NODE_ENV === 'production') {
    const staticDir = path.resolve(
      process.env.STATIC_DIR ?? path.join(import.meta.dirname, '../../client/dist'),
    )
    app.use(express.static(staticDir))
    app.get(/^\/(?!api).*/, (_req, res) => {
      // Pass root instead of a pre-joined absolute path: without root, the
      // `send` module runs its dotfile check against every segment of the
      // full resolved path, so any dot-prefixed ancestor directory (e.g.
      // .claude, .config, a hidden deploy path) makes it 404 a real file.
      res.sendFile('index.html', { root: staticDir })
    })
  }

  return app
}
