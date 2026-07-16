import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getSmtpConfig } from './emailConfig.js'

const SMTP_ENV_KEYS = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'EMAIL_TO', 'EMAIL_FROM'] as const

function setFullSmtpEnv(overrides: Partial<Record<(typeof SMTP_ENV_KEYS)[number], string>> = {}) {
  process.env.SMTP_HOST = overrides.SMTP_HOST ?? 'smtp.example.com'
  process.env.SMTP_PORT = overrides.SMTP_PORT ?? '587'
  process.env.SMTP_USER = overrides.SMTP_USER ?? 'user'
  process.env.SMTP_PASS = overrides.SMTP_PASS ?? 'pass'
  process.env.EMAIL_TO = overrides.EMAIL_TO ?? 'owner@example.com'
  process.env.EMAIL_FROM = overrides.EMAIL_FROM ?? 'diary@example.com'
}

let originalEnv: Record<string, string | undefined>

beforeEach(() => {
  originalEnv = Object.fromEntries(SMTP_ENV_KEYS.map((key) => [key, process.env[key]]))
})

afterEach(() => {
  for (const key of SMTP_ENV_KEYS) {
    if (originalEnv[key] === undefined) delete process.env[key]
    else process.env[key] = originalEnv[key]
  }
})

describe('getSmtpConfig', () => {
  it('returns a config object when every SMTP env var is present', () => {
    // Arrange
    setFullSmtpEnv()

    // Act
    const config = getSmtpConfig()

    // Assert
    expect(config).toEqual({
      host: 'smtp.example.com',
      port: 587,
      user: 'user',
      pass: 'pass',
      to: 'owner@example.com',
      from: 'diary@example.com',
    })
  })

  it.each(SMTP_ENV_KEYS)('returns null when %s is missing', (missingKey) => {
    // Arrange
    setFullSmtpEnv()
    delete process.env[missingKey]

    // Act
    const config = getSmtpConfig()

    // Assert
    expect(config).toBeNull()
  })

  it('returns null when SMTP_PORT is not a valid positive integer', () => {
    // Arrange
    setFullSmtpEnv({ SMTP_PORT: 'not-a-port' })

    // Act
    const config = getSmtpConfig()

    // Assert
    expect(config).toBeNull()
  })
})
