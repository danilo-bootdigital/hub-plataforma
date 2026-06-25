// Tipos e constantes compartilhados para carregamento de mensagens.
// Arquivo neutro (NÃO 'use server') — pode exportar const/types livremente.

export const PAGINA_MENSAGENS = 30

export type MensagemDTO = {
  id: string
  direcao: 'enviada' | 'recebida'
  conteudo: string | null
  tipo_midia: string
  url_midia: string | null
  enviado_em: string
}
