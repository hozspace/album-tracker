import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Express } from 'express'
import type Anthropic from '@anthropic-ai/sdk'
import type { Transporter } from 'nodemailer'
import request from 'supertest'
import type Database from 'better-sqlite3'
import { createApp } from '../app.js'
import { createTestDb } from '../test/testDb.js'
import { RecsGenerationError } from '../lib/recsClient.js'

const SMTP_ENV_KEYS = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'EMAIL_TO', 'EMAIL_FROM'] as const

function setFullSmtpEnv() {
  process.env.SMTP_HOST = 'smtp.example.com'
  process.env.SMTP_PORT = '587'
  process.env.SMTP_USER = 'user'
  process.env.SMTP_PASS = 'pass'
  process.env.EMAIL_TO = 'owner@example.com'
  process.env.EMAIL_FROM = 'diary@example.com'
}

function clearSmtpEnv() {
  for (const key of SMTP_ENV_KEYS) delete process.env[key]
}

let db: Database.Database

beforeEach(() => {
  db = createTestDb()
  clearSmtpEnv()
})

afterEach(() => {
  clearSmtpEnv()
  vi.unstubAllGlobals()
})

describe('POST /api/email/send-now', () => {
  it('returns a 502 envelope when SMTP is not configured', async () => {
    // Arrange
    const app: Express = createApp(db)

    // Act
    const res = await request(app).post('/api/email/send-now')

    // Assert
    expect(res.status).toBe(502)
    expect(res.body).toEqual({ success: false, data: null, error: 'SMTP not configured' })
  })

  it('returns a 502 envelope when the Anthropic client cannot be created', async () => {
    // Arrange
    setFullSmtpEnv()
    const app: Express = createApp(db, undefined, undefined, {
      getTransporter: () => ({ sendMail: vi.fn() }) as unknown as Transporter,
      getAnthropicClient: () => {
        throw new RecsGenerationError('set ANTHROPIC_API_KEY in .env')
      },
    })

    // Act
    const res = await request(app).post('/api/email/send-now')

    // Assert
    expect(res.status).toBe(502)
    expect(res.body.error).toMatch(/set ANTHROPIC_API_KEY in \.env/)
  })

  it('sends the top non-wildcard recommendation and returns what was sent', async () => {
    // Arrange
    setFullSmtpEnv()
    const sendMail = vi.fn().mockResolvedValue(undefined)
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ 'release-groups': [{ id: 'mbid-x' }] }),
    } as unknown as Response)
    vi.stubGlobal('fetch', fetchMock)

    const wildcard = { artist: 'A', title: 'Wildcard Pick', year: 2020, because: 'random', mode: 'wildcard' }
    const deepen = {
      artist: 'Radiohead',
      title: 'OK Computer',
      year: 1997,
      because: 'you loved Kid A',
      mode: 'deepen',
    }
    const client = {
      messages: {
        create: vi.fn(async () => ({
          id: 'msg_1',
          content: [{ type: 'text', text: JSON.stringify({ recommendations: [wildcard, deepen] }) }],
          stop_reason: 'end_turn',
        })),
      },
    } as unknown as Anthropic

    const app: Express = createApp(db, undefined, undefined, {
      getTransporter: () => ({ sendMail }) as unknown as Transporter,
      getAnthropicClient: () => client,
      verifyDelayMs: 0,
    })

    // Act
    const res = await request(app).post('/api/email/send-now')

    // Assert
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.sent).toBe(true)
    expect(res.body.data.subject).toBe("Today's album: OK Computer — Radiohead")
    expect(res.body.data.rec).toMatchObject({ title: 'OK Computer', artist: 'Radiohead' })
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ subject: "Today's album: OK Computer — Radiohead" }),
    )
  })

  it('returns a 502 envelope when sending fails', async () => {
    // Arrange
    setFullSmtpEnv()
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ 'release-groups': [{ id: 'mbid-x' }] }),
    } as unknown as Response)
    vi.stubGlobal('fetch', fetchMock)

    const rec = {
      artist: 'Radiohead',
      title: 'OK Computer',
      year: 1997,
      because: 'you loved Kid A',
      mode: 'deepen',
    }
    const client = {
      messages: {
        create: vi.fn(async () => ({
          id: 'msg_1',
          content: [{ type: 'text', text: JSON.stringify({ recommendations: [rec] }) }],
          stop_reason: 'end_turn',
        })),
      },
    } as unknown as Anthropic

    const app: Express = createApp(db, undefined, undefined, {
      getTransporter: () =>
        ({ sendMail: vi.fn().mockRejectedValue(new Error('connection refused')) }) as unknown as Transporter,
      getAnthropicClient: () => client,
      verifyDelayMs: 0,
    })

    // Act
    const res = await request(app).post('/api/email/send-now')

    // Assert
    expect(res.status).toBe(502)
    expect(res.body.error).toMatch(/failed to send email: connection refused/)
  })
})
