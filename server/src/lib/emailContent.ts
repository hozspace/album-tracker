import type { Rec } from '../types/rec.js'

export interface EmailContent {
  subject: string
  html: string
  text: string
}

// Minimal, clean HTML — no images, since cover art URLs are app-local and
// won't load in an email client. The APP_URL link is omitted entirely when
// unset rather than pointing at an empty href.
export function buildRecEmail(rec: Rec, appUrl: string | undefined): EmailContent {
  const subject = `Today's album: ${rec.title} — ${rec.artist}`
  const yearLine = rec.year ? String(rec.year) : 'year unknown'
  const trimmedAppUrl = appUrl?.trim()

  const html = [
    '<!doctype html>',
    '<html>',
    '<body style="font-family: sans-serif; color: #111; max-width: 480px; margin: 0 auto;">',
    `<h1 style="font-size: 20px;">${escapeHtml(rec.title)}</h1>`,
    `<p style="margin: 0 0 4px;"><strong>${escapeHtml(rec.artist)}</strong> · ${escapeHtml(yearLine)}</p>`,
    `<p>${escapeHtml(rec.because)}</p>`,
    `<p style="color: #666; font-size: 13px;">mode: ${escapeHtml(rec.mode)}</p>`,
    ...(trimmedAppUrl ? [`<p><a href="${escapeHtml(trimmedAppUrl)}">open the app</a></p>`] : []),
    '</body>',
    '</html>',
  ].join('\n')

  const text = [
    `${rec.title} — ${rec.artist} (${yearLine})`,
    '',
    rec.because,
    '',
    `mode: ${rec.mode}`,
    ...(trimmedAppUrl ? ['', `open the app: ${trimmedAppUrl}`] : []),
  ].join('\n')

  return { subject, html, text }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
