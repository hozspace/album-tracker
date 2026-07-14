import { describe, it, expect, beforeEach } from 'vitest'
import type { Express } from 'express'
import request from 'supertest'
import { createApp } from '../app.js'
import { createTestDb } from '../test/testDb.js'

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

let app: Express

beforeEach(() => {
  app = createApp(createTestDb())
})

describe('POST /api/logs', () => {
  it('creates a log and returns it in the envelope', async () => {
    // Arrange
    const payload = validLogPayload({ faveTrack: 'Paranoid Android', relisten: true })

    // Act
    const res = await request(app).post('/api/logs').send(payload)

    // Assert
    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.error).toBeNull()
    expect(res.body.data).toMatchObject({
      title: 'OK Computer',
      artist: 'Radiohead',
      year: 1997,
      rating: 4.5,
      listenedOn: '2026-07-01',
      faveTrack: 'Paranoid Android',
      relisten: true,
      mbid: null,
      artUrl: null,
      note: null,
    })
    expect(res.body.data.id).toBeTypeOf('number')
    expect(res.body.data.createdAt).toBeTypeOf('string')
  })

  it('round-trips a created log through GET /api/logs/:id', async () => {
    // Arrange
    const createRes = await request(app).post('/api/logs').send(validLogPayload())
    const id = createRes.body.data.id

    // Act
    const getRes = await request(app).get(`/api/logs/${id}`)

    // Assert
    expect(getRes.status).toBe(200)
    expect(getRes.body.data).toEqual(createRes.body.data)
  })

  it('defaults relisten to false when omitted', async () => {
    // Arrange & Act
    const res = await request(app).post('/api/logs').send(validLogPayload())

    // Assert
    expect(res.body.data.relisten).toBe(false)
  })

  it('rejects a rating that is not on a 0.5 step', async () => {
    // Arrange
    const payload = validLogPayload({ rating: 4.3 })

    // Act
    const res = await request(app).post('/api/logs').send(payload)

    // Assert
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.error).toMatch(/0.5 steps/)
  })

  it('rejects a rating outside the 0.5-5.0 range', async () => {
    // Arrange
    const payload = validLogPayload({ rating: 5.5 })

    // Act
    const res = await request(app).post('/api/logs').send(payload)

    // Assert
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/between 0.5 and 5/)
  })

  it('rejects a missing title', async () => {
    // Arrange
    const { title, ...payload } = validLogPayload()
    void title

    // Act
    const res = await request(app).post('/api/logs').send(payload)

    // Assert
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/title/)
  })

  it('rejects a blank title', async () => {
    // Arrange
    const payload = validLogPayload({ title: '   ' })

    // Act
    const res = await request(app).post('/api/logs').send(payload)

    // Assert
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/title/)
  })

  it('rejects an unknown field, naming it in the error', async () => {
    // Arrange
    const payload = validLogPayload({ favoriteColor: 'blue' })

    // Act
    const res = await request(app).post('/api/logs').send(payload)

    // Assert
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/unknown field: favoriteColor/)
  })

  it('rejects an invalid listenedOn date', async () => {
    // Arrange
    const payload = validLogPayload({ listenedOn: '2026-02-30' })

    // Act
    const res = await request(app).post('/api/logs').send(payload)

    // Assert
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/listenedOn/)
  })

  it('rejects a malformed listenedOn date string', async () => {
    // Arrange
    const payload = validLogPayload({ listenedOn: '07/01/2026' })

    // Act
    const res = await request(app).post('/api/logs').send(payload)

    // Assert
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/listenedOn/)
  })

  it('rejects a year outside 1900-2100', async () => {
    // Arrange
    const payload = validLogPayload({ year: 1899 })

    // Act
    const res = await request(app).post('/api/logs').send(payload)

    // Assert
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/year/)
  })

  it('rejects a note longer than 2000 characters', async () => {
    // Arrange
    const payload = validLogPayload({ note: 'x'.repeat(2001) })

    // Act
    const res = await request(app).post('/api/logs').send(payload)

    // Assert
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/note/)
  })
})

