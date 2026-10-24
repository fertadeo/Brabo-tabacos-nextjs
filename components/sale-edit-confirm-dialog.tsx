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
import {
  type SaleEditConfirmSummary,
  formatSaleEditMoney,
} from "@/lib/sale-edit-summary"
import type { Cliente } from "@/lib/api"
import { ClienteInfoCard } from "@/components/cliente-picker"
import { formatSaleIvaRateLabel } from "@/lib/sale-iva"
import { Loader2, Minus, Plus } from "lucide-react"

const CHANGE_BADGE: Record<
  "added" | "removed" | "modified",
  { label: string; variant: "default" | "secondary" | "destructive" }
> = {
  added: { label: "Nuevo", variant: "default" },
  removed: { label: "Eliminado", variant: "destructive" },
  modified: { label: "Modificado", variant: "secondary" },
}

interface SaleEditConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  summary: SaleEditConfirmSummary | null
  saleNumber: string
  selectedCliente?: Cliente | null
  saving: boolean
  onConfirm: () => void
}

export function SaleEditConfirmDialog({
  open,
  onOpenChange,
  summary,
  saleNumber,
  selectedCliente,
  saving,
  onConfirm,
}: SaleEditConfirmDialogProps) {
  if (!summary) return null

  const itemDiffs = summary.lineChanges.filter((l) => l.kind !== "unchanged")
  const finalLineChangeByKey = new Map(
    summary.lineChanges
      .filter((l) => l.kind !== "removed")
      .map((l) => [l.matchKey, l])
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Confirmar cambios en venta #{saleNumber}</DialogTitle>
          <DialogDescription>
            Revisá el detalle antes de guardar. Los cambios actualizarán stock, caja y sincronización según
            corresponda.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {!summary.hasAnyChange && (
            <p className="text-sm text-muted-foreground rounded-lg border p-3 bg-muted/30">
              No detectamos cambios respecto a la venta original. Podés cancelar o guardar igualmente.
            </p>
          )}

          {selectedCliente ? (
            <ClienteInfoCard cliente={selectedCliente} />
          ) : (
            <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-5 text-center">
              <p className="text-sm font-medium">Consumidor final</p>
              <p className="text-xs text-muted-foreground mt-1">La venta quedará sin cliente asociado.</p>
            </div>
          )}

          <section className="space-y-2">
            <h4 className="text-sm font-semibold">Resumen general</h4>
            <dl className="text-sm rounded-lg border divide-y">
              <div className="px-3 py-2 grid gap-1 sm:grid-cols-[7rem_1fr]">
                <dt className="text-muted-foreground">Cliente</dt>
                <dd>
                  {summary.clientChanged ? (
                    <>
                      <span className="line-through text-muted-foreground">{summary.clientBefore}</span>
                      <span className="mx-2 text-muted-foreground">→</span>
                      <span className="font-medium">{summary.clientAfter}</span>
                    </>
                  ) : (
                    <span className="font-medium">{summary.clientAfter}</span>
                  )}
                </dd>
              </div>
              <div className="px-3 py-2 grid gap-1 sm:grid-cols-[7rem_1fr]">
                <dt className="text-muted-foreground">Pago</dt>
                <dd>
                  {summary.paymentChanged ? (
                    <>
                      <span className="line-through text-muted-foreground">{summary.paymentBefore}</span>
                      <span className="mx-2 text-muted-foreground">→</span>
                      <span className="font-medium">{summary.paymentAfter}</span>
                    </>
                  ) : (
                    <span className="font-medium">{summary.paymentAfter}</span>
                  )}
                </dd>
              </div>
              <div className="px-3 py-2 grid gap-1 sm:grid-cols-[7rem_1fr]">
                <dt className="text-muted-foreground">Moneda</dt>
                <dd>
                  {summary.currencyChanged ? (
                    <>
                      <span className="line-through text-muted-foreground">
                        {summary.currencyBefore === "USD" ? "Dólares (USD)" : "Pesos (ARS)"}
                      </span>
                      <span className="mx-2 text-muted-foreground">→</span>
                      <span className="font-medium">
                        {summary.currencyAfter === "USD" ? "Dólares (USD)" : "Pesos (ARS)"}
                        {summary.currencyAfter === "USD" && summary.exchangeRateAfter
                          ? ` · ${summary.exchangeRateAfter.toLocaleString("es-AR")} ARS/USD`
                          : ""}
                      </span>
                    </>
                  ) : (
                    <span className="font-medium">
                      {summary.currencyAfter === "USD" ? "Dólares (USD)" : "Pesos (ARS)"}
                      {summary.currencyAfter === "USD" && summary.exchangeRateAfter
                        ? ` · ${summary.exchangeRateAfter.toLocaleString("es-AR")} ARS/USD`
                        : ""}
                    </span>
                  )}
                </dd>
              </div>
              <div className="px-3 py-2 grid gap-1 sm:grid-cols-[7rem_1fr]">
                <dt className="text-muted-foreground">Total</dt>
                <dd>
                  {summary.totalChanged ? (
                    <>
                      <span className="line-through text-muted-foreground">
                        {formatSaleEditMoney(summary.totalBefore, summary.currencyAfter)}
                      </span>
                      <span className="mx-2 text-muted-foreground">→</span>
                      <span className="font-semibold">
                        {formatSaleEditMoney(summary.totalAfter, summary.currencyAfter)}
                      </span>
                    </>
                  ) : (
                    <span className="font-semibold">
                      {formatSaleEditMoney(summary.totalAfter, summary.currencyAfter)}
                    </span>
                  )}
                </dd>
              </div>
              <div className="px-3 py-2 grid gap-1 sm:grid-cols-[7rem_1fr]">
                <dt className="text-muted-foreground">Notas</dt>
                <dd className="whitespace-pre-wrap">
                  {summary.notesChanged ? (
                    <>
                      <span className="text-muted-foreground line-through block">{summary.notesBefore}</span>
                      <span className="font-medium block mt-1">{summary.notesAfter}</span>
                    </>
                  ) : (
                    <span>{summary.notesAfter}</span>
                  )}
                </dd>
              </div>
            </dl>
          </section>

          {summary.hasItemChanges && itemDiffs.length > 0 && (
            <section className="space-y-2">
              <h4 className="text-sm font-semibold">Cambios en ítems</h4>
              <ul className="text-sm space-y-2 rounded-lg border p-3 bg-muted/20">
                {itemDiffs.map((line, idx) => {
                  const badge = CHANGE_BADGE[line.kind as "added" | "removed" | "modified"]
                  const Icon = line.kind === "added" ? Plus : line.kind === "removed" ? Minus : null
                  return (
                    <li key={`${line.kind}-${line.label}-${idx}`} className="flex gap-2">
                      {Icon ? <Icon className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" /> : null}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={line.kind === "removed" ? "line-through" : "font-medium"}>
                            {line.label}
                          </span>
                          {badge ? (
                            <Badge variant={badge.variant} className="text-[10px] px-1.5 py-0">
                              {badge.label}
                            </Badge>
                          ) : null}
                        </div>
                        {line.details?.map((d) => (
                          <p key={d} className="text-xs text-muted-foreground mt-0.5">
                            {d}
                          </p>
                        ))}
                        {line.kind === "added" && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {line.quantity} × {formatSaleEditMoney(line.unit_price, summary.currencyAfter)} · IVA{" "}
                            {formatSaleIvaRateLabel(line.iva_rate)}
                          </p>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          <section className="space-y-2">
            <h4 className="text-sm font-semibold">Venta a guardar (ítems finales)</h4>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-right w-16">Cant.</TableHead>
                    <TableHead className="text-right w-24">P. unit.</TableHead>
                    <TableHead className="text-right w-20">IVA</TableHead>
                    <TableHead className="text-right w-28">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.finalLines.map((line) => {
                    const change = finalLineChangeByKey.get(line.matchKey)
                    const badge =
                      change && change.kind !== "unchanged"
                        ? CHANGE_BADGE[change.kind as "added" | "modified"]
                        : null
                    return (
                      <TableRow key={line.matchKey}>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{line.label}</span>
                            {badge ? (
                              <Badge variant={badge.variant} className="text-[10px] px-1.5 py-0">
                                {badge.label}
                              </Badge>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{line.quantity}</TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {formatSaleEditMoney(line.unit_price, summary.currencyAfter)}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {formatSaleIvaRateLabel(line.iva_rate)}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatSaleEditMoney(line.subtotal, summary.currencyAfter)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </section>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Volver a editar
          </Button>
          <Button onClick={onConfirm} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Confirmar y guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
