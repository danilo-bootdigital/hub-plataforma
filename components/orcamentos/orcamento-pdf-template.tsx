// Template HTML/Tailwind para preview/PDF de orçamento.
// Server Component puro: sem 'use client', sem hooks, sem estado.
// Estrutura: Grid + Flexbox + fluxo natural. Zero position:absolute estrutural.
// Fidelidade visual à imagem aprovada, sem rigidez de coordenadas.

import {
  User,
  FileText,
  Truck,
  ShoppingCart,
  ClipboardList,
  MessageSquare,
  Phone,
  Mail,
  Globe,
  Calendar,
  UserCircle2,
} from 'lucide-react'

// Aliases semânticos com tamanho corporativo (informação > ícone):
// títulos de seção em 16px (h-4); ícones inline em 14px (h-3.5).
const IconeCliente = () => <User className="h-4 w-4" />
const IconeDocumento = () => <FileText className="h-4 w-4" />
const IconeCaminhao = () => <Truck className="h-4 w-4" />
const IconeCarrinho = () => <ShoppingCart className="h-4 w-4" />
const IconeDocTexto = () => <ClipboardList className="h-4 w-4" />
const IconeBalao = () => <MessageSquare className="h-4 w-4" />
const IconeTelefone = () => <Phone className="h-3.5 w-3.5" />
const IconeEmail = () => <Mail className="h-3.5 w-3.5" />
const IconeGlobo = () => <Globe className="h-3.5 w-3.5" />
const IconeCalendario = () => <Calendar className="h-3.5 w-3.5" />
const IconeNota = () => <FileText className="h-3.5 w-3.5" />
const IconeUsuario = () => <UserCircle2 className="h-3.5 w-3.5" />

// Ícone Instagram não está disponível no lucide-react 1.17; mantido como SVG inline
// (regra da auditoria rápida: não adicionar nova dependência).
const IconeInstagram = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
)

type OrcamentoItem = {
  id: string
  descricao: string
  quantidade: number
  preco_unitario: number
  desconto_item: number
  subtotal: number
  product_id: string | null
  marca?: string | null
  codigo?: string | null
  unidade?: string | null
}

type OrcamentoTemplateData = {
  id: string
  numero: number
  status: string
  criado_em: string
  validade_em: string | null
  responsavel: { nome: string } | null
  lead: {
    id: string
    nome: string
    telefone: string
    email: string
    endereco: string
    cpf_cnpj: string
  } | null
  contato: {
    id: string
    nome: string
    telefone: string | null
    email: string | null
    cpf_cnpj: string | null
    cargo: string | null
    tipo_pessoa: string | null
    categoria_cliente: string | null
    especialidade: string | null
    tipo_conselho: string | null
    numero_conselho: string | null
    uf_conselho: string | null
    observacoes: string | null
    empresa_id: string | null
    empresa: { id: string; nome: string } | null
    endereco: string | null
    endereco_numero: string | null
    endereco_complemento: string | null
    endereco_bairro: string | null
    endereco_cidade: string | null
    endereco_estado: string | null
    endereco_cep: string | null
  } | null
  deal: { id: string; titulo: string; contato_id: string } | null
  aprovador: { nome: string } | null
  fornecedor: {
    id: string
    nome: string
    hub_id: string | null
    health_hubs: { id: string; nome: string; logo_url: string | null } | null
  } | null
  carrier: { nome: string } | null
  organizacao: {
    nome: string
    nome_fantasia: string | null
    cnpj: string | null
    telefone: string | null
    email: string | null
    endereco: string | null
    logo_url: string | null
    site: string | null
    instagram: string | null
  } | null
  itens: OrcamentoItem[]
  valor_subtotal: number
  desconto_geral: number
  frete: number
  frete_regiao: string | null
  endereco_entrega: string | null
  forma_pagamento: string | null
  valor_total: number
  observacoes: string | null
  nota_tipo_pessoa: string | null
  nota_nome: string | null
  nota_documento: string | null
  nota_razao_social: string | null
  nota_nome_fantasia: string | null
  nota_endereco: string | null
  nota_ie: string | null
  nota_im: string | null
}

