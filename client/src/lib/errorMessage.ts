const FALLBACK_MESSAGE = 'Something went wrong.'

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : FALLBACK_MESSAGE
}
