import { config } from 'dotenv'
import { resolve } from 'node:path'

// Load the repo-root .env in dev. Missing files are a no-op, so Docker
// (which passes real env vars) is unaffected. Must be imported before any
// module that reads process.env at import time (db.ts, dataDir.ts).
config({ path: resolve(process.cwd(), '../.env'), quiet: true })
config({ path: resolve(process.cwd(), '.env'), quiet: true })
