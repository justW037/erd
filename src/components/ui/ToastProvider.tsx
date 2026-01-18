import React, { createContext, useCallback, useContext, useState } from 'react'

export interface Toast {
  id: number
  message: string
  type: 'info' | 'success' | 'error'
}

interface ToastContextValue {
  addToast: (message: string, type?: Toast['type']) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return ctx
}

interface ToastProviderProps {
  children: React.ReactNode
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [nextId, setNextId] = useState(1)

  const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    setToasts((prev) => [...prev, { id: nextId, message, type }])
    setNextId((id) => id + 1)
    setTimeout(() => {
      setToasts((prev) => prev.slice(1))
    }, 3000)
  }, [nextId])

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-3 py-2 rounded-md text-sm shadow-lg border backdrop-blur bg-slate-900/85 text-slate-50 ${
              toast.type === 'success'
                ? 'border-emerald-500'
                : toast.type === 'error'
                ? 'border-red-500'
                : 'border-slate-600'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export default ToastProvider