describe('GET /api/logs', () => {
  async function seedLogs(): Promise<void> {
    await request(app).post('/api/logs').send(
      validLogPayload({ title: 'Album A', listenedOn: '2026-07-01' }),
    )
    await request(app).post('/api/logs').send(
      validLogPayload({ title: 'Album B', listenedOn: '2026-07-03' }),
    )
    await request(app).post('/api/logs').send(
      validLogPayload({ title: 'Album C', listenedOn: '2026-07-02' }),
    )
  }

  it('returns logs newest listened_on first with a total count', async () => {
    // Arrange
    await seedLogs()

    // Act
    const res = await request(app).get('/api/logs')

    // Assert
    expect(res.status).toBe(200)
    expect(res.body.data.total).toBe(3)
    expect(res.body.data.logs.map((log: { title: string }) => log.title)).toEqual([
      'Album B',
      'Album C',
      'Album A',
    ])
  })

  it('paginates with limit and offset', async () => {
    // Arrange
    await seedLogs()

    // Act
    const res = await request(app).get('/api/logs?limit=1&offset=1')

    // Assert
    expect(res.status).toBe(200)
    expect(res.body.data.total).toBe(3)
    expect(res.body.data.logs).toHaveLength(1)
    expect(res.body.data.logs[0].title).toBe('Album C')
  })

  it('caps limit at 200 by rejecting larger values', async () => {
    // Act
    const res = await request(app).get('/api/logs?limit=201')

    // Assert
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/limit/)
  })

  it('rejects a non-numeric limit', async () => {
    // Act
    const res = await request(app).get('/api/logs?limit=abc')

    // Assert
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/limit/)
  })

  it('rejects a negative offset', async () => {
    // Act
    const res = await request(app).get('/api/logs?offset=-1')

    // Assert
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/offset/)
  })
})

describe('GET /api/logs/:id', () => {
  it('returns a 404 envelope when the log does not exist', async () => {
    // Act
    const res = await request(app).get('/api/logs/999')

    // Assert
    expect(res.status).toBe(404)
    expect(res.body.success).toBe(false)
    expect(res.body.data).toBeNull()
    expect(res.body.error).toMatch(/not found/)
  })
})

describe('PUT /api/logs/:id', () => {
  it('partially updates only the provided fields', async () => {
    // Arrange
    const createRes = await request(app).post('/api/logs').send(validLogPayload())
    const id = createRes.body.data.id

    // Act
    const res = await request(app).put(`/api/logs/${id}`).send({ rating: 5, note: 'revisit' })

    // Assert
    expect(res.status).toBe(200)
    expect(res.body.data.rating).toBe(5)
    expect(res.body.data.note).toBe('revisit')
    expect(res.body.data.title).toBe('OK Computer')
    expect(res.body.data.artist).toBe('Radiohead')
  })

  it('returns a 404 envelope when updating a missing log', async () => {
    // Act
    const res = await request(app).put('/api/logs/999').send({ rating: 5 })

    // Assert
    expect(res.status).toBe(404)
    expect(res.body.error).toMatch(/not found/)
  })

  it('rejects an invalid field value on update', async () => {
    // Arrange
    const createRes = await request(app).post('/api/logs').send(validLogPayload())
    const id = createRes.body.data.id

    // Act
    const res = await request(app).put(`/api/logs/${id}`).send({ rating: 4.2 })

    // Assert
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/0.5 steps/)
  })
})

describe('DELETE /api/logs/:id', () => {
  it('deletes an existing log', async () => {
    // Arrange
    const createRes = await request(app).post('/api/logs').send(validLogPayload())
    const id = createRes.body.data.id

    // Act
    const deleteRes = await request(app).delete(`/api/logs/${id}`)
    const getRes = await request(app).get(`/api/logs/${id}`)

    // Assert
    expect(deleteRes.status).toBe(200)
    expect(deleteRes.body.data).toEqual({ deleted: true })
    expect(getRes.status).toBe(404)
  })

  it('returns a 404 envelope when deleting a missing log', async () => {
    // Act
    const res = await request(app).delete('/api/logs/999')

    // Assert
    expect(res.status).toBe(404)
    expect(res.body.error).toMatch(/not found/)
  })
})
