import { Router, type Response } from 'express'
import type Database from 'better-sqlite3'
import * as logsRepository from '../repositories/logsRepository.js'
import {
  parseLogId,
  validateCreateLog,
  validateListQuery,
  validateUpdateLog,
} from '../validation/logValidation.js'
import { ValidationError } from '../lib/validationError.js'
import { fail, ok } from '../lib/envelope.js'
import { cacheArtForLog, removeArtFile } from '../lib/artCache.js'

export function createLogsRouter(db: Database.Database, artDir: string): Router {
  const router = Router()

  router.get('/', (req, res) => {
    try {
      const { limit, offset } = validateListQuery(req.query as Record<string, unknown>)
      res.json(ok(logsRepository.findAll(db, limit, offset)))
    } catch (error) {
      handleError(res, error)
    }
  })

  router.post('/', (req, res) => {
    try {
      const input = validateCreateLog(req.body)
      const created = logsRepository.create(db, input)
      res.status(201).json(ok(created))
      // Fire-and-forget: the client shouldn't wait on an external image
      // download. The row is rewritten to point at the local cache once the
      // download completes; failures are logged and leave artUrl untouched.
      void cacheArtForLog(db, artDir, created)
    } catch (error) {
      handleError(res, error)
    }
  })

  router.get('/:id', (req, res) => {
    try {
      const id = parseLogId(req.params.id)
      const log = logsRepository.findById(db, id)
      if (!log) {
        res.status(404).json(fail('log not found'))
        return
      }
      res.json(ok(log))
    } catch (error) {
      handleError(res, error)
    }
  })

  router.put('/:id', (req, res) => {
    try {
      const id = parseLogId(req.params.id)
      const existing = logsRepository.findById(db, id)
      if (!existing) {
        res.status(404).json(fail('log not found'))
        return
      }
      const input = validateUpdateLog(req.body)
      const updated = logsRepository.update(db, id, input)
      res.json(ok(updated))

      const artUrlChanged = input.artUrl !== undefined && input.artUrl !== existing.artUrl
      if (artUrlChanged && updated) {
        // The old cached file (if any) no longer matches the new artUrl.
        removeArtFile(artDir, id)
        void cacheArtForLog(db, artDir, updated)
      }
    } catch (error) {
      handleError(res, error)
    }
  })

  router.delete('/:id', (req, res) => {
    try {
      const id = parseLogId(req.params.id)
      const deleted = logsRepository.remove(db, id)
      if (!deleted) {
        res.status(404).json(fail('log not found'))
        return
      }
      removeArtFile(artDir, id)
      res.json(ok({ deleted: true }))
    } catch (error) {
      handleError(res, error)
    }
  })

  return router
}

function handleError(res: Response, error: unknown): void {
  if (error instanceof ValidationError) {
    res.status(400).json(fail(error.message))
    return
  }
  res.status(500).json(fail('internal server error'))
}
