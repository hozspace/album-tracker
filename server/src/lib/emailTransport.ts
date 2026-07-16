import nodemailer, { type Transporter } from 'nodemailer'
import { getSmtpConfig } from './emailConfig.js'

// Returns null when SMTP isn't configured so callers can decide how to
// react (disable scheduling, return a clear envelope error, etc.) instead
// of nodemailer throwing deep inside a cron callback.
export function createTransportFromEnv(): Transporter | null {
  const config = getSmtpConfig()
  if (!config) return null

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: { user: config.user, pass: config.pass },
  })
}
