"use client"

import { ArrowRight, DollarSign, Receipt } from "lucide-react"
import { SaleCurrencyBadge } from "@/components/sale-currency-badge"
import {
  formatExchangeRate,
  formatSaleMoney,
  isUsdSale,
  usdToArs,
  type SaleCurrency,
} from "@/lib/pos-usd"
import { cn } from "@/lib/utils"

export type SaleCurrencyNoticeVariant = "banner" | "panel" | "facturacion"

export interface SaleCurrencyNoticeProps {
  currency: SaleCurrency | string | null | undefined
  exchangeRate?: number | null
  totalAmount?: number | null
  variant?: SaleCurrencyNoticeVariant
  className?: string
}

export function SaleCurrencyNotice({
  currency,
  exchangeRate,
  totalAmount,
  variant = "panel",
  className,
}: SaleCurrencyNoticeProps) {
  if (!isUsdSale(currency)) return null

  const rate = exchangeRate != null && exchangeRate > 0 ? Number(exchangeRate) : null
  const totalUsd = totalAmount != null && totalAmount > 0 ? Number(totalAmount) : null
  const totalArsRef = totalUsd != null && rate != null ? usdToArs(totalUsd, rate) : null

  if (variant === "banner") {
    return (
      <div
        className={cn(
          "flex flex-col gap-2 rounded-lg border border-amber-400/60 bg-amber-50 px-4 py-3 text-sm",
          "dark:border-amber-600/50 dark:bg-amber-950/30",
          className
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <DollarSign className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
          <span className="font-semibold text-amber-950 dark:text-amber-100">Venta en dólares (USD)</span>
          <SaleCurrencyBadge currency="USD" exchangeRate={rate} showRate />
        </div>
        <p className="text-xs text-amber-900/90 dark:text-amber-200/90 leading-relaxed">
          Los importes del carrito y el cobro están en <strong>USD</strong>.
          {rate != null ? (
            <>
              {" "}
              Cotización aplicada: <strong>{formatExchangeRate(rate)} ARS por USD</strong>.
            </>
          ) : (
            " Indicá la cotización USD/ARS antes de cobrar."
          )}
        </p>
        {totalUsd != null && rate != null ? (
          <p className="text-xs text-muted-foreground">
            Total a cobrar: <strong>{formatSaleMoney(totalUsd, "USD")}</strong>
            <span className="mx-1">·</span>
            Referencia en pesos: {formatSaleMoney(totalArsRef ?? 0, "ARS")}
          </p>
        ) : null}
      </div>
    )
  }

  if (variant === "facturacion") {
    return (
      <div
        className={cn(
          "rounded-lg border border-amber-400/60 bg-amber-50/90 p-4 text-sm space-y-3",
          "dark:border-amber-600/50 dark:bg-amber-950/25",
          className
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Receipt className="h-4 w-4 text-amber-700 dark:text-amber-300" />
          <span className="font-semibold">Facturación en moneda dólar (DOL)</span>
          <SaleCurrencyBadge currency="USD" exchangeRate={rate} showRate />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1">
            Venta POS <ArrowRight className="h-3 w-3" /> Comprobante ARCA
          </span>
          <span>Importes en USD · moneda WSFE <strong>DOL</strong></span>
        </div>
        <ul className="text-xs space-y-1 text-amber-950/90 dark:text-amber-100/90 list-disc pl-4">
          <li>
            El total del comprobante será{" "}
            {totalUsd != null ? (
              <strong>{formatSaleMoney(totalUsd, "USD")}</strong>
            ) : (
              "el de la venta en USD"
            )}
            , no en pesos.
          </li>
          {rate != null ? (
            <li>
              Tipo de cambio fijado al cobrar: <strong>{formatExchangeRate(rate)} ARS/USD</strong> (no se recalcula al
              facturar).
            </li>
          ) : (
            <li>La venta no tiene cotización guardada; revisá los datos antes de emitir.</li>
          )}
          {totalArsRef != null ? (
            <li>Referencia equivalente en pesos: {formatSaleMoney(totalArsRef, "ARS")}.</li>
          ) : null}
        </ul>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "rounded-md border border-amber-300/70 bg-amber-50/80 px-3 py-2 text-xs space-y-1",
        "dark:border-amber-700/50 dark:bg-amber-950/20",
        className
      )}
    >
      <div className="flex items-center gap-2 font-medium text-amber-950 dark:text-amber-100">
        <DollarSign className="h-3.5 w-3.5" />
        Cobro en dólares
        {rate != null ? <span className="font-normal text-muted-foreground">· TC {formatExchangeRate(rate)}</span> : null}
      </div>
      <p className="text-muted-foreground leading-snug">
        Al confirmar, la venta quedará registrada en USD para facturar en DOL.
      </p>
    </div>
  )
}
