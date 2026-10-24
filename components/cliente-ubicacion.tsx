"use client"

import { MapPin } from "lucide-react"
import type { Cliente } from "@/lib/api"
import { getClienteUbicacionParts, type ClienteUbicacionParts } from "@/lib/cliente-display"
import { cn } from "@/lib/utils"

export type ClienteUbicacionVariant = "default" | "compact" | "table" | "detail"

export interface ClienteUbicacionProps {
  cliente?: Cliente | null
  address?: string | null
  city?: string | null
  country?: string | null
  variant?: ClienteUbicacionVariant
  className?: string
  showIcon?: boolean
  emptyLabel?: string | null
}

function resolveParts(props: ClienteUbicacionProps): ClienteUbicacionParts {
  if (props.cliente) return getClienteUbicacionParts(props.cliente)
  return {
    address: props.address?.trim() || null,
    city: props.city?.trim() || null,
    country: props.country?.trim() || null,
  }
}

function localityLine(city: string | null, country: string | null): string | null {
  const parts = [city, country && country !== "AR" && country !== "Argentina" ? country : null].filter(
    Boolean
  ) as string[]
  return parts.length > 0 ? parts.join(", ") : null
}

function primaryTextClass(variant: ClienteUbicacionVariant, lineClamp?: boolean) {
  return cn(
    "break-words [overflow-wrap:anywhere]",
    lineClamp && "line-clamp-2",
    variant === "detail" && "text-base font-medium leading-snug text-foreground",
    variant === "default" && "text-sm font-medium leading-snug text-foreground/90",
    variant === "table" && "text-sm font-medium leading-snug text-foreground/90",
    variant === "compact" && "text-xs font-medium leading-snug text-foreground/85"
  )
}

function secondaryTextClass(variant: ClienteUbicacionVariant) {
  return cn(
    "break-words [overflow-wrap:anywhere] mt-0.5",
    variant === "detail" && "text-sm leading-relaxed text-muted-foreground",
    variant === "default" && "text-xs leading-relaxed text-muted-foreground",
    variant === "table" && "text-xs leading-relaxed text-muted-foreground",
    variant === "compact" && "text-[11px] leading-relaxed text-muted-foreground"
  )
}

export function ClienteUbicacion({
  cliente,
  address,
  city,
  country,
  variant = "default",
  className,
  showIcon = true,
  emptyLabel = null,
}: ClienteUbicacionProps) {
  const parts = resolveParts({ cliente, address, city, country })
  const locality = localityLine(parts.city, parts.country)
  const hasContent = Boolean(parts.address || locality)

  if (!hasContent) {
    if (!emptyLabel) return null
    return (
      <p className={cn("text-xs text-muted-foreground italic", className)}>{emptyLabel}</p>
    )
  }

  const iconClass = cn(
    "shrink-0 text-primary/70",
    variant === "detail" ? "h-5 w-5 mt-0.5" : "h-3.5 w-3.5 mt-0.5"
  )

  const lineClamp = variant === "compact" || variant === "table"

  const content = (
    <div className="min-w-0 flex-1">
      {parts.address ? (
        <p className={primaryTextClass(variant, lineClamp)}>{parts.address}</p>
      ) : null}
      {locality ? (
        <p className={parts.address ? secondaryTextClass(variant) : primaryTextClass(variant, lineClamp)}>
          {locality}
        </p>
      ) : null}
    </div>
  )

  if (variant === "detail") {
    return (
      <div className={cn("min-w-0", className)}>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1.5">
          Ubicación
        </p>
        <div className="flex items-start gap-3">
          {showIcon ? <MapPin className={iconClass} aria-hidden /> : null}
          {content}
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex items-start gap-1.5",
        variant === "table" && "max-w-[220px]",
        className
      )}
    >
      {showIcon ? <MapPin className={iconClass} aria-hidden /> : null}
      {content}
    </div>
  )
}
