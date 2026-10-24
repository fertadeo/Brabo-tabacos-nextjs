"use client"

import React, { useEffect, useState } from "react"
import Image from "next/image"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Alert } from "@/components/ui/alert"
import {
  Calendar,
  User,
  CreditCard,
  Package,
  Receipt,
  CheckCircle2,
  Clock,
  AlertCircle,
  Pencil,
} from "lucide-react"
import { saleHasFiscalLock } from "@/lib/sale-edit"
import { saleHasNotaCreditoEmitida } from "@/lib/facturacion-nota-credito"
import { externalInvoiceBadgeLabel, IMPORTED_SALE_FISCAL_HINT, isImportedSale, LINKED_POS_SALE_HINT } from "@/lib/sale-import"
import type { SaleResponseData, SalePaymentMethod } from "@/lib/api"
import { getProductById } from "@/lib/api"
import { getSaleItemDisplayName, isSaleCustomItem, saleItemCatalogProductIds } from "@/lib/sale-items"
import { useConfirmBeforeClose } from "@/lib/use-confirm-before-close"
import { computeSaleIvaBreakdown, formatSaleIvaRateLabel, normalizeSaleIvaRate } from "@/lib/sale-iva"
import { SaleClienteSection } from "@/components/sale-cliente-section"

interface SaleDetailModalProps {
  sale: SaleResponseData | null
  isOpen: boolean
  onClose: () => void
  canEdit?: boolean
  onEdit?: () => void
}

const paymentMethodLabels: Record<SalePaymentMethod, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
  mixto: "Mixto",
}

const syncStatusConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }
> = {
  pending: { label: "Pendiente", variant: "secondary", icon: Clock },
  synced: { label: "Sincronizado", variant: "default", icon: CheckCircle2 },
  error: { label: "Error", variant: "destructive", icon: AlertCircle },
}

type ProductInfo = { name: string; imageUrl?: string }

/** Formato argentino: punto para miles, coma para decimales. Ej: 1500000 → "1.500.000,00" */
function formatPrice(value: number | string, decimals = 2): string {
  const n = typeof value === "number" ? value : Number(value)
  if (Number.isNaN(n)) return "—"
  const fixed = n.toFixed(decimals)
  const [intPart, decPart] = fixed.split(".")
  const withDots = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  return decPart ? `${withDots},${decPart}` : withDots
}

