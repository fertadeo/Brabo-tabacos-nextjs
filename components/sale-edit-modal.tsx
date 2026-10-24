"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { BudgetProductCatalog } from "@/components/budget-product-catalog"
import { PosManualItemCard } from "@/components/pos-manual-item-card"
import { PosCartItemRow } from "@/components/pos-cart-item-row"
import {
  getClienteById,
  getClientes,
  getProductById,
  getProducts,
  updateSale,
  type Cliente,
  type Product,
  type SaleCurrency,
  type SalePaymentMethod,
  type SaleResponseData,
  type UpdateSaleRequest,
} from "@/lib/api"
import {
  getPosCartLineKey,
  newCustomLineId,
  type PosCartLine,
} from "@/lib/pos-cart"
import { canAddPosCatalogProduct } from "@/lib/pos-products"
import {
  posCartLinesToCreateSaleItems,
  saleItemCatalogProductIds,
  saleItemsToPosCartLines,
} from "@/lib/sale-items"
import {
  clienteRequiresZeroItemIva,
  effectiveSaleItemIvaRate,
} from "@/lib/facturacion-cliente-fiscal"
import { computeSaleIvaBreakdown, productIvaRate, type SaleIvaRate } from "@/lib/sale-iva"
import { SaleEditConfirmDialog } from "@/components/sale-edit-confirm-dialog"
import { ClientePicker } from "@/components/cliente-picker"
import { getClienteDisplayName } from "@/lib/cliente-display"
import {
  buildSaleEditConfirmSummary,
  cartToLineSnapshots,
  clientLabelFromSale,
  type SaleEditConfirmSummary,
  type SaleEditOriginalSnapshot,
} from "@/lib/sale-edit-summary"
import { useConfirmBeforeClose } from "@/lib/use-confirm-before-close"
import { SaleCurrencyNotice } from "@/components/sale-currency-notice"
import { SaleCurrencyBadge } from "@/components/sale-currency-badge"
import { getDollarRate } from "@/lib/product-pricing"
import {
  applyUsdUnitPriceEdit,
  arsToUsd,
  convertCartLineToArs,
  convertCartLineToUsd,
  formatSaleMoney,
  isUsdSale,
  recalcUsdCartLine,
  resolveSaleCurrency,
  usdToArs,
} from "@/lib/pos-usd"
import { Loader2, Plus, RefreshCw, Save } from "lucide-react"
import { toast } from "sonner"

const PAYMENT_LABELS: Record<SalePaymentMethod, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
  mixto: "Mixto",
}

function formatEditMoney(n: number, currency: SaleCurrency) {
  return formatSaleMoney(n, resolveSaleCurrency(currency), { maximumFractionDigits: 2, minimumFractionDigits: 2 })
}

interface SaleEditModalProps {
  sale: SaleResponseData | null
  isOpen: boolean
  onClose: () => void
  onSaved: (sale: SaleResponseData) => void
}

