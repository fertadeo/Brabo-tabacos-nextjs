"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { ERPLayout } from "@/components/erp-layout"
import { Protected } from "@/components/protected"
import { useRole } from "@/app/hooks/useRole"
import type { Role } from "@/app/config/menu"
import {
  deleteCommercialBudget,
  ensureCommercialBudgetApproved,
  getCommercialBudgetById,
  getClienteById,
  getClientes,
  getProducts,
  updateCommercialBudget,
  type CommercialBudgetDetail,
  type Cliente,
  type Product,
  type ApiBudgetError,
} from "@/lib/api"
import { commercialBudgetDetailToPdfData } from "@/lib/commercial-budget-pdf-mapper"
import {
  budgetDetailDraftLinesToApiItems,
  budgetDetailDraftToLineItems,
  linesFromBudgetDetail,
  type BudgetDetailDraftLine,
} from "@/lib/budget-lines"
import {
  budgetHasUsdLines,
  computeBudgetHeaderTotal,
  formatBudgetMoney,
  formatBudgetTotalsSummary,
  formatExchangeRate,
  resolveBudgetLineCurrency,
} from "@/lib/budget-currency"
import { withBudgetCurrencyChange, withBudgetUnitPriceEdit } from "@/lib/budget-line-handlers"
import type { SaleCurrency } from "@/lib/pos-usd"
import { getDollarRate } from "@/lib/product-pricing"
import { BudgetLinesPanel } from "@/components/budget-lines-panel"
import { BudgetProductCatalog } from "@/components/budget-product-catalog"
import { PosManualItemCard } from "@/components/pos-manual-item-card"
import { BudgetPdfModal } from "@/components/budget-pdf-modal"
import { BudgetConvertSaleDialog } from "@/components/budget-convert-sale-dialog"
import { ClientePicker } from "@/components/cliente-picker"
import { SaleClienteSection } from "@/components/sale-cliente-section"
import { getClienteDisplayName } from "@/lib/cliente-display"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ArrowLeft, CheckCircle2, FileText, Loader2, Plus, Save, Trash2 } from "lucide-react"
import { toast } from "sonner"

const ROLES_VER: Role[] = [
  "admin",
  "gerencia",
  "ventas",
  "finanzas",
  "logistica",
  "manager",
  "employee",
  "viewer",
]
const ROLES_EDITAR: Role[] = ["admin", "gerencia", "ventas"]
const ROLES_ELIMINAR: Role[] = ["admin", "gerencia"]

function formatMoney(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n)
}

function formatDate(iso: string | null) {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleString("es-AR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return iso
  }
}

