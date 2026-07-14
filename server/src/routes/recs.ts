import { Router, type Response } from 'express'
import type Database from 'better-sqlite3'
import Anthropic from '@anthropic-ai/sdk'
import * as recsRepository from '../repositories/recsRepository.js'
import { fail, ok } from '../lib/envelope.js'
import { ValidationError } from '../lib/validationError.js'
import { RecsGenerationError } from '../lib/recsClient.js'
import { generateAndStoreRecs } from '../lib/recsGeneration.js'
import {
  parseRecId,
  validateGenerateRecsBody,
  validateRecStatusBody,
} from '../validation/recValidation.js'

export interface RecsRouterOptions {
  getAnthropicClient?: () => Anthropic
  // Test-only override for the MusicBrainz verification rate-limit delay.
  verifyDelayMs?: number
}

export function createRecsRouter(db: Database.Database, options: RecsRouterOptions = {}): Router {
  const router = Router()
  const getAnthropicClient = options.getAnthropicClient ?? defaultGetAnthropicClient

  router.post('/generate', async (req, res) => {
    try {
      const { seed } = validateGenerateRecsBody(req.body)
      const client = getAnthropicClient()
      const recs = await generateAndStoreRecs(db, client, seed, { verifyDelayMs: options.verifyDelayMs })
      res.json(ok({ recs }))
    } catch (error) {
      handleError(res, error)
    }
  })

  router.get('/', (_req, res) => {
    res.json(ok({ recs: recsRepository.findPending(db) }))
  })

  router.post('/:id/status', (req, res) => {
    try {
      const id = parseRecId(req.params.id)
      const { status } = validateRecStatusBody(req.body)
      const updated = recsRepository.updateStatus(db, id, status)
      if (!updated) {
        res.status(404).json(fail('recommendation not found'))
        return
      }
      res.json(ok(updated))
    } catch (error) {
      handleError(res, error)
    }
  })

  return router
}

function defaultGetAnthropicClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new RecsGenerationError('set ANTHROPIC_API_KEY in .env')
  }
  return new Anthropic()
}

function handleError(res: Response, error: unknown): void {
  if (error instanceof ValidationError) {
    res.status(400).json(fail(error.message))
    return
  }
  if (error instanceof RecsGenerationError) {
    res.status(502).json(fail(error.message))
    return
  }
  res.status(500).json(fail('internal server error'))
}
