import { Router, type Response } from 'express'
import type Database from 'better-sqlite3'
import type Anthropic from '@anthropic-ai/sdk'
import type { Transporter } from 'nodemailer'
import { fail, ok } from '../lib/envelope.js'
import { RecsGenerationError } from '../lib/recsClient.js'
import { getAnthropicClient as defaultGetAnthropicClient } from '../lib/anthropicClient.js'
import { createTransportFromEnv } from '../lib/emailTransport.js'
import { getSmtpConfig } from '../lib/emailConfig.js'
import { EmailJobError, runDailyEmailJob } from '../lib/emailJob.js'

export interface EmailRouterOptions {
  getAnthropicClient?: () => Anthropic
  getTransporter?: () => Transporter | null
  // Test-only override for the MusicBrainz verification rate-limit delay.
  verifyDelayMs?: number
}

// Manual trigger so the owner can verify the daily email works without
// waiting for the scheduled run. Runs the exact same job as the cron.
export function createEmailRouter(db: Database.Database, options: EmailRouterOptions = {}): Router {
  const router = Router()
  const getAnthropicClient = options.getAnthropicClient ?? defaultGetAnthropicClient
  const getTransporter = options.getTransporter ?? createTransportFromEnv

  router.post('/send-now', async (_req, res) => {
    try {
      const smtpConfig = getSmtpConfig()
      const transporter = getTransporter()
      if (!smtpConfig || !transporter) {
        res.status(502).json(fail('SMTP not configured'))
        return
      }

      const client = getAnthropicClient()
      const result = await runDailyEmailJob(db, client, transporter, smtpConfig, {
        verifyDelayMs: options.verifyDelayMs,
      })
      res.json(ok({ sent: true, subject: result.subject, rec: result.rec }))
    } catch (error) {
      handleError(res, error)
    }
  })

  return router
}

function handleError(res: Response, error: unknown): void {
  if (error instanceof RecsGenerationError || error instanceof EmailJobError) {
    res.status(502).json(fail(error.message))
    return
  }
  res.status(500).json(fail('internal server error'))
}
