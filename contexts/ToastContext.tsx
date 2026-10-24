"use client"

import React, { createContext, useCallback, useContext, useState, ReactNode } from "react"
import { AlertToast, type AlertToastType } from "@/components/alert-toast"

interface ToastOptions {
  message: string
  type?: AlertToastType
  duration?: number
}

interface ToastContextType {
  showToast: (options: ToastOptions | string) => void
  hideToast: () => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

interface ToastProviderProps {
  children: ReactNode
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [visible, setVisible] = useState(false)
  const [message, setMessage] = useState("")
  const [type, setType] = useState<AlertToastType>("success")
  const [duration, setDuration] = useState(4000)

  const showToast = useCallback((options: ToastOptions | string) => {
    if (typeof options === "string") {
      setMessage(options)
      setType("success")
      setDuration(4000)
    } else {
      setMessage(options.message)
      setType(options.type ?? "success")
      setDuration(options.duration ?? 4000)
    }
    setVisible(true)
  }, [])

  const hideToast = useCallback(() => {
    setVisible(false)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <AlertToast
        visible={visible}
        message={message}
        type={type}
        onClose={hideToast}
        duration={duration}
      />
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext)
  if (ctx === undefined) {
    throw new Error("useToast debe usarse dentro de ToastProvider")
  }
  return ctx
}
