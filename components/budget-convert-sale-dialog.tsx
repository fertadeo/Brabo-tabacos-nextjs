"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  postCommercialBudgetConvertToSale,
  getClienteById,
  type CommercialBudgetDetail,
  type Cliente,
  type SalePaymentMethod,
  type ApiBudgetError,
} from "@/lib/api"
import { SaleClienteSection } from "@/components/sale-cliente-section"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

const PAYMENT_LABELS: Record<SalePaymentMethod, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
  mixto: "Mixto",
}

import {
  budgetTotalsByCurrency,
  formatBudgetMoney,
  resolveBudgetLineCurrency,
} from "@/lib/budget-currency"

interface BudgetConvertSaleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  budget: CommercialBudgetDetail | null
  onSuccess: (payload: { saleId: number; saleNumber: string }) => void
}

export function BudgetConvertSaleDialog({
  open,
  onOpenChange,
  budget,
  onSuccess,
}: BudgetConvertSaleDialogProps) {
  const total = budget?.total_amount ?? 0
  const saleCurrency = useMemo(() => {
    const items = budget?.items ?? []
    if (!items.length) return "ARS" as const
    const currencies = new Set(items.map((item) => resolveBudgetLineCurrency(item.currency)))
    return currencies.size === 1 && currencies.has("USD") ? ("USD" as const) : ("ARS" as const)
  }, [budget?.items])
  const saleTotal = useMemo(() => {
    if (!budget?.items?.length) return total
    if (saleCurrency === "USD") {
      return budgetTotalsByCurrency(budget.items).usd
    }
    return total
  }, [budget?.items, saleCurrency, total])
  const formatMoney = (n: number) => formatBudgetMoney(n, saleCurrency)
  const [paymentMethod, setPaymentMethod] = useState<SalePaymentMethod>("efectivo")
  const [efectivo, setEfectivo] = useState(0)
  const [tarjeta, setTarjeta] = useState(0)
  const [transferencia, setTransferencia] = useState(0)
  const [notes, setNotes] = useState("")
  const [syncWoo, setSyncWoo] = useState(true)
  const [allowInactive, setAllowInactive] = useState(false)
  const [overrideClientId, setOverrideClientId] = useState("")
  const [overrideCliente, setOverrideCliente] = useState<Cliente | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open || !budget) return
    setPaymentMethod("efectivo")
    setEfectivo(Math.round(saleTotal))
    setTarjeta(0)
    setTransferencia(0)
    setNotes("")
    setSyncWoo(true)
    setAllowInactive(false)
    setOverrideClientId("")
    setOverrideCliente(null)
    if (budget.client_id) {
      void getClienteById(budget.client_id)
        .then(setOverrideCliente)
        .catch(() => setOverrideCliente(null))
    }
  }, [open, budget, saleTotal])

  const mixtoSum = useMemo(() => efectivo + tarjeta + transferencia, [efectivo, tarjeta, transferencia])

  async function submit() {
    if (!budget) return
    if (paymentMethod === "mixto") {
      const diff = Math.abs(mixtoSum - saleTotal)
      if (diff > 0.01) {
        toast.error("En pago mixto, la suma debe coincidir con el total del presupuesto", {
          description: `${formatMoney(mixtoSum)} ≠ ${formatMoney(saleTotal)}`,
        })
        return
      }
    }
    setSubmitting(true)
    try {
      const cid = overrideClientId.trim() ? parseInt(overrideClientId, 10) : undefined
      const res = await postCommercialBudgetConvertToSale(budget.id, {
        payment_method: paymentMethod,
        payment_details:
          paymentMethod === "mixto"
            ? { efectivo, tarjeta, transferencia }
            : undefined,
        notes: notes.trim() || undefined,
        sync_to_woocommerce: syncWoo,
        allow_inactive: allowInactive,
        client_id: cid != null && !Number.isNaN(cid) && cid > 0 ? cid : undefined,
      })
      toast.success("Venta registrada", { description: res.sale?.sale_number || `ID ${res.sale?.id}` })
      onSuccess({ saleId: res.sale.id, saleNumber: res.sale.sale_number })
      onOpenChange(false)
    } catch (e: unknown) {
      const err = e as ApiBudgetError
      toast.error(err?.message || "No se pudo convertir a venta")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Convertir a venta</DialogTitle>
          <DialogDescription>
            Se aplican las mismas reglas que en el POS: validación de stock, caja y cobro. Total:{" "}
            <strong className="text-foreground">{formatMoney(saleTotal)}</strong>
            {saleCurrency === "USD" && budget?.exchange_rate ? (
              <span className="block text-xs mt-1">
                Moneda USD · cotización {Number(budget.exchange_rate).toLocaleString("es-AR")}
              </span>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        {budget && (
          <div className="space-y-4 py-2">
            <SaleClienteSection
              clientId={budget.client_id}
              cliente={overrideCliente}
              saleSnapshot={budget}
              fallbackName={budget.client_name}
              compact
            />

            <div className="space-y-2">
              <Label>Medio de pago</Label>
              <Select
                value={paymentMethod}
                onValueChange={(v) => setPaymentMethod(v as SalePaymentMethod)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PAYMENT_LABELS) as SalePaymentMethod[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {PAYMENT_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {paymentMethod === "mixto" && (
              <div className="grid grid-cols-1 gap-3 rounded-lg border p-3 bg-muted/30">
                <div className="space-y-1">
                  <Label className="text-xs">Efectivo</Label>
                  <Input
                    type="number"
                    min={0}
                    value={efectivo}
                    onChange={(e) => setEfectivo(Math.max(0, parseFloat(e.target.value) || 0))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tarjeta</Label>
                  <Input
                    type="number"
                    min={0}
                    value={tarjeta}
                    onChange={(e) => setTarjeta(Math.max(0, parseFloat(e.target.value) || 0))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Transferencia</Label>
                  <Input
                    type="number"
                    min={0}
                    value={transferencia}
                    onChange={(e) => setTransferencia(Math.max(0, parseFloat(e.target.value) || 0))}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Suma: {formatMoney(mixtoSum)} — debe ser {formatMoney(saleTotal)}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="conv-notes">Notas de la venta (opcional)</Label>
              <Textarea
                id="conv-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="No reemplazan las notas del presupuesto"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="conv-client">Cliente en la venta (opcional)</Label>
              <Input
                id="conv-client"
                inputMode="numeric"
                placeholder={`Por defecto: ${budget.client_id} (${budget.client_name || "—"})`}
                value={overrideClientId}
                onChange={(e) => setOverrideClientId(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                Si completás un ID distinto, la venta quedará a nombre de ese cliente.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="woo" checked={syncWoo} onCheckedChange={(c) => setSyncWoo(c === true)} />
              <Label htmlFor="woo" className="text-sm font-normal cursor-pointer">
                Sincronizar con WooCommerce
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="ina" checked={allowInactive} onCheckedChange={(c) => setAllowInactive(c === true)} />
              <Label htmlFor="ina" className="text-sm font-normal cursor-pointer">
                Permitir productos inactivos
              </Label>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={submitting || !budget} className="gap-2">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Confirmar venta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
