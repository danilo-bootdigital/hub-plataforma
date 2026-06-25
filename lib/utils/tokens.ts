import crypto from 'crypto'

export interface TokenData {
  quoteId: string
  tokenHash: string
  tokenRaw: string
  expiresAt: Date
}

export function generateToken(): { tokenRaw: string; tokenHash: string } {
  const tokenRaw = crypto.randomBytes(16).toString('hex')
  const tokenHash = crypto.createHash('sha256').update(tokenRaw).digest('hex')
  return { tokenRaw, tokenHash }
}

export function createTokenData(quoteId: string): TokenData {
  const { tokenRaw, tokenHash } = generateToken()
  const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 dias

  return {
    quoteId,
    tokenHash,
    tokenRaw,
    expiresAt
  }
}

export function validateToken(tokenRaw: string, tokenHash: string): boolean {
  const calculatedHash = crypto.createHash('sha256').update(tokenRaw).digest('hex')
  return calculatedHash === tokenHash
}

export function formatExpirationDate(date: Date): string {
  return date.toLocaleDateString('pt-BR') + ' às ' + date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  })
}