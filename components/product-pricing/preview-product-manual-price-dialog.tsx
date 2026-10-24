"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, Loader2 } from "lucide-react"
import { useToast } from "@/contexts/ToastContext"
import { updateProduct } from "@/lib/api"
import { formatArs, roundPrice, type PriceSampleRow } from "@/lib/product-pricing"

function parsePriceInput(raw: string): number | null {
  const normalized = raw.trim().replace(/\s/g, "").replace(",", ".")
  if (!normalized) return null
  const n = Number(normalized)
  if (Number.isNaN(n) || n < 0) return null
  return roundPrice(n)
}

interface PreviewProductManualPriceDialogProps {
  product: PriceSampleRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
  syncToWooCommerce?: boolean
  previewMultiplier?: number
  onSaved: (productId: number, newPrice: number) => void
}

export function PreviewProductManualPriceDialog({
  product,
  open,
  onOpenChange,
  syncToWooCommerce = false,
  previewMultiplier = 1,
  onSaved,
}: PreviewProductManualPriceDialogProps) {
  const { showToast } = useToast()
  const [priceInput, setPriceInput] = useState("")
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open && product) {
      setPriceInput(String(product.current_price))
      setConfirmOpen(false)
    }
  }, [open, product])

  const parsedNewPrice = useMemo(() => parsePriceInput(priceInput), [priceInput])

  const priceChanged =
    product != null &&
    parsedNewPrice != null &&
    parsedNewPrice !== roundPrice(product.current_price)

  const batchPreviewAfterSave =
    parsedNewPrice != null ? roundPrice(parsedNewPrice * previewMultiplier) : null

  const handleRequestSave = () => {
    if (parsedNewPrice == null) {
      showToast({ message: "Ingresá un precio válido (≥ 0)", type: "error" })
      return
    }
    if (!priceChanged) {
      showToast({ message: "El precio es igual al actual", type: "info" })
      return
    }
    setConfirmOpen(true)
  }

  const handleConfirmSave = async () => {
    if (!product || parsedNewPrice == null) return
    setSaving(true)
    try {
      await updateProduct(product.id, {
        price: parsedNewPrice,
        ...(syncToWooCommerce ? { sync_to_woocommerce: true } : {}),
      })
      showToast({
        message: `Precio actualizado: ${product.name}`,
        type: "success",
      })
      onSaved(product.id, parsedNewPrice)
      setConfirmOpen(false)
      onOpenChange(false)
    } catch (e) {
      showToast({
        message: e instanceof Error ? e.message : "Error al guardar el precio",
        type: "error",
      })
    } finally {
      setSaving(false)
    }
  }

  if (!product) return null

  return (
    <>
      <Dialog open={open && !confirmOpen} onOpenChange={onOpenChange}>
        <DialogContent className="w-[calc(100%-1.5rem)] max-w-md max-h-[90dvh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="text-left">
            <DialogTitle className="text-lg">Editar precio</DialogTitle>
            <DialogDescription className="font-mono text-xs break-all">{product.code}</DialogDescription>
          </DialogHeader>

          <p className="text-sm font-medium line-clamp-3">{product.name}</p>

          <div className="grid gap-3 sm:gap-4 rounded-lg border bg-muted/40 p-3 sm:p-4 grid-cols-1 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">Precio actual</Label>
              <p className="text-lg font-semibold tabular-nums">{formatArs(product.current_price)}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">Nuevo precio (al guardar)</Label>
              <p className="text-lg font-semibold tabular-nums text-turquoise-600 dark:text-turquoise-400">
                {parsedNewPrice != null ? formatArs(parsedNewPrice) : "—"}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="manual-price-input">Precio que estás escribiendo</Label>
            <Input
              id="manual-price-input"
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              className="h-11 text-base sm:text-sm"
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              autoFocus
            />
            {previewMultiplier !== 1 && parsedNewPrice != null && (
              <p className="text-xs text-muted-foreground">
                En el ajuste por lote quedaría{" "}
                <span className="font-medium tabular-nums">
                  {formatArs(batchPreviewAfterSave ?? 0)}
                </span>{" "}
                ({previewMultiplier > 1 ? "+" : ""}
                {((previewMultiplier - 1) * 100).toFixed(2)}% sobre el precio guardado)
              </p>
            )}
          </div>

          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:gap-0">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="w-full sm:w-auto"
              onClick={handleRequestSave}
              disabled={parsedNewPrice == null || !priceChanged}
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmOpen} onOpenChange={(isOpen) => !isOpen && !saving && setConfirmOpen(false)}>
        <DialogContent
          className="w-[calc(100%-1.5rem)] max-w-sm sm:max-w-md z-[100] p-4 sm:p-6"
          showCloseButton={false}
        >
          <DialogHeader className="text-left">
            <div className="flex flex-col sm:flex-row items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div className="space-y-2">
                <DialogTitle className="text-lg">¿Confirmar nuevo precio?</DialogTitle>
                <DialogDescription asChild>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground truncate">{product.name}</p>
                    <p>
                      <span className="text-muted-foreground">Actual: </span>
                      <span className="font-semibold tabular-nums">{formatArs(product.current_price)}</span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">Nuevo: </span>
                      <span className="font-semibold tabular-nums text-turquoise-600 dark:text-turquoise-400">
                        {parsedNewPrice != null ? formatArs(parsedNewPrice) : "—"}
                      </span>
                    </p>
                    {syncToWooCommerce && (
                      <p className="text-xs">También se sincronizará con WooCommerce.</p>
                    )}
                  </div>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:gap-0">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setConfirmOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="w-full sm:w-auto"
              onClick={() => void handleConfirmSave()}
              disabled={saving}
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Sí, guardar precio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
