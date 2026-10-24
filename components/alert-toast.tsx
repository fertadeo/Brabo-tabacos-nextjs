"use client"

import React, { useEffect } from "react"
import { CheckCircle, AlertTriangle, Info, X } from "lucide-react"
import { Button } from "@/components/ui/button"

export type AlertToastType = "success" | "error" | "info"

interface AlertToastProps {
  visible: boolean
  message: string
  type?: AlertToastType
  onClose: () => void
  /** Duración en ms antes de cerrar automáticamente (0 = no auto-close) */
  duration?: number
}

const typeStyles: Record<
  AlertToastType,
  { bg: string; border: string; icon: React.ReactNode; iconBg: string }
> = {
  success: {
    bg: "bg-green-600 dark:bg-green-700 text-white",
    border: "border-green-500/30",
    iconBg: "bg-green-500/30",
    icon: <CheckCircle className="h-5 w-5 shrink-0" />,
  },
  error: {
    bg: "bg-destructive text-destructive-foreground",
    border: "border-destructive/30",
    iconBg: "bg-white/20",
    icon: <AlertTriangle className="h-5 w-5 shrink-0" />,
  },
  info: {
    bg: "bg-blue-600 dark:bg-blue-700 text-white",
    border: "border-blue-500/30",
    iconBg: "bg-blue-500/30",
    icon: <Info className="h-5 w-5 shrink-0" />,
  },
}

export function AlertToast({
  visible,
  message,
  type = "success",
  onClose,
  duration = 4000,
}: AlertToastProps) {
  useEffect(() => {
    if (!visible || duration <= 0) return
    const t = setTimeout(onClose, duration)
    return () => clearTimeout(t)
  }, [visible, duration, onClose])

  if (!visible) return null

  const styles = typeStyles[type]

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`fixed top-4 right-4 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border ${styles.bg} ${styles.border} animate-in fade-in slide-in-from-top-4 duration-300 max-w-[min(24rem,calc(100vw-2rem))]`}
    >
      <span className={styles.iconBg + " flex items-center justify-center rounded-full p-1"}>
        {styles.icon}
      </span>
      <p className="flex-1 font-medium text-sm leading-snug">{message}</p>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 rounded-full hover:bg-white/20 text-white hover:text-white"
        onClick={onClose}
        aria-label="Cerrar"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}
