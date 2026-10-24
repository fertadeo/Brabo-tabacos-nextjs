"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Download, ExternalLink, FileText, Loader2 } from "lucide-react"
import { toast } from "sonner"
import {
  downloadPurchaseSourcePdf,
  fetchPurchaseSourcePdfBlob,
  openPurchaseSourcePdf,
  type Purchase,
} from "@/lib/api"

interface PurchaseSourcePdfModalProps {
  isOpen: boolean
  purchase: Purchase | null
  onClose: () => void
}

export function PurchaseSourcePdfModal({
  isOpen,
  purchase,
  onClose,
}: PurchaseSourcePdfModalProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !purchase?.id) {
      setPdfUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
      setError(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    setPdfUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })

    void fetchPurchaseSourcePdfBlob(purchase.id)
      .then((blob) => {
        const url = URL.createObjectURL(blob)
        if (cancelled) {
          URL.revokeObjectURL(url)
          return
        }
        setPdfUrl(url)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "No se pudo cargar el PDF")
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [isOpen, purchase?.id])

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl)
    }
  }, [pdfUrl])

  const filename =
    purchase?.source_delivery_note_number != null
      ? `remito-${purchase.source_delivery_note_number}.pdf`
      : purchase
        ? `${purchase.purchase_number}.pdf`
        : "documento.pdf"

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documento del proveedor
          </DialogTitle>
          <DialogDescription>
            {purchase
              ? `${purchase.purchase_number} · ${purchase.supplier_name}${
                  purchase.source_delivery_note_number
                    ? ` · Remito ${purchase.source_delivery_note_number}`
                    : ""
                }`
              : "Vista previa del PDF importado."}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-hidden rounded-lg border bg-muted/30">
          {loading ? (
            <div className="flex h-[min(72vh,820px)] flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-sm">Cargando documento…</p>
            </div>
          ) : error ? (
            <div className="flex h-[min(72vh,820px)] items-center justify-center p-6 text-sm text-destructive">
              {error}
            </div>
          ) : pdfUrl ? (
            <iframe
              src={pdfUrl}
              title="Documento PDF del proveedor"
              className="h-[min(72vh,820px)] w-full bg-white"
            />
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="default"
              size="sm"
              disabled={!purchase || !pdfUrl}
              onClick={() =>
                purchase &&
                void downloadPurchaseSourcePdf(purchase.id, filename).catch((err) =>
                  toast.error(err instanceof Error ? err.message : "No se pudo descargar")
                )
              }
            >
              <Download className="mr-2 h-4 w-4" />
              Descargar PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!purchase || !pdfUrl}
              onClick={() =>
                purchase &&
                void openPurchaseSourcePdf(purchase.id).catch((err) =>
                  toast.error(err instanceof Error ? err.message : "No se pudo abrir")
                )
              }
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Abrir en pestaña nueva
            </Button>
          </div>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
