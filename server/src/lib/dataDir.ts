import { join, resolve } from 'node:path'

// Pure path resolution only (no fs access) so this can be imported anywhere,
// including test modules, without side effects like opening the real database
// or touching the real data directory.
export const DATA_DIR = resolve(process.env.DATA_DIR ?? '../data')
export const ART_DIR = join(DATA_DIR, 'art')
