import { describe, it, expect } from 'vitest'
import request from 'supertest'
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
