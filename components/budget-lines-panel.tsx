"use client"

import { useState } from "react"
import Image from "next/image"
import type { Product } from "@/lib/api"
import { getProductImageUrl } from "@/lib/product-image-utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { FileText, LayoutGrid, LayoutList, Maximize2, Minus, Plus, Trash2 } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { SaleCurrency } from "@/lib/budget-currency"
import {
  budgetLineTotal,
  formatBudgetMoney,
  formatExchangeRate,
  resolveBudgetLineCurrency,
} from "@/lib/budget-currency"
import {
  currencyPricePrefix,
  formatArsPriceInput,
  formatUsdPriceInput,
  parseArsPriceInput,
  parseUsdPriceInput,
} from "@/lib/pos-usd"

export interface BudgetLineItem {
  key: number | string
  name: string
  code: string
  quantity: number
  unit_price: number
  currency?: SaleCurrency
  ars_unit_price?: number
  product?: Product
  isCustom?: boolean
}

interface BudgetLinesPanelProps {
  lines: BudgetLineItem[]
  total: number
  totalLabel?: string
  exchangeRate?: number | null
  formatMoney?: (n: number) => string
  onUpdateQuantity: (key: number | string, quantity: number) => void
  onUpdateUnitPrice: (key: number | string, unitPrice: number) => void
  onUpdateCurrency?: (key: number | string, currency: SaleCurrency) => void
  onUpdateName?: (key: number | string, name: string) => void
  onRemove: (key: number | string) => void
  emptyMessage?: string
  className?: string
}

function lineMoney(line: BudgetLineItem, value: number): string {
  return formatBudgetMoney(value, resolveBudgetLineCurrency(line.currency))
}

function ViewModeToggle({
  viewMode,
  onViewModeChange,
  onExpanded,
  showExpanded,
}: {
  viewMode: "list" | "grid"
  onViewModeChange: (m: "list" | "grid") => void
  onExpanded?: () => void
  showExpanded?: boolean
}) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex rounded-md border">
        <Button
          type="button"
          variant={viewMode === "list" ? "secondary" : "ghost"}
          size="icon"
          className="h-8 w-8 rounded-r-none"
          onClick={() => onViewModeChange("list")}
          title="Vista lista"
        >
          <LayoutList className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={viewMode === "grid" ? "secondary" : "ghost"}
          size="icon"
          className="h-8 w-8 rounded-l-none"
          onClick={() => onViewModeChange("grid")}
          title="Vista cuadrícula"
        >
          <LayoutGrid className="h-4 w-4" />
        </Button>
      </div>
      {showExpanded && onExpanded && (
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onExpanded} title="Vista ampliada">
          <Maximize2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}

function LineImage({ product, name }: { product?: Product; name: string }) {
  if (!product) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] text-muted-foreground">
        —
      </div>
    )
  }
  return (
    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted">
      <Image src={getProductImageUrl(product, { size: 80 })} alt={name} fill className="object-cover" sizes="40px" />
    </div>
  )
}

