'use client'

// Mensageria (E11) — composer de envio de TEXTO. Chama a Server Action da E9.6
// (enviarMensagemDeTexto). Estados: enviando (useTransition), erro (Alert destructive),
// aviso (confirmação pendente). Após sucesso, router.refresh() reidrata histórico + lista.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { enviarMensagemDeTexto } from '@/lib/mensageria/envio/acao-enviar-texto'

const MENSAGEM_ERRO: Record<string, string> = {
  nao_autenticado: 'Sessão expirada. Faça login novamente.',
  conversa_nao_encontrada: 'Conversa não encontrada.',
  corpo_vazio: 'Digite uma mensagem.',
  provider_indisponivel: 'Provedor de mensagens indisponível no momento.',
  falha_envio: 'Falha ao enviar a mensagem. Tente novamente.',
}

export function ComposerEnvio({ conversationId }: { conversationId: string }) {
  const router = useRouter()
  const [corpo, setCorpo] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [enviando, iniciar] = useTransition()

  function enviar() {
    const texto = corpo.trim()
    if (!texto || enviando) return
    setErro(null)
    setAviso(null)
    iniciar(async () => {
      const r = await enviarMensagemDeTexto({ conversationId, corpo: texto })
      if (r.ok) {
        setCorpo('')
        if (r.status === 'confirmacao_pendente') setAviso('Mensagem enviada; confirmação pendente.')
        router.refresh()
      } else {
        setErro(MENSAGEM_ERRO[r.codigo] ?? 'Não foi possível enviar a mensagem.')
      }
    })
  }

  return (
    <div className="space-y-2 border-t p-3">
      {erro && (
        <Alert variant="destructive"><AlertDescription>{erro}</AlertDescription></Alert>
      )}
      {aviso && (
        <Alert><AlertDescription>{aviso}</AlertDescription></Alert>
      )}
      <div className="flex items-end gap-2">
        <Textarea
          value={corpo}
          onChange={(e) => setCorpo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() }
          }}
          placeholder="Digite uma mensagem…  (Enter envia · Shift+Enter quebra linha)"
          rows={2}
          disabled={enviando}
        />
        <Button onClick={enviar} disabled={enviando || !corpo.trim()}>
          {enviando ? 'Enviando…' : 'Enviar'}
        </Button>
      </div>
    </div>
  )
}