const formatBRL = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n ?? 0)

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString('pt-BR')
  } catch {
    return iso
  }
}

const formatDocumento = (doc: string | null | undefined) => {
  if (!doc) return '—'
  const d = doc.replace(/\D/g, '')
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  return doc
}

const formatPhone = (phone: string | null | undefined) => {
  if (!phone) return '—'
  const d = phone.replace(/\D/g, '')
  if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  return phone
}

const formatCEP = (cep: string | null | undefined) => {
  if (!cep) return ''
  const d = cep.replace(/\D/g, '')
  if (d.length === 8) return d.replace(/(\d{5})(\d{3})/, '$1-$2')
  return cep
}

const laboratorioItem = (
  item: OrcamentoItem,
  fornecedor: OrcamentoTemplateData['fornecedor']
): string => {
  if (item.marca && item.marca.trim()) return item.marca
  if (fornecedor?.nome) return fornecedor.nome
  return '—'
}

function CampoRotulo({ rotulo, valor, valorNegrito = true }: { rotulo: string; valor?: string | null; valorNegrito?: boolean }) {
  // Oculta campos vazios (sem placeholder "—").
  const v = valor == null ? '' : String(valor).trim()
  if (!v || v === '—') return null
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight">{rotulo}</span>
      <span className={`text-[12px] text-slate-800 break-words leading-snug ${valorNegrito ? 'font-bold' : 'font-normal'}`}>
        {v}
      </span>
    </div>
  )
}

function Cabecalho({ data }: { data: OrcamentoTemplateData }) {
  const org = data.organizacao
  return (
    <header className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center border-b-2 border-emerald-600 pb-4">
      {/* Bloco esquerda: logo + empresa */}
      <div className="md:col-span-4 flex flex-col gap-0.5">
        {org?.logo_url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={org.logo_url}
            alt={org.nome_fantasia || org.nome || 'Logo'}
            className="h-12 w-auto object-contain self-start"
          />
        ) : (
          <div className="text-2xl font-extrabold text-slate-800">
            {(org?.nome_fantasia || org?.nome || 'DPRIME').split(' ')[0]}
            <span className="text-slate-800">
              {(org?.nome_fantasia || org?.nome || 'DPRIME').split(' ').slice(1).join(' ')}
            </span>
          </div>
        )}
        <div className="text-[15px] font-extrabold text-slate-600 tracking-tight">Representação Farmacêutica</div>
      </div>

      {/* Bloco centro: contatos */}
      <div className="md:col-span-5 flex flex-col gap-1 text-[11px] text-slate-700 md:border-l md:border-slate-300 md:pl-3">
        {org?.telefone && (
          <div className="flex items-center gap-2">
            <span className="text-slate-500" aria-hidden><IconeTelefone /></span>
            <span>{org.telefone}</span>
          </div>
        )}
        {org?.email && (
          <div className="flex items-center gap-2 break-all">
            <span className="text-slate-500" aria-hidden><IconeEmail /></span>
            <span>{org.email}</span>
          </div>
        )}
        {org?.site && (
          <div className="flex items-center gap-2 break-all">
            <span className="text-slate-500" aria-hidden><IconeGlobo /></span>
            <span>{org.site}</span>
          </div>
        )}
        {org?.instagram && (
          <div className="flex items-center gap-2">
            <span className="text-slate-500" aria-hidden><IconeInstagram /></span>
            <span>{org.instagram}</span>
          </div>
        )}
      </div>

      {/* Bloco direita: ORÇAMENTO + dados */}
      <div className="md:col-span-3 flex flex-col items-start md:items-end gap-1">
        <h1 className="text-4xl font-black text-slate-800 leading-none tracking-tight">ORÇAMENTO</h1>
        <div className="h-0.5 w-20 bg-slate-300 md:self-end mt-0.5 mb-1" />
        <div className="flex items-center gap-2 text-[11px] text-slate-600">
          <span className="text-slate-500" aria-hidden><IconeCalendario /></span>
          <span>Data: <strong className="text-slate-800">{formatDate(data.criado_em)}</strong></span>
        </div>
        {data.validade_em && (
          <div className="flex items-center gap-2 text-[11px] text-slate-600">
            <span className="text-slate-500" aria-hidden><IconeCalendario /></span>
            <span>Validade: <strong className="text-slate-800">{formatDate(data.validade_em)}</strong></span>
          </div>
        )}
        <div className="flex items-center gap-2 text-[11px] text-slate-600">
          <span className="text-slate-500" aria-hidden><IconeNota /></span>
          <span>Proposta: <strong className="text-slate-800">{data.numero}</strong></span>
        </div>
        {data.responsavel?.nome && (
          <div className="flex items-center gap-2 text-[11px] text-slate-600">
            <span className="text-slate-500" aria-hidden><IconeUsuario /></span>
            <span>Vendedor: <strong className="text-slate-800">{data.responsavel.nome}</strong></span>
          </div>
        )}
      </div>
    </header>
  )
}

