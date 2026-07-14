import { describe, it, expect, beforeEach } from 'vitest'
import type { Express } from 'express'
import request from 'supertest'
import { createApp } from '../app.js'
import { createTestDb } from '../test/testDb.js'

function isoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function validLogPayload(overrides: Record<string, unknown> = {}) {
  return {
    title: 'OK Computer',
    artist: 'Radiohead',
    rating: 4,
    listenedOn: isoDate(new Date()),
    ...overrides,
  }
}

let app: Express

beforeEach(() => {
  app = createApp(createTestDb())
})

describe('GET /api/stats', () => {
  it('returns zero total and null monthAvg when there are no logs', async () => {
    // Act
    const res = await request(app).get('/api/stats')

    // Assert
    expect(res.status).toBe(200)
    expect(res.body.data).toEqual({ total: 0, monthCount: 0, monthAvg: null })
  })

  it('counts all logs in total but only the current month in monthCount/monthAvg', async () => {
    // Arrange
    const now = new Date()
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15)

    await request(app).post('/api/logs').send(validLogPayload({ rating: 4 }))
    await request(app).post('/api/logs').send(validLogPayload({ rating: 5 }))
    await request(app).post('/api/logs').send(
      validLogPayload({ rating: 2, listenedOn: isoDate(lastMonth) }),
    )

    // Act
    const res = await request(app).get('/api/stats')

    // Assert
    expect(res.status).toBe(200)
    expect(res.body.data.total).toBe(3)
    expect(res.body.data.monthCount).toBe(2)
    expect(res.body.data.monthAvg).toBe(4.5)
  })
})
