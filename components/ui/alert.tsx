"use client"

/**
 * Alertas reutilizables (Error, Warning, Info, Success) con icono, título y contenido.
 * Para alertas flotantes en la app usar <Alert variant="…" floating title="…" />.
 */
import * as React from "react"
import { AlertCircle, AlertTriangle, Info, CheckCircle } from "lucide-react"

import { cn } from "@/lib/utils"

const alertVariants = {
  error: {
    root: "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/40",
    border: "border-l-red-500 dark:border-l-red-400",
    icon: "bg-red-500 text-white dark:bg-red-400",
    title: "text-red-800 dark:text-red-200",
    description: "text-red-700/90 dark:text-red-300/90",
    Icon: AlertCircle,
  },
  warning: {
    root: "border-amber-200 bg-amber-50 dark:border-amber-900/30 dark:bg-amber-950/30",
    border: "border-l-amber-500 dark:border-l-amber-400",
    icon: "bg-amber-500 text-white dark:bg-amber-400",
    title: "text-amber-800 dark:text-amber-200",
    description: "text-amber-800/90 dark:text-amber-200/90",
    Icon: AlertTriangle,
  },
  info: {
    root: "border-blue-200 bg-blue-50 dark:border-blue-900/30 dark:bg-blue-950/30",
    border: "border-l-blue-500 dark:border-l-blue-400",
    icon: "bg-blue-500 text-white dark:bg-blue-400",
    title: "text-blue-800 dark:text-blue-200",
    description: "text-blue-800/90 dark:text-blue-200/90",
    Icon: Info,
  },
  success: {
    root: "border-emerald-200 bg-emerald-50 dark:border-emerald-900/30 dark:bg-emerald-950/30",
    border: "border-l-emerald-500 dark:border-l-emerald-400",
    icon: "bg-emerald-500 text-white dark:bg-emerald-400",
    title: "text-emerald-800 dark:text-emerald-200",
    description: "text-emerald-800/90 dark:text-emerald-200/90",
    Icon: CheckCircle,
  },
} as const

export type AlertVariant = keyof typeof alertVariants

export interface AlertProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  variant?: AlertVariant
  title?: React.ReactNode
  description?: React.ReactNode
  /** Si es true, el alert se muestra como flotante (fixed bottom-right). Usar para toasts. */
  floating?: boolean
  /** Contenido adicional (ej. botón) debajo de description */
  action?: React.ReactNode
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = "info", title, description, floating, action, children, ...props }, ref) => {
    const config = alertVariants[variant] ?? alertVariants.error
    const Icon = config.Icon

    const content = (
      <>
        <div className="flex gap-3">
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
              config.icon
            )}
          >
            <Icon className="h-4 w-4" strokeWidth={2.5} />
          </span>
          <div className="flex-1 space-y-0.5 min-w-0">
            {title != null && (
              <p className={cn("text-sm font-semibold leading-tight", config.title)}>{title}</p>
            )}
            {(description != null || children) && (
              <div className={cn("text-sm", config.description)}>
                {description}
                {children}
              </div>
            )}
          </div>
        </div>
        {action != null && <div className="mt-3">{action}</div>}
      </>
    )

    const rootClasses = cn(
      "rounded-lg border px-4 py-3 text-left",
      config.root,
      config.border,
      "border-l-4",
      floating &&
        "fixed top-6 right-6 z-[100] min-w-[20rem] max-w-md shadow-lg animate-in fade-in-0 slide-in-from-top-4 duration-300",
      className
    )

    return (
      <div ref={ref} role="alert" className={rootClasses} {...props}>
        {content}
      </div>
    )
  }
)
Alert.displayName = "Alert"

export { Alert, alertVariants }
