import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createApp } from './app.js'
import { createTestDb } from './test/testDb.js'

describe('GET /api/health', () => {
  it('returns ok status', async () => {
    const app = createApp(createTestDb())
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok' })
  })
})

describe('production SPA fallback', () => {
  let staticDir: string
  const originalNodeEnv = process.env.NODE_ENV

  beforeEach(() => {
    // Regression test: a dot-prefixed ancestor directory (e.g. a temp dir
    // under a hidden path, or .claude/worktrees in this repo) used to make
    // `send` 404 a real index.html when sendFile was called without `root`.
    staticDir = mkdtempSync(join(tmpdir(), '.spa-fallback-test-'))
    writeFileSync(join(staticDir, 'index.html'), '<html><body>spa shell</body></html>')
    process.env.NODE_ENV = 'production'
    process.env.STATIC_DIR = staticDir
  })

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv
    delete process.env.STATIC_DIR
    rmSync(staticDir, { recursive: true, force: true })
  })

  it('serves index.html for a non-API client route', async () => {
    const app = createApp(createTestDb())
    const res = await request(app).get('/recs')
    expect(res.status).toBe(200)
    expect(res.text).toBe('<html><body>spa shell</body></html>')
  })

  it('still returns the JSON 404 envelope for an unknown API route', async () => {
    const app = createApp(createTestDb())
    const res = await request(app).get('/api/nope')
    expect(res.status).toBe(404)
    expect(res.body).toEqual({ success: false, data: null, error: 'not found' })
  })
})
