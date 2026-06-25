'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Trash2, AlertTriangle, Shield, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { excluirInstanciaSegura, marcarInstanciaInativa } from '@/app/(dashboard)/configuracoes/whatsapp/actions-seguras'

type Props = {
  aberto: boolean
  onFechar: () => void
  instancia: {
    id: string
    nome: string
    status_conexao: string
  }
}

export function ModalExcluirInstancia({ aberto, onFechar, instancia }: Props) {
  const [carregando, setCarregando] = useState(false)
  const [acao, setAcao] = useState<'excluir' | 'inativar'>('excluir')

  async function handleConfirmar() {
    setCarregando(true)
    try {
      if (acao === 'excluir') {
        const resultado = await excluirInstanciaSegura(instancia.id)
        toast.success(resultado.message, { description: 'Sucesso' })
      } else {
        await marcarInstanciaInativa(instancia.id, 'Ação do administrador')
        toast.success(`Instância "${instancia.nome}" marcada como inativa.`, { description: 'Sucesso' })
      }
      onFechar()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ocorreu um erro inesperado.', { description: 'Erro' })
    } finally {
      setCarregando(false)
    }
  }

  const podeExcluir = instancia.status_conexao !== 'conectado'

  return (
    <Dialog open={aberto} onOpenChange={onFechar}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-500" />
            Excluir Instância
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações da instância */}
          <div className="bg-slate-50 p-3 rounded-lg">
            <p className="font-medium text-slate-900">{instancia.nome}</p>
            <p className="text-sm text-slate-500">
              Status: {instancia.status_conexao === 'conectado' ? 'Conectada' : 'Desconectada'}
            </p>
          </div>

          {/* Alerta de proteção de dados */}
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <strong>Dados comerciais protegidos:</strong> Conversas, leads, mensagens e histórico serão preservados integralmente.
            </AlertDescription>
          </Alert>

          {/* Escolha da ação */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Ação a ser executada:</label>

            <div className="space-y-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="acao"
                  value="excluir"
                  checked={acao === 'excluir'}
                  onChange={(e) => setAcao(e.target.value as 'excluir' | 'inativar')}
                  disabled={!podeExcluir}
                />
                <span className={podeExcluir ? '' : 'text-slate-400'}>
                  {podeExcluir ? (
                    <>
                      <CheckCircle className="inline h-4 w-4 text-green-500 mr-1" />
                      Excluir permanentemente
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="inline h-4 w-4 text-yellow-500 mr-1" />
                      Instância conectada - não pode ser excluída
                    </>
                  )}
                </span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="acao"
                  value="inativar"
                  checked={acao === 'inativar'}
                  onChange={(e) => setAcao(e.target.value as 'excluir' | 'inativar')}
                />
                <span>
                  <AlertTriangle className="inline h-4 w-4 text-orange-500 mr-1" />
                  Marcar como inativa (conserva no banco)
                </span>
              </label>
            </div>
          </div>

          {/* Lista do que será removido */}
          <div className="bg-red-50 p-3 rounded-lg text-sm">
            <p className="font-medium text-red-800 mb-2">Itens que serão removidos:</p>
            <ul className="list-disc list-inside space-y-1 text-red-700">
              <li>Conexão com a Evolution API</li>
              <li>Sessão WhatsApp</li>
              <li>QR Code ativo</li>
              <li>Webhook configurado</li>
              <li>Token de autenticação</li>
              <li>Registro da instância no banco</li>
            </ul>
          </div>

          {/* Lista do que será preservado */}
          <div className="bg-green-50 p-3 rounded-lg text-sm">
            <p className="font-medium text-green-800 mb-2">Dados que serão preservados:</p>
            <ul className="list-disc list-inside space-y-1 text-green-700">
              <li>Todas as conversas</li>
              <li>Todas as mensagens</li>
              <li>Leads e contatos</li>
              <li>Pipeline de vendas</li>
              <li>Orçamentos e pedidos</li>
              <li>Relatórios e histórico</li>
            </ul>
          </div>

          {!podeExcluir && acao === 'excluir' && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Esta instância está conectada. Desconecte-a primeiro para poder excluí-la.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onFechar} disabled={carregando}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmar}
            disabled={!podeExcluir && acao === 'excluir' || carregando}
            variant={acao === 'excluir' ? 'destructive' : 'default'}
          >
            {carregando ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                {acao === 'excluir' ? 'Excluindo...' : 'Processando...'}
              </>
            ) : (
              acao === 'excluir' ? 'Excluir Instância' : 'Marcar como Inativa'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}