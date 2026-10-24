"use client"

import { useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Download, FileText, Loader2 } from "lucide-react"
import { ArcaInvoiceTemplatePreview } from "@/components/arca-invoice-template-preview"
import { getArcaInvoiceSampleParams } from "@/lib/arca-invoice-sample"
import { generateArcaInvoicePdf } from "@/lib/generate-arca-invoice-pdf"
import { getTipoComprobanteLabel } from "@/lib/facturacion-comprobantes"

export interface ArcaInvoiceTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ArcaInvoiceTemplateDialog({ open, onOpenChange }: ArcaInvoiceTemplateDialogProps) {
  const sample = useMemo(() => getArcaInvoiceSampleParams(), [open])
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownloadSample = async () => {
    setIsDownloading(true)
    try {
      await generateArcaInvoicePdf(sample)
    } catch (e) {
      console.error("Error al generar PDF muestra:", e)
      alert("No se pudo generar el PDF de muestra.")
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] max-w-4xl flex-col gap-0 p-0">
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Plantilla de factura ARCA / AFIP
          </DialogTitle>
          <DialogDescription>
            Vista previa del diseño por triplicado (ORIGINAL, DUPLICADO, TRIPLICADO) que se descarga al emitir. Datos de
            ejemplo ({getTipoComprobanteLabel(sample.comprobante.tipo)}). El comprobante real usa la respuesta de la API
            (CAE, QR, número, etc.).
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto bg-muted/40 p-4 md:p-6">
          <ArcaInvoiceTemplatePreview data={sample} />
        </div>

        <DialogFooter className="shrink-0 border-t px-6 py-4 gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <Button variant="secondary" onClick={() => void handleDownloadSample()} disabled={isDownloading}>
            {isDownloading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {isDownloading ? "Generando…" : "Descargar PDF de muestra"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
