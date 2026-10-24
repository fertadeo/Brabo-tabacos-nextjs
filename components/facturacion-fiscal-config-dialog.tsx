"use client"

import { useEffect, useRef, useState } from "react"
import { RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Cliente, FacturarSaleRequest, FacturarSugerenciaData } from "@/lib/api"
import { buildFacturarFormForSale } from "@/lib/facturacion-form-from-cliente"
import { FacturacionFiscalConfigPanel } from "@/components/facturacion-fiscal-config-panel"

export interface FacturacionFiscalConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  form: FacturarSaleRequest
  cliente: Cliente | null
  sugerencia?: FacturarSugerenciaData | null
  onApply: (form: FacturarSaleRequest, options: { saveAsDefault: boolean }) => void
}

export function FacturacionFiscalConfigDialog({
  open,
  onOpenChange,
  form,
  cliente,
  sugerencia,
  onApply,
}: FacturacionFiscalConfigDialogProps) {
  const [draft, setDraft] = useState<FacturarSaleRequest>(form)
  const [saveAsDefault, setSaveAsDefault] = useState(false)
  const wasOpenRef = useRef(false)

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setDraft({ ...form })
      setSaveAsDefault(false)
    }
    wasOpenRef.current = open
  }, [open, form])

  const restoreSuggestion = () => {
    const suggested = buildFacturarFormForSale(cliente, sugerencia)
    setDraft({ ...suggested, fiscalManualConfig: false })
  }

  const handleApply = () => {
    if ((draft.concepto === 2 || draft.concepto === 3) && (!draft.fechaServicioDesde || !draft.fechaServicioHasta)) {
      return
    }
    onApply(
      {
        ...draft,
        fiscalManualConfig: true,
        skipPadronCondicionCheck: true,
      },
      { saveAsDefault }
    )
    onOpenChange(false)
  }

  const fechasServicioInvalidas =
    (draft.concepto === 2 || draft.concepto === 3) &&
    (!draft.fechaServicioDesde || !draft.fechaServicioHasta)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configuración fiscal del comprobante</DialogTitle>
          <DialogDescription>
            Elegí el tipo de factura y la condición IVA del receptor. Al guardar, estos valores quedan aplicados a esta
            emisión y verás el resumen actualizado en la confirmación.
          </DialogDescription>
        </DialogHeader>

        <FacturacionFiscalConfigPanel
          value={draft}
          onChange={setDraft}
          cliente={cliente}
          sugerencia={sugerencia}
          showSaveAsDefault
          saveAsDefault={saveAsDefault}
          onSaveAsDefaultChange={setSaveAsDefault}
        />

        {fechasServicioInvalidas ? (
          <p className="text-destructive text-sm">
            Para concepto servicios o mixto, completá fecha de servicio desde y hasta.
          </p>
        ) : null}

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <Button type="button" variant="ghost" size="sm" onClick={restoreSuggestion}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Restaurar sugerencia del cliente
          </Button>
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleApply} disabled={fechasServicioInvalidas}>
              Guardar y volver
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
