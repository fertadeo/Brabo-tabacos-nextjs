"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useConfirmBeforeClose } from "@/lib/use-confirm-before-close"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertTriangle, Loader2, Package, Plus, Search, Trash2 } from "lucide-react"
import {
  createOrder,
  getClientes,
  getProducts,
  type Cliente,
  type Product,
} from "@/lib/api"
import { ClientePicker } from "@/components/cliente-picker"
import { getClienteDisplayName } from "@/lib/cliente-display"
import { IvaRateSelect } from "@/components/iva-rate-select"
import {
  clienteRequiresZeroItemIva,
  effectiveSaleItemIvaRate,
} from "@/lib/facturacion-cliente-fiscal"
import {
  computeSaleIvaBreakdown,
  DEFAULT_SALE_IVA_RATE,
  formatSaleIvaRateLabel,
  type SaleIvaRate,
} from "@/lib/sale-iva"
import {
  DEFAULT_PRICE_LIST_SLUG,
  PRICE_LIST_OPTIONS,
  resolveProductListPrice,
  type PriceListSlug,
} from "@/lib/price-lists"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface NewOrderModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

type DraftLine = {
  key: string
  product_id: number
  code: string
  name: string
  quantity: number
  unit_price: number
  iva_rate: SaleIvaRate
}

