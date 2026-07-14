import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { Express } from 'express'
import type Anthropic from '@anthropic-ai/sdk'
import request from 'supertest'
import { createApp } from '../app.js'
import { createTestDb } from '../test/testDb.js'
import type Database from 'better-sqlite3'

function validLogPayload(overrides: Record<string, unknown> = {}) {
  return {
    title: 'OK Computer',
    artist: 'Radiohead',
    year: 1997,
    rating: 4.5,
    listenedOn: '2026-07-01',
    ...overrides,
  }
}

function fakeAnthropicClient(recommendations: unknown[], stopReason = 'end_turn'): Anthropic {
  return {
    messages: {
      create: vi.fn(async () => ({
        id: 'msg_1',
        content: [{ type: 'text', text: JSON.stringify({ recommendations }) }],
        stop_reason: stopReason,
      })),
    },
  } as unknown as Anthropic
}

function musicbrainzOkResponse(id: string): Response {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve({ 'release-groups': [{ id }] }),
  } as unknown as Response
}

const SIX_RECS = Array.from({ length: 6 }, (_, i) => ({
  artist: `Artist ${i}`,
  title: `Album ${i}`,
  year: 2000 + i,
  because: `Reason ${i}`,
  mode: 'deepen',
}))

let db: Database.Database

beforeEach(() => {
  db = createTestDb()
})

afterEach(() => {
  vi.unstubAllGlobals()
  delete process.env.ANTHROPIC_API_KEY
})

describe('POST /api/recs/generate', () => {
  it('generates, verifies, stores, and returns up to 5 recommendations', async () => {
    // Arrange
    const fetchMock = vi.fn().mockResolvedValue(musicbrainzOkResponse('mbid-x'))
    vi.stubGlobal('fetch', fetchMock)
    const client = fakeAnthropicClient(SIX_RECS)
    const app: Express = createApp(db, undefined, { getAnthropicClient: () => client, verifyDelayMs: 0 })

    // Act
    const res = await request(app).post('/api/recs/generate').send({})

    // Assert
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.recs).toHaveLength(5)
    expect(res.body.data.recs[0]).toMatchObject({
      artist: 'Artist 0',
      title: 'Album 0',
      mbid: 'mbid-x',
      artUrl: 'https://coverartarchive.org/release-group/mbid-x/front-500',
      because: 'Reason 0',
      mode: 'deepen',
      status: 'pending',
    })
  })

  it('drops recommendations MusicBrainz cannot verify', async () => {
    // Arrange
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ 'release-groups': [] }),
    } as unknown as Response)
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const client = fakeAnthropicClient(SIX_RECS)
    const app: Express = createApp(db, undefined, { getAnthropicClient: () => client, verifyDelayMs: 0 })

    // Act
    const res = await request(app).post('/api/recs/generate').send({})

    // Assert
    expect(res.status).toBe(200)
    expect(res.body.data.recs).toHaveLength(0)
  })

  it('accepts a seed for cold-start generation', async () => {
    // Arrange
    const fetchMock = vi.fn().mockResolvedValue(musicbrainzOkResponse('mbid-seed'))
    vi.stubGlobal('fetch', fetchMock)
    const create = vi.fn(async () => ({
      id: 'msg_1',
      content: [{ type: 'text', text: JSON.stringify({ recommendations: SIX_RECS }) }],
      stop_reason: 'end_turn',
    }))
    const client = { messages: { create } } as unknown as Anthropic
    const app: Express = createApp(db, undefined, { getAnthropicClient: () => client, verifyDelayMs: 0 })

    // Act
    const res = await request(app)
      .post('/api/recs/generate')
      .send({ seed: { genre: 'shoegaze' } })

    // Assert
    expect(res.status).toBe(200)
    const callArgs = create.mock.calls[0]?.[0] as { messages: { content: string }[] }
    expect(callArgs.messages[0].content).toContain('genre shoegaze')
  })

  it('rejects an unknown field in the request body', async () => {
    // Arrange
    const app: Express = createApp(db, undefined, { getAnthropicClient: () => fakeAnthropicClient(SIX_RECS), verifyDelayMs: 0 })

    // Act
    const res = await request(app).post('/api/recs/generate').send({ bogus: true })

    // Assert
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/unknown field: bogus/)
  })

  it('returns a clear envelope error when ANTHROPIC_API_KEY is unset and no client is injected', async () => {
    // Arrange
    delete process.env.ANTHROPIC_API_KEY
    const app: Express = createApp(db)

    // Act
    const res = await request(app).post('/api/recs/generate').send({})

    // Assert
    expect(res.status).toBe(502)
    expect(res.body.success).toBe(false)
    expect(res.body.error).toMatch(/set ANTHROPIC_API_KEY in \.env/)
  })

  it('maps a Claude refusal to a 502 envelope error', async () => {
    // Arrange
    const client = fakeAnthropicClient(SIX_RECS, 'refusal')
    const app: Express = createApp(db, undefined, { getAnthropicClient: () => client, verifyDelayMs: 0 })

    // Act
    const res = await request(app).post('/api/recs/generate').send({})

    // Assert
    expect(res.status).toBe(502)
    expect(res.body.error).toMatch(/declined/)
  })
})