export default function PresupuestoDetallePage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = String(params.id ?? "")
  const { hasAnyOfRoles } = useRole()
  const puedeEditar = hasAnyOfRoles(ROLES_EDITAR)
  const puedeEliminar = hasAnyOfRoles(ROLES_ELIMINAR)

  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<CommercialBudgetDetail | null>(null)
  const [pdfOpen, setPdfOpen] = useState(false)
  const [convertOpen, setConvertOpen] = useState(false)

  const [notes, setNotes] = useState("")
  const [validUntil, setValidUntil] = useState("")
  const [clientId, setClientId] = useState<number | null>(null)
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null)
  const [clientSearch, setClientSearch] = useState("")
  const [clients, setClients] = useState<Cliente[]>([])
  const [draftLines, setDraftLines] = useState<BudgetDetailDraftLine[]>([])
  const [allowInactiveDraft, setAllowInactiveDraft] = useState(false)
  const [exchangeRate, setExchangeRate] = useState<number | null>(null)

  const [products, setProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [showAddProduct, setShowAddProduct] = useState(false)

  const [saving, setSaving] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const [confirm, setConfirm] = useState<{
    title: string
    description: string
    action: () => Promise<void>
    destructive?: boolean
  } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getCommercialBudgetById(id)
      const d = res.data
      setDetail(d)
      setNotes(d.notes ?? "")
      setValidUntil(d.valid_until ? d.valid_until.split("T")[0] : "")
      setClientId(d.client_id)
      setSelectedCliente(null)
      setClientSearch("")
      setDraftLines(linesFromBudgetDetail(d.items || []))
      setExchangeRate(d.exchange_rate != null ? Number(d.exchange_rate) : null)
      if (d.exchange_rate == null) {
        void getDollarRate()
          .then((data) => setExchangeRate(data.current_rate > 0 ? data.current_rate : null))
          .catch(() => setExchangeRate(null))
      }
      if (d.client_id) {
        void getClienteById(d.client_id)
          .then((cliente) => {
            setSelectedCliente(cliente)
            setClientSearch(getClienteDisplayName(cliente))
          })
          .catch(() => setSelectedCliente(null))
      }
    } catch (e: unknown) {
      const err = e as { status?: number; message?: string }
      if (err?.status === 401) router.replace("/login")
      else if (err?.status === 404) toast.error("Presupuesto no encontrado")
      else toast.error(err?.message ?? "Error al cargar")
      setDetail(null)
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (searchParams.get("pdf") === "1" && detail && !loading) {
      setPdfOpen(true)
    }
  }, [searchParams, detail, loading])

  useEffect(() => {
    if (!detail || detail.status === "rejected" || detail.status === "expired") return
    let cancelled = false
    setLoadingProducts(true)
    ;(async () => {
      try {
        const data = await getProducts(1, 500, false)
        const list = Array.isArray(data) ? data : (data as { products: Product[] }).products || []
        if (!cancelled) setProducts(list)
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoadingProducts(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [detail?.status, detail?.id])

  useEffect(() => {
    if (clientSearch.trim().length < 2) {
      setClients([])
      return
    }
    const t = setTimeout(() => {
      getClientes(1, 20, clientSearch.trim(), "active")
        .then((r) => setClients(r.clients || []))
        .catch(() => setClients([]))
    }, 300)
    return () => clearTimeout(t)
  }, [clientSearch])

  const pdfPayload = useMemo(() => (detail ? commercialBudgetDetailToPdfData(detail) : null), [detail])
  const productsById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products]
  )
  const draftLineItems = useMemo(
    () => budgetDetailDraftToLineItems(draftLines, productsById),
    [draftLines, productsById]
  )
  const draftTotal = useMemo(
    () => computeBudgetHeaderTotal(draftLines, exchangeRate ?? detail?.exchange_rate),
    [draftLines, exchangeRate, detail?.exchange_rate]
  )
  const draftTotalSummary = useMemo(
    () => formatBudgetTotalsSummary(draftLines, exchangeRate ?? detail?.exchange_rate),
    [draftLines, exchangeRate, detail?.exchange_rate]
  )

  const lineProductIds = useMemo(
    () => draftLines.filter((l) => l.product_id != null).map((l) => l.product_id as number),
    [draftLines]
  )

  async function saveChanges() {
    if (!detail || !puedeEditar) return
    if (!clientId) {
      toast.error("Cliente requerido")
      return
    }
    const isDraft = detail.status === "draft"
    if (isDraft) {
      const invalidCustom = draftLines.some((l) => l.is_custom && !(l.description || l.product_name).trim())
      if (invalidCustom) {
        toast.error("Hay un ítem escrito sin descripción")
        return
      }
      if (draftLines.length === 0) {
        toast.error("El presupuesto debe tener al menos un ítem")
        return
      }
      const effectiveRate = exchangeRate ?? detail.exchange_rate ?? null
      if (budgetHasUsdLines(draftLines) && (!effectiveRate || effectiveRate <= 0)) {
        toast.error("No hay cotización del dólar para guardar ítems en USD")
        return
      }
    }
    setSaving(true)
    try {
      const body: Parameters<typeof updateCommercialBudget>[1] = {
        client_id: clientId,
        valid_until: validUntil.trim() || null,
        notes: notes.trim() || null,
      }
      if (isDraft) {
        body.items = budgetDetailDraftLinesToApiItems(draftLines)
        body.allow_inactive = allowInactiveDraft
        if (budgetHasUsdLines(draftLines)) {
          body.exchange_rate = exchangeRate ?? detail.exchange_rate ?? null
        }
      }
      const updated = await updateCommercialBudget(detail.id, body)
      setDetail(updated)
      setDraftLines(linesFromBudgetDetail(updated.items || []))
      toast.success("Cambios guardados")
    } catch (e: unknown) {
      const err = e as ApiBudgetError
      toast.error(err?.message ?? "No se pudo guardar")
    } finally {
      setSaving(false)
    }
  }

  function addProductLine(p: Product) {
    const exists = draftLines.find((l) => l.product_id === p.id)
    if (exists) {
      setDraftLines((prev) =>
        prev.map((l) => (l.product_id === p.id ? { ...l, quantity: l.quantity + 1 } : l))
      )
      toast.message("Cantidad +1", { description: p.name })
      return
    }
    const tempId = -Date.now()
    setDraftLines((prev) => [
      ...prev,
      {
        id: tempId,
        product_id: p.id,
        product_name: p.name,
        product_code: p.code,
        description: "",
        is_custom: false,
        quantity: 1,
        unit_price: Number(p.price) || 0,
        currency: "ARS",
      },
    ])
    toast.message("Producto agregado", { description: p.name })
  }

  function addCustomLine(payload: { description: string; quantity: number; unit_price: number }) {
    const tempId = -Date.now()
    setDraftLines((prev) => [
      ...prev,
      {
        id: tempId,
        product_id: null,
        product_name: payload.description,
        product_code: "",
        description: payload.description,
        is_custom: true,
        quantity: payload.quantity,
        unit_price: payload.unit_price,
        currency: "ARS",
      },
    ])
    toast.message("Ítem agregado", { description: payload.description })
  }

  function updateDraftLine(id: number, patch: Partial<BudgetDetailDraftLine>) {
    setDraftLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  }

  function updateDraftLineUnitPrice(id: number, unitPrice: number) {
    const rate = exchangeRate ?? detail?.exchange_rate ?? null
    if (!rate || rate <= 0) {
      updateDraftLine(id, { unit_price: unitPrice })
      return
    }
    setDraftLines((prev) =>
      prev.map((line) => {
        if (line.id !== id) return line
        const product = line.product_id != null ? productsById.get(line.product_id) : undefined
        return withBudgetUnitPriceEdit({ ...line, product }, unitPrice, rate)
      })
    )
  }

  function updateDraftLineCurrency(id: number, currency: SaleCurrency) {
    const rate = exchangeRate ?? detail?.exchange_rate ?? null
    if (!rate || rate <= 0) {
      toast.error("No hay cotización del dólar disponible")
      return
    }
    setDraftLines((prev) =>
      prev.map((line) => {
        if (line.id !== id) return line
        const product = line.product_id != null ? productsById.get(line.product_id) : undefined
        return withBudgetCurrencyChange({ ...line, product }, currency, rate)
      })
    )
  }

  function updateDraftLineDescription(id: number, name: string) {
    updateDraftLine(id, { description: name, product_name: name })
  }

  function removeDraftLine(id: number) {
    setDraftLines((prev) => prev.filter((l) => l.id !== id))
  }

  function runConfirm() {
    if (!confirm) return
    const fn = confirm.action
    setConfirm(null)
    void (async () => {
      setActionLoading("confirm")
      try {
        await fn()
        await load()
      } catch (e: unknown) {
        toast.error((e as Error)?.message ?? "Error")
      } finally {
        setActionLoading(null)
      }
    })()
  }

  if (loading) {
    return (
      <Protected requiredRoles={ROLES_VER}>
        <ERPLayout activeItem="presupuestos">
          <div className="flex justify-center py-24 text-muted-foreground gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            Cargando presupuesto…
          </div>
        </ERPLayout>
      </Protected>
    )
  }

  if (!detail) {
    return (
      <Protected requiredRoles={ROLES_VER}>
        <ERPLayout activeItem="presupuestos">
          <p className="text-muted-foreground">No se encontró el presupuesto.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/presupuestos">Volver</Link>
          </Button>
        </ERPLayout>
      </Protected>
    )
  }

  const readonly = detail.status === "rejected" || detail.status === "expired"
  const editableDraft = puedeEditar && detail.status === "draft"
  const editableMeta =
    puedeEditar && (detail.status === "draft" || detail.status === "sent" || detail.status === "approved")
  const itemsReadonly = !editableDraft

  return (
    <Protected requiredRoles={ROLES_VER}>
      <ERPLayout activeItem="presupuestos">
        <div className="max-w-5xl mx-auto space-y-6 pb-12">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/presupuestos" className="gap-1">
                <ArrowLeft className="h-4 w-4" />
                Listado
              </Link>
            </Button>
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3 min-w-0 flex-1">
              <div>
                <h1 className="text-2xl font-bold font-mono tracking-tight mb-1">{detail.budget_number}</h1>
                <p className="text-xs text-muted-foreground">
                  Creado {formatDate(detail.created_at)} · Actualizado {formatDate(detail.updated_at)}
                </p>
              </div>
              <SaleClienteSection
                clientId={clientId ?? detail.client_id}
                cliente={selectedCliente}
                saleSnapshot={detail}
                fallbackName={detail.client_name}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="default" size="sm" className="gap-1 shadow-sm" onClick={() => setPdfOpen(true)}>
                <FileText className="h-4 w-4" />
                Ver / descargar PDF
              </Button>
              {editableMeta && (
                <Button
                  size="sm"
                  className="gap-1"
                  disabled={actionLoading === "convert"}
                  onClick={async () => {
                    setActionLoading("convert")
                    try {
                      await ensureCommercialBudgetApproved(detail.id)
                      setConvertOpen(true)
                    } catch (e: unknown) {
                      toast.error((e as Error)?.message ?? "No se pudo preparar la venta")
                    } finally {
                      setActionLoading(null)
                    }
                  }}
                >
                  {actionLoading === "convert" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Convertir a venta
                </Button>
              )}
            </div>
          </div>

          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="pt-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total cotizado</p>
                <p className="text-3xl font-bold tabular-nums">
                  {formatBudgetMoney(editableDraft ? draftTotal : detail.total_amount, "ARS")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {editableDraft
                    ? draftTotalSummary
                    : formatBudgetTotalsSummary(detail.items || [], detail.exchange_rate)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {detail.item_count ?? detail.items?.length ?? 0} ítem(s) · sin movimiento de stock
                </p>
              </div>
              {editableDraft && puedeEliminar && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive gap-1"
                  disabled={!!actionLoading}
                  onClick={() =>
                    setConfirm({
                      title: "Eliminar presupuesto",
                      description: "Se eliminará el presupuesto y todas sus líneas. No se puede deshacer.",
                      destructive: true,
                      action: async () => {
                        await deleteCommercialBudget(detail.id)
                        toast.success("Presupuesto eliminado")
                        router.push("/presupuestos")
                      },
                    })
                  }
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar
                </Button>
              )}
            </CardContent>
          </Card>

          {editableMeta && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Editar presupuesto</CardTitle>
                <CardDescription>
                  {editableDraft
                    ? "Cliente, líneas, notas y vigencia. Guardá los cambios antes de convertir a venta."
                    : "En este estado solo podés corregir cliente, notas y vigencia. Los ítems ya no se modifican."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Cambiar cliente</Label>
                  <ClientePicker
                    searchValue={clientSearch}
                    onSearchChange={(value) => {
                      setClientSearch(value)
                      if (selectedCliente && value.trim() !== getClienteDisplayName(selectedCliente)) {
                        setClientId(null)
                        setSelectedCliente(null)
                      }
                    }}
                    results={clients}
                    selectedCliente={selectedCliente}
                    onSelect={(cliente) => {
                      setClientId(cliente.id)
                      setSelectedCliente(cliente)
                      setClientSearch(getClienteDisplayName(cliente))
                      setClients([])
                    }}
                    onClear={() => {
                      setClientId(null)
                      setSelectedCliente(null)
                      setClientSearch("")
                      setClients([])
                    }}
                    placeholder="Buscar por nombre, CUIT, código o dirección…"
                    clearLabel="Quitar cliente"
                  />
                </div>
                {editableDraft && (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="aid"
                      checked={allowInactiveDraft}
                      onCheckedChange={(c) => setAllowInactiveDraft(c === true)}
                    />
                    <Label htmlFor="aid" className="text-sm font-normal cursor-pointer">
                      Permitir productos inactivos al guardar
                    </Label>
                  </div>
                )}
                <div className="grid gap-4 sm:grid-cols-2 max-w-xl">
                  <div className="space-y-2">
                    <Label>Válido hasta</Label>
                    <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2 max-w-2xl">
                  <Label>Notas</Label>
                  <Textarea rows={4} maxLength={5000} value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
                <Button onClick={saveChanges} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Guardar cambios
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle>Ítems</CardTitle>
                <CardDescription>Productos del catálogo o ítems escritos</CardDescription>
              </div>
              {editableDraft && (
                <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => setShowAddProduct((v) => !v)}>
                  <Plus className="h-4 w-4" />
                  Agregar producto
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {editableDraft && showAddProduct && (
                <div className="rounded-lg border p-3 bg-muted/20 space-y-4">
                  <BudgetProductCatalog
                    products={products}
                    loading={loadingProducts}
                    onAddProduct={addProductLine}
                    lineProductIds={lineProductIds}
                  />
                </div>
              )}
              {editableDraft && (
                <PosManualItemCard
                  onAdd={addCustomLine}
                  addLabel="Agregar ítem escrito"
                  inputIdPrefix="budget-detail-manual"
                />
              )}
              {editableDraft ? (
                <BudgetLinesPanel
                  lines={draftLineItems}
                  total={draftTotal}
                  totalLabel={budgetHasUsdLines(draftLines) ? "Total estimado (ARS)" : "Total estimado"}
                  exchangeRate={exchangeRate ?? detail.exchange_rate}
                  formatMoney={(n) => formatBudgetMoney(n, "ARS")}
                  onUpdateQuantity={(key, quantity) => updateDraftLine(Number(key), { quantity })}
                  onUpdateUnitPrice={(key, unitPrice) => updateDraftLineUnitPrice(Number(key), unitPrice)}
                  onUpdateCurrency={(key, currency) => updateDraftLineCurrency(Number(key), currency)}
                  onUpdateName={(key, name) => updateDraftLineDescription(Number(key), name)}
                  onRemove={(key) => removeDraftLine(Number(key))}
                />
              ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descripción</TableHead>
                      <TableHead className="w-20">Mon.</TableHead>
                      <TableHead className="w-28">Cant.</TableHead>
                      <TableHead className="text-right w-32">P. unit.</TableHead>
                      <TableHead className="text-right w-36">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {linesFromBudgetDetail(detail.items || []).map((row) => {
                      const currency = resolveBudgetLineCurrency(row.currency)
                      return (
                      <TableRow key={row.id}>
                        <TableCell>
                          <div className="font-medium text-sm">
                            {row.is_custom ? row.description || row.product_name : row.product_name}
                          </div>
                          {!row.is_custom && row.product_code && (
                            <div className="text-xs font-mono text-muted-foreground">{row.product_code}</div>
                          )}
                        </TableCell>
                        <TableCell>{currency}</TableCell>
                        <TableCell>{row.quantity}</TableCell>
                        <TableCell className="text-right">
                          {formatBudgetMoney(row.unit_price, currency)}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatBudgetMoney(row.quantity * row.unit_price, currency)}
                        </TableCell>
                      </TableRow>
                    )})}
                  </TableBody>
                </Table>
              </div>
              )}
            </CardContent>
          </Card>

          {readonly && (
            <Card className="border-dashed">
              <CardContent className="py-6 text-sm text-muted-foreground">
                Este presupuesto está cerrado y no se puede editar.
              </CardContent>
            </Card>
          )}

          <Separator />

          <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
            Los presupuestos no reservan stock. La conversión a venta usa el mismo flujo que el POS y
            valida disponibilidad en ese momento. Las{" "}
            <Link href="/reparaciones" className="underline underline-offset-2">
              órdenes de reparación
            </Link>{" "}
            tienen otro circuito (presupuesto de taller).
          </p>
        </div>

        <BudgetPdfModal
          isOpen={pdfOpen}
          onClose={() => setPdfOpen(false)}
          budget={pdfPayload}
          documentVariant="catalog"
        />

        <BudgetConvertSaleDialog
          open={convertOpen}
          onOpenChange={setConvertOpen}
          budget={detail}
          onSuccess={({ saleId, saleNumber }) => {
            toast.info("Podés ver la venta en el módulo de ventas", {
              description: `${saleNumber} (id ${saleId})`,
              duration: 6000,
            })
          }}
        />

        <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{confirm?.title}</DialogTitle>
              <DialogDescription>{confirm?.description}</DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setConfirm(null)} disabled={actionLoading === "confirm"}>
                Cancelar
              </Button>
              <Button
                variant={confirm?.destructive ? "destructive" : "default"}
                onClick={runConfirm}
                disabled={actionLoading === "confirm"}
                className="gap-2"
              >
                {actionLoading === "confirm" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Confirmar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </ERPLayout>
    </Protected>
  )
}
