"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useConfirmBeforeClose } from "@/lib/use-confirm-before-close"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Download, FileText, Loader2, Printer } from "lucide-react"
import jsPDF from "jspdf"
import type { SaleCurrency } from "@/lib/pos-usd"
import autoTable from "jspdf-autotable"
import {
  generateCommercialBudgetPdf,
  getCommercialBudgetPdfBlob,
  commercialPdfParamsFromModalInput,
} from "@/lib/generate-commercial-budget-pdf"

export interface BudgetPdfModalLine {
  id: string
  service: string
  description: string
  equipmentType?: string
  equipmentModel?: string
  problemDescription?: string
  quantity: number
  vat: number
  unitPrice: number
  currency?: SaleCurrency
  subtotal: number
}

export interface BudgetPdfModalData {
  id: string
  numero: string
  cliente: string
  email?: string
  telefono?: string
  direccion?: string
  codigo?: string
  cuit?: string
  condicionFiscal?: string
  fecha: string
  fechaVencimiento: string
  estado: string
  items: BudgetPdfModalLine[]
  subtotal: number
  vat21: number
  vat105: number
  total: number
  observaciones?: string
  validez?: number
  formaPago?: string
  vendedor?: string
}

interface BudgetPdfModalProps {
  isOpen: boolean
  onClose: () => void
  budget: BudgetPdfModalData | null
  /** Catálogo (presupuestos del módulo) vs. reparación legado */
  documentVariant?: "repair" | "catalog"
}

export function BudgetPdfModal({
  isOpen,
  onClose,
  budget,
  documentVariant = "repair",
}: BudgetPdfModalProps) {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)

  const isCatalog = documentVariant === "catalog"

  useEffect(() => {
    if (!isOpen || !budget || !isCatalog) {
      setPreviewUrl(null)
      setPreviewError(null)
      return
    }

    let revoked: string | null = null
    let cancelled = false
    setPreviewLoading(true)
    setPreviewError(null)

    getCommercialBudgetPdfBlob(commercialPdfParamsFromModalInput(budget))
      .then((blob) => {
        if (cancelled) return
        const url = URL.createObjectURL(blob)
        revoked = url
        setPreviewUrl(url)
      })
      .catch(() => {
        if (!cancelled) setPreviewError("No se pudo generar la vista previa")
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false)
      })

    return () => {
      cancelled = true
      if (revoked) URL.revokeObjectURL(revoked)
    }
  }, [isOpen, budget, isCatalog])

  const handleDownloadPDF = async () => {
    if (!budget) return

    if (isCatalog) {
      setIsGeneratingPdf(true)
      try {
        await generateCommercialBudgetPdf(commercialPdfParamsFromModalInput(budget))
      } catch (error) {
        console.error("Error al generar PDF:", error)
        alert("No se pudo generar el PDF. Intenta nuevamente.")
      } finally {
        setIsGeneratingPdf(false)
      }
      return
    }

    setIsGeneratingPdf(true)
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 15
      let yPosition = margin

      doc.setFillColor(20, 184, 166)
      doc.rect(0, 0, pageWidth, 35, "F")
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(22)
      doc.setFont("helvetica", "bold")
      doc.text(process.env.NEXT_PUBLIC_APP_NAME?.trim() || 'Aurix Retail', margin, 15)
      doc.setFontSize(9)
      doc.setFont("helvetica", "normal")
      doc.text("Servicios y Reparaciones de Hardware", margin, 21)

      const boxX = pageWidth - margin - 50
      doc.setFillColor(240, 240, 240)
      doc.roundedRect(boxX, 8, 48, 22, 2, 2, "FD")
      doc.setTextColor(20, 184, 166)
      doc.setFontSize(14)
      doc.setFont("helvetica", "bold")
      doc.text("PRESUPUESTO", boxX + 24, 15, { align: "center" })
      doc.setFontSize(12)
      doc.text(`N° ${budget.numero}`, boxX + 24, 20, { align: "center" })

      yPosition = 45
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(12)
      doc.setFont("helvetica", "bold")
      doc.text("CLIENTE:", margin, yPosition)
      yPosition += 6
      doc.setFontSize(10)
      doc.setFont("helvetica", "normal")
      doc.text(`Nombre: ${budget.cliente}`, margin, yPosition)
      yPosition += 10

      const head = [["Cant.", "Servicio/Reparación", "Equipo", "IVA", "P.Unit.", "Subtotal"]]
      const tableData = budget.items.map((item) => [
        item.quantity.toString(),
        item.service,
        item.equipmentType ? item.equipmentType.replace("_", " ").toUpperCase() : "-",
        `${item.vat}%`,
        `$${item.unitPrice.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`,
        `$${item.subtotal.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`,
      ])

      autoTable(doc, {
        startY: yPosition,
        head,
        body: tableData,
        theme: "striped",
        headStyles: { fillColor: [20, 184, 166], textColor: [255, 255, 255], fontStyle: "bold" },
        styles: { fontSize: 9 },
        margin: { left: margin, right: margin },
      })

      const date = new Date().toISOString().split("T")[0]
      doc.save(`Presupuesto_${budget.numero}_${date}.pdf`)
    } catch (error) {
      console.error("Error al generar PDF:", error)
      alert("No se pudo generar el PDF. Intenta nuevamente.")
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  const handlePrint = () => {
    if (isCatalog && previewUrl) {
      const w = window.open(previewUrl, "_blank")
      w?.addEventListener("load", () => w?.print())
      return
    }
    if (!budget) return
    window.print()
  }

  const [handleOpenChange, confirmDialog] = useConfirmBeforeClose((open) => {
    if (!open) onClose()
  })

  if (!budget) return null

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-50 dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <span>Presupuesto {budget.numero}</span>
            </DialogTitle>
            <DialogDescription>
              {isCatalog
                ? "Vista previa idéntica al PDF que se descarga."
                : "Visualización y descarga del presupuesto"}
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={handleDownloadPDF}
              disabled={isGeneratingPdf}
              variant="default"
              className="flex-1 gap-2"
            >
              {isGeneratingPdf ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {isGeneratingPdf ? "Generando…" : "Descargar PDF"}
            </Button>
            <Button
              onClick={handlePrint}
              variant="outline"
              className="flex-1 gap-2"
              disabled={isCatalog && (previewLoading || !previewUrl)}
            >
              <Printer className="h-4 w-4" />
              Imprimir
            </Button>
          </div>

          <Separator />

          {isCatalog ? (
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-white min-h-[480px]">
              {previewLoading && (
                <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <p className="text-sm">Generando vista previa…</p>
                </div>
              )}
              {previewError && (
                <div className="p-8 text-center text-destructive text-sm">{previewError}</div>
              )}
              {!previewLoading && previewUrl && (
                <iframe
                  title={`Vista previa presupuesto ${budget.numero}`}
                  src={previewUrl}
                  className="w-full min-h-[70vh] border-0"
                />
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border text-sm text-muted-foreground">
              Vista previa HTML solo disponible para presupuestos de reparación. Usá Descargar PDF.
            </div>
          )}
        </DialogContent>
      </Dialog>
      {confirmDialog}
    </>
  )
}
