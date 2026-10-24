"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react"
import { ArcaInvoiceTemplatePreview } from "@/components/arca-invoice-template-preview"
import type { GenerateArcaInvoicePdfParams } from "@/lib/generate-arca-invoice-pdf"

export interface FacturacionArcaPreviewPanelProps {
  data: GenerateArcaInvoicePdfParams | null
  loading?: boolean
  error?: string | null
  title?: string
  description?: string
  defaultOpen?: boolean
}

export function FacturacionArcaPreviewPanel({
  data,
  loading = false,
  error = null,
  title = "Vista previa del comprobante ARCA",
  description = "Así se verá el comprobante fiscal. Es un borrador: el número, CAE y QR se asignan al emitir en ARCA.",
  defaultOpen = true,
}: FacturacionArcaPreviewPanelProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="rounded-lg border">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium hover:bg-muted/50 transition-colors"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
      >
        <span>{title}</span>
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>
      {open ? (
        <div className="border-t px-4 pb-4 pt-3 space-y-3">
          <p className="text-muted-foreground text-xs">{description}</p>
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground text-sm">
              <Loader2 className="h-5 w-5 animate-spin" />
              Generando vista previa…
            </div>
          ) : error ? (
            <p className="text-destructive text-sm">{error}</p>
          ) : data ? (
            <div className="overflow-x-auto rounded-md border bg-white p-2 sm:p-4">
              <ArcaInvoiceTemplatePreview data={data} triplicado={false} />
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No hay datos para mostrar la vista previa.</p>
          )}
        </div>
      ) : null}
    </div>
  )
}
