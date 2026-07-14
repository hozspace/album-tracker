import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { Express } from 'express'
import request from 'supertest'
import { mkdtempSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createApp } from '../app.js'
import { createTestDb } from '../test/testDb.js'
import { fakeArtResponse } from '../test/fakeArtResponse.js'

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

const COVER_ART_URL = 'https://coverartarchive.org/release-group/abc/front-250'

let app: Express
let artDir: string

beforeEach(() => {
  artDir = mkdtempSync(join(tmpdir(), 'art-cache-test-'))
  app = createApp(createTestDb(), artDir)
})

afterEach(() => {
  vi.unstubAllGlobals()
  rmSync(artDir, { recursive: true, force: true })
})

describe('cover art caching on POST /api/logs', () => {
  it('downloads and caches art, rewriting artUrl to the local route', async () => {
    // Arrange
    const fetchMock = vi.fn().mockResolvedValue(fakeArtResponse())
    vi.stubGlobal('fetch', fetchMock)

    // Act
    const createRes = await request(app)
      .post('/api/logs')
      .send(validLogPayload({ artUrl: COVER_ART_URL }))
    const id = createRes.body.data.id

    // Assert: response comes back fast with the original (external) url…
    expect(createRes.status).toBe(201)
    expect(createRes.body.data.artUrl).toBe(COVER_ART_URL)

    // …and is rewritten once the background fetch completes.
    await vi.waitFor(async () => {
      const getRes = await request(app).get(`/api/logs/${id}`)
      expect(getRes.body.data.artUrl).toBe(`/api/art/${id}`)
    })

    const artRes = await request(app).get(`/api/art/${id}`)
    expect(artRes.status).toBe(200)
    expect(artRes.headers['cache-control']).toBe('public, max-age=31536000, immutable')
    expect(artRes.headers['content-type']).toMatch(/^image\/jpeg/)
    expect(Buffer.compare(artRes.body as Buffer, Buffer.from([1, 2, 3, 4]))).toBe(0)
  })

  it('keeps the external artUrl and still returns 201 when the download fails', async () => {
    // Arrange
    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'))
    vi.stubGlobal('fetch', fetchMock)

    // Act
    const createRes = await request(app)
      .post('/api/logs')
      .send(validLogPayload({ artUrl: COVER_ART_URL }))
    const id = createRes.body.data.id

    // Assert
    expect(createRes.status).toBe(201)
    expect(createRes.body.data.artUrl).toBe(COVER_ART_URL)

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })
    const getRes = await request(app).get(`/api/logs/${id}`)
    expect(getRes.body.data.artUrl).toBe(COVER_ART_URL)
  })

  it('does not fetch a disallowed host', async () => {
    // Arrange
    const fetchMock = vi.fn().mockResolvedValue(fakeArtResponse())
    vi.stubGlobal('fetch', fetchMock)
    const untrustedUrl = 'https://evil.example.com/cover.jpg'

    // Act
    const createRes = await request(app)
      .post('/api/logs')
      .send(validLogPayload({ artUrl: untrustedUrl }))
    const id = createRes.body.data.id

    // Assert
    expect(createRes.status).toBe(201)
    await new Promise((r) => setTimeout(r, 10))
    expect(fetchMock).not.toHaveBeenCalled()

    const getRes = await request(app).get(`/api/logs/${id}`)
    expect(getRes.body.data.artUrl).toBe(untrustedUrl)
  })
})

describe('DELETE /api/logs/:id', () => {
  it('removes the cached art file', async () => {
    // Arrange
    const fetchMock = vi.fn().mockResolvedValue(fakeArtResponse())
    vi.stubGlobal('fetch', fetchMock)

    const createRes = await request(app)
      .post('/api/logs')
      .send(validLogPayload({ artUrl: COVER_ART_URL }))
    const id = createRes.body.data.id

    await vi.waitFor(async () => {
      const getRes = await request(app).get(`/api/logs/${id}`)
      expect(getRes.body.data.artUrl).toBe(`/api/art/${id}`)
    })
    expect(existsSync(join(artDir, `${id}.jpg`))).toBe(true)

    // Act
    const deleteRes = await request(app).delete(`/api/logs/${id}`)

    // Assert
    expect(deleteRes.status).toBe(200)
    expect(existsSync(join(artDir, `${id}.jpg`))).toBe(false)

    const artRes = await request(app).get(`/api/art/${id}`)
    expect(artRes.status).toBe(404)
    expect(artRes.body.success).toBe(false)
  })
})

describe('GET /api/art/:id', () => {
  it('returns a 404 envelope when the art does not exist', async () => {
    // Act
    const res = await request(app).get('/api/art/999')

    // Assert
    expect(res.status).toBe(404)
    expect(res.body.success).toBe(false)
    expect(res.body.error).toMatch(/not found/)
  })

  it('returns a 404 envelope for a non-numeric id', async () => {
    // Act
    const res = await request(app).get('/api/art/not-a-number')

    // Assert
    expect(res.status).toBe(404)
    expect(res.body.success).toBe(false)
  })
})
