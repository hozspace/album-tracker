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

export type RecMode = 'deepen' | 'branch' | 'wildcard'
export type RecStatus = 'pending' | 'logged' | 'dismissed'

export interface Rec {
  id: number
  artist: string
  title: string
  year: number | null
  mbid: string | null
  artUrl: string | null
  because: string
  mode: RecMode
  status: RecStatus
  createdAt: string
}

export interface RecsSeed {
  genre?: string
  artist?: string
}

export interface RecsPage {
  recs: Rec[]
}
