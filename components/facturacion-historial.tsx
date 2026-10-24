"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Download, Eye, Loader2 } from "lucide-react"
import type { Sale, SaleComprobanteHistorial } from "@/lib/api"
import {
  historialComprobanteLabel,
  historialComprobanteRef,
  visibleSaleHistorial,
} from "@/lib/facturacion-historial"

export function FacturacionHistorialList({
  sale,
  downloadingKey,
  viewingKey,
  onDownload,
  onView,
}: {
  sale: Sale
  downloadingKey?: string | null
  viewingKey?: string | null
  onDownload: (row: SaleComprobanteHistorial) => void
  onView?: (row: SaleComprobanteHistorial) => void
}) {
  const rows = visibleSaleHistorial(sale)
  if (rows.length < 2) return null

  return (
    <div className="mb-4 space-y-2 rounded-lg border bg-background p-3">
      <p className="text-sm font-medium">Historial de comprobantes</p>
      <p className="text-muted-foreground text-xs">
        Cada factura y nota de crédito queda registrada sobre esta venta (por ejemplo factura 1, NC y
        refacturación).
      </p>
      <ol className="space-y-2">
        {rows.map((row, index) => {
          const key = historialDownloadKey(row)
          const downloading = downloadingKey === key
          const viewing = viewingKey === key
          return (
            <li
              key={key}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
            >
              <div className="min-w-0 space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground tabular-nums">{index + 1}.</span>
                  <span className="font-medium">{historialComprobanteLabel(row)}</span>
                  {row.vigente ? (
                    <Badge variant="secondary" className="text-[10px] font-normal">
                      Vigente
                    </Badge>
                  ) : row.kind === "nota_credito" ? (
                    <Badge variant="outline" className="text-[10px] font-normal">
                      NC
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] font-normal">
                      Anulada
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground font-mono text-xs">
                  {historialComprobanteRef(row) ? `${historialComprobanteRef(row)} · ` : null}
                  CAE {row.cae ?? "—"}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-1.5">
                {onView ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={viewing || downloading}
                    onClick={() => onView(row)}
                  >
                    {viewing ? (
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Eye className="mr-2 h-3.5 w-3.5" />
                    )}
                    Ver
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={downloading || viewing}
                  onClick={() => onDownload(row)}
                >
                  {downloading ? (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-3.5 w-3.5" />
                  )}
                  PDF
                </Button>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

export function historialDownloadKey(row: SaleComprobanteHistorial): string {
  return `${row.kind}-${row.cae ?? row.sequence}`
}