function SecaoCards({ data }: { data: OrcamentoTemplateData }) {
  const cliente = data.contato || data.lead
  const isPF = data.nota_tipo_pessoa === 'PF'
  const temNota = !!(data.nota_nome || data.nota_documento)

  return (
    <section className="grid grid-cols-1 md:grid-cols-3 gap-4 print:break-inside-avoid">
      {/* Card 1: DADOS DO CLIENTE / CONTATO */}
      <article className="border border-slate-200 shadow-sm rounded-md overflow-hidden bg-white">
        <div className="bg-[#e8f5e8] text-slate-700 px-3 py-2 flex items-center gap-2">
          <IconeCliente />
          <h2 className="text-[12px] font-bold tracking-wide">DADOS DO CLIENTE / CONTATO</h2>
        </div>
        <div className="p-4 flex flex-col gap-1">
          <CampoRotulo rotulo="Nome" valor={cliente?.nome} />
          <CampoRotulo rotulo="CPF" valor={formatDocumento(data.contato?.cpf_cnpj || data.lead?.cpf_cnpj)} />
          <CampoRotulo rotulo="E-mail" valor={data.contato?.email || data.lead?.email} />
          <CampoRotulo rotulo="Telefone" valor={formatPhone(data.contato?.telefone || data.lead?.telefone)} />
          <CampoRotulo rotulo="Cargo" valor={data.contato?.cargo} />
          {data.contato?.especialidade && (
            <CampoRotulo rotulo="Especialidade" valor={data.contato.especialidade} valorNegrito={false} />
          )}
          {data.contato?.tipo_conselho && data.contato?.numero_conselho && (
            <CampoRotulo
              rotulo="Conselho / Nº"
              valor={`${data.contato.tipo_conselho} ${data.contato.numero_conselho}${data.contato.uf_conselho ? '-' + data.contato.uf_conselho : ''}`}
            />
          )}
          {data.contato?.tipo_pessoa && (
            <CampoRotulo
              rotulo="Tipo de pessoa"
              valor={
                data.contato.tipo_pessoa === 'PF'
                  ? 'Pessoa Física'
                  : data.contato.tipo_pessoa === 'PJ'
                    ? 'Pessoa Jurídica'
                    : data.contato.tipo_pessoa
              }
            />
          )}
          {data.contato?.endereco && (
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight">Endereço</span>
              <span className="text-[11px] text-slate-800 break-words leading-snug">
                {data.contato.endereco}
                {data.contato.endereco_numero ? `, ${data.contato.endereco_numero}` : ''}
                {data.contato.endereco_bairro ? ` • ${data.contato.endereco_bairro}` : ''}
                {data.contato.endereco_cidade ? ` • ${data.contato.endereco_cidade}` : ''}
                {data.contato.endereco_estado ? `-${data.contato.endereco_estado}` : ''}
                {data.contato.endereco_cep ? ` • ${formatCEP(data.contato.endereco_cep)}` : ''}
              </span>
            </div>
          )}
        </div>
      </article>

      {/* Card 2: DADOS PARA EMISSÃO DA NOTA */}
      {temNota && (
        <article className="border border-slate-200 shadow-sm rounded-md overflow-hidden bg-white">
          <div className="bg-[#e8f5e8] text-slate-700 px-3 py-2 flex items-center gap-2">
            <IconeDocumento />
            <h2 className="text-[12px] font-bold tracking-wide">DADOS PARA EMISSÃO DA NOTA</h2>
          </div>
          <div className="p-4 flex flex-col gap-1">
            <CampoRotulo rotulo="Tipo" valor={isPF ? 'Pessoa Física' : 'Pessoa Jurídica'} />
            {isPF ? (
              <>
                <CampoRotulo rotulo="Nome" valor={data.nota_nome || ''} />
                <CampoRotulo rotulo="CPF" valor={formatDocumento(data.nota_documento)} />
              </>
            ) : (
              <>
                <CampoRotulo rotulo="Razão Social" valor={data.nota_razao_social || data.nota_nome || ''} />
                {data.nota_nome_fantasia && (
                  <CampoRotulo rotulo="Nome Fantasia" valor={data.nota_nome_fantasia} />
                )}
                <CampoRotulo rotulo="CNPJ" valor={formatDocumento(data.nota_documento)} />
                {data.nota_ie && <CampoRotulo rotulo="Inscrição Estadual" valor={data.nota_ie} />}
                {data.nota_im && <CampoRotulo rotulo="Inscrição Municipal" valor={data.nota_im} />}
              </>
            )}
            {data.contato?.email && <CampoRotulo rotulo="E-mail" valor={data.contato.email} />}
            {data.contato?.telefone && (
              <CampoRotulo rotulo="Telefone" valor={formatPhone(data.contato.telefone)} />
            )}
            {data.nota_endereco && (
              <CampoRotulo rotulo="Endereço" valor={data.nota_endereco} valorNegrito={false} />
            )}
          </div>
        </article>
      )}

      {/* Card 3: ENDEREÇO DE ENTREGA — sempre visível */}
      <article className="border border-slate-200 shadow-sm rounded-md overflow-hidden bg-white">
        <div className="bg-[#e8f5e8] text-slate-700 px-3 py-2 flex items-center gap-2">
          <IconeCaminhao />
          <h2 className="text-[12px] font-bold tracking-wide">ENDEREÇO DE ENTREGA</h2>
        </div>
        <div className="p-4 flex flex-col gap-1">
          <CampoRotulo rotulo="Nome / Destinatário" valor={cliente?.nome} />
          <CampoRotulo rotulo="Telefone" valor={formatPhone(data.contato?.telefone)} />
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight">Endereço</span>
            <span className="text-[11px] text-slate-800 whitespace-pre-wrap break-words leading-snug">
              {(() => {
                if (data.endereco_entrega && data.endereco_entrega.trim().length > 0) return data.endereco_entrega
                if (data.contato?.endereco) return 'Mesmo endereço do cliente'
                return 'Não informado'
              })()}
            </span>
          </div>
          {data.contato?.endereco_bairro && <CampoRotulo rotulo="Bairro" valor={data.contato.endereco_bairro} />}
          {data.contato?.endereco_cidade && (
            <CampoRotulo
              rotulo="Cidade / UF"
              valor={`${data.contato.endereco_cidade}${data.contato.endereco_estado ? ' - ' + data.contato.endereco_estado : ''}`}
            />
          )}
          {data.contato?.endereco_cep && <CampoRotulo rotulo="CEP" valor={formatCEP(data.contato.endereco_cep)} />}
        </div>
      </article>
    </section>
  )
}