describe('GET /api/recs', () => {
  it('returns only pending recommendations, newest first', async () => {
    // Arrange
    const fetchMock = vi.fn().mockResolvedValue(musicbrainzOkResponse('mbid-1'))
    vi.stubGlobal('fetch', fetchMock)
    const app: Express = createApp(db, undefined, {
      getAnthropicClient: () => fakeAnthropicClient(SIX_RECS.slice(0, 2)),
      verifyDelayMs: 0,
    })
    await request(app).post('/api/recs/generate').send({})

    // Act
    const res = await request(app).get('/api/recs')

    // Assert
    expect(res.status).toBe(200)
    expect(res.body.data.recs).toHaveLength(2)
    expect(res.body.data.recs.every((rec: { status: string }) => rec.status === 'pending')).toBe(true)
  })

  it('returns an empty list when nothing has been generated', async () => {
    // Arrange
    const app: Express = createApp(db)

    // Act
    const res = await request(app).get('/api/recs')

    // Assert
    expect(res.status).toBe(200)
    expect(res.body.data.recs).toEqual([])
  })
})

describe('POST /api/recs/:id/status', () => {
  async function seedOneRec(app: Express): Promise<number> {
    const fetchMock = vi.fn().mockResolvedValue(musicbrainzOkResponse('mbid-1'))
    vi.stubGlobal('fetch', fetchMock)
    const res = await request(app).post('/api/recs/generate').send({})
    return res.body.data.recs[0].id
  }

  it('transitions a rec to logged', async () => {
    // Arrange
    const app: Express = createApp(db, undefined, {
      getAnthropicClient: () => fakeAnthropicClient(SIX_RECS.slice(0, 1)),
      verifyDelayMs: 0,
    })
    const id = await seedOneRec(app)

    // Act
    const res = await request(app).post(`/api/recs/${id}/status`).send({ status: 'logged' })

    // Assert
    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('logged')
  })

  it('transitions a rec to dismissed', async () => {
    // Arrange
    const app: Express = createApp(db, undefined, {
      getAnthropicClient: () => fakeAnthropicClient(SIX_RECS.slice(0, 1)),
      verifyDelayMs: 0,
    })
    const id = await seedOneRec(app)

    // Act
    const res = await request(app).post(`/api/recs/${id}/status`).send({ status: 'dismissed' })

    // Assert
    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('dismissed')
  })

  it('removes a dismissed or logged rec from the pending list', async () => {
    // Arrange
    const app: Express = createApp(db, undefined, {
      getAnthropicClient: () => fakeAnthropicClient(SIX_RECS.slice(0, 1)),
      verifyDelayMs: 0,
    })
    const id = await seedOneRec(app)
    await request(app).post(`/api/recs/${id}/status`).send({ status: 'dismissed' })

    // Act
    const res = await request(app).get('/api/recs')

    // Assert
    expect(res.body.data.recs).toHaveLength(0)
  })

  it('rejects an invalid status value', async () => {
    // Arrange
    const app: Express = createApp(db, undefined, {
      getAnthropicClient: () => fakeAnthropicClient(SIX_RECS.slice(0, 1)),
      verifyDelayMs: 0,
    })
    const id = await seedOneRec(app)

    // Act
    const res = await request(app).post(`/api/recs/${id}/status`).send({ status: 'bogus' })

    // Assert
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/status/)
  })

  it('returns a 404 envelope for a missing rec', async () => {
    // Arrange
    const app: Express = createApp(db)

    // Act
    const res = await request(app).post('/api/recs/999/status').send({ status: 'logged' })

    // Assert
    expect(res.status).toBe(404)
    expect(res.body.error).toMatch(/not found/)
  })
})

describe('logs remain unaffected by the recs router', () => {
  it('still creates logs normally', async () => {
    // Arrange
    const app: Express = createApp(db)

    // Act
    const res = await request(app).post('/api/logs').send(validLogPayload())

    // Assert
    expect(res.status).toBe(201)
  })
})
