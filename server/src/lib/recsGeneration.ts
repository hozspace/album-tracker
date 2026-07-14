import type Database from 'better-sqlite3'
import type Anthropic from '@anthropic-ai/sdk'
import * as recsRepository from '../repositories/recsRepository.js'
import * as logsRepository from '../repositories/logsRepository.js'
import type { Log } from '../types/log.js'
import type { Rec } from '../types/rec.js'
import { buildRecsAggregates } from './recsAggregates.js'
import { buildRecsContext, type RecsContextLog, type RecsContextSeed } from './recsContext.js'
import { generateRecommendations } from './recsClient.js'
import { verifyRecommendations } from './musicbrainzVerify.js'

const CONTEXT_LOG_LIMIT = 50
const MAX_STORED_RECS = 5

export interface GenerateAndStoreRecsOptions {
  // Overridable so tests aren't stuck waiting on MusicBrainz's real ~1 req/s
  // rate limit. Defaults to verifyRecommendations' own production delay.
  verifyDelayMs?: number
}

export async function generateAndStoreRecs(
  db: Database.Database,
  client: Anthropic,
  seed: RecsContextSeed | undefined,
  options: GenerateAndStoreRecsOptions = {},
): Promise<Rec[]> {
  const { logs } = logsRepository.findAll(db, CONTEXT_LOG_LIMIT, 0)
  const pastRecs = recsRepository.findAll(db)

  const context = buildRecsContext({
    logs: logs.map(toContextLog),
    aggregates: buildRecsAggregates(logs),
    pastRecs: pastRecs.map((rec) => ({ artist: rec.artist, title: rec.title, status: rec.status })),
    seed,
  })

  const raw = await generateRecommendations(client, context)
  const verified =
    options.verifyDelayMs === undefined
      ? await verifyRecommendations(raw)
      : await verifyRecommendations(raw, options.verifyDelayMs)
  const toStore = verified.slice(0, MAX_STORED_RECS)

  return toStore.map((rec) =>
    recsRepository.create(db, {
      artist: rec.artist,
      title: rec.title,
      year: rec.year,
      mbid: rec.mbid,
      artUrl: rec.artUrl,
      because: rec.because,
      mode: rec.mode,
    }),
  )
}

function toContextLog(log: Log): RecsContextLog {
  return {
    title: log.title,
    artist: log.artist,
    year: log.year,
    rating: log.rating,
    relisten: log.relisten,
    faveTrack: log.faveTrack,
    note: log.note,
  }
}
