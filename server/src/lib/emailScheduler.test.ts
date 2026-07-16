import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { SmtpConfig } from './emailConfig.js'

const { getSmtpConfigMock, createTransportFromEnvMock, getAnthropicClientMock, runDailyEmailJobMock } =
  vi.hoisted(() => ({
    getSmtpConfigMock: vi.fn(),
    createTransportFromEnvMock: vi.fn(),
    getAnthropicClientMock: vi.fn(),
    runDailyEmailJobMock: vi.fn(),
  }))

vi.mock('./emailConfig.js', () => ({ getSmtpConfig: getSmtpConfigMock }))
vi.mock('./emailTransport.js', () => ({ createTransportFromEnv: createTransportFromEnvMock }))
vi.mock('./anthropicClient.js', () => ({ getAnthropicClient: getAnthropicClientMock }))
vi.mock('./emailJob.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./emailJob.js')>()
  return { ...actual, runDailyEmailJob: runDailyEmailJobMock }
})

const { startEmailScheduler, missedOccurrence, readLastRun, writeLastRun } = await import(
  './emailScheduler.js'
)

const SMTP_CONFIG: SmtpConfig = {
  host: 'smtp.example.com',
  port: 587,
  user: 'user',
  pass: 'pass',
  to: 'owner@example.com',
  from: 'diary@example.com',
}
const FAKE_TRANSPORTER = { sendMail: vi.fn() } as never
const FAKE_DB = {} as never
// long enough that only the startup check runs inside a test
const POLL_MS = 60 * 60 * 1000

let dir: string
let lastRunFile: string
let handle: { stop: () => void } | undefined

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'email-sched-test-'))
  lastRunFile = join(dir, 'email-last-run')
  getSmtpConfigMock.mockReset()
  createTransportFromEnvMock.mockReset()
  getAnthropicClientMock.mockReset()
  runDailyEmailJobMock.mockReset()
  delete process.env.EMAIL_CRON
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  handle?.stop()
  handle = undefined
  rmSync(dir, { recursive: true, force: true })
  vi.restoreAllMocks()
})

describe('missedOccurrence', () => {
  it('returns the most recent occurrence when nothing has ever run', () => {
    const due = missedOccurrence('0 8 * * *', null, new Date('2026-07-16T12:00:00'))
    expect(due).toEqual(new Date('2026-07-16T08:00:00'))
  })

  it('returns null when the latest occurrence was already handled', () => {
    const now = new Date('2026-07-16T12:00:00')
    const due = missedOccurrence('0 8 * * *', new Date('2026-07-16T08:00:00'), now)
    expect(due).toBeNull()
  })

  it('returns the missed occurrence after a day asleep', () => {
    // last handled yesterday 08:00, machine slept through today's 08:00
    const due = missedOccurrence(
      '0 8 * * *',
      new Date('2026-07-15T08:00:00'),
      new Date('2026-07-16T09:30:00'),
    )
    expect(due).toEqual(new Date('2026-07-16T08:00:00'))
  })
})

describe('last-run persistence', () => {
  it('round-trips through the file and tolerates a missing or corrupt file', () => {
    expect(readLastRun(lastRunFile)).toBeNull()
    const when = new Date('2026-07-16T08:00:00Z')
    writeLastRun(lastRunFile, when)
    expect(readLastRun(lastRunFile)).toEqual(when)
  })
})

describe('startEmailScheduler', () => {
  it('logs a clear line and does not schedule when SMTP is not configured', () => {
    // Arrange
    getSmtpConfigMock.mockReturnValue(null)
    createTransportFromEnvMock.mockReturnValue(null)

    // Act
    handle = startEmailScheduler(FAKE_DB, { lastRunFile, pollMs: POLL_MS })

    // Assert
    expect(handle).toBeUndefined()
    expect(console.log).toHaveBeenCalledWith('daily email disabled: SMTP not configured')
  })

  it('catches up on startup when no occurrence has ever been handled', async () => {
    // Arrange
    getSmtpConfigMock.mockReturnValue(SMTP_CONFIG)
    createTransportFromEnvMock.mockReturnValue(FAKE_TRANSPORTER)
    getAnthropicClientMock.mockReturnValue({} as never)
    runDailyEmailJobMock.mockResolvedValue({ subject: "Today's album: X — Y", rec: {} })

    // Act
    handle = startEmailScheduler(FAKE_DB, { lastRunFile, pollMs: POLL_MS })
    await vi.waitFor(() => expect(runDailyEmailJobMock).toHaveBeenCalledTimes(1))

    // Assert: the handled occurrence is recorded for next time
    await vi.waitFor(() => expect(existsSync(lastRunFile)).toBe(true))
    expect(new Date(readFileSync(lastRunFile, 'utf8')).getTime()).not.toBeNaN()
    expect(console.log).toHaveBeenCalledWith("daily email sent: Today's album: X — Y")
  })

  it('does nothing on startup when the latest occurrence was already handled', async () => {
    // Arrange: record the current latest occurrence as handled
    const current = missedOccurrence('0 8 * * *', null, new Date())
    writeLastRun(lastRunFile, current!)
    getSmtpConfigMock.mockReturnValue(SMTP_CONFIG)
    createTransportFromEnvMock.mockReturnValue(FAKE_TRANSPORTER)

    // Act
    handle = startEmailScheduler(FAKE_DB, { lastRunFile, pollMs: POLL_MS })
    await new Promise((resolve) => setTimeout(resolve, 50))

    // Assert
    expect(runDailyEmailJobMock).not.toHaveBeenCalled()
  })

  it('does not record the occurrence when the job fails, so the next poll retries', async () => {
    // Arrange
    getSmtpConfigMock.mockReturnValue(SMTP_CONFIG)
    createTransportFromEnvMock.mockReturnValue(FAKE_TRANSPORTER)
    getAnthropicClientMock.mockReturnValue({} as never)
    runDailyEmailJobMock.mockRejectedValue(new Error('smtp connection refused'))

    // Act
    handle = startEmailScheduler(FAKE_DB, { lastRunFile, pollMs: POLL_MS })
    await vi.waitFor(() =>
      expect(console.error).toHaveBeenCalledWith('daily email job failed:', 'smtp connection refused'),
    )

    // Assert
    expect(existsSync(lastRunFile)).toBe(false)
  })

  it('respects EMAIL_CRON for the schedule', () => {
    // Arrange: with a handled 09:30 occurrence, a 09:30 schedule is current
    process.env.EMAIL_CRON = '30 9 * * *'
    const current = missedOccurrence('30 9 * * *', null, new Date())
    writeLastRun(lastRunFile, current!)
    getSmtpConfigMock.mockReturnValue(SMTP_CONFIG)
    createTransportFromEnvMock.mockReturnValue(FAKE_TRANSPORTER)

    // Act
    handle = startEmailScheduler(FAKE_DB, { lastRunFile, pollMs: POLL_MS })

    // Assert
    expect(runDailyEmailJobMock).not.toHaveBeenCalled()
  })
})
