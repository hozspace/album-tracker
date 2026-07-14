import { Router } from 'express'
import type Database from 'better-sqlite3'
import * as logsRepository from '../repositories/logsRepository.js'
import { ok } from '../lib/envelope.js'

const ROUNDING_PRECISION = 100

export function createStatsRouter(db: Database.Database): Router {
  const router = Router()

  router.get('/', (_req, res) => {
    const total = logsRepository.countTotal(db)
    const { monthStart, monthEndExclusive } = currentMonthRange()
    const { count, avg } = logsRepository.countAndAverageForMonth(db, monthStart, monthEndExclusive)

    res.json(
      ok({
        total,
        monthCount: count,
        monthAvg: avg === null ? null : Math.round(avg * ROUNDING_PRECISION) / ROUNDING_PRECISION,
      }),
    )
  })

  return router
}

function currentMonthRange(): { monthStart: string; monthEndExclusive: string } {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  return {
    monthStart: formatDate(new Date(year, month, 1)),
    monthEndExclusive: formatDate(new Date(year, month + 1, 1)),
  }
}

function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
