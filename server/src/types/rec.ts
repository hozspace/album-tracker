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

export interface CreateRecInput {
  artist: string
  title: string
  year: number | null
  mbid: string | null
  artUrl: string | null
  because: string
  mode: RecMode
}