export function SaleDetailModal({ sale, isOpen, onClose, canEdit, onEdit }: SaleDetailModalProps) {
  const [productInfoMap, setProductInfoMap] = useState<Record<number, ProductInfo>>({})

  useEffect(() => {
    if (!sale?.items?.length) {
      setProductInfoMap({})
      return
    }
    const ids = saleItemCatalogProductIds(sale.items)
    if (ids.length === 0) {
      setProductInfoMap({})
      return
    }
    let cancelled = false
    Promise.all(
      ids.map(async (id) => {
        try {
          const p = await getProductById(id)
          return { id, name: p.name, imageUrl: p.image_url ?? p.images?.[0] }
        } catch {
          return { id, name: `Producto #${id}` }
        }
      })
    ).then((results) => {
      if (cancelled) return
      setProductInfoMap(
        results.reduce<Record<number, ProductInfo>>((acc, { id, name, imageUrl }) => {
          acc[id] = { name, imageUrl }
          return acc
        }, {})
      )
    })
    return () => {
      cancelled = true
    }
  }, [sale?.id, sale?.items?.map((i) => `${i.product_id ?? ""}-${i.product_name ?? ""}`).join(",")])

  const [handleOpenChange, confirmDialog] = useConfirmBeforeClose((open) => {
    if (!open) onClose()
  })

  if (!sale) return null

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return dateStr
    }
  }

  const syncConfig = sale.sync_status
    ? syncStatusConfig[sale.sync_status] ?? {
        label: sale.sync_status,
        variant: "outline" as const,
        icon: Clock,
      }
    : null
  const SyncIcon = syncConfig?.icon ?? Clock

  return (
    <>
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[min(42rem,calc(100vw-2rem))] max-h-[90vh] overflow-y-auto overflow-x-hidden p-0 gap-0">
        <DialogHeader className="border-b bg-muted/30 px-6 pr-12 py-5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Receipt className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-xl tracking-tight">
                Venta POS #{sale.sale_number}
              </DialogTitle>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {formatDate(sale.sale_date)}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 p-6 pr-12 min-w-0">
          {sale && isImportedSale(sale) ? (
            <Alert
              variant="warning"
              title={externalInvoiceBadgeLabel(sale)}
              description={sale.sale_source === "pos_external" ? LINKED_POS_SALE_HINT : IMPORTED_SALE_FISCAL_HINT}
            />
          ) : saleHasFiscalLock(sale) ? (
            <Alert
              variant="error"
              title="Venta facturada (ARCA)"
              description="Solo lectura. Para corregir el comprobante fiscal hace falta emitir una nota de crédito y, si corresponde, refacturar."
            />
          ) : saleHasNotaCreditoEmitida(sale) ? (
            <Alert
              variant="warning"
              title="Factura anulada con nota de crédito"
              description="Podés editar la venta y volver a facturar. El comprobante original y la NC quedan en el historial."
            />
          ) : null}
          {canEdit && onEdit && (
            <div className="flex justify-end">
              <Button type="button" size="sm" variant="outline" className="gap-2" onClick={onEdit}>
                <Pencil className="h-4 w-4" />
                Editar venta
              </Button>
            </div>
          )}
          <section className="rounded-xl border bg-muted/20 p-4 min-w-0 overflow-hidden space-y-4">
            <h3 className="sr-only">Detalles de la venta</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 min-w-0">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background border text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Fecha
                  </p>
                  <p className="mt-0.5 text-sm font-medium">{formatDate(sale.sale_date)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background border text-muted-foreground">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Pago
                  </p>
                  <p className="mt-0.5 text-sm font-medium">
                    {paymentMethodLabels[sale.payment_method] ?? sale.payment_method}
                  </p>
                </div>
              </div>
              {syncConfig && (
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background border text-muted-foreground">
                    <SyncIcon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Sincronización
                    </p>
                    <p className="mt-0.5">
                      <Badge variant={syncConfig.variant} className="font-normal">
                        {syncConfig.label}
                      </Badge>
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <div className="mb-2 flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Cliente
                </h4>
              </div>
              <SaleClienteSection
                clientId={sale.client_id}
                saleSnapshot={sale}
                fallbackName={sale.client_name}
              />
            </div>
          </section>

          <section className="min-w-0">
            <div className="mb-3 flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground shrink-0" />
              <h4 className="text-sm font-semibold">Artículos</h4>
            </div>
            <div className="rounded-xl border overflow-hidden min-w-0">
              <div className="overflow-x-auto">
                <Table className="w-full min-w-[320px]" style={{ tableLayout: "fixed" }}>
                  <colgroup>
                    <col style={{ width: "44%" }} />
                    <col style={{ width: "4rem" }} />
                    <col style={{ width: "6rem" }} />
                    <col style={{ width: "5rem" }} />
                    <col style={{ width: "7rem" }} />
                  </colgroup>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b bg-muted/30">
                      <TableHead className="whitespace-nowrap">Producto</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Cant.</TableHead>
                      <TableHead className="text-right whitespace-nowrap">P. unit.</TableHead>
                      <TableHead className="text-right whitespace-nowrap">IVA</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                <TableBody>
                  {(sale.items || []).map((item, idx) => {
                    const custom = isSaleCustomItem(item)
                    const info =
                      item.product_id != null ? productInfoMap[item.product_id] : undefined
                    const displayName = getSaleItemDisplayName(item)
                    const subtotal =
                      item.subtotal ??
                      item.total_price ??
                      item.quantity * (typeof item.unit_price === "number" ? item.unit_price : 0)
                    return (
                      <TableRow key={idx} className="border-b last:border-b-0">
                        <TableCell className="align-top py-3 whitespace-normal w-0">
                          <div className="flex items-start gap-3 min-w-0 w-full overflow-hidden">
                            {!custom && info?.imageUrl ? (
                              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border bg-muted">
                                <Image
                                  src={info.imageUrl}
                                  alt=""
                                  fill
                                  className="object-cover"
                                  sizes="48px"
                                />
                              </div>
                            ) : (
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border bg-muted text-muted-foreground text-[10px] text-center leading-tight px-0.5">
                                {custom ? "Manual" : <Package className="h-5 w-5" />}
                              </div>
                            )}
                            <span
                              className="font-medium text-sm block break-words min-w-0"
                              style={{ overflowWrap: "break-word", wordBreak: "break-word" }}
                            >
                              {info?.name && !custom ? info.name : displayName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right align-top py-3 tabular-nums whitespace-nowrap">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-right align-top py-3 tabular-nums text-muted-foreground whitespace-nowrap">
                          ${typeof item.unit_price === "number" ? formatPrice(item.unit_price) : String(item.unit_price)}
                        </TableCell>
                        <TableCell className="text-right align-top py-3 tabular-nums text-muted-foreground whitespace-nowrap text-xs">
                          {formatSaleIvaRateLabel(normalizeSaleIvaRate(item.iva_rate))}
                        </TableCell>
                        <TableCell className="text-right align-top py-3 font-medium tabular-nums whitespace-nowrap">
                          ${formatPrice(subtotal)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
              </div>
            </div>
          </section>

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 rounded-xl border bg-muted/20 px-5 py-4 min-w-0">
            {(() => {
              const ivaBreakdown = computeSaleIvaBreakdown(
                (sale.items || []).map((item) => ({
                  subtotal:
                    item.subtotal ??
                    item.total_price ??
                    item.quantity * (typeof item.unit_price === "number" ? item.unit_price : 0),
                  iva_rate: item.iva_rate,
                }))
              )
              return (
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Neto gravado: ${formatPrice(ivaBreakdown.netoGravado)}</p>
                  {ivaBreakdown.iva21 > 0 ? <p>IVA 21% contenido: ${formatPrice(ivaBreakdown.iva21)}</p> : null}
                  {ivaBreakdown.iva105 > 0 ? (
                    <p>IVA 10,5% contenido: ${formatPrice(ivaBreakdown.iva105)}</p>
                  ) : null}
                  {ivaBreakdown.ivaExento > 0 ? (
                    <p>Exento / 0%: ${formatPrice(ivaBreakdown.ivaExento)}</p>
                  ) : null}
                </div>
              )
            })()}
            <div className="flex items-baseline gap-2 sm:ml-auto">
              <span className="text-sm font-medium text-muted-foreground">Total</span>
              <span className="text-2xl font-bold tabular-nums">
                ${formatPrice(sale.total_amount)}
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    {confirmDialog}
    </>
  )
}
