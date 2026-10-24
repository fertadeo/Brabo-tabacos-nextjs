"use client"

import { Badge } from "@/components/ui/badge"
import { getTipoComprobanteBadgeStyle } from "@/lib/facturacion-comprobantes"
import { cn } from "@/lib/utils"

interface TipoComprobanteBadgeProps {
  tipo: number | null | undefined
  className?: string
}

export function TipoComprobanteBadge({ tipo, className }: TipoComprobanteBadgeProps) {
  const style = getTipoComprobanteBadgeStyle(tipo)
  return (
    <Badge variant="outline" className={cn("text-xs shrink-0", style.className, className)}>
      {style.shortLabel}
    </Badge>
  )
}