function money(n: number) {
  return n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export function NewOrderModal({ isOpen, onClose, onSuccess }: NewOrderModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [clientSearch, setClientSearch] = useState("")
  const [clients, setClients] = useState<Cliente[]>([])
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null)

  const [products, setProducts] = useState<Product[]>([])
  const [productSearch, setProductSearch] = useState("")
  const [loadingProducts, setLoadingProducts] = useState(false)

  const [priceList, setPriceList] = useState<PriceListSlug>(DEFAULT_PRICE_LIST_SLUG)
  const [status, setStatus] = useState("pendiente_preparacion")
  const [deliveryDate, setDeliveryDate] = useState("")
  const [deliveryAddress, setDeliveryAddress] = useState("")
  const [transportCompany, setTransportCompany] = useState("")
  const [notes, setNotes] = useState("")
  const [discountPercent, setDiscountPercent] = useState(0)

  const [lines, setLines] = useState<DraftLine[]>([])
  const [qtyDraft, setQtyDraft] = useState(1)

  const requiresZeroItemIva = useMemo(
    () => clienteRequiresZeroItemIva(selectedCliente),
    [selectedCliente]
  )

  const reset = useCallback(() => {
    setError(null)
    setClientSearch("")
    setClients([])
    setSelectedCliente(null)
    setProductSearch("")
    setPriceList(DEFAULT_PRICE_LIST_SLUG)
    setStatus("pendiente_preparacion")
    setDeliveryDate("")
    setDeliveryAddress("")
    setTransportCompany("")
    setNotes("")
    setDiscountPercent(0)
    setLines([])
    setQtyDraft(1)
  }, [])

  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    setLoadingProducts(true)
    void getProducts(1, 500, true)
      .then((data) => {
        if (cancelled) return
        const list = Array.isArray(data) ? data : data.products || []
        setProducts(list.filter((p) => p.is_active !== false))
      })
      .catch(() => {
        if (!cancelled) toast.error("No se pudieron cargar productos")
      })
      .finally(() => {
        if (!cancelled) setLoadingProducts(false)
      })
    return () => {
      cancelled = true
    }
  }, [isOpen])

  useEffect(() => {
    if (clientSearch.trim().length < 2) {
      setClients([])
      return
    }
    const t = setTimeout(() => {
      getClientes(1, 25, clientSearch.trim(), "active")
        .then((r) => setClients(r.clients || []))
        .catch(() => setClients([]))
    }, 280)
    return () => clearTimeout(t)
  }, [clientSearch])

  useEffect(() => {
    if (!requiresZeroItemIva) return
    setLines((prev) =>
      prev.some((l) => l.iva_rate !== 0)
        ? prev.map((l) => (l.iva_rate === 0 ? l : { ...l, iva_rate: 0 as SaleIvaRate }))
        : prev
    )
  }, [requiresZeroItemIva])

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase()
    if (q.length < 1) return products.slice(0, 12)
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          String(p.code || "").toLowerCase().includes(q) ||
          String(p.barcode || "").toLowerCase().includes(q)
      )
      .slice(0, 20)
  }, [products, productSearch])

  const lineProductIds = useMemo(() => new Set(lines.map((l) => l.product_id)), [lines])

  function addProduct(product: Product) {
    const unit = resolveProductListPrice(product, priceList)
    const iva = effectiveSaleItemIvaRate(
      (Number(product.iva_rate) as SaleIvaRate) || DEFAULT_SALE_IVA_RATE,
      selectedCliente
    )
    const qty = Math.max(1, Math.floor(qtyDraft) || 1)
    setLines((prev) => {
      const existing = prev.find((l) => l.product_id === product.id)
      if (existing) {
        return prev.map((l) =>
          l.product_id === product.id ? { ...l, quantity: l.quantity + qty } : l
        )
      }
      return [
        ...prev,
        {
          key: `p-${product.id}`,
          product_id: product.id,
          code: String(product.code || ""),
          name: product.name,
          quantity: qty,
          unit_price: unit,
          iva_rate: iva,
        },
      ]
    })
    setProductSearch("")
    setQtyDraft(1)
    setError(null)
  }

  function updateLine(key: string, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  }

  function removeLine(key: string) {
    setLines((prev) => prev.filter((l) => l.key !== key))
  }

  const totals = useMemo(() => {
    const subtotal = lines.reduce((s, l) => s + l.quantity * l.unit_price, 0)
    const ivaBreakdown = computeSaleIvaBreakdown(
      lines.map((l) => ({ subtotal: l.quantity * l.unit_price, iva_rate: l.iva_rate }))
    )
    const discount = subtotal * (Math.min(100, Math.max(0, discountPercent)) / 100)
    return {
      subtotal,
      discount,
      netoGravado: ivaBreakdown.netoGravado,
      ivaTotal: ivaBreakdown.ivaTotal,
      total: Math.max(0, subtotal - discount),
      units: lines.reduce((s, l) => s + l.quantity, 0),
    }
  }, [lines, discountPercent])

  async function handleSubmit() {
    if (!selectedCliente) {
      setError("Seleccioná un cliente")
      return
    }
    if (lines.length === 0) {
      setError("Agregá al menos un producto del catálogo")
      return
    }

    setLoading(true)
    setError(null)
    try {
      await createOrder({
        client_id: selectedCliente.id,
        order_date: todayISO(),
        status: status as any,
        delivery_date: deliveryDate || undefined,
        delivery_address: deliveryAddress.trim() || undefined,
        observations: notes.trim() || undefined,
        shipping_company: transportCompany.trim() || undefined,
        final_discount: discountPercent || undefined,
        price_list: priceList,
        items: lines.map((l) => ({
          product_id: l.product_id,
          description: l.name,
          quantity: l.quantity,
          unit_price: l.unit_price,
          iva_rate: l.iva_rate,
        })),
      })
      toast.success("Pedido creado")
      reset()
      onSuccess()
      onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo crear el pedido"
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (loading) return
    reset()
    onClose()
  }

  const [handleOpenChange, confirmDialog] = useConfirmBeforeClose((open) => {
    if (!open) handleClose()
  })

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-hidden flex flex-col gap-0 p-0">
          <DialogHeader className="px-6 pt-6 pb-3 shrink-0 border-b">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Package className="h-5 w-5 text-primary" />
              Nuevo pedido
            </DialogTitle>
            <DialogDescription>
              Armá el pedido con productos del catálogo (cigarrillos, golosinas, medicamentos). Se
              guarda en el ERP para preparar y despachar.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
            {error ? (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}

            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Cliente</h3>
              <ClientePicker
                searchValue={clientSearch}
                onSearchChange={(value) => {
                  setClientSearch(value)
                  if (selectedCliente && value.trim() !== getClienteDisplayName(selectedCliente)) {
                    setSelectedCliente(null)
                  }
                  if (!value.trim()) setSelectedCliente(null)
                }}
                results={clients}
                selectedCliente={selectedCliente}
                onSelect={(cliente) => {
                  setSelectedCliente(cliente)
                  setClientSearch(getClienteDisplayName(cliente))
                  setClients([])
                  setDeliveryAddress(cliente.address || "")
                  setError(null)
                }}
                onClear={() => {
                  setSelectedCliente(null)
                  setClientSearch("")
                  setClients([])
                }}
                placeholder="Buscar por nombre, CUIT o código…"
                clearLabel="Quitar cliente"
              />
            </section>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label>Lista de precios</Label>
                <Select
                  value={priceList}
                  onValueChange={(v) => {
                    const slug = v as PriceListSlug
                    setPriceList(slug)
                    setLines((prev) =>
                      prev.map((l) => {
                        const p = products.find((x) => x.id === l.product_id)
                        if (!p) return l
                        return { ...l, unit_price: resolveProductListPrice(p, slug) }
                      })
                    )
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRICE_LIST_OPTIONS.map((o) => (
                      <SelectItem key={o.slug} value={o.slug}>
                        {o.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Estado</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendiente_preparacion">Para preparar</SelectItem>
                    <SelectItem value="en_proceso">En proceso</SelectItem>
                    <SelectItem value="listo_despacho">Listo despacho</SelectItem>
                    <SelectItem value="aprobado">Aprobado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="delivery-date">Entrega (opcional)</Label>
                <Input
                  id="delivery-date"
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="disc">Desc. final %</Label>
                <Input
                  id="disc"
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="addr">Domicilio de entrega</Label>
                <Input
                  id="addr"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Calle, localidad…"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="transport">Transporte</Label>
                <Input
                  id="transport"
                  value={transportCompany}
                  onChange={(e) => setTransportCompany(e.target.value)}
                  placeholder="Empresa / método"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Observaciones</Label>
              <Textarea
                id="notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Condiciones, horario, referencias…"
              />
            </div>

            <Separator />

            <section className="space-y-3">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <h3 className="text-sm font-semibold">Productos</h3>
                <div className="flex items-center gap-2">
                  <Label htmlFor="qty-add" className="text-xs text-muted-foreground">
                    Cant. al agregar
                  </Label>
                  <Input
                    id="qty-add"
                    type="number"
                    min={1}
                    className="h-8 w-20"
                    value={qtyDraft}
                    onChange={(e) => setQtyDraft(parseInt(e.target.value, 10) || 1)}
                  />
                </div>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Buscar por nombre, código o código de barras…"
                  className="pl-9"
                />
              </div>

              {loadingProducts ? (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Cargando catálogo…
                </p>
              ) : (
                <ul className="max-h-40 overflow-y-auto rounded-lg border divide-y">
                  {filteredProducts.length === 0 ? (
                    <li className="px-3 py-4 text-sm text-muted-foreground text-center">
                      Sin resultados
                    </li>
                  ) : (
                    filteredProducts.map((p) => {
                      const price = resolveProductListPrice(p, priceList)
                      const inCart = lineProductIds.has(p.id)
                      return (
                        <li key={p.id}>
                          <button
                            type="button"
                            onClick={() => addProduct(p)}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-muted/60 transition-colors",
                              inCart && "bg-primary/5"
                            )}
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{p.name}</p>
                              <p className="text-xs text-muted-foreground font-mono">
                                {p.code || "—"}
                                {p.stock != null ? ` · stock ${p.stock}` : ""}
                              </p>
                            </div>
                            <span className="text-sm tabular-nums shrink-0">${money(price)}</span>
                            <Plus className="h-4 w-4 text-primary shrink-0" />
                          </button>
                        </li>
                      )
                    })
                  )}
                </ul>
              )}

              {lines.length > 0 ? (
                <div className="rounded-lg border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead className="w-24 text-right">Cant.</TableHead>
                        <TableHead className="w-28">IVA</TableHead>
                        <TableHead className="w-28 text-right">P. unit.</TableHead>
                        <TableHead className="w-28 text-right">Subtotal</TableHead>
                        <TableHead className="w-12" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lines.map((l) => (
                        <TableRow key={l.key}>
                          <TableCell>
                            <div className="font-medium text-sm">{l.name}</div>
                            {l.code ? (
                              <Badge variant="outline" className="mt-0.5 font-mono text-[10px]">
                                {l.code}
                              </Badge>
                            ) : null}
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              min={1}
                              className="h-8 text-right"
                              value={l.quantity}
                              onChange={(e) =>
                                updateLine(l.key, {
                                  quantity: Math.max(1, parseInt(e.target.value, 10) || 1),
                                })
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <IvaRateSelect
                              value={requiresZeroItemIva ? 0 : l.iva_rate}
                              onChange={(rate) => updateLine(l.key, { iva_rate: rate })}
                              size="sm"
                              disabled={requiresZeroItemIva}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              className="h-8 text-right"
                              value={l.unit_price}
                              onChange={(e) =>
                                updateLine(l.key, {
                                  unit_price: Math.max(0, parseFloat(e.target.value) || 0),
                                })
                              }
                            />
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-sm font-medium">
                            ${money(l.quantity * l.unit_price)}
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => removeLine(l.key)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">
                  Todavía no hay líneas. Buscá y agregá productos del catálogo.
                </p>
              )}
            </section>
          </div>

          <DialogFooter className="shrink-0 border-t px-6 py-4 flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-sm text-muted-foreground space-y-0.5 w-full sm:w-auto">
              <p>
                {lines.length} ítem{lines.length === 1 ? "" : "s"} · {totals.units} u.
                {totals.discount > 0 ? ` · desc. $${money(totals.discount)}` : ""}
              </p>
              <p className="text-base font-semibold text-foreground tabular-nums">
                Total ${money(totals.total)}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  (IVA ref. ${money(totals.ivaTotal)} ·{" "}
                  {requiresZeroItemIva ? formatSaleIvaRateLabel(0) : "según líneas"})
                </span>
              </p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto justify-end">
              <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={loading || !selectedCliente || lines.length === 0}
              >
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Guardar pedido
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {confirmDialog}
    </>
  )
}
