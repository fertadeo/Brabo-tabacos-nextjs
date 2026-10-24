"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useConfirmBeforeClose } from "@/lib/use-confirm-before-close"
import { Button } from "@/components/ui/button"
import { getRepairOrderAcceptanceDocument } from "@/lib/api"
import { documentClientePdfFromSnapshot } from "@/lib/document-cliente-pdf"
import { RepairOrderEquipmentReadOnly } from "@/components/repair-order-equipment-fields"
import { FileText, Loader2 } from "lucide-react"

interface RepairOrderAcceptanceDocumentModalProps {
  orderId: number | string
  isOpen: boolean
  onClose: () => void
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—"
  try {
    return new Date(dateStr).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  } catch {
    return dateStr
  }
}

function formatMoney(value: string | number) {
  const n = typeof value === "string" ? parseFloat(value) : value
  if (Number.isNaN(n)) return "—"
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n)
}

export function RepairOrderAcceptanceDocumentModal({
  orderId,
  isOpen,
  onClose,
}: RepairOrderAcceptanceDocumentModalProps) {
  const [doc, setDoc] = useState<Awaited<ReturnType<typeof getRepairOrderAcceptanceDocument>>["data"] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !orderId) return
    setLoading(true)
    setError(null)
    getRepairOrderAcceptanceDocument(orderId)
      .then((res) => setDoc(res.data ?? null))
      .catch((e) => setError(e instanceof Error ? e.message : "Error al cargar documento"))
      .finally(() => setLoading(false))
  }, [isOpen, orderId])

  const handlePrint = () => {
    window.print()
  }

  const handleClose = () => onClose()

  const [handleOpenChange, confirmDialog] = useConfirmBeforeClose((open) => {
    if (!open) handleClose()
  })

  return (
    <>
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto print:max-w-none print:block">
        <DialogHeader className="print:hidden">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documento de aceptación
          </DialogTitle>
        </DialogHeader>
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}
        {error && <p className="text-destructive">{error}</p>}
        {!loading && doc && (
          <div className="space-y-4 print:block" id="acceptance-document">
            <div className="border rounded-lg p-6 space-y-4 bg-background">
              <h2 className="text-lg font-semibold">Orden de reparación {doc.repair_number}</h2>
              <div className="rounded-lg border bg-muted/20 p-4 space-y-1 text-sm">
                <p className="font-semibold">{doc.client_name}</p>
                {(() => {
                  const fields = documentClientePdfFromSnapshot(doc)
                  return (
                    <>
                      {fields.clientCode ? <p className="text-muted-foreground">Código: {fields.clientCode}</p> : null}
                      {fields.clientCuit ? <p className="text-muted-foreground">CUIT/CUIL: {fields.clientCuit}</p> : null}
                      {fields.clientPhone ? <p className="text-muted-foreground">Tel: {fields.clientPhone}</p> : null}
                      {fields.clientEmail ? <p className="text-muted-foreground">{fields.clientEmail}</p> : null}
                      {fields.clientAddressLines?.map((line) => (
                        <p key={line} className="text-muted-foreground">{line}</p>
                      ))}
                    </>
                  )
                })()}
              </div>
              <div>
                <p className="font-semibold mb-1">Equipo</p>
                <RepairOrderEquipmentReadOnly equipmentDescription={doc.equipment_description} />
              </div>
              {doc.customer_declared_fault?.trim() && (
                <p>
                  <strong>Falla declarada por el cliente:</strong> {doc.customer_declared_fault}
                </p>
              )}
              {doc.work_description && (
                <p><strong>Trabajo a realizar:</strong> {doc.work_description}</p>
              )}
              <p><strong>Fecha de recepción:</strong> {formatDate(doc.reception_date)}</p>
              {doc.delivery_date_estimated && (
                <p><strong>Fecha estimada de entrega:</strong> {formatDate(doc.delivery_date_estimated)}</p>
              )}
              <p><strong>Monto a pagar:</strong> {formatMoney(doc.total_amount)}</p>
              {doc.days_to_claim != null && doc.disclaimer_text && (
                <p className="text-sm text-muted-foreground mt-4 border-t pt-4">
                  {doc.disclaimer_text}
                </p>
              )}
              {doc.days_to_claim != null && !doc.disclaimer_text && (
                <p className="text-sm text-muted-foreground mt-4 border-t pt-4">
                  Pasados los {doc.days_to_claim} días de finalizado el trabajo, si el cliente no pasa a retirar el equipo reparado no tiene derecho a reclamo.
                </p>
              )}
              {doc.items && doc.items.length > 0 && (
                <div className="mt-4">
                  <strong>Materiales:</strong>
                  <ul className="list-disc pl-6 mt-1">
                    {doc.items.map((item, i) => (
                      <li key={i}>
                        {item.product_name} x {item.quantity} — {formatMoney(item.unit_price)} = {formatMoney(item.total_price)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="flex gap-2 print:hidden">
              <Button onClick={handlePrint}>Imprimir</Button>
              <Button variant="outline" onClick={handleClose}>Cerrar</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
    {confirmDialog}
    </>
  )
}
