import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { SmtpConfig } from './emailConfig.js'

const { scheduleMock, getSmtpConfigMock, createTransportFromEnvMock, getAnthropicClientMock, runDailyEmailJobMock } =
  vi.hoisted(() => ({
    scheduleMock: vi.fn(() => ({}) as never),
    getSmtpConfigMock: vi.fn(),
    createTransportFromEnvMock: vi.fn(),
    getAnthropicClientMock: vi.fn(),
    runDailyEmailJobMock: vi.fn(),
  }))

vi.mock('node-cron', () => ({ default: { schedule: scheduleMock } }))
vi.mock('./emailConfig.js', () => ({ getSmtpConfig: getSmtpConfigMock }))
vi.mock('./emailTransport.js', () => ({ createTransportFromEnv: createTransportFromEnvMock }))
vi.mock('./anthropicClient.js', () => ({ getAnthropicClient: getAnthropicClientMock }))
vi.mock('./emailJob.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./emailJob.js')>()
  return { ...actual, runDailyEmailJob: runDailyEmailJobMock }
})

const { startEmailScheduler } = await import('./emailScheduler.js')

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

beforeEach(() => {
  scheduleMock.mockClear()
  getSmtpConfigMock.mockReset()
  createTransportFromEnvMock.mockReset()
  getAnthropicClientMock.mockReset()
  runDailyEmailJobMock.mockReset()
  delete process.env.EMAIL_CRON
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('startEmailScheduler', () => {
  it('logs a clear line and does not schedule when SMTP is not configured', () => {
    // Arrange
    getSmtpConfigMock.mockReturnValue(null)
    createTransportFromEnvMock.mockReturnValue(null)

    // Act
    const task = startEmailScheduler(FAKE_DB)

    // Assert
    expect(task).toBeUndefined()
    expect(scheduleMock).not.toHaveBeenCalled()
    expect(console.log).toHaveBeenCalledWith('daily email disabled: SMTP not configured')
  })

  it('schedules the job with the default cron expression when EMAIL_CRON is unset', () => {
    // Arrange
    getSmtpConfigMock.mockReturnValue(SMTP_CONFIG)
    createTransportFromEnvMock.mockReturnValue(FAKE_TRANSPORTER)

    // Act
    startEmailScheduler(FAKE_DB)

    // Assert
    expect(scheduleMock).toHaveBeenCalledWith('0 8 * * *', expect.any(Function))
  })

  it('reads the cron expression from EMAIL_CRON when set', () => {
    // Arrange
    process.env.EMAIL_CRON = '30 9 * * *'
    getSmtpConfigMock.mockReturnValue(SMTP_CONFIG)
    createTransportFromEnvMock.mockReturnValue(FAKE_TRANSPORTER)

    // Act
    startEmailScheduler(FAKE_DB)

    // Assert
    expect(scheduleMock).toHaveBeenCalledWith('30 9 * * *', expect.any(Function))
  })

  it('logs and does not throw when the scheduled job fails', async () => {
    // Arrange
    getSmtpConfigMock.mockReturnValue(SMTP_CONFIG)
    createTransportFromEnvMock.mockReturnValue(FAKE_TRANSPORTER)
    getAnthropicClientMock.mockReturnValue({} as never)
    runDailyEmailJobMock.mockRejectedValue(new Error('smtp connection refused'))

    // Act
    startEmailScheduler(FAKE_DB)
    const scheduledFn = scheduleMock.mock.calls[0][1] as () => void
    scheduledFn()
    await vi.waitFor(() => expect(console.error).toHaveBeenCalled())

    // Assert
    expect(console.error).toHaveBeenCalledWith('daily email job failed:', 'smtp connection refused')
  })

  it('logs success when the scheduled job succeeds', async () => {
    // Arrange
    getSmtpConfigMock.mockReturnValue(SMTP_CONFIG)
    createTransportFromEnvMock.mockReturnValue(FAKE_TRANSPORTER)
    getAnthropicClientMock.mockReturnValue({} as never)
    runDailyEmailJobMock.mockResolvedValue({ subject: "Today's album: X — Y", rec: {} })

    // Act
    startEmailScheduler(FAKE_DB)
    const scheduledFn = scheduleMock.mock.calls[0][1] as () => void
    scheduledFn()
    await vi.waitFor(() => expect(console.log).toHaveBeenCalledWith(expect.stringContaining('daily email sent')))

    // Assert
    expect(console.log).toHaveBeenCalledWith("daily email sent: Today's album: X — Y")
  })
})
