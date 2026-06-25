'use client'

import { Toaster } from "@/components/ui/sonner"
import { ToastProvider } from "@/hooks/use-toast"

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ToastProvider>
        <Toaster />
      </ToastProvider>
    </>
  )
}