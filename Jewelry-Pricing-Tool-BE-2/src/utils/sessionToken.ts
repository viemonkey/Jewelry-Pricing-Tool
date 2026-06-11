import { createHash, randomBytes } from 'crypto'
import { Request, Response } from 'express'

export const SESSION_COOKIE_NAME = 'jq_session'

export function createSessionToken(): string {
  return randomBytes(48).toString('base64url')
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function getCookie(req: Request, name: string): string | null {
  const raw = req.headers.cookie
  if (!raw) return null

  const parts = raw.split(';').map((part) => part.trim())
  for (const part of parts) {
    const eqIndex = part.indexOf('=')
    if (eqIndex === -1) continue
    const key = part.slice(0, eqIndex)
    const value = part.slice(eqIndex + 1)
    if (key === name) return decodeURIComponent(value)
  }

  return null
}

export function setSessionCookie(res: Response, token: string, expiresAt: Date) {
  const secure = process.env.COOKIE_SECURE === 'true'
  const sameSite = process.env.COOKIE_SAME_SITE || 'Lax'
  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    `SameSite=${sameSite}`,
    `Expires=${expiresAt.toUTCString()}`,
  ]
  if (secure) parts.push('Secure')
  res.setHeader('Set-Cookie', parts.join('; '))
}

export function clearSessionCookie(res: Response) {
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=${process.env.COOKIE_SAME_SITE || 'Lax'}; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
  )
}
