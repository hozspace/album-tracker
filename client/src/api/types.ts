export interface ApiEnvelope<T> {
  success: boolean
  data: T | null
  error: string | null
}

export interface Log {
  id: string
  mbid: string
  title: string
  artist: string
  year: number | null
  artUrl: string | null
  rating: number
  faveTrack: string | null
  listenedOn: string
  relisten: boolean
  note: string | null
  createdAt: string
}

export type NewLog = Omit<Log, 'id' | 'createdAt'>

export interface LogsPage {
  logs: Log[]
  total: number
}

export interface Stats {
  total: number
  monthCount: number
  monthAvg: number | null
}
