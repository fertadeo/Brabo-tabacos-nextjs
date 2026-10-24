"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PenLine, Plus } from "lucide-react"
import { IvaRateSelect } from "@/components/iva-rate-select"
import { DEFAULT_SALE_IVA_RATE, type SaleIvaRate } from "@/lib/sale-iva"

const FORMAT_NUM = { maximumFractionDigits: 0, minimumFractionDigits: 0 } as const

function formatUnitPrice(n: number): string {
  return n.toLocaleString("es-AR", FORMAT_NUM)
}

function parseUnitPriceInput(value: string): number {
  const digits = value.replace(/\D/g, "")
  return digits === "" ? 0 : Math.max(0, parseInt(digits, 10))
}

export interface PosManualItemCardProps {
  onAdd: (payload: { description: string; quantity: number; unit_price: number; iva_rate: SaleIvaRate }) => void
  disabled?: boolean
  addLabel?: string
  inputIdPrefix?: string
  /** Factura C: solo permite ítems exentos (0%). */
  lockIvaToZero?: boolean
}

export function PosManualItemCard({
  onAdd,
  disabled,
  addLabel = "Agregar al carrito",
  inputIdPrefix = "pos-manual",
  lockIvaToZero = false,
}: PosManualItemCardProps) {
  const [description, setDescription] = useState("")
  const [quantity, setQuantity] = useState("1")
  const [unitPrice, setUnitPrice] = useState(0)
  const [ivaRate, setIvaRate] = useState<SaleIvaRate>(lockIvaToZero ? 0 : DEFAULT_SALE_IVA_RATE)
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    if (lockIvaToZero) setIvaRate(0)
  }, [lockIvaToZero])

  function handleAdd() {
    const desc = description.trim()
    if (!desc) {
      setLocalError("Escribí la descripción del ítem")
      return
    }
    const q = parseInt(quantity, 10)
    if (!Number.isFinite(q) || q < 1) {
      setLocalError("La cantidad debe ser al menos 1")
      return
    }
    if (unitPrice < 0) {
      setLocalError("El precio no puede ser negativo")
      return
    }
    setLocalError(null)
    onAdd({
      description: desc,
      quantity: q,
      unit_price: unitPrice,
      iva_rate: lockIvaToZero ? 0 : ivaRate,
    })
    setDescription("")
    setQuantity("1")
    setUnitPrice(0)
    setIvaRate(lockIvaToZero ? 0 : DEFAULT_SALE_IVA_RATE)
  }

  return (
    <Card className="border-dashed border-primary/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <PenLine className="h-4 w-4" />
          Ítem manual
        </CardTitle>
        <p className="text-xs text-muted-foreground font-normal">
          Servicio o producto puntual que no está en el catálogo. No se crea en Productos.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor={`${inputIdPrefix}-desc`}>Descripción</Label>
          <Input
            id={`${inputIdPrefix}-desc`}
            placeholder="Ej: Instalación de software, cable HDMI..."
            value={description}
            onChange={(e) => {
              setDescription(e.target.value)
              setLocalError(null)
            }}
            disabled={disabled}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label htmlFor={`${inputIdPrefix}-qty`}>Cantidad</Label>
            <Input
              id={`${inputIdPrefix}-qty`}
              type="number"
              min={1}
              step={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${inputIdPrefix}-price`}>Precio unitario</Label>
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground">$</span>
              <Input
                id={`${inputIdPrefix}-price`}
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={unitPrice === 0 ? "" : formatUnitPrice(Math.round(unitPrice))}
                onChange={(e) => setUnitPrice(parseUnitPriceInput(e.target.value))}
                disabled={disabled}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${inputIdPrefix}-iva`}>IVA</Label>
            <IvaRateSelect
              id={`${inputIdPrefix}-iva`}
              value={lockIvaToZero ? 0 : ivaRate}
              onChange={setIvaRate}
              disabled={disabled || lockIvaToZero}
            />
          </div>
        </div>
        {localError && <p className="text-xs text-red-600 dark:text-red-400">{localError}</p>}
        <Button type="button" variant="secondary" className="w-full" onClick={handleAdd} disabled={disabled}>
          <Plus className="h-4 w-4 mr-1" />
          {addLabel}
        </Button>
      </CardContent>
    </Card>
  )
}
