"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Minus, Plus, Trash2 } from "lucide-react"
import Image from "next/image"
import { getProductImageUrl } from "@/lib/product-image-utils"
import { IvaRateSelect } from "@/components/iva-rate-select"
import { getPosCartLineKey, getPosCartLineLabel, isPosCustomLine, type PosCartLine } from "@/lib/pos-cart"
import { posCatalogMaxQuantity } from "@/lib/pos-products"
import type { SaleIvaRate } from "@/lib/sale-iva"
import {
  cartLineArsReference,
  currencyPricePrefix,
  formatArsPriceInput,
  formatSaleMoney,
  formatUsdPriceInput,
  parseArsPriceInput,
  parseUsdPriceInput,
  resolveSaleCurrency,
  type SaleCurrency,
} from "@/lib/pos-usd"

const FORMAT_NUM = { maximumFractionDigits: 0, minimumFractionDigits: 0 } as const

function formatLineTotal(value: number, currency: SaleCurrency): string {
  if (currency === "USD") {
    return formatSaleMoney(value, "USD", { maximumFractionDigits: 2, minimumFractionDigits: 2 })
  }
  return `$ ${value.toLocaleString("es-AR", FORMAT_NUM)}`
}

export interface PosCartItemRowProps {
  line: PosCartLine
  view: "list" | "grid" | "table"
  onUpdateQuantity: (lineKey: string, delta: number) => void
  onSetUnitPrice: (lineKey: string, unit_price: number) => void
  onSetIvaRate: (lineKey: string, iva_rate: SaleIvaRate) => void
  onRemove: (lineKey: string) => void
  /** Factura C: alícuota fija en 0% (exento). */
  ivaRateDisabled?: boolean
  currency?: SaleCurrency
  exchangeRate?: number | null
}

