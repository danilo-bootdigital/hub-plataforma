'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Search, X } from 'lucide-react'
import type { Product } from '@/types/database'

type Props = {
  produtos: Product[]
  value: string | null
  onSelect: (produtoId: string | null) => void
}

export function BuscaProduto({ produtos, value, onSelect }: Props) {
  const [busca, setBusca] = useState('')
  const [aberto, setAberto] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const ref = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const produtoSelecionado = value ? produtos.find(p => p.id === value) : null

  // Filtragem em tempo real sem debounce para melhor responsividade
  const filtrados = busca.trim()
    ? produtos.filter(p => p.nome.toLowerCase().includes(busca.toLowerCase()))
    : produtos

  const opcoes = [{ id: '__livre__', nome: 'Descrição livre' }, ...filtrados.slice(0, 50)]

  useEffect(() => {
    function handleClickFora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAberto(false)
        setActiveIndex(-1)
      }
    }

    // Adicionar evento de click apenas quando o dropdown estiver aberto
    if (aberto) {
      document.addEventListener('mousedown', handleClickFora)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickFora)
    }
  }, [aberto])


  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const item = listRef.current.children[activeIndex] as HTMLElement | undefined
      if (item) {
        item.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }
  }, [activeIndex, produtos])

  useEffect(() => {
    setAberto(false)
    setActiveIndex(-1)
    setBusca('')
  }, [produtos])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!aberto) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setAberto(true)
        e.preventDefault()
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex(prev => (prev < opcoes.length - 1 ? prev + 1 : 0))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex(prev => (prev > 0 ? prev - 1 : opcoes.length - 1))
        break
      case 'Enter':
        e.preventDefault()
        if (activeIndex >= 0 && activeIndex < opcoes.length) {
          const opcao = opcoes[activeIndex]
          if (opcao.id === '__livre__') {
            onSelect(null)
          } else {
            onSelect(opcao.id)
            setBusca('')
          }
          setAberto(false)
          setActiveIndex(-1)
        }
        break
      case 'Escape':
        e.preventDefault()
        setAberto(false)
        setActiveIndex(-1)
        break
    }
  }, [aberto, activeIndex, opcoes, onSelect])

  function handleSelect(produtoId: string) {
    onSelect(produtoId)
    setBusca('')
    setTimeout(() => {
      setAberto(false)
      setActiveIndex(-1)
    }, 100)
  }

  function handleLimpar() {
    onSelect(null)
    setBusca('')
    inputRef.current?.focus()
  }

  if (produtoSelecionado) {
    return (
      <div className="flex h-9 items-center gap-2 rounded-lg border bg-slate-50 px-3">
        <span className="flex-1 text-sm text-slate-900 truncate">{produtoSelecionado.nome}</span>
        <button
          type="button"
          onClick={handleLimpar}
          className="text-slate-400 hover:text-slate-600"
          aria-label="Limpar produto selecionado"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  const listboxId = 'busca-produto-listbox'

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
        <Input
          ref={inputRef}
          className="h-9 text-sm pl-8"
          placeholder="Buscar produto..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          onFocus={() => setAberto(true)}
          onKeyDown={handleKeyDown}
          role="combobox"
          aria-expanded={aberto}
          aria-controls={listboxId}
          aria-activedescendant={activeIndex >= 0 ? `busca-produto-opt-${activeIndex}` : undefined}
          aria-autocomplete="list"
        />
      </div>
      {aberto && (
        <ul
          id={listboxId}
          ref={listRef}
          role="listbox"
          className="absolute z-[99999] mt-1 w-full rounded-lg border bg-white shadow-lg max-h-72 overflow-y-auto"
        >
          {opcoes.map((opcao, index) => (
            <li
              key={opcao.id}
              id={`busca-produto-opt-${index}`}
              role="option"
              aria-selected={activeIndex === index}
              className={`w-full px-3 py-2 text-left text-sm cursor-pointer truncate ${
                opcao.id === '__livre__' ? 'text-slate-500' : ''
              } ${activeIndex === index ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50'}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                if (opcao.id === '__livre__') {
                  onSelect(null)
                  setAberto(false)
                  setActiveIndex(-1)
                } else {
                  handleSelect(opcao.id)
                }
              }}
              onMouseEnter={() => setActiveIndex(index)}
            >
              {opcao.id === '__livre__' ? (
                'Descrição livre'
              ) : (
                <>
                  {opcao.nome}
                  {'preco_unitario' in opcao && (opcao as Product).preco_unitario > 0 && (
                    <span className="ml-2 text-xs text-slate-400">
                      R$ {(opcao as Product).preco_unitario.toFixed(2)}
                    </span>
                  )}
                </>
              )}
            </li>
          ))}
          {filtrados.length === 0 && (
            <li className="px-3 py-2 text-sm text-slate-400" role="option" aria-disabled="true" aria-selected={false}>
              Nenhum produto encontrado. Tente outro termo ou selecione "Descrição livre".
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
