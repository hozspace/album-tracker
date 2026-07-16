import Anthropic from '@anthropic-ai/sdk'
import { RecsGenerationError } from './recsClient.js'

// Shared by any code path that talks to Claude (in-app recs generation, the
// daily email job) so the "no API key" error message stays consistent.
export function getAnthropicClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new RecsGenerationError('set ANTHROPIC_API_KEY in .env')
  }
  return new Anthropic()
}
