import { createApp } from './app.js'
import { db } from './db.js'
import { backfillArtCache } from './lib/artCache.js'
import { ART_DIR } from './lib/dataDir.js'

const PORT = Number(process.env.PORT ?? 4180)

const app = createApp(db, ART_DIR)

app.listen(PORT, () => {
  console.log(`server listening on port ${PORT}`)
})

// Don't block server startup on caching pre-existing external art.
void backfillArtCache(db, ART_DIR).catch((error) => {
  console.error('art cache backfill failed:', error)
})
