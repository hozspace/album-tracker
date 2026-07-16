import { describe, it, expect, vi, beforeEach } from 'vitest'
import type Anthropic from '@anthropic-ai/sdk'
import type { Transporter } from 'nodemailer'
import type { Rec } from '../types/rec.js'
import type { SmtpConfig } from './emailConfig.js'

const { generateAndStoreRecs } = vi.hoisted(() => ({ generateAndStoreRecs: vi.fn() }))
vi.mock('./recsGeneration.js', () => ({ generateAndStoreRecs }))

const { runDailyEmailJob, EmailJobError } = await import('./emailJob.js')

function fakeRec(overrides: Partial<Rec> = {}): Rec {
  return {
    id: 1,
    artist: 'Radiohead',
    title: 'OK Computer',
    year: 1997,
    mbid: 'mbid-1',
    artUrl: 'https://coverartarchive.org/release-group/mbid-1/front-500',
    because: 'because reasons',
    mode: 'deepen',
    status: 'pending',
    createdAt: '2026-07-16T08:00:00.000Z',
    ...overrides,
  }
}

const SMTP_CONFIG: SmtpConfig = {
  host: 'smtp.example.com',
  port: 587,
  user: 'user',
  pass: 'pass',
  to: 'owner@example.com',
  from: 'diary@example.com',
}

function fakeTransporter(sendMail = vi.fn().mockResolvedValue(undefined)): Transporter {
  return { sendMail } as unknown as Transporter
}

const fakeDb = {} as never
const fakeClient = {} as Anthropic

beforeEach(() => {
  generateAndStoreRecs.mockReset()
  delete process.env.APP_URL
})

describe('runDailyEmailJob', () => {
  it('generates recs with no seed and emails the first non-wildcard rec', async () => {
    // Arrange
    const wildcard = fakeRec({ id: 1, mode: 'wildcard', title: 'Wild Album' })
    const deepen = fakeRec({ id: 2, mode: 'deepen', title: 'Deepen Album' })
    generateAndStoreRecs.mockResolvedValue([wildcard, deepen])
    const transporter = fakeTransporter()

    // Act
    const result = await runDailyEmailJob(fakeDb, fakeClient, transporter, SMTP_CONFIG)

    // Assert
    expect(generateAndStoreRecs).toHaveBeenCalledWith(fakeDb, fakeClient, undefined, { verifyDelayMs: undefined })
    expect(result.rec).toEqual(deepen)
    expect(result.subject).toBe("Today's album: Deepen Album — Radiohead")
    expect(transporter.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: SMTP_CONFIG.to, from: SMTP_CONFIG.from, subject: result.subject }),
    )
  })

  it('falls back to the first rec when every rec is a wildcard', async () => {
    // Arrange
    const onlyWildcard = fakeRec({ mode: 'wildcard', title: 'Only Wildcard' })
    generateAndStoreRecs.mockResolvedValue([onlyWildcard])
    const transporter = fakeTransporter()

    // Act
    const result = await runDailyEmailJob(fakeDb, fakeClient, transporter, SMTP_CONFIG)

    // Assert
    expect(result.rec).toEqual(onlyWildcard)
  })

  it('throws EmailJobError when no recommendations are generated', async () => {
    // Arrange
    generateAndStoreRecs.mockResolvedValue([])
    const transporter = fakeTransporter()

    // Act / Assert
    await expect(runDailyEmailJob(fakeDb, fakeClient, transporter, SMTP_CONFIG)).rejects.toThrow(EmailJobError)
    expect(transporter.sendMail).not.toHaveBeenCalled()
  })

  it('throws EmailJobError when sending fails', async () => {
    // Arrange
    generateAndStoreRecs.mockResolvedValue([fakeRec()])
    const transporter = fakeTransporter(vi.fn().mockRejectedValue(new Error('connection refused')))

    // Act / Assert
    await expect(runDailyEmailJob(fakeDb, fakeClient, transporter, SMTP_CONFIG)).rejects.toThrow(
      /failed to send email: connection refused/,
    )
  })

  it('propagates errors thrown by recs generation without sending', async () => {
    // Arrange
    generateAndStoreRecs.mockRejectedValue(new Error('claude is down'))
    const transporter = fakeTransporter()

    // Act / Assert
    await expect(runDailyEmailJob(fakeDb, fakeClient, transporter, SMTP_CONFIG)).rejects.toThrow('claude is down')
    expect(transporter.sendMail).not.toHaveBeenCalled()
  })

  it('includes the app link when APP_URL is set', async () => {
    // Arrange
    process.env.APP_URL = 'https://diary.example.com'
    generateAndStoreRecs.mockResolvedValue([fakeRec()])
    const transporter = fakeTransporter()

    // Act
    await runDailyEmailJob(fakeDb, fakeClient, transporter, SMTP_CONFIG)

    // Assert
    const call = (transporter.sendMail as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(call.html).toContain('https://diary.example.com')
  })
})
