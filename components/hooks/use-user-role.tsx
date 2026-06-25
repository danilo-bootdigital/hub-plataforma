'use client'

import { useState, useEffect } from 'react'
import type { UserRole } from '@/types/database'

export function useUserRole() {
  const [cargo, setCargo] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function getCargo() {
      try {
        const response = await fetch('/api/user/cargo')
        if (response.ok) {
          const data = await response.json()
          setCargo(data.cargo)
        }
      } catch (error) {
        console.error('Erro ao obter cargo do usuário:', error)
      } finally {
        setLoading(false)
      }
    }

    getCargo()
  }, [])

  return { cargo, loading }
}