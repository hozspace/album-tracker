import Anthropic from '@anthropic-ai/sdk'
import { RECS_SYSTEM_PROMPT } from './recsPrompt.js'
import { RECS_SCHEMA } from './recsSchema.js'
import type { RecMode } from '../types/rec.js'

const RECS_MAX_TOKENS = 4000
const DEFAULT_MODEL = 'claude-opus-4-8'

export class RecsGenerationError extends Error {}

export interface RawRecommendation {
  artist: string
  title: string
  year: number
  because: string
  mode: RecMode
}

export async function generateRecommendations(
  client: Anthropic,
  contextString: string,
): Promise<RawRecommendation[]> {
  const model = process.env.RECS_MODEL ?? DEFAULT_MODEL

  let response: Anthropic.Message
  try {
    response = await client.messages.create({
      model,
      max_tokens: RECS_MAX_TOKENS,
      thinking: { type: 'adaptive' },
      system: RECS_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: contextString }],
      output_config: { format: { type: 'json_schema', schema: RECS_SCHEMA } },
    })
  } catch (error) {
    throw toRecsGenerationError(error)
  }

  if (response.stop_reason === 'refusal') {
    throw new RecsGenerationError('Claude declined to generate recommendations for this request.')
  }
  if (response.stop_reason === 'max_tokens') {
    throw new RecsGenerationError('Claude ran out of room generating recommendations. Try again.')
  }

  const textBlock = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === 'text',
  )
  if (!textBlock) {
    throw new RecsGenerationError('Claude did not return any recommendations.')
  }

  return parseRecommendations(textBlock.text)
}

function parseRecommendations(text: string): RawRecommendation[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new RecsGenerationError('Claude returned recommendations in an unexpected format.')
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !Array.isArray((parsed as { recommendations?: unknown }).recommendations)
  ) {
    throw new RecsGenerationError('Claude returned recommendations in an unexpected format.')
  }

  return (parsed as { recommendations: RawRecommendation[] }).recommendations
}

// Most specific first: AuthenticationError and RateLimitError are both
// subclasses of APIError, so they must be checked before the general
// APIError branch or they would never be reached.
function toRecsGenerationError(error: unknown): RecsGenerationError {
  if (error instanceof Anthropic.AuthenticationError) {
    return new RecsGenerationError(
      'Claude API rejected the request — check ANTHROPIC_API_KEY in .env.',
    )
  }
  if (error instanceof Anthropic.RateLimitError) {
    return new RecsGenerationError('Claude API rate limit reached. Try again in a moment.')
  }
  if (error instanceof Anthropic.APIError) {
    return new RecsGenerationError(`Claude API error: ${error.message}`)
  }
  if (error instanceof Error) {
    return new RecsGenerationError(`Failed to reach Claude API: ${error.message}`)
  }
  return new RecsGenerationError('Failed to reach Claude API.')
}