export function SaleEditModal({ sale, isOpen, onClose, onSaved }: SaleEditModalProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [cart, setCart] = useState<PosCartLine[]>([])
  const [originalTotal, setOriginalTotal] = useState(0)
  const [clientId, setClientId] = useState<number | null>(null)
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null)
  const [clientDisplayName, setClientDisplayName] = useState("Consumidor final")
  const [originalSnapshot, setOriginalSnapshot] = useState<SaleEditOriginalSnapshot | null>(null)
  const [clientSearch, setClientSearch] = useState("")
  const [clients, setClients] = useState<Cliente[]>([])
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmSummary, setConfirmSummary] = useState<SaleEditConfirmSummary | null>(null)
  const [notes, setNotes] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<SalePaymentMethod>("efectivo")
  const [originalPaymentMethod, setOriginalPaymentMethod] = useState<SalePaymentMethod>("efectivo")
  const [paymentDetails, setPaymentDetails] = useState({ efectivo: 0, tarjeta: 0, transferencia: 0 })
  const [allowInactive, setAllowInactive] = useState(false)
  const [syncWoo, setSyncWoo] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [saleCurrency, setSaleCurrency] = useState<SaleCurrency>("ARS")
  const [exchangeRate, setExchangeRate] = useState<number | null>(null)
  const [exchangeRateInput, setExchangeRateInput] = useState("")
  const [dollarRateLoading, setDollarRateLoading] = useState(false)
  const [dollarRateError, setDollarRateError] = useState<string | null>(null)
  const [dollarRateLabel, setDollarRateLabel] = useState<string | null>(null)

  const initFromSale = useCallback(async (s: SaleResponseData) => {
    setLoading(true)
    try {
      const ids = saleItemCatalogProductIds(s.items || [])
      const productById: Record<number, Product> = {}
      await Promise.all(
        ids.map(async (id) => {
          try {
            productById[id] = await getProductById(id)
          } catch {
            /* stub en saleItemsToPosCartLines */
          }
        })
      )
      const initialCartRaw = saleItemsToPosCartLines(s.items || [], productById)
      const currency = resolveSaleCurrency(s.currency)
      const rate = s.exchange_rate ?? null
      const initialCart =
        currency === "USD" && rate && rate > 0
          ? initialCartRaw.map((line) => ({
              ...line,
              ars_unit_price: usdToArs(line.unit_price, rate),
            }))
          : initialCartRaw
      const clientLabel = clientLabelFromSale(s.client_id, s.client_name)
      setCart(initialCart)
      setOriginalTotal(s.total_amount)
      setClientId(s.client_id)
      setSelectedCliente(null)
      setClientDisplayName(clientLabel)
      if (s.client_id) {
        void getClienteById(s.client_id)
          .then((cliente) => {
            setSelectedCliente(cliente)
            setClientSearch(getClienteDisplayName(cliente))
          })
          .catch(() => setSelectedCliente(null))
      }
      setOriginalSnapshot({
        clientId: s.client_id,
        clientLabel,
        notes: s.notes ?? "",
        paymentMethod: s.payment_method,
        currency,
        exchangeRate: rate,
        total: s.total_amount,
        lines: cartToLineSnapshots(initialCart),
      })
      setSaleCurrency(currency)
      setExchangeRate(rate)
      setExchangeRateInput(rate != null ? String(rate) : "")
      setDollarRateError(null)
      setDollarRateLabel(null)
      setNotes(s.notes ?? "")
      setPaymentMethod(s.payment_method)
      setOriginalPaymentMethod(s.payment_method)
      const pd = s.payment_details
      setPaymentDetails({
        efectivo: pd?.efectivo ?? (s.payment_method === "mixto" ? 0 : s.total_amount),
        tarjeta: pd?.tarjeta ?? 0,
        transferencia: pd?.transferencia ?? 0,
      })
      setAllowInactive(false)
      setSyncWoo(s.sync_status === "synced")
      setDirty(false)
      setShowAddProduct(false)
      setClientSearch("")
      setClients([])
      setConfirmOpen(false)
      setConfirmSummary(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen && sale) {
      void initFromSale(sale)
    }
  }, [isOpen, sale?.id, initFromSale, sale])

  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    setLoadingProducts(true)
    getProducts(1, 500, false)
      .then((data) => {
        if (cancelled) return
        const list = Array.isArray(data) ? data : (data as { products: Product[] }).products || []
        setProducts(list)
      })
      .catch(() => {
        if (!cancelled) setProducts([])
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
      getClientes(1, 20, clientSearch.trim(), "active")
        .then((r) => setClients(r.clients || []))
        .catch(() => setClients([]))
    }, 300)
    return () => clearTimeout(t)
  }, [clientSearch])

  async function loadSuggestedExchangeRate() {
    setDollarRateLoading(true)
    setDollarRateError(null)
    try {
      const data = await getDollarRate()
      const rate = data.current_rate
      setExchangeRate(rate)
      setExchangeRateInput(String(rate))
      setDollarRateLabel(data.quote?.dollar_label ?? "Dólar del día")
      if (isUsdSale(saleCurrency) && cart.length > 0) {
        setCart((prev) => prev.map((line) => recalcUsdCartLine(line, rate)))
        markDirty()
      }
    } catch (e) {
      setDollarRateError(e instanceof Error ? e.message : "No se pudo cargar la cotización")
    } finally {
      setDollarRateLoading(false)
    }
  }

  function handleSaleCurrencyChange(next: SaleCurrency) {
    if (next === saleCurrency) return
    if (next === "USD") {
      setSaleCurrency("USD")
      void loadSuggestedExchangeRate()
      if (exchangeRate && exchangeRate > 0) {
        setCart((prev) => prev.map((line) => convertCartLineToUsd(line, exchangeRate)))
      }
      markDirty()
      return
    }
    setSaleCurrency("ARS")
    setCart((prev) => prev.map((line) => convertCartLineToArs(line)))
    markDirty()
  }

  function handleExchangeRateInputChange(raw: string) {
    setExchangeRateInput(raw)
    const parsed = Number(raw.replace(",", "."))
    if (!Number.isFinite(parsed) || parsed <= 0) return
    setExchangeRate(parsed)
    if (isUsdSale(saleCurrency)) {
      setCart((prev) => prev.map((line) => recalcUsdCartLine(line, parsed)))
      markDirty()
    }
  }

  const total = useMemo(
    () => cart.reduce((sum, i) => sum + i.quantity * i.unit_price, 0),
    [cart]
  )

  const totalChanged = Math.abs(total - originalTotal) >= 0.01
  const paymentMethodChanged = paymentMethod !== originalPaymentMethod
  const needsMixtoDetails =
    paymentMethod === "mixto" && (totalChanged || paymentMethodChanged)

  const mixtoSum = paymentDetails.efectivo + paymentDetails.tarjeta + paymentDetails.transferencia
  const mixtoValid = !needsMixtoDetails || Math.abs(mixtoSum - total) < 0.02

  const ivaBreakdown = useMemo(
    () =>
      computeSaleIvaBreakdown(
        cart.map((line) => ({
          subtotal: line.quantity * line.unit_price,
          iva_rate: line.iva_rate,
        }))
      ),
    [cart]
  )

  const requiresZeroItemIva = useMemo(
    () => clienteRequiresZeroItemIva(selectedCliente),
    [selectedCliente]
  )

  useEffect(() => {
    if (!isOpen || !requiresZeroItemIva) return
    setCart((prev) =>
      prev.some((line) => line.iva_rate !== 0)
        ? prev.map((line) => (line.iva_rate === 0 ? line : { ...line, iva_rate: 0 as SaleIvaRate }))
        : prev
    )
  }, [isOpen, requiresZeroItemIva, selectedCliente?.id])

  const lineProductIds = useMemo(
    () =>
      cart
        .filter((l) => l.kind === "catalog")
        .map((l) => (l.kind === "catalog" ? l.product.id : 0)),
    [cart]
  )

  function markDirty() {
    setDirty(true)
  }

  function addProductLine(p: Product) {
    if (!canAddPosCatalogProduct(p)) {
      toast.error("Sin stock disponible para este producto")
      return
    }
    const arsPrice = Number(p.price) || 0
    const unitPrice =
      isUsdSale(saleCurrency) && exchangeRate && exchangeRate > 0
        ? arsToUsd(arsPrice, exchangeRate)
        : arsPrice
    const exists = cart.find((l) => l.kind === "catalog" && l.product.id === p.id)
    if (exists) {
      setCart((prev) =>
        prev.map((l) =>
          l.kind === "catalog" && l.product.id === p.id
            ? { ...l, quantity: l.quantity + 1 }
            : l
        )
      )
    } else {
      setCart((prev) => [
        ...prev,
        {
          kind: "catalog" as const,
          product: p,
          quantity: 1,
          unit_price: unitPrice,
          iva_rate: effectiveSaleItemIvaRate(productIvaRate(p), selectedCliente),
          ...(isUsdSale(saleCurrency) ? { ars_unit_price: arsPrice } : {}),
        },
      ])
    }
    markDirty()
    toast.message("Producto agregado", { description: p.name })
  }

  function addCustomLine(payload: {
    description: string
    quantity: number
    unit_price: number
    iva_rate?: SaleIvaRate
  }) {
    const arsPrice = payload.unit_price
    const unitPrice =
      isUsdSale(saleCurrency) && exchangeRate && exchangeRate > 0
        ? arsToUsd(arsPrice, exchangeRate)
        : arsPrice
    setCart((prev) => [
      ...prev,
      {
        kind: "custom",
        lineId: newCustomLineId(),
        description: payload.description,
        quantity: payload.quantity,
        unit_price: unitPrice,
        iva_rate: effectiveSaleItemIvaRate(payload.iva_rate ?? 21, selectedCliente),
        ...(isUsdSale(saleCurrency) ? { ars_unit_price: arsPrice } : {}),
      },
    ])
    markDirty()
  }

  function updateCartQuantity(lineKey: string, delta: number) {
    setCart((prev) => {
      const item = prev.find((i) => getPosCartLineKey(i) === lineKey)
      if (!item) return prev
      const newQty = item.quantity + delta
      if (newQty <= 0) return prev.filter((i) => getPosCartLineKey(i) !== lineKey)
      return prev.map((i) =>
        getPosCartLineKey(i) === lineKey ? { ...i, quantity: newQty } : i
      )
    })
    markDirty()
  }

  function removeFromCart(lineKey: string) {
    setCart((prev) => prev.filter((i) => getPosCartLineKey(i) !== lineKey))
    markDirty()
  }

  function setCartUnitPrice(lineKey: string, unit_price: number) {
    setCart((prev) =>
      prev.map((i) => {
        if (getPosCartLineKey(i) !== lineKey) return i
        if (isUsdSale(saleCurrency) && exchangeRate && exchangeRate > 0) {
          return applyUsdUnitPriceEdit(i, unit_price, exchangeRate)
        }
        return { ...i, unit_price }
      })
    )
    markDirty()
  }

  function setCartIvaRate(lineKey: string, iva_rate: SaleIvaRate) {
    setCart((prev) =>
      prev.map((i) => (getPosCartLineKey(i) === lineKey ? { ...i, iva_rate } : i))
    )
    markDirty()
  }

  function validateBeforeSave(): boolean {
    if (!sale) return false
    if (cart.length === 0) {
      toast.error("La venta debe tener al menos un ítem")
      return false
    }
    const invalidCustom = cart.some((i) => i.kind === "custom" && !i.description.trim())
    if (invalidCustom) {
      toast.error("Hay un ítem manual sin descripción")
      return false
    }
    if (needsMixtoDetails && !mixtoValid) {
      toast.error("En pago mixto, la suma debe coincidir con el nuevo total", {
        description: `${formatEditMoney(mixtoSum, saleCurrency)} ≠ ${formatEditMoney(total, saleCurrency)}`,
      })
      return false
    }
    if (isUsdSale(saleCurrency) && (!exchangeRate || exchangeRate <= 0)) {
      toast.error("Indicá una cotización USD/ARS válida para ventas en dólares")
      return false
    }
    return true
  }

  function buildUpdateBody(): UpdateSaleRequest {
    const body: UpdateSaleRequest = {
      client_id: clientId,
      notes: notes.trim() || null,
      items: posCartLinesToCreateSaleItems(cart),
      allow_inactive: allowInactive || undefined,
      sync_to_woocommerce: isUsdSale(saleCurrency) ? false : syncWoo || undefined,
    }
    const resolvedCurrency = resolveSaleCurrency(saleCurrency)
    if (isUsdSale(resolvedCurrency)) {
      if (exchangeRate) {
        body.currency = "USD"
        body.exchange_rate = exchangeRate
      }
    } else if (originalSnapshot && isUsdSale(originalSnapshot.currency)) {
      body.currency = "ARS"
    }
    if (paymentMethodChanged) {
      body.payment_method = paymentMethod
    }
    if (needsMixtoDetails) {
      body.payment_method = "mixto"
      body.payment_details = {
        efectivo: paymentDetails.efectivo,
        tarjeta: paymentDetails.tarjeta,
        transferencia: paymentDetails.transferencia,
      }
    }
    return body
  }

  function openConfirmSave() {
    if (!sale || !originalSnapshot) return
    if (!validateBeforeSave()) return
    const summary = buildSaleEditConfirmSummary({
      original: originalSnapshot,
      clientId,
      clientLabel: clientDisplayName,
      notes,
      paymentMethod,
      paymentLabel: (m) => PAYMENT_LABELS[m],
      currency: saleCurrency,
      exchangeRate,
      total,
      cart,
    })
    setConfirmSummary(summary)
    setConfirmOpen(true)
  }

  async function performSave() {
    if (!sale) return
    setSaving(true)
    try {
      const updated = await updateSale(sale.id, buildUpdateBody())
      toast.success("Venta actualizada")
      setDirty(false)
      setConfirmOpen(false)
      setConfirmSummary(null)
      onSaved(updated)
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar la venta")
    } finally {
      setSaving(false)
    }
  }

  const clientChanged = originalSnapshot != null && clientId !== originalSnapshot.clientId

  const [handleOpenChangeInner, confirmDialog] = useConfirmBeforeClose(
    () => onClose(),
    "¿Descartar cambios?",
    "Hay modificaciones sin guardar en esta venta."
  )

  function handleOpenChange(open: boolean) {
    if (open) return
    if (dirty) {
      handleOpenChangeInner(false)
    } else {
      onClose()
    }
  }

  if (!sale) return null

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar venta #{sale.sale_number}</DialogTitle>
            <DialogDescription>
              Corregí cliente, ítems, IVA o notas. Enviá siempre el carrito completo al guardar.
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex justify-center py-12 text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Cargando venta…
            </div>
          ) : (
            <div className="space-y-5 py-1">
              {totalChanged && (
                <Alert
                  variant="warning"
                  title="El total cambió"
                  description={`De ${formatEditMoney(originalTotal, saleCurrency)} a ${formatEditMoney(total, saleCurrency)}.${
                    originalPaymentMethod === "mixto" || paymentMethod === "mixto"
                      ? " Redistribuí el pago mixto antes de guardar."
                      : " La caja se actualizará automáticamente."
                  }`}
                />
              )}

              <div
                className={`rounded-lg border p-4 space-y-3 ${
                  isUsdSale(saleCurrency)
                    ? "border-amber-400/70 bg-amber-50/30 dark:border-amber-600/40 dark:bg-amber-950/15"
                    : "bg-muted/20"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-semibold">Moneda de cobro</Label>
                  {isUsdSale(saleCurrency) ? (
                    <SaleCurrencyBadge currency="USD" exchangeRate={exchangeRate} showRate className="ml-auto" />
                  ) : null}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(["ARS", "USD"] as const).map((cur) => (
                    <Button
                      key={cur}
                      type="button"
                      variant={saleCurrency === cur ? "default" : "outline"}
                      size="sm"
                      className={saleCurrency === cur && cur === "USD" ? "bg-amber-600 hover:bg-amber-600" : ""}
                      onClick={() => handleSaleCurrencyChange(cur)}
                    >
                      {cur === "ARS" ? "Pesos (ARS)" : "Dólares (USD)"}
                    </Button>
                  ))}
                </div>
                {isUsdSale(saleCurrency) ? (
                  <div className="space-y-2 rounded-md border border-amber-300/60 bg-background/80 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <Label htmlFor="sale-edit-exchange-rate" className="text-xs font-medium">
                        Cotización USD/ARS (obligatoria)
                      </Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => void loadSuggestedExchangeRate()}
                        disabled={dollarRateLoading}
                      >
                        <RefreshCw className={`h-3.5 w-3.5 mr-1 ${dollarRateLoading ? "animate-spin" : ""}`} />
                        Sugerir del día
                      </Button>
                    </div>
                    <Input
                      id="sale-edit-exchange-rate"
                      type="number"
                      min={0}
                      step={0.01}
                      value={exchangeRateInput}
                      onChange={(e) => handleExchangeRateInputChange(e.target.value)}
                      placeholder="Ej. 1200"
                    />
                    {dollarRateLabel ? (
                      <p className="text-xs text-muted-foreground">
                        Sugerencia: {dollarRateLabel}
                        {exchangeRate ? ` · ${exchangeRate.toLocaleString("es-AR")} ARS/USD` : ""}
                      </p>
                    ) : null}
                    {dollarRateError ? (
                      <p className="text-xs text-destructive">{dollarRateError}</p>
                    ) : null}
                    <SaleCurrencyNotice variant="panel" currency="USD" exchangeRate={exchangeRate} />
                  </div>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label>Cliente</Label>
                <ClientePicker
                  searchValue={clientSearch}
                  onSearchChange={(value) => {
                    setClientSearch(value)
                    if (selectedCliente && value.trim() !== getClienteDisplayName(selectedCliente)) {
                      setClientId(null)
                      setSelectedCliente(null)
                      setClientDisplayName("Consumidor final")
                    }
                    if (!value.trim() && clientId != null) {
                      setClientId(null)
                      setSelectedCliente(null)
                      setClientDisplayName("Consumidor final")
                    }
                    markDirty()
                  }}
                  results={clients}
                  selectedCliente={selectedCliente}
                  onSelect={(cliente) => {
                    setClientId(cliente.id)
                    setSelectedCliente(cliente)
                    setClientDisplayName(getClienteDisplayName(cliente))
                    setClientSearch(getClienteDisplayName(cliente))
                    setClients([])
                    markDirty()
                  }}
                  onClear={() => {
                    setClientId(null)
                    setSelectedCliente(null)
                    setClientDisplayName("Consumidor final")
                    setClientSearch("")
                    setClients([])
                    markDirty()
                  }}
                  placeholder="Buscar cliente por nombre, CUIT, código o dirección…"
                  clearLabel="Consumidor final"
                />
                {clientChanged && originalSnapshot ? (
                  <p className="text-xs text-muted-foreground">
                    Cliente anterior: <span className="font-medium">{originalSnapshot.clientLabel}</span>
                  </p>
                ) : null}
                {requiresZeroItemIva ? (
                  <Alert
                    variant="warning"
                    title="Factura C — sin IVA discriminado"
                    description="Este cliente recibe Factura C: los ítems deben estar al 0% (exento) para que ARCA acepte el comprobante."
                  />
                ) : null}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>Ítems</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => setShowAddProduct((v) => !v)}
                  >
                    <Plus className="h-4 w-4" />
                    Agregar producto
                  </Button>
                </div>
                {showAddProduct && (
                  <div className="rounded-lg border p-3 bg-muted/20">
                    <BudgetProductCatalog
                      products={products}
                      loading={loadingProducts}
                      onAddProduct={addProductLine}
                      lineProductIds={lineProductIds}
                    />
                  </div>
                )}
                <PosManualItemCard
                  onAdd={addCustomLine}
                  addLabel="Agregar ítem manual"
                  inputIdPrefix="sale-edit-manual"
                  lockIvaToZero={requiresZeroItemIva}
                />
                <div className="rounded-md border overflow-x-auto">
                  <table className="w-full text-sm min-w-[520px]">
                    <thead>
                      <tr className="border-b bg-muted/30 text-left">
                        <th className="p-2 w-10" />
                        <th className="p-2">Producto</th>
                        <th className="p-2 text-center">Cant.</th>
                        <th className="p-2 text-right">P. unit.</th>
                        <th className="p-2 text-right">IVA</th>
                        <th className="p-2 text-right">Subtotal</th>
                        <th className="p-2 w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {cart.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-6 text-center text-muted-foreground">
                            Sin ítems — agregá al menos uno
                          </td>
                        </tr>
                      ) : (
                        cart.map((line) => (
                          <PosCartItemRow
                            key={getPosCartLineKey(line)}
                            line={line}
                            view="table"
                            currency={saleCurrency}
                            exchangeRate={exchangeRate}
                            onUpdateQuantity={updateCartQuantity}
                            onSetUnitPrice={setCartUnitPrice}
                            onSetIvaRate={setCartIvaRate}
                            onRemove={removeFromCart}
                            ivaRateDisabled={requiresZeroItemIva}
                          />
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-lg border bg-muted/20 p-4 space-y-1 text-sm">
                <p className="text-muted-foreground">
                  Neto gravado ({isUsdSale(saleCurrency) ? "USD" : "ARS"}):{" "}
                  {formatEditMoney(ivaBreakdown.netoGravado, saleCurrency)}
                </p>
                <p
                  className={`text-lg font-bold tabular-nums ${
                    isUsdSale(saleCurrency) ? "text-amber-700 dark:text-amber-400" : ""
                  }`}
                >
                  Total: {formatEditMoney(total, saleCurrency)}
                </p>
                {isUsdSale(saleCurrency) && exchangeRate && total > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Referencia ARS: {formatEditMoney(total * exchangeRate, "ARS")}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Método de pago</Label>
                  <Select
                    value={paymentMethod}
                    onValueChange={(v) => {
                      setPaymentMethod(v as SalePaymentMethod)
                      markDirty()
                    }}
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
              </div>

              {needsMixtoDetails && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-lg border p-3 bg-muted/30">
                  <div className="space-y-1">
                    <Label className="text-xs">Efectivo</Label>
                    <Input
                      type="number"
                      min={0}
                      value={paymentDetails.efectivo}
                      onChange={(e) => {
                        setPaymentDetails((p) => ({
                          ...p,
                          efectivo: Math.max(0, parseFloat(e.target.value) || 0),
                        }))
                        markDirty()
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Tarjeta</Label>
                    <Input
                      type="number"
                      min={0}
                      value={paymentDetails.tarjeta}
                      onChange={(e) => {
                        setPaymentDetails((p) => ({
                          ...p,
                          tarjeta: Math.max(0, parseFloat(e.target.value) || 0),
                        }))
                        markDirty()
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Transferencia</Label>
                    <Input
                      type="number"
                      min={0}
                      value={paymentDetails.transferencia}
                      onChange={(e) => {
                        setPaymentDetails((p) => ({
                          ...p,
                          transferencia: Math.max(0, parseFloat(e.target.value) || 0),
                        }))
                        markDirty()
                      }}
                    />
                  </div>
                  <p className="sm:col-span-3 text-xs text-muted-foreground">
                    Suma: {formatEditMoney(mixtoSum, saleCurrency)} — debe ser {formatEditMoney(total, saleCurrency)}
                    {!mixtoValid && (
                      <span className="text-destructive ml-1">No coincide</span>
                    )}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Notas</Label>
                <Textarea
                  rows={3}
                  maxLength={5000}
                  value={notes}
                  onChange={(e) => {
                    setNotes(e.target.value)
                    markDirty()
                  }}
                />
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="sale-edit-inactive"
                    checked={allowInactive}
                    onCheckedChange={(c) => {
                      setAllowInactive(c === true)
                      markDirty()
                    }}
                  />
                  <Label htmlFor="sale-edit-inactive" className="text-sm font-normal cursor-pointer">
                    Permitir productos inactivos
                  </Label>
                </div>
                {sale.sync_status === "synced" && !isUsdSale(saleCurrency) && (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="sale-edit-woo"
                      checked={syncWoo}
                      onCheckedChange={(c) => {
                        setSyncWoo(c === true)
                        markDirty()
                      }}
                    />
                    <Label htmlFor="sale-edit-woo" className="text-sm font-normal cursor-pointer">
                      Re-sincronizar con WooCommerce al guardar
                    </Label>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button
              onClick={openConfirmSave}
              disabled={loading || saving || cart.length === 0 || (needsMixtoDetails && !mixtoValid)}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              Revisar y guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {confirmDialog}
      <SaleEditConfirmDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!open && !saving) {
            setConfirmOpen(false)
            setConfirmSummary(null)
          }
        }}
        summary={confirmSummary}
        saleNumber={sale.sale_number}
        selectedCliente={selectedCliente}
        saving={saving}
        onConfirm={() => void performSave()}
      />
    </>
  )
}