function SecaoProdutos({ itens, fornecedor }: { itens: OrcamentoItem[]; fornecedor: OrcamentoTemplateData['fornecedor'] }) {
  return (
    <section data-pdf-products className="flex flex-col gap-0">
      <div className="bg-[#e8f5e8] text-slate-700 px-4 py-3 rounded-t-md flex items-center gap-2 shadow-sm">
        <IconeCarrinho />
        <h2 className="text-[14px] font-extrabold tracking-wide">PRODUTOS</h2>
      </div>
      <div className="border border-t-0 border-slate-200 rounded-b-md overflow-hidden bg-white">
        <table className="w-full text-[12.5px] border-collapse">
          <thead>
            <tr className="bg-white text-slate-700">
              <th className="px-2 py-3 text-center w-10 font-bold text-[12px]">#</th>
              <th className="px-3 py-3 text-left font-bold text-[12px]">DESCRIÇÃO</th>
              <th className="px-3 py-3 text-left font-bold text-[12px]">APRESENTAÇÃO</th>
              <th className="px-2 py-3 text-center w-14 font-bold text-[12px]">QTD</th>
              <th className="px-3 py-3 text-right w-28 font-bold text-[12px]">VALOR UNIT.</th>
              <th className="px-2 py-3 text-center w-16 font-bold text-[12px]">DESC.</th>
              <th className="px-3 py-3 text-right w-32 font-bold text-[12px]">VALOR TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item, idx) => (
              <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                <td className="px-2 py-3 text-center align-top font-bold border-t border-slate-200">{idx + 1}</td>
                <td className="px-3 py-3 align-top border-t border-slate-200">
                  <div className="font-bold text-slate-800 leading-snug">{item.descricao}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Laboratório: {laboratorioItem(item, fornecedor)}</div>
                </td>
                <td className="px-3 py-3 align-top text-slate-700 border-t border-slate-200">
                  {item.unidade || '—'}
                </td>
                <td className="px-2 py-3 text-center align-top text-slate-700 border-t border-slate-200 font-semibold">
                  {item.quantidade}
                </td>
                <td className="px-3 py-3 text-right align-top text-slate-700 border-t border-slate-200">
                  {formatBRL(item.preco_unitario)}
                </td>
                <td className="px-2 py-3 text-center align-top text-slate-700 border-t border-slate-200">
                  {item.desconto_item > 0 ? `${item.desconto_item}%` : '—'}
                </td>
                <td className="px-3 py-3 text-right align-top font-bold text-slate-800 border-t border-slate-200">
                  {formatBRL(item.subtotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function SecaoTotais({ data }: { data: OrcamentoTemplateData }) {
  return (
    <section className="flex justify-end print:break-inside-avoid">
      <div className="w-full md:w-1/2 lg:w-5/12 border border-slate-200 rounded-md bg-white overflow-hidden shadow-sm">
        <div className="px-4 py-2 flex justify-between text-[13px] text-slate-700 border-b border-slate-200">
          <span className="font-semibold">SUBTOTAL</span>
          <span className="font-bold">{formatBRL(data.valor_subtotal)}</span>
        </div>
        <div className="px-4 py-2 flex justify-between text-[13px] text-slate-700 border-b border-slate-200">
          <span className="font-semibold">
            DESCONTO{data.desconto_geral > 0 ? ` (${data.desconto_geral}%)` : ''}
          </span>
          <span className="font-bold">
            {data.desconto_geral > 0
              ? `- ${formatBRL((data.valor_subtotal * data.desconto_geral) / 100)}`
              : formatBRL(0)}
          </span>
        </div>
        <div className="px-4 py-2 flex justify-between text-[13px] text-slate-700 border-b border-slate-200">
          <span className="font-semibold">FRETE</span>
          <span className="font-bold">{formatBRL(data.frete)}</span>
        </div>
        <div className="bg-slate-800 text-white px-5 py-4 flex justify-between items-center">
          <span className="text-[15px] font-black tracking-[0.2em]">TOTAL</span>
          <span className="text-[26px] font-black leading-none">{formatBRL(data.valor_total)}</span>
        </div>
      </div>
    </section>
  )
}

function SecaoComercial({ data }: { data: OrcamentoTemplateData }) {
  const hub = data.fornecedor?.health_hubs
  const linhas: { rotulo: string; valor: string }[] = []
  if (data.fornecedor?.nome) linhas.push({ rotulo: 'Fornecedor / Laboratório', valor: data.fornecedor.nome })
  if (hub?.nome) linhas.push({ rotulo: 'Hub de Saúde', valor: hub.nome })
  if (data.carrier?.nome) linhas.push({ rotulo: 'Transportadora', valor: data.carrier.nome })
  if (data.frete_regiao) linhas.push({ rotulo: 'Região do frete', valor: data.frete_regiao })
  if (data.forma_pagamento) linhas.push({ rotulo: 'Forma de pagamento', valor: data.forma_pagamento })

  const temLogoHub = !!hub?.logo_url
  const temComercial = linhas.length > 0 || temLogoHub

  return (
    <section className="grid grid-cols-1 md:grid-cols-2 gap-4 print:break-inside-avoid">
      {temComercial && (
        <article className="border border-slate-200 shadow-sm rounded-md bg-white overflow-hidden">
          <div className="bg-[#e8f5e8] text-slate-700 px-3 py-2.5 flex items-center gap-2">
            <IconeDocTexto />
            <h2 className="text-[12px] font-bold tracking-wide">DADOS COMERCIAIS</h2>
          </div>
          <div className="p-4 flex items-start gap-3">
            <div className="flex-1 flex flex-col gap-1.5 text-[12px]">
              {linhas.map((l) => (
                <div key={l.rotulo} className="flex items-baseline gap-2">
                  <span className="font-bold text-slate-700 shrink-0">{l.rotulo}:</span>
                  <span className="text-slate-800 font-medium break-words">{l.valor}</span>
                </div>
              ))}
            </div>
            {temLogoHub && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={hub?.logo_url as string}
                alt={hub?.nome || 'Hub de Saúde'}
                className="h-12 w-auto max-w-[120px] object-contain shrink-0 self-start"
              />
            )}
          </div>
        </article>
      )}
      {data.observacoes && data.observacoes.trim() && (
        <article className="border border-slate-200 shadow-sm rounded-md bg-white">
          <div className="bg-[#e8f5e8] text-slate-700 px-3 py-2.5 flex items-center gap-2">
            <IconeBalao />
            <h2 className="text-[12px] font-bold tracking-wide">OBSERVAÇÕES</h2>
          </div>
          <div className="p-4 text-[12px] text-slate-800 whitespace-pre-wrap break-words leading-relaxed">
            {data.observacoes}
          </div>
        </article>
      )}
    </section>
  )
}

function Rodape({ org }: { org: OrcamentoTemplateData['organizacao'] }) {
  if (!org) return null
  if (!org.telefone && !org.email && !org.site && !org.instagram) return null
  return (
    <footer className="border-t border-slate-200 text-slate-600 px-4 pt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-[11px] font-medium print:break-inside-avoid">
      {org.telefone && (
        <span className="flex items-center gap-1.5"><IconeTelefone /><span>{org.telefone}</span></span>
      )}
      {org.email && (
        <span className="flex items-center gap-1.5 break-all"><IconeEmail /><span>{org.email}</span></span>
      )}
      {org.site && (
        <span className="flex items-center gap-1.5 break-all"><IconeGlobo /><span>{org.site}</span></span>
      )}
      {org.instagram && (
        <span className="flex items-center gap-1.5"><IconeInstagram /><span>{org.instagram}</span></span>
      )}
    </footer>
  )
}

export function OrcamentoPdfTemplate({ data }: { data: OrcamentoTemplateData }) {
  return (
    <article
      data-pdf-template="ready"
      className="font-sans grid gap-5 p-10 bg-white text-slate-800 w-full"
    >
      <Cabecalho data={data} />
      <SecaoCards data={data} />
      <SecaoProdutos itens={data.itens} fornecedor={data.fornecedor} />
      <SecaoTotais data={data} />
      <SecaoComercial data={data} />
      <Rodape org={data.organizacao} />
    </article>
  )
}
