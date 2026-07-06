// Validação de e-mail compartilhada — fonte única para telas e server actions
// (evita divergência entre pontos que aceitavam/rejeitavam formatos diferentes).
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function emailValido(email: string): boolean {
  return EMAIL_RE.test(email)
}
