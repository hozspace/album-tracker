export interface Envelope<T> {
  success: boolean
  data: T | null
  error: string | null
}

export function ok<T>(data: T): Envelope<T> {
  return { success: true, data, error: null }
}

export function fail(error: string): Envelope<null> {
  return { success: false, data: null, error }
}
