import { CronExpressionParser } from 'cron-parser'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type Database from 'better-sqlite3'
import { DATA_DIR } from './dataDir.js'
import { getSmtpConfig } from './emailConfig.js'
import { createTransportFromEnv } from './emailTransport.js'
import { getAnthropicClient } from './anthropicClient.js'
import { runDailyEmailJob } from './emailJob.js'

const DEFAULT_EMAIL_CRON = '0 8 * * *'
const CATCH_UP_POLL_MS = 5 * 60 * 1000
const LAST_RUN_FILE = 'email-last-run'

// The host is a laptop: a fixed-time cron tick misses entirely when the
// machine is asleep at that moment. Instead of firing on the tick, we poll:
// "has the most recent scheduled occurrence been handled?" — on wake or
// startup the answer is no, and the email goes out then. The last handled
// occurrence is persisted in the data dir so restarts don't resend.

// Most recent occurrence of the schedule not yet handled, or null when
// current. Exported for tests.
export function missedOccurrence(
  cronExpression: string,
  lastRun: Date | null,
  now: Date,
): Date | null {
  const prev = CronExpressionParser.parse(cronExpression, { currentDate: now }).prev().toDate()
  return !lastRun || prev.getTime() > lastRun.getTime() ? prev : null
}

export function readLastRun(file: string): Date | null {
  try {
    const parsed = new Date(readFileSync(file, 'utf8').trim())
    return Number.isNaN(parsed.getTime()) ? null : parsed
  } catch {
    return null
  }
}

export function writeLastRun(file: string, occurrence: Date): void {
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, occurrence.toISOString())
}

export interface EmailSchedulerOptions {
  pollMs?: number
  lastRunFile?: string
}

export interface EmailSchedulerHandle {
  stop: () => void
}

export function startEmailScheduler(
  db: Database.Database,
  options: EmailSchedulerOptions = {},
): EmailSchedulerHandle | undefined {
  const smtpConfig = getSmtpConfig()
  const transporter = createTransportFromEnv()

  if (!smtpConfig || !transporter) {
    console.log('daily email disabled: SMTP not configured')
    return undefined
  }

  const cronExpression = process.env.EMAIL_CRON ?? DEFAULT_EMAIL_CRON
  const lastRunFile = options.lastRunFile ?? join(DATA_DIR, LAST_RUN_FILE)
  const pollMs = options.pollMs ?? CATCH_UP_POLL_MS
  let running = false

  async function checkAndRun(): Promise<void> {
    if (running) return
    const due = missedOccurrence(cronExpression, readLastRun(lastRunFile), new Date())
    if (!due) return

    running = true
    try {
      const client = getAnthropicClient()
      const result = await runDailyEmailJob(db, client, transporter!, smtpConfig!)
      // recorded only on success so a failed send retries on the next poll
      writeLastRun(lastRunFile, due)
      console.log(`daily email sent: ${result.subject}`)
    } catch (error) {
      console.error('daily email job failed:', error instanceof Error ? error.message : error)
    } finally {
      running = false
    }
  }

  void checkAndRun()
  const timer = setInterval(() => void checkAndRun(), pollMs)
  timer.unref?.()

  return { stop: () => clearInterval(timer) }
}
