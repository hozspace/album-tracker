export interface Log {
  id: number
  mbid: string | null
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

export interface CreateLogInput {
  mbid: string | null
  title: string
  artist: string
  year: number | null
  artUrl: string | null
  rating: number
  faveTrack: string | null
  listenedOn: string
  relisten: boolean
  note: string | null
}

export type UpdateLogInput = Partial<CreateLogInput>
