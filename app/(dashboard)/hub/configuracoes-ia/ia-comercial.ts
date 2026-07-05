// Tipos/constantes do assistente de IA comercial (DEC-021, Config-3).
// Módulo puro (sem 'use server') — importável por client e server.

export type IaComercial = {
  prompt_mestre: string
  objetivo: string
  regras: string
  tom_de_voz: string
  restricoes: string
  contexto_negocio: string
  produtos_prioritarios: string
  informacoes_proibidas: string
  observacoes: string
}

export const IA_COMERCIAL_VAZIO: IaComercial = {
  prompt_mestre: '', objetivo: '', regras: '', tom_de_voz: '', restricoes: '',
  contexto_negocio: '', produtos_prioritarios: '', informacoes_proibidas: '', observacoes: '',
}
