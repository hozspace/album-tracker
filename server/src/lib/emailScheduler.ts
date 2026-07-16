import cron, { type ScheduledTask } from 'node-cron'
import type Database from 'better-sqlite3'
import { getSmtpConfig } from './emailConfig.js'
import { createTransportFromEnv } from './emailTransport.js'
import { getAnthropicClient } from './anthropicClient.js'
import { runDailyEmailJob } from './emailJob.js'

const DEFAULT_EMAIL_CRON = '0 8 * * *'

// Wired into server startup alongside the art-cache backfill. Schedules the
// daily recommendation email if (and only if) SMTP is fully configured;
// otherwise logs one clear line and does nothing. A failure on any given
// run is logged, never thrown — the next scheduled run tries again.
export function startEmailScheduler(db: Database.Database): ScheduledTask | undefined {
  const smtpConfig = getSmtpConfig()
  const transporter = createTransportFromEnv()

  if (!smtpConfig || !transporter) {
    console.log('daily email disabled: SMTP not configured')
    return undefined
  }

  const cronExpression = process.env.EMAIL_CRON ?? DEFAULT_EMAIL_CRON

  return cron.schedule(cronExpression, () => {
    void runScheduledJob(db, transporter, smtpConfig)
  })
}

async function runScheduledJob(
  db: Database.Database,
  transporter: NonNullable<ReturnType<typeof createTransportFromEnv>>,
  smtpConfig: NonNullable<ReturnType<typeof getSmtpConfig>>,
): Promise<void> {
  try {
    const client = getAnthropicClient()
    const result = await runDailyEmailJob(db, client, transporter, smtpConfig)
    console.log(`daily email sent: ${result.subject}`)
  } catch (error) {
    console.error('daily email job failed:', error instanceof Error ? error.message : error)
  }
}
