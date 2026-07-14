import { describe, it, expect, vi } from 'vitest'
import Anthropic from '@anthropic-ai/sdk'
import { generateRecommendations, RecsGenerationError } from './recsClient.js'

function fakeClient(create: (...args: unknown[]) => unknown): Anthropic {
  return { messages: { create } } as unknown as Anthropic
}

function textResponse(payload: unknown, stopReason: string = 'end_turn') {
  return {
    id: 'msg_1',
    content: [{ type: 'text', text: JSON.stringify(payload) }],
    stop_reason: stopReason,
  }
}

const VALID_PAYLOAD = {
  recommendations: [
    { artist: 'Boards of Canada', title: 'Geogaddi', year: 2002, because: 'Test reason.', mode: 'deepen' },
  ],
}

describe('generateRecommendations', () => {
  it('parses the recommendations array out of the text block', async () => {
    const client = fakeClient(async () => textResponse(VALID_PAYLOAD))

    const result = await generateRecommendations(client, 'context')

    expect(result).toEqual(VALID_PAYLOAD.recommendations)
  })

  it('sends the model, thinking, system prompt, and structured output schema', async () => {
    const create = vi.fn(async () => textResponse(VALID_PAYLOAD))
    const client = fakeClient(create)

    await generateRecommendations(client, 'my context')

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        max_tokens: 4000,
        thinking: { type: 'adaptive' },
        messages: [{ role: 'user', content: 'my context' }],
        output_config: expect.objectContaining({
          format: expect.objectContaining({ type: 'json_schema' }),
        }),
      }),
    )
    const callArgs = create.mock.calls[0]?.[0] as Record<string, unknown>
    expect(callArgs.temperature).toBeUndefined()
    expect(callArgs.top_p).toBeUndefined()
    expect(callArgs.top_k).toBeUndefined()
  })

  it('defaults the model to claude-opus-4-8 when RECS_MODEL is unset', async () => {
    const create = vi.fn(async () => textResponse(VALID_PAYLOAD))
    const client = fakeClient(create)

    await generateRecommendations(client, 'context')

    const callArgs = create.mock.calls[0]?.[0] as Record<string, unknown>
    expect(callArgs.model).toBe('claude-opus-4-8')
  })

  it('uses RECS_MODEL from env when set', async () => {
    const create = vi.fn(async () => textResponse(VALID_PAYLOAD))
    const client = fakeClient(create)
    const previous = process.env.RECS_MODEL
    process.env.RECS_MODEL = 'claude-haiku-4-5'

    try {
      await generateRecommendations(client, 'context')
    } finally {
      if (previous === undefined) delete process.env.RECS_MODEL
      else process.env.RECS_MODEL = previous
    }

    const callArgs = create.mock.calls[0]?.[0] as Record<string, unknown>
    expect(callArgs.model).toBe('claude-haiku-4-5')
  })

  it('throws a clear error when stop_reason is refusal', async () => {
    const client = fakeClient(async () => textResponse(VALID_PAYLOAD, 'refusal'))

    await expect(generateRecommendations(client, 'context')).rejects.toThrow(RecsGenerationError)
    await expect(generateRecommendations(client, 'context')).rejects.toThrow(/declined/)
  })

  it('throws a clear error when stop_reason is max_tokens', async () => {
    const client = fakeClient(async () => textResponse(VALID_PAYLOAD, 'max_tokens'))

    await expect(generateRecommendations(client, 'context')).rejects.toThrow(/ran out of room/)
  })

  it('throws when the response has no text block', async () => {
    const client = fakeClient(async () => ({ id: 'msg_1', content: [], stop_reason: 'end_turn' }))

    await expect(generateRecommendations(client, 'context')).rejects.toThrow(/did not return/)
  })

  it('throws when the text block is not valid JSON', async () => {
    const client = fakeClient(async () => ({
      id: 'msg_1',
      content: [{ type: 'text', text: 'not json' }],
      stop_reason: 'end_turn',
    }))

    await expect(generateRecommendations(client, 'context')).rejects.toThrow(/unexpected format/)
  })

  it('throws when the JSON does not match the expected shape', async () => {
    const client = fakeClient(async () => textResponse({ recommendations: 'not-an-array' }))

    await expect(generateRecommendations(client, 'context')).rejects.toThrow(/unexpected format/)
  })

  it('maps AuthenticationError to a clear message pointing at ANTHROPIC_API_KEY', async () => {
    const error = new Anthropic.AuthenticationError(
      401,
      { type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } },
      'invalid x-api-key',
      new Headers(),
    )
    const client = fakeClient(async () => {
      throw error
    })

    await expect(generateRecommendations(client, 'context')).rejects.toThrow(/ANTHROPIC_API_KEY/)
  })

  it('maps RateLimitError to a clear retry message', async () => {
    const error = new Anthropic.RateLimitError(
      429,
      { type: 'error', error: { type: 'rate_limit_error', message: 'rate limited' } },
      'rate limited',
      new Headers(),
    )
    const client = fakeClient(async () => {
      throw error
    })

    await expect(generateRecommendations(client, 'context')).rejects.toThrow(/rate limit/i)
  })

  it('maps a generic APIError to a message including the API error text', async () => {
    const error = new Anthropic.InternalServerError(
      500,
      { type: 'error', error: { type: 'api_error', message: 'boom' } },
      'boom',
      new Headers(),
    )
    const client = fakeClient(async () => {
      throw error
    })

    await expect(generateRecommendations(client, 'context')).rejects.toThrow(/Claude API error/)
  })

  it('maps a non-API error to a generic connectivity message', async () => {
    const client = fakeClient(async () => {
      throw new Error('network down')
    })

    await expect(generateRecommendations(client, 'context')).rejects.toThrow(/Failed to reach Claude API/)
  })
})