export function PosCartItemRow({
  line,
  view,
  onUpdateQuantity,
  onSetUnitPrice,
  onSetIvaRate,
  onRemove,
  ivaRateDisabled = false,
  currency = "ARS",
  exchangeRate,
}: PosCartItemRowProps) {
  const lineKey = getPosCartLineKey(line)
  const label = getPosCartLineLabel(line)
  const custom = isPosCustomLine(line)
  const maxQty = custom ? undefined : posCatalogMaxQuantity(line.product)
  const lineTotal = line.quantity * line.unit_price
  const resolvedCurrency = resolveSaleCurrency(currency)
  const arsRef = resolvedCurrency === "USD" ? cartLineArsReference(line) : null
  const pricePrefix = currencyPricePrefix(resolvedCurrency)

  const formatUnitPriceDisplay = (n: number) =>
    resolvedCurrency === "USD" ? formatUsdPriceInput(n) : formatArsPriceInput(n)

  const parseUnitPriceInput = (value: string) =>
    resolvedCurrency === "USD" ? parseUsdPriceInput(value) : parseArsPriceInput(value)

  const qtyControls = (
    <>
      <Button variant="outline" size="icon" className={view === "grid" ? "h-6 w-6" : "h-7 w-7"} onClick={() => onUpdateQuantity(lineKey, -1)}>
        <Minus className={view === "grid" ? "h-2.5 w-2.5" : "h-3 w-3"} />
      </Button>
      <span className={`text-center tabular-nums ${view === "grid" ? "text-xs font-medium w-6" : "text-sm w-8"}`}>{line.quantity}</span>
      <Button
        variant="outline"
        size="icon"
        className={view === "grid" ? "h-6 w-6" : "h-7 w-7"}
        onClick={() => onUpdateQuantity(lineKey, 1)}
        disabled={!custom && maxQty != null && line.quantity >= maxQty}
      >
        <Plus className={view === "grid" ? "h-2.5 w-2.5" : "h-3 w-3"} />
      </Button>
    </>
  )

  const priceInput = (
    <div className="flex flex-col gap-0.5 shrink-0">
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground whitespace-nowrap">{pricePrefix}</span>
        <Input
          type="text"
          inputMode={resolvedCurrency === "USD" ? "decimal" : "numeric"}
          className={view === "grid" ? "h-6 text-xs w-20" : view === "table" ? "w-24 h-8 text-xs inline-block" : "w-24 h-7 text-xs"}
          placeholder="0"
          value={line.unit_price === 0 ? "" : formatUnitPriceDisplay(line.unit_price)}
          onChange={(e) => onSetUnitPrice(lineKey, parseUnitPriceInput(e.target.value))}
        />
      </div>
      {resolvedCurrency === "USD" && arsRef != null ? (
        <span className="text-[10px] text-muted-foreground pl-5">
          Lista ARS ${arsRef.toLocaleString("es-AR", FORMAT_NUM)}
        </span>
      ) : null}
    </div>
  )

  const ivaSelect = (
    <IvaRateSelect
      value={line.iva_rate}
      onChange={(rate) => onSetIvaRate(lineKey, rate)}
      size="sm"
      disabled={ivaRateDisabled}
    />
  )

  if (view === "table") {
    return (
      <tr className="border-t hover:bg-muted/30">
        <td className="p-2">
          {custom ? (
            <div className="flex h-10 w-10 items-center justify-center rounded bg-muted text-[10px] text-muted-foreground text-center leading-tight">
              Manual
            </div>
          ) : (
            <div className="relative h-10 w-10 rounded overflow-hidden bg-muted inline-block">
              <Image src={getProductImageUrl(line.product, { size: 80 })} alt={label} fill className="object-cover" sizes="40px" />
            </div>
          )}
        </td>
        <td className="p-2 font-medium">
          {label}
          {custom && (
            <Badge variant="outline" className="ml-2 text-[10px]">
              Manual
            </Badge>
          )}
        </td>
        <td className="p-2">
          <div className="flex items-center justify-center gap-1">{qtyControls}</div>
        </td>
        <td className="p-2 text-right">
          <div className="flex items-center justify-end gap-1">{priceInput}</div>
        </td>
        <td className="p-2 text-right">
          <div className="flex justify-end">{ivaSelect}</div>
        </td>
        <td className="p-2 text-right font-medium">{formatLineTotal(lineTotal, resolvedCurrency)}</td>
        <td className="p-2 text-right">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => onRemove(lineKey)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </td>
      </tr>
    )
  }

  if (view === "grid") {
    return (
      <div className="rounded-lg border bg-card p-2 flex flex-col gap-1.5">
        <div className="relative aspect-square rounded overflow-hidden bg-muted min-h-[60px] flex items-center justify-center">
          {custom ? (
            <span className="text-xs text-muted-foreground px-2 text-center">Ítem manual</span>
          ) : line.product.images?.[0] ? (
            <Image src={getProductImageUrl(line.product, { size: 80 })} alt={label} fill className="object-contain" sizes="80px" />
          ) : (
            <span className="text-muted-foreground text-xs">Sin imagen</span>
          )}
        </div>
        <p className="text-xs font-medium truncate leading-tight" title={label}>
          {label}
          {custom && (
            <Badge variant="outline" className="ml-1 text-[9px] px-1 py-0">
              Manual
            </Badge>
          )}
        </p>
        <div className="flex items-center justify-between gap-1">{qtyControls}</div>
        <div className="flex items-center justify-between gap-2">
          {priceInput}
          {ivaSelect}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold">{formatLineTotal(lineTotal, resolvedCurrency)}</span>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-red-600" onClick={() => onRemove(lineKey)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between gap-2 py-2 border-b last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">
          {label}
          {custom && (
            <Badge variant="outline" className="ml-2 text-[10px] shrink-0">
              Manual
            </Badge>
          )}
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-1">
          {qtyControls}
          {priceInput}
          {ivaSelect}
        </div>
      </div>
      <div className="text-right shrink-0">
        <span className="text-sm font-medium whitespace-nowrap block">
          {formatLineTotal(lineTotal, resolvedCurrency)}
        </span>
        {resolvedCurrency === "USD" && arsRef != null ? (
          <span className="text-[10px] text-muted-foreground">
            ARS ${(arsRef * line.quantity).toLocaleString("es-AR", FORMAT_NUM)}
          </span>
        ) : null}
      </div>
      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => onRemove(lineKey)}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}
