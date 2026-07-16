import type Database from 'better-sqlite3'
import type Anthropic from '@anthropic-ai/sdk'
import type { Transporter } from 'nodemailer'
import type { Rec } from '../types/rec.js'
import type { SmtpConfig } from './emailConfig.js'
import { buildRecEmail } from './emailContent.js'
import { generateAndStoreRecs } from './recsGeneration.js'

export class EmailJobError extends Error {}

export interface RunDailyEmailJobOptions {
  // Test-only override for the MusicBrainz verification rate-limit delay,
  // threaded through to generateAndStoreRecs.
  verifyDelayMs?: number
}

export interface DailyEmailResult {
  rec: Rec
  subject: string
}

// Generates a fresh set of recommendations (history-based, no seed — same
// path as an in-app "generate" click, so the emailed rec also shows up as
// pending in the app) and emails the top one. Callers decide what to do
// with a thrown EmailJobError: the cron scheduler logs and waits for the
// next run, the manual endpoint turns it into a fail envelope.
export async function runDailyEmailJob(
  db: Database.Database,
  client: Anthropic,
  transporter: Transporter,
  smtpConfig: SmtpConfig,
  options: RunDailyEmailJobOptions = {},
): Promise<DailyEmailResult> {
  const recs = await generateAndStoreRecs(db, client, undefined, {
    verifyDelayMs: options.verifyDelayMs,
  })

  const top = pickTopRec(recs)
  if (!top) {
    throw new EmailJobError('no recommendations were generated to email')
  }

  const content = buildRecEmail(top, process.env.APP_URL)

  try {
    await transporter.sendMail({
      to: smtpConfig.to,
      from: smtpConfig.from,
      subject: content.subject,
      html: content.html,
      text: content.text,
    })
  } catch (error) {
    throw new EmailJobError(
      `failed to send email: ${error instanceof Error ? error.message : String(error)}`,
    )
  }

  return { rec: top, subject: content.subject }
}

// Prefer a non-wildcard rec (deepen/branch) since those are grounded in the
// listening history; fall back to whatever came back first otherwise.
function pickTopRec(recs: Rec[]): Rec | undefined {
  return recs.find((rec) => rec.mode !== 'wildcard') ?? recs[0]
}