function LinesListBody({
  lines,
  exchangeRate,
  onUpdateQuantity,
  onUpdateUnitPrice,
  onUpdateCurrency,
  onUpdateName,
  onRemove,
  compact,
}: Omit<BudgetLinesPanelProps, "total" | "totalLabel" | "emptyMessage" | "className" | "formatMoney"> & {
  compact?: boolean
}) {
  return (
    <div className={cn("space-y-2", compact ? "max-h-[280px] overflow-y-auto pr-1" : "")}>
      {lines.map((line) => {
        const currency = resolveBudgetLineCurrency(line.currency)
        const pricePrefix = currencyPricePrefix(currency)
        const arsRef =
          currency === "USD" ? line.ars_unit_price ?? line.product?.price : undefined
        const formatPriceInput =
          currency === "USD"
            ? (n: number) => formatUsdPriceInput(n)
            : (n: number) => formatArsPriceInput(n)
        const parsePriceInput =
          currency === "USD"
            ? (value: string) => parseUsdPriceInput(value)
            : (value: string) => parseArsPriceInput(value)

        return (
        <div
          key={line.key}
          className="flex items-start justify-between gap-2 rounded-lg border bg-card p-2.5 hover:bg-muted/30 transition-colors"
        >
          <div className="flex min-w-0 flex-1 gap-2.5">
            <LineImage product={line.product} name={line.name} />
            <div className="min-w-0 flex-1">
              {line.isCustom && onUpdateName ? (
                <Input
                  className="h-8 text-sm font-medium mb-1"
                  value={line.name}
                  placeholder="Descripción del ítem"
                  onChange={(e) => onUpdateName(line.key, e.target.value)}
                />
              ) : (
                <p className="text-sm font-medium leading-snug line-clamp-2">{line.name}</p>
              )}
              <p className="text-xs font-mono text-muted-foreground truncate">{line.code}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onUpdateQuantity(line.key, Math.max(1, line.quantity - 1))}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <Input
                  type="number"
                  min={1}
                  className="h-7 w-14 text-center text-sm px-1"
                  value={line.quantity}
                  onChange={(e) =>
                    onUpdateQuantity(line.key, Math.max(1, parseInt(e.target.value, 10) || 1))
                  }
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onUpdateQuantity(line.key, line.quantity + 1)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
                {onUpdateCurrency ? (
                  <Select
                    value={currency}
                    onValueChange={(value) => onUpdateCurrency(line.key, value as SaleCurrency)}
                  >
                    <SelectTrigger className="h-7 w-[78px] text-xs px-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ARS">ARS</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                  </Select>
                ) : null}
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">{pricePrefix}</span>
                  <Input
                    type="text"
                    inputMode={currency === "USD" ? "decimal" : "numeric"}
                    className="h-7 w-24 text-right text-sm"
                    value={formatPriceInput(line.unit_price)}
                    onChange={(e) =>
                      onUpdateUnitPrice(line.key, parsePriceInput(e.target.value))
                    }
                  />
                </div>
                {currency === "USD" && arsRef != null ? (
                  <p className="text-[10px] text-muted-foreground w-full">
                    Ref. catálogo: {formatBudgetMoney(arsRef, "ARS")}
                    {exchangeRate ? ` · TC ${formatExchangeRate(exchangeRate)}` : ""}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className="text-sm font-semibold tabular-nums whitespace-nowrap">
              {lineMoney(line, budgetLineTotal(line.quantity, line.unit_price))}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => onRemove(line.key)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )})}
    </div>
  )
}

function LinesGridBody({
  lines,
  exchangeRate,
  onUpdateQuantity,
  onUpdateUnitPrice,
  onUpdateCurrency,
  onUpdateName,
  onRemove,
}: Omit<BudgetLinesPanelProps, "total" | "totalLabel" | "emptyMessage" | "className" | "formatMoney">) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[320px] overflow-y-auto pr-1">
      {lines.map((line) => {
        const currency = resolveBudgetLineCurrency(line.currency)
        const pricePrefix = currencyPricePrefix(currency)
        const formatPriceInput =
          currency === "USD"
            ? (n: number) => formatUsdPriceInput(n)
            : (n: number) => formatArsPriceInput(n)
        const parsePriceInput =
          currency === "USD"
            ? (value: string) => parseUsdPriceInput(value)
            : (value: string) => parseArsPriceInput(value)

        return (
        <div
          key={line.key}
          className="rounded-lg border bg-card p-2.5 flex flex-col gap-2"
        >
          <div className="flex gap-2 min-w-0">
            {line.product ? (
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
                <Image
                  src={getProductImageUrl(line.product, { size: 96 })}
                  alt={line.name}
                  fill
                  className="object-contain"
                  sizes="56px"
                />
              </div>
            ) : (
              <div className="h-14 w-14 shrink-0 rounded-md bg-muted" />
            )}
            <div className="min-w-0 flex-1">
              {line.isCustom && onUpdateName ? (
                <Input
                  className="h-7 text-xs font-medium mb-1"
                  value={line.name}
                  placeholder="Descripción"
                  onChange={(e) => onUpdateName(line.key, e.target.value)}
                />
              ) : (
                <p className="text-xs font-medium line-clamp-2 leading-tight" title={line.name}>
                  {line.name}
                </p>
              )}
              <p className="text-[10px] font-mono text-muted-foreground truncate">{line.code}</p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-1 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-6 w-6"
              onClick={() => onUpdateQuantity(line.key, Math.max(1, line.quantity - 1))}
            >
              <Minus className="h-2.5 w-2.5" />
            </Button>
            <span className="text-xs font-medium tabular-nums w-6 text-center">{line.quantity}</span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-6 w-6"
              onClick={() => onUpdateQuantity(line.key, line.quantity + 1)}
            >
              <Plus className="h-2.5 w-2.5" />
            </Button>
            {onUpdateCurrency ? (
              <Select
                value={currency}
                onValueChange={(value) => onUpdateCurrency(line.key, value as SaleCurrency)}
              >
                <SelectTrigger className="h-6 w-[72px] text-[10px] px-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ARS">ARS</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            ) : null}
            <div className="flex items-center gap-1 flex-1 min-w-[90px]">
              <span className="text-[10px] text-muted-foreground">{pricePrefix}</span>
              <Input
                type="text"
                inputMode={currency === "USD" ? "decimal" : "numeric"}
                className="h-6 flex-1 text-right text-xs px-1"
                value={formatPriceInput(line.unit_price)}
                onChange={(e) => onUpdateUnitPrice(line.key, parsePriceInput(e.target.value))}
              />
            </div>
          </div>
          <div className="flex items-center justify-between border-t pt-1.5">
            <span className="text-xs font-semibold tabular-nums">
              {lineMoney(line, budgetLineTotal(line.quantity, line.unit_price))}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive"
              onClick={() => onRemove(line.key)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )})}
    </div>
  )
}

