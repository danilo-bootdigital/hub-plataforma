import * as React from "react"

import { cn } from "@/lib/utils"

export interface ToastProps {
  title?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  duration?: number
  variant?: "default" | "destructive"
}

interface ToastContextType {
  toasts: Array<{
    id: string
    title?: React.ReactNode
    description?: React.ReactNode
    action?: React.ReactNode
    duration?: number
    variant?: "default" | "destructive"
  }>
  addToast: (toast: Omit<ToastProps, "id">) => void
  removeToast: (id: string) => void
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined)

export function useToast() {
  const context = React.useContext(ToastContext)

  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider")
  }

  const toast = React.useCallback((props: Omit<ToastProps, "id">) => {
    context.addToast(props)
  }, [context.addToast])

  return { ...context, toast }
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Array<any>>([])

  const addToast = React.useCallback((toast: Omit<ToastProps, "id">) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast = {
      id,
      duration: toast.duration ?? 5000,
      ...toast,
    }

    setToasts((prev) => [...prev, newToast])

    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, newToast.duration)
    }
  }, [])

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  )
}

export function Toast({ title, description, action }: ToastProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-4 rounded-lg bg-background p-4 shadow-lg border">
      <div className="flex-1">
        {title && <div className="font-medium">{title}</div>}
        {description && <div className="text-sm text-muted-foreground">{description}</div>}
      </div>
      {action}
    </div>
  )
}