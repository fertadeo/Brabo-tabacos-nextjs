"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Cliente, SaleCurrency, SalePaymentMethod } from "@/lib/api"
import { ClienteInfoCard } from "@/components/cliente-picker"
import { SaleCurrencyNotice } from "@/components/sale-currency-notice"
import { getPosCartLineKey, getPosCartLineLabel, type PosCartLine } from "@/lib/pos-cart"
import { formatSaleIvaRateLabel } from "@/lib/sale-iva"
import {
  cartLineArsReference,
  formatExchangeRate,
  formatSaleMoney,
  isUsdSale,
  usdToArs,
} from "@/lib/pos-usd"
import { Loader2 } from "lucide-react"

const FORMAT_NUM = { maximumFractionDigits: 2, minimumFractionDigits: 2 } as const

function formatMoney(value: number, currency: SaleCurrency = "ARS"): string {
  return formatSaleMoney(value, currency, FORMAT_NUM)
}

export interface SaleConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cart: PosCartLine[]
  total: number
  currency?: SaleCurrency
  exchangeRate?: number | null
  paymentMethod: SalePaymentMethod
  paymentLabel: string
  selectedCliente: Cliente | null
  submitting?: boolean
  onConfirm: () => void
}

export function SaleConfirmDialog({
  open,
  onOpenChange,
  cart,
  total,
  currency = "ARS",
  exchangeRate,
  paymentMethod,
  paymentLabel,
  selectedCliente,
  submitting,
  onConfirm,
}: SaleConfirmDialogProps) {
  const usd = isUsdSale(currency)
  const rate = exchangeRate != null && exchangeRate > 0 ? Number(exchangeRate) : null
  const totalArsRef = usd && rate != null ? usdToArs(total, rate) : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{usd ? "Confirmar venta en dólares" : "Confirmar venta"}</DialogTitle>
          <DialogDescription>
            {usd
              ? "Revisá cotización, ítems y total en USD. La venta quedará lista para facturar en moneda DOL."
              : "Revisá el cliente, los ítems y el total antes de registrar la venta en el sistema."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {usd ? (
            <SaleCurrencyNotice
              variant="banner"
              currency={currency}
              exchangeRate={rate}
              totalAmount={total}
            />
          ) : null}

          {selectedCliente ? (
            <ClienteInfoCard cliente={selectedCliente} />
          ) : (
            <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-5 text-center">
              <p className="text-sm font-medium">Consumidor final</p>
              <p className="text-xs text-muted-foreground mt-1">La venta se registrará sin cliente asociado.</p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Moneda de cobro:</span>
            <Badge variant={usd ? "default" : "outline"} className={usd ? "bg-amber-600 hover:bg-amber-600" : ""}>
              {usd ? "Dólares (USD)" : "Pesos (ARS)"}
            </Badge>
            {usd && rate != null ? (
              <span className="text-xs text-muted-foreground">
                Cotización fijada: {formatExchangeRate(rate)} ARS/USD
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Método de pago:</span>
            <Badge variant="outline">{paymentLabel}</Badge>
            {paymentMethod === "mixto" ? (
              <span className="text-xs text-muted-foreground">(desglose en pantalla anterior)</span>
            ) : null}
          </div>

          <section className="space-y-2">
            <h4 className="text-sm font-semibold">Ítems ({cart.length})</h4>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-right w-16">Cant.</TableHead>
                    <TableHead className="text-right w-24">P. unit.</TableHead>
                    {usd ? <TableHead className="text-right w-24">Ref. ARS</TableHead> : null}
                    <TableHead className="text-right w-16">IVA</TableHead>
                    <TableHead className="text-right w-28">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cart.map((line) => {
                    const subtotal = line.quantity * line.unit_price
                    const arsUnit = usd ? cartLineArsReference(line) : null
                    return (
                      <TableRow key={getPosCartLineKey(line)}>
                        <TableCell className="font-medium text-sm">{getPosCartLineLabel(line)}</TableCell>
                        <TableCell className="text-right tabular-nums">{line.quantity}</TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {formatMoney(line.unit_price, currency)}
                        </TableCell>
                        {usd ? (
                          <TableCell className="text-right tabular-nums text-xs text-muted-foreground">
                            {arsUnit != null ? formatMoney(arsUnit, "ARS") : "—"}
                          </TableCell>
                        ) : null}
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {formatSaleIvaRateLabel(line.iva_rate)}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatMoney(subtotal, currency)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </section>

          <div
            className={`flex flex-col gap-1 rounded-lg border px-4 py-3 ${
              usd ? "border-amber-400/50 bg-amber-50/50 dark:bg-amber-950/20" : "bg-muted/20"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                {usd ? "Total a cobrar (USD)" : "Total a cobrar"}
              </span>
              <span className="text-2xl font-bold tabular-nums">{formatMoney(total, currency)}</span>
            </div>
            {usd && totalArsRef != null ? (
              <p className="text-xs text-muted-foreground text-right">
                Equivalente aproximado en pesos: {formatMoney(totalArsRef, "ARS")}
              </p>
            ) : null}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Volver
          </Button>
          <Button onClick={onConfirm} disabled={submitting} className="gap-2">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {usd ? "Confirmar cobro en USD" : "Confirmar y cobrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
