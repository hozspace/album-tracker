import { extname } from 'node:path'
import { Router } from 'express'
import { contentTypeForExtension, findArtFile } from '../lib/artCache.js'
import { fail } from '../lib/envelope.js'
import { ValidationError } from '../lib/validationError.js'
import { parseLogId } from '../validation/logValidation.js'

const CACHE_CONTROL_HEADER = 'public, max-age=31536000, immutable'

export function createArtRouter(artDir: string): Router {
  const router = Router()

  router.get('/:id', (req, res) => {
    let id: number
    try {
      id = parseLogId(req.params.id)
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(404).json(fail('art not found'))
        return
      }
      throw error
    }

    const filePath = findArtFile(artDir, id)
    if (!filePath) {
      res.status(404).json(fail('art not found'))
      return
    }

    res.set('Cache-Control', CACHE_CONTROL_HEADER)
    res.type(contentTypeForExtension(extname(filePath).slice(1)))
    res.sendFile(filePath, (error) => {
      if (error && !res.headersSent) {
        res.status(500).json(fail('failed to read art file'))
      }
    })
  })

  return router
}
