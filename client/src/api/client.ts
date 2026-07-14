import type { ApiEnvelope, Log, LogsPage, NewLog, Rec, RecsPage, RecsSeed, Stats } from './types'

export class ApiError extends Error {}

const UNREACHABLE_MESSAGE = "Can't reach the server. Check your connection and try again."
const UNEXPECTED_MESSAGE = 'The server sent an unexpected response.'
const FALLBACK_MESSAGE = 'Something went wrong.'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`/api${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    })
  } catch {
    throw new ApiError(UNREACHABLE_MESSAGE)
  }

  let envelope: ApiEnvelope<T>
  try {
    envelope = await response.json()
  } catch {
    throw new ApiError(UNEXPECTED_MESSAGE)
  }

  if (!envelope.success) {
    throw new ApiError(envelope.error ?? FALLBACK_MESSAGE)
  }

  return envelope.data as T
}

export const api = {
  getLogs: (limit: number, offset: number) =>
    request<LogsPage>(`/logs?limit=${limit}&offset=${offset}`),

  getLog: (id: string) => request<Log>(`/logs/${encodeURIComponent(id)}`),

  createLog: (payload: NewLog) =>
    request<Log>('/logs', { method: 'POST', body: JSON.stringify(payload) }),

  updateLog: (id: string, payload: Partial<NewLog>) =>
    request<Log>(`/logs/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteLog: (id: string) =>
    request<null>(`/logs/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  getStats: () => request<Stats>('/stats'),

  getRecs: () => request<RecsPage>('/recs'),

  generateRecs: (seed?: RecsSeed) =>
    request<RecsPage>('/recs/generate', { method: 'POST', body: JSON.stringify(seed ? { seed } : {}) }),

  updateRecStatus: (id: number, status: Rec['status']) =>
    request<Rec>(`/recs/${id}/status`, { method: 'POST', body: JSON.stringify({ status }) }),
}
