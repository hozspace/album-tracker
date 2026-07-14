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

export function createLogsRouter(db: Database.Database): Router {
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
      if (!logsRepository.findById(db, id)) {
        res.status(404).json(fail('log not found'))
        return
      }
      const input = validateUpdateLog(req.body)
      res.json(ok(logsRepository.update(db, id, input)))
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
