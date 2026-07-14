// JSON schema for structured output. additionalProperties: false is required
// at every object level for Claude's structured outputs feature.
export const RECS_SCHEMA = {
  type: 'object',
  properties: {
    recommendations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          artist: { type: 'string' },
          title: { type: 'string' },
          year: { type: 'integer' },
          because: { type: 'string' },
          mode: { type: 'string', enum: ['deepen', 'branch', 'wildcard'] },
        },
        required: ['artist', 'title', 'year', 'because', 'mode'],
        additionalProperties: false,
      },
    },
  },
  required: ['recommendations'],
  additionalProperties: false,
} as const
