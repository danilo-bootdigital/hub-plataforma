'use client'

import { BadgePerfil } from './badge-perfil'
import { ModalAlterarSenha } from './modal-alterar-senha'
import { Button } from '@/components/ui/button'
import { alternarStatusUsuario } from '@/app/(dashboard)/configuracoes/usuarios/actions'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { UserRole } from '@/types/database'

type Usuario = {
  id: string
  nome: string
  email: string
  telefone: string | null
  cargo: UserRole
  disponivel: boolean
  ativo: boolean
  criado_em: string
}

export function ListaUsuarios({ usuarios }: { usuarios: Usuario[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-slate-50 text-left">
            <th className="px-4 py-3 font-medium text-slate-600">Nome</th>
            <th className="px-4 py-3 font-medium text-slate-600">E-mail</th>
            <th className="px-4 py-3 font-medium text-slate-600">Telefone</th>
            <th className="px-4 py-3 font-medium text-slate-600">Perfil</th>
            <th className="px-4 py-3 font-medium text-slate-600">Cadastrado em</th>
            <th className="px-4 py-3 font-medium text-slate-600">Status</th>
            <th className="px-4 py-3 font-medium text-slate-600">Ações</th>
          </tr>
        </thead>
        <tbody>
          {usuarios.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                Nenhum usuário encontrado.
              </td>
            </tr>
          )}
          {usuarios.map((usuario) => (
            <tr key={usuario.id} className="border-b last:border-0 hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-900">{usuario.nome}</td>
              <td className="px-4 py-3 text-slate-600">{usuario.email}</td>
              <td className="px-4 py-3 text-slate-600">{usuario.telefone ?? '—'}</td>
              <td className="px-4 py-3">
                <BadgePerfil perfil={usuario.cargo} />
              </td>
              <td className="px-4 py-3 text-slate-600">
                {format(new Date(usuario.criado_em), 'dd/MM/yyyy', { locale: ptBR })}
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  usuario.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {usuario.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <ModalAlterarSenha usuarioId={usuario.id} nomeUsuario={usuario.nome} />
                  <form action={alternarStatusUsuario.bind(null, usuario.id, !usuario.ativo)}>
                    <Button type="submit" variant="outline" size="sm">
                      {usuario.ativo ? 'Desativar' : 'Ativar'}
                    </Button>
                  </form>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
