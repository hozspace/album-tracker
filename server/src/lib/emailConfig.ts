export interface SmtpConfig {
  host: string
  port: number
  user: string
  pass: string
  to: string
  from: string
}

// Reads SMTP settings straight from process.env — never logs or echoes the
// values. Returns null (rather than throwing) when anything required is
// missing so callers can treat "not configured" as a normal, expected state.
export function getSmtpConfig(): SmtpConfig | null {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_TO, EMAIL_FROM } = process.env

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !EMAIL_TO || !EMAIL_FROM) {
    return null
  }

  const port = Number(SMTP_PORT)
  if (!Number.isInteger(port) || port <= 0) {
    return null
  }

  return { host: SMTP_HOST, port, user: SMTP_USER, pass: SMTP_PASS, to: EMAIL_TO, from: EMAIL_FROM }
}