export function BudgetLinesPanel({
  lines,
  total,
  totalLabel = "Total estimado",
  exchangeRate,
  formatMoney,
  onUpdateQuantity,
  onUpdateUnitPrice,
  onUpdateCurrency,
  onUpdateName,
  onRemove,
  emptyMessage = "Agregá productos del catálogo o ítems escritos.",
  className,
}: BudgetLinesPanelProps) {
  const [viewMode, setViewMode] = useState<"list" | "grid">("list")
  const [expandedOpen, setExpandedOpen] = useState(false)

  const formatTotal =
    formatMoney ?? ((n: number) => formatBudgetMoney(n, "ARS"))

  const countLabel =
    lines.length === 0
      ? "Sin líneas"
      : `${lines.length} ítem${lines.length !== 1 ? "s" : ""} · ${formatTotal(total)}`

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{countLabel}</p>
        {lines.length > 0 && (
          <ViewModeToggle
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onExpanded={() => setExpandedOpen(true)}
            showExpanded
          />
        )}
      </div>

      {lines.length === 0 ? (
        <p className="text-sm text-muted-foreground py-10 text-center rounded-lg border border-dashed">{emptyMessage}</p>
      ) : viewMode === "list" ? (
        <LinesListBody
          lines={lines}
          exchangeRate={exchangeRate}
          onUpdateQuantity={onUpdateQuantity}
          onUpdateUnitPrice={onUpdateUnitPrice}
          onUpdateCurrency={onUpdateCurrency}
          onUpdateName={onUpdateName}
          onRemove={onRemove}
          compact
        />
      ) : (
        <LinesGridBody
          lines={lines}
          exchangeRate={exchangeRate}
          onUpdateQuantity={onUpdateQuantity}
          onUpdateUnitPrice={onUpdateUnitPrice}
          onUpdateCurrency={onUpdateCurrency}
          onUpdateName={onUpdateName}
          onRemove={onRemove}
        />
      )}

      {lines.length > 0 && (
        <div className="flex justify-end border-t pt-3">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">{totalLabel}</p>
            <p className="text-xl font-bold tabular-nums">{formatTotal(total)}</p>
          </div>
        </div>
      )}

      <Dialog open={expandedOpen} onOpenChange={setExpandedOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col gap-4 p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Líneas del presupuesto — Vista ampliada
            </DialogTitle>
            <p className="text-sm text-muted-foreground">{countLabel}</p>
          </DialogHeader>
          <div className="border rounded-md overflow-auto flex-1 min-h-[320px]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-muted/80 border-b">
                  <th className="text-left p-2 w-14">Img.</th>
                  <th className="text-left p-2">Producto</th>
                  <th className="text-left p-2 w-28">Código</th>
                  <th className="text-center p-2 w-20">Mon.</th>
                  <th className="text-center p-2 w-24">Cant.</th>
                  <th className="text-right p-2 w-32">P. unit.</th>
                  <th className="text-right p-2 w-32">Subtotal</th>
                  <th className="p-2 w-12" />
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => {
                  const currency = resolveBudgetLineCurrency(line.currency)
                  const formatPriceInput =
                    currency === "USD"
                      ? (n: number) => formatUsdPriceInput(n)
                      : (n: number) => formatArsPriceInput(n)
                  const parsePriceInput =
                    currency === "USD"
                      ? (value: string) => parseUsdPriceInput(value)
                      : (value: string) => parseArsPriceInput(value)

                  return (
                  <tr key={line.key} className="border-t hover:bg-muted/30">
                    <td className="p-2">
                      <LineImage product={line.product} name={line.name} />
                    </td>
                    <td className="p-2 font-medium">
                      {line.isCustom && onUpdateName ? (
                        <Input
                          className="h-8"
                          value={line.name}
                          placeholder="Descripción del ítem"
                          onChange={(e) => onUpdateName(line.key, e.target.value)}
                        />
                      ) : (
                        line.name
                      )}
                    </td>
                    <td className="p-2 font-mono text-xs text-muted-foreground">{line.code}</td>
                    <td className="p-2">
                      {onUpdateCurrency ? (
                        <Select
                          value={currency}
                          onValueChange={(value) => onUpdateCurrency(line.key, value as SaleCurrency)}
                        >
                          <SelectTrigger className="h-8 w-[76px] mx-auto text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ARS">ARS</SelectItem>
                            <SelectItem value="USD">USD</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        currency
                      )}
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        min={1}
                        className="h-8 w-16 mx-auto text-center"
                        value={line.quantity}
                        onChange={(e) =>
                          onUpdateQuantity(line.key, Math.max(1, parseInt(e.target.value, 10) || 1))
                        }
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="text"
                        inputMode={currency === "USD" ? "decimal" : "numeric"}
                        className="h-8 w-28 ml-auto text-right"
                        value={formatPriceInput(line.unit_price)}
                        onChange={(e) =>
                          onUpdateUnitPrice(line.key, parsePriceInput(e.target.value))
                        }
                      />
                    </td>
                    <td className="p-2 text-right font-medium tabular-nums">
                      {lineMoney(line, budgetLineTotal(line.quantity, line.unit_price))}
                    </td>
                    <td className="p-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => onRemove(line.key)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                )})}
              </tbody>
              <tfoot>
                <tr className="border-t bg-muted/40 font-semibold">
                  <td colSpan={6} className="p-3 text-right text-muted-foreground">
                    Total
                  </td>
                  <td className="p-3 text-right tabular-nums">{formatTotal(total)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
