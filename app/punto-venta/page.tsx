"use client"

import { useState, useEffect, useMemo } from "react"
import { ERPLayout } from "@/components/erp-layout"
import { Protected } from "@/components/protected"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  getProducts,
  getClientes,
  createSale,
  getPosApiKey,
  getAccessToken,
  type Product,
  type Cliente,
  type SalePaymentMethod,
  type SaleResponseData,
  type CreateSaleRequest,
  type SaleCurrency,
} from "@/lib/api"
import { Search, Plus, Receipt, User, CreditCard, Banknote, Wallet, AlertCircle, LayoutGrid, LayoutList, Maximize2, Loader2, Check, DollarSign, RefreshCw } from "lucide-react"
import Link from "next/link"
import { getProductImageUrl } from "@/lib/product-image-utils"
import Image from "next/image"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Alert } from "@/components/ui/alert"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import {
  canAddPosCatalogProduct,
  filterPosCatalogProducts,
  isPosBackorderOnly,
  isPosInStock,
  posCatalogMaxQuantity,
} from "@/lib/pos-products"
import { generateSaleReceiptPdf } from "@/lib/generate-sale-receipt-pdf"
import type { SaleReceiptCartItem } from "@/lib/generate-sale-receipt-pdf"
import {
  getPosCartLineKey,
  newCustomLineId,
  type PosCartLine,
} from "@/lib/pos-cart"
import { posCartLinesToCreateSaleItems, posCartLinesToReceiptItems } from "@/lib/sale-items"
import { PosManualItemCard } from "@/components/pos-manual-item-card"
import { PosCartItemRow } from "@/components/pos-cart-item-row"
import { ClientePicker } from "@/components/cliente-picker"
import { SaleConfirmDialog } from "@/components/sale-confirm-dialog"
import { SaleCurrencyBadge } from "@/components/sale-currency-badge"
import { SaleCurrencyNotice } from "@/components/sale-currency-notice"
import { getClienteDisplayName } from "@/lib/cliente-display"
import {
  clienteRequiresZeroItemIva,
  effectiveSaleItemIvaRate,
} from "@/lib/facturacion-cliente-fiscal"
import { computeSaleIvaBreakdown, DEFAULT_SALE_IVA_RATE, productIvaRate, type SaleIvaRate } from "@/lib/sale-iva"
import { getDollarRate } from "@/lib/product-pricing"
import {
  applyUsdUnitPriceEdit,
  arsToUsd,
  convertCartLineToArs,
  convertCartLineToUsd,
  formatSaleMoney,
  isUsdSale,
  recalcUsdCartLine,
  type SaleCurrency as PosSaleCurrency,
} from "@/lib/pos-usd"

const PAYMENT_LABELS: Record<SalePaymentMethod, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
  mixto: "Mixto",
}

const FORMAT_NUM = { maximumFractionDigits: 0, minimumFractionDigits: 0 } as const

function isInactiveWithStock(p: Product): boolean {
  const inactive = p.is_active === false || (typeof p.is_active === "number" && p.is_active === 0)
  return !!inactive && p.stock > 0
}

export default function PuntoVentaPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [searchProduct, setSearchProduct] = useState("")
  const [cart, setCart] = useState<PosCartLine[]>([])
  const [clientSearch, setClientSearch] = useState("")
  const [clients, setClients] = useState<Cliente[]>([])
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null)
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<SalePaymentMethod>("efectivo")
  const [paymentDetails, setPaymentDetails] = useState({ efectivo: 0, tarjeta: 0, transferencia: 0 })
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [confirmSaleOpen, setConfirmSaleOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSale, setLastSale] = useState<SaleResponseData | null>(null)
  const [lastSalePdfData, setLastSalePdfData] = useState<{
    sale: SaleResponseData
    cartItems: SaleReceiptCartItem[]
    clientName: string
    clientPhone?: string
    clientAddress?: string
  } | null>(null)
  const [apiKeyMissing, setApiKeyMissing] = useState(false)
  const [cartViewMode, setCartViewMode] = useState<"list" | "grid">("list")
  const [productsViewMode, setProductsViewMode] = useState<"list" | "grid">("list")
  const [openProductsModal, setOpenProductsModal] = useState(false)
  const [openCartModal, setOpenCartModal] = useState(false)
  const [showInactiveProductAlert, setShowInactiveProductAlert] = useState(false)
  const [showBackorderProducts, setShowBackorderProducts] = useState(false)
  const [productsModalFilter, setProductsModalFilter] = useState<"all" | "active" | "inactive" | "out_of_stock">("all")
  const [addingProductId, setAddingProductId] = useState<number | null>(null)
  const [addedProductId, setAddedProductId] = useState<number | null>(null)
  const [saleCurrency, setSaleCurrency] = useState<SaleCurrency>("ARS")
  const [exchangeRate, setExchangeRate] = useState<number | null>(null)
  const [exchangeRateInput, setExchangeRateInput] = useState("")
  const [dollarRateLoading, setDollarRateLoading] = useState(false)
  const [dollarRateError, setDollarRateError] = useState<string | null>(null)
  const [dollarRateLabel, setDollarRateLabel] = useState<string | null>(null)

  const total = useMemo(
    () => cart.reduce((sum, i) => sum + i.quantity * i.unit_price, 0),
    [cart]
  )

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
    if (!requiresZeroItemIva) return
    setCart((prev) =>
      prev.some((line) => line.iva_rate !== 0)
        ? prev.map((line) => (line.iva_rate === 0 ? line : { ...line, iva_rate: 0 as SaleIvaRate }))
        : prev
    )
  }, [requiresZeroItemIva, selectedCliente?.id])

  useEffect(() => {
    loadProducts()
  }, [])

  async function loadSuggestedExchangeRate() {
    setDollarRateLoading(true)
    setDollarRateError(null)
    try {
      const data = await getDollarRate()
      const rate = data.current_rate
      setExchangeRate(rate)
      setExchangeRateInput(String(rate))
      setDollarRateLabel(data.quote?.dollar_label ?? "Dólar del día")
      if (saleCurrency === "USD" && cart.length > 0) {
        setCart((prev) => prev.map((line) => recalcUsdCartLine(line, rate)))
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
      return
    }
    setSaleCurrency("ARS")
    setCart((prev) => prev.map((line) => convertCartLineToArs(line)))
  }

  function handleExchangeRateInputChange(raw: string) {
    setExchangeRateInput(raw)
    const parsed = Number(raw.replace(",", "."))
    if (!Number.isFinite(parsed) || parsed <= 0) return
    setExchangeRate(parsed)
    if (saleCurrency === "USD") {
      setCart((prev) => prev.map((line) => recalcUsdCartLine(line, parsed)))
    }
  }

  function formatPosMoney(value: number): string {
    return formatSaleMoney(value, saleCurrency as PosSaleCurrency)
  }

  function checkAuthForSale() {
    const hasAuth = !!getAccessToken() || !!getPosApiKey()
    setApiKeyMissing(!hasAuth)
  }

  useEffect(() => {
    checkAuthForSale()
  }, [])

  useEffect(() => {
    const onFocus = () => checkAuthForSale()
    window.addEventListener("focus", onFocus)
    return () => window.removeEventListener("focus", onFocus)
  }, [])

  useEffect(() => {
    if (clientSearch.trim().length < 2) {
      setClients([])
      return
    }
    if (
      selectedCliente &&
      clientSearch.trim() === getClienteDisplayName(selectedCliente).trim()
    ) {
      setClients([])
      return
    }
    const t = setTimeout(() => {
      getClientes(1, 20, clientSearch.trim(), "active")
        .then((r) => setClients(r.clients || []))
        .catch(() => setClients([]))
    }, 300)
    return () => clearTimeout(t)
  }, [clientSearch, selectedCliente])

  async function loadProducts() {
    try {
      setLoadingProducts(true)
      const data = await getProducts(1, 500, false)
      const list = Array.isArray(data) ? data : (data as { products: Product[] }).products || []
      setProducts(list)
    } catch (e) {
      console.error(e)
      setError("No se pudieron cargar los productos")
    } finally {
      setLoadingProducts(false)
    }
  }

  const filteredProducts = useMemo(
    () =>
      filterPosCatalogProducts(products, {
        includeBackorder: showBackorderProducts,
        searchTerm: searchProduct,
      }),
    [products, searchProduct, showBackorderProducts]
  )

  const productsModalList = useMemo(() => {
    const isActive = (p: Product) => !!p.is_active
    switch (productsModalFilter) {
      case "active":
        return filteredProducts.filter((p) => isActive(p) && isPosInStock(p))
      case "inactive":
        return filteredProducts.filter((p) => !isActive(p))
      case "out_of_stock":
        return filteredProducts.filter((p) => isPosBackorderOnly(p))
      default:
        return filteredProducts
    }
  }, [filteredProducts, productsModalFilter])

  function addToCart(product: Product, qty = 1) {
    if (!canAddPosCatalogProduct(product)) return
    if (isInactiveWithStock(product)) {
      setShowInactiveProductAlert(true)
      return
    }
    addToCartInternal(product, qty)
  }

  function handleAddToCartClick(product: Product, e?: React.MouseEvent) {
    e?.stopPropagation()
    if (!canAddPosCatalogProduct(product) || addingProductId != null) return
    if (isInactiveWithStock(product)) {
      setShowInactiveProductAlert(true)
      return
    }
    setAddingProductId(product.id)
    addToCartInternal(product)
    const id = product.id
    const t1 = setTimeout(() => {
      setAddingProductId(null)
      setAddedProductId(id)
    }, 300)
    const t2 = setTimeout(() => setAddedProductId(null), 2500)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }

  function addToCartInternal(product: Product, qty = 1) {
    if (!canAddPosCatalogProduct(product)) return
    const maxQty = posCatalogMaxQuantity(product)
    const arsPrice = product.price
    const unitPrice =
      saleCurrency === "USD" && exchangeRate && exchangeRate > 0
        ? arsToUsd(arsPrice, exchangeRate)
        : arsPrice
    setCart((prev) => {
      const existing = prev.find(
        (i) => i.kind === "catalog" && i.product.id === product.id
      )
      if (existing && existing.kind === "catalog") {
        const newQty = Math.min(existing.quantity + qty, maxQty)
        if (newQty <= 0) {
          return prev.filter(
            (i) => !(i.kind === "catalog" && i.product.id === product.id)
          )
        }
        return prev.map((i) =>
          i.kind === "catalog" && i.product.id === product.id
            ? { ...i, quantity: newQty }
            : i
        )
      }
      const line = {
        kind: "catalog" as const,
        product,
        quantity: Math.min(qty, maxQty),
        unit_price: unitPrice,
        iva_rate: effectiveSaleItemIvaRate(productIvaRate(product), selectedCliente),
      }
      if (saleCurrency === "USD") {
        return [...prev, { ...line, ars_unit_price: arsPrice }]
      }
      return [...prev, line]
    })
  }

  function addCustomToCart(payload: {
    description: string
    quantity: number
    unit_price: number
    iva_rate: SaleIvaRate
  }) {
    const arsPrice = payload.unit_price
    const unitPrice =
      saleCurrency === "USD" && exchangeRate && exchangeRate > 0
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
        iva_rate: effectiveSaleItemIvaRate(payload.iva_rate, selectedCliente),
        ...(saleCurrency === "USD" ? { ars_unit_price: arsPrice } : {}),
      },
    ])
    setError(null)
  }

  function updateCartQuantity(lineKey: string, delta: number) {
    setCart((prev) => {
      const item = prev.find((i) => getPosCartLineKey(i) === lineKey)
      if (!item) return prev
      const newQty = item.quantity + delta
      if (newQty <= 0) return prev.filter((i) => getPosCartLineKey(i) !== lineKey)
      return prev.map((i) => {
        if (getPosCartLineKey(i) !== lineKey) return i
        if (i.kind === "catalog") {
          const capped = Math.min(newQty, posCatalogMaxQuantity(i.product))
          return { ...i, quantity: capped }
        }
        return { ...i, quantity: newQty }
      })
    })
  }

  function removeFromCart(lineKey: string) {
    setCart((prev) => prev.filter((i) => getPosCartLineKey(i) !== lineKey))
  }

  function setCartUnitPrice(lineKey: string, unit_price: number) {
    if (unit_price < 0) return
    setCart((prev) =>
      prev.map((i) => {
        if (getPosCartLineKey(i) !== lineKey) return i
        if (saleCurrency === "USD" && exchangeRate && exchangeRate > 0) {
          return applyUsdUnitPriceEdit(i, unit_price, exchangeRate)
        }
        return { ...i, unit_price }
      })
    )
  }

  function setCartIvaRate(lineKey: string, iva_rate: SaleIvaRate) {
    setCart((prev) =>
      prev.map((i) => (getPosCartLineKey(i) === lineKey ? { ...i, iva_rate } : i))
    )
  }

  function clearCart() {
    setCart([])
    setLastSale(null)
    setLastSalePdfData(null)
    setError(null)
  }

  const mixtoSum = paymentDetails.efectivo + paymentDetails.tarjeta + paymentDetails.transferencia
  const mixtoValid = paymentMethod !== "mixto" || Math.abs(mixtoSum - total) < 0.02

  async function handleCobrar() {
    if (cart.length === 0) {
      setError("Agregá al menos un ítem al carrito")
      return
    }
    if (saleCurrency === "USD") {
      if (!exchangeRate || exchangeRate <= 0) {
        setError("Indicá una cotización USD/ARS válida para cobrar en dólares")
        return
      }
    }
    const invalidCustom = cart.some(
      (i) => i.kind === "custom" && !i.description.trim()
    )
    if (invalidCustom) {
      setError("Hay un ítem manual sin descripción")
      return
    }
    if (paymentMethod === "mixto" && !mixtoValid) {
      setError("La suma de efectivo + tarjeta + transferencia debe coincidir con el total")
      return
    }
    setError(null)
    setConfirmSaleOpen(true)
  }

  async function performCobrar() {
    const cartSnapshot = [...cart]
    setSubmitting(true)
    try {
      const body: CreateSaleRequest = {
        items: posCartLinesToCreateSaleItems(cart),
        payment_method: paymentMethod,
        client_id: selectedClientId ?? undefined,
        notes: notes.trim() || undefined,
        sync_to_woocommerce: saleCurrency === "USD" ? false : true,
      }
      if (saleCurrency === "USD" && exchangeRate) {
        body.currency = "USD"
        body.exchange_rate = exchangeRate
      }
      if (paymentMethod === "mixto") {
        body.payment_details = {
          efectivo: paymentDetails.efectivo,
          tarjeta: paymentDetails.tarjeta,
          transferencia: paymentDetails.transferencia,
        }
      }
      const sale = await createSale(body)
      setConfirmSaleOpen(false)
      setLastSale(sale)
      setLastSalePdfData({
        sale,
        cartItems: posCartLinesToReceiptItems(cartSnapshot),
        clientName: clientDisplay,
        clientPhone: selectedCliente?.phone ?? undefined,
        clientAddress: selectedCliente?.address ?? undefined,
      })
      setCart([])
      setClientSearch("")
      setSelectedClientId(null)
      setSelectedCliente(null)
      setNotes("")
      setPaymentDetails({ efectivo: 0, tarjeta: 0, transferencia: 0 })
      setSaleCurrency("ARS")
      setExchangeRate(null)
      setExchangeRateInput("")
      setDollarRateLabel(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al crear la venta")
    } finally {
      setSubmitting(false)
    }
  }

  const clientDisplay = selectedCliente
    ? getClienteDisplayName(selectedCliente)
    : selectedClientId
      ? `Cliente #${selectedClientId}`
      : "Consumidor final"

  const cartRowCurrencyProps = {
    currency: saleCurrency as PosSaleCurrency,
    exchangeRate,
  }

  return (
    <Protected requiredRoles={["gerencia", "ventas", "admin"]}>
      <ERPLayout activeItem="punto-venta">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold flex flex-wrap items-center gap-2">
                Punto de venta
                {isUsdSale(saleCurrency) ? <SaleCurrencyBadge currency="USD" exchangeRate={exchangeRate} showRate /> : null}
              </h1>
              <p className="text-muted-foreground">
                {isUsdSale(saleCurrency)
                  ? "Cobro y facturación en dólares (USD → DOL en ARCA)"
                  : "Ventas en local físico"}
              </p>
            </div>
          </div>

          {isUsdSale(saleCurrency) && cart.length > 0 ? (
            <SaleCurrencyNotice
              variant="banner"
              currency={saleCurrency}
              exchangeRate={exchangeRate}
              totalAmount={total}
            />
          ) : null}

          {apiKeyMissing && (
            <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/30">
              <CardContent className="flex flex-col sm:flex-row sm:items-center gap-3 pt-4">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                <p className="text-sm flex-1">
                  Para registrar ventas tenés que estar logueado o configurar la API Key en Configuración.
                  Sin autenticación no se puede enviar la venta al servidor.
                </p>
                <Button asChild variant="outline" size="sm" className="shrink-0 border-amber-600 text-amber-700 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900/50">
                  <Link href="/configuracion?tab=pos">Configurar API Key</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Columna izquierda: búsqueda + productos + carrito */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2 space-y-0">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Search className="h-4 w-4" />
                      Productos
                    </CardTitle>
                    {!loadingProducts && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Mostrando {filteredProducts.length} producto{filteredProducts.length !== 1 ? "s" : ""}
                        {showBackorderProducts ? " (con stock y por encargo)." : " con stock."}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant={productsViewMode === "list" ? "secondary" : "ghost"}
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setProductsViewMode("list")}
                      title="Vista lista"
                    >
                      <LayoutList className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={productsViewMode === "grid" ? "secondary" : "ghost"}
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setProductsViewMode("grid")}
                      title="Vista cuadrícula"
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setOpenProductsModal(true)}
                      title="Ver lista completa en pantalla ampliada"
                    >
                      <Maximize2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input
                    placeholder="Buscar por nombre, código o categoría..."
                    value={searchProduct}
                    onChange={(e) => setSearchProduct(e.target.value)}
                    className="max-w-md"
                  />
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="pos-show-backorder"
                      checked={showBackorderProducts}
                      onCheckedChange={(c) => setShowBackorderProducts(c === true)}
                    />
                    <Label htmlFor="pos-show-backorder" className="text-sm font-normal cursor-pointer">
                      Incluir venta por encargo (sin stock)
                    </Label>
                  </div>
                  <div className="max-h-[280px] overflow-y-auto border rounded-md p-2">
                    {loadingProducts ? (
                      <p className="text-sm text-muted-foreground">Cargando productos...</p>
                    ) : filteredProducts.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Sin resultados</p>
                    ) : productsViewMode === "list" ? (
                      <div className="space-y-1">
                        {filteredProducts.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => addToCart(p)}
                            disabled={!canAddPosCatalogProduct(p)}
                            className="flex items-center gap-3 w-full p-2 rounded-lg border bg-card hover:bg-muted/50 text-left disabled:opacity-50 disabled:pointer-events-none"
                          >
                            <div className="relative h-10 w-10 shrink-0 rounded overflow-hidden bg-muted">
                              <Image
                                src={getProductImageUrl(p, { size: 80 })}
                                alt={p.name}
                                fill
                                className="object-cover"
                                sizes="40px"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-medium truncate">{p.name}</p>
                                {isPosBackorderOnly(p) && (
                                  <Badge variant="outline" className="text-xs shrink-0 border-amber-500 text-amber-700 dark:text-amber-300">
                                    Por encargo
                                  </Badge>
                                )}
                                {isInactiveWithStock(p) && (
                                  <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 text-xs shrink-0">
                                    Inactivo
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                ${Number(p.price).toLocaleString("es-AR", FORMAT_NUM)}
                                {isPosBackorderOnly(p) ? " · Sin stock" : ` · Stock ${p.stock}`}
                              </p>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className={addedProductId === p.id ? "shrink-0 bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700 hover:text-white" : "shrink-0"}
                              onClick={(e) => handleAddToCartClick(p, e)}
                              disabled={!canAddPosCatalogProduct(p) || addingProductId === p.id}
                            >
                              {addingProductId === p.id ? (
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              ) : addedProductId === p.id ? (
                                <Check className="h-4 w-4 mr-1" />
                              ) : (
                                <Plus className="h-4 w-4 mr-1" />
                              )}
                              {addingProductId === p.id ? "" : addedProductId === p.id ? "Agregado" : "Agregar"}
                            </Button>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {filteredProducts.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={(e) => handleAddToCartClick(p, e)}
                            disabled={!canAddPosCatalogProduct(p) || addingProductId === p.id}
                            className="flex flex-col gap-2 p-2 rounded-lg border bg-card hover:bg-muted/50 text-left disabled:opacity-50 disabled:pointer-events-none"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <div className="relative h-10 w-10 shrink-0 rounded overflow-hidden bg-muted">
                                <Image
                                  src={getProductImageUrl(p, { size: 80 })}
                                  alt={p.name}
                                  fill
                                  className="object-cover"
                                  sizes="40px"
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="text-xs font-medium truncate">{p.name}</p>
                                  {isPosBackorderOnly(p) && (
                                    <Badge variant="outline" className="text-[10px] shrink-0 px-1 border-amber-500 text-amber-700 dark:text-amber-300">
                                      Encargo
                                    </Badge>
                                  )}
                                  {isInactiveWithStock(p) && (
                                    <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 text-[10px] shrink-0 px-1">
                                      Inactivo
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  ${Number(p.price).toLocaleString("es-AR", FORMAT_NUM)}
                                  {isPosBackorderOnly(p) ? " · Sin stock" : ` · Stock ${p.stock}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center justify-center gap-1 min-h-[28px] text-xs">
                              {addingProductId === p.id ? (
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                              ) : addedProductId === p.id ? (
                                <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                                  <Check className="h-3.5 w-3.5" /> Agregado
                                </span>
                              ) : (
                                <span className="text-muted-foreground">+ Agregar</span>
                              )}
                            </div>
                          </button>
                    ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <PosManualItemCard
                onAdd={addCustomToCart}
                disabled={submitting}
                lockIvaToZero={requiresZeroItemIva}
              />

              <Card>
                <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2 space-y-0">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Receipt className="h-4 w-4" />
                      Carrito
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      {cart.length === 0
                        ? "0 productos en el carrito"
                        : (() => {
                            const total = cart.reduce((s, i) => s + i.quantity, 0)
                            return `${total} producto${total !== 1 ? "s" : ""} agregado${total !== 1 ? "s" : ""} al carrito`
                          })()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {cart.length > 0 && (
                      <>
                        <Button
                          variant={cartViewMode === "list" ? "secondary" : "ghost"}
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setCartViewMode("list")}
                          title="Vista lista"
                        >
                          <LayoutList className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={cartViewMode === "grid" ? "secondary" : "ghost"}
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setCartViewMode("grid")}
                          title="Vista cuadrícula"
                        >
                          <LayoutGrid className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={clearCart}>
                          Vaciar
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setOpenCartModal(true)}
                      title="Ver carrito completo en pantalla ampliada"
                    >
                      <Maximize2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {cart.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4">El carrito está vacío</p>
                  ) : cartViewMode === "list" ? (
                    <div className="space-y-2 max-h-[220px] overflow-y-auto">
                      {cart.map((item) => (
                        <PosCartItemRow
                          key={getPosCartLineKey(item)}
                          line={item}
                          view="list"
                          onUpdateQuantity={updateCartQuantity}
                          onSetUnitPrice={setCartUnitPrice}
                          onSetIvaRate={setCartIvaRate}
                          onRemove={removeFromCart}
                          ivaRateDisabled={requiresZeroItemIva}
                          {...cartRowCurrencyProps}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 max-h-[280px] overflow-y-auto">
                      {cart.map((item) => (
                        <PosCartItemRow
                          key={getPosCartLineKey(item)}
                          line={item}
                          view="grid"
                          onUpdateQuantity={updateCartQuantity}
                          onSetUnitPrice={setCartUnitPrice}
                          onSetIvaRate={setCartIvaRate}
                          onRemove={removeFromCart}
                          ivaRateDisabled={requiresZeroItemIva}
                          {...cartRowCurrencyProps}
                        />
                      ))}
                    </div>
                  )}
                  {cart.length > 0 && (
                    <p className="text-sm font-semibold mt-3 pt-2 border-t">
                      Subtotal: {formatPosMoney(total)}
                      {isUsdSale(saleCurrency) && exchangeRate ? (
                        <span className="block text-xs font-normal text-muted-foreground mt-0.5">
                          Ref. ARS {formatSaleMoney(total * exchangeRate, "ARS")}
                        </span>
                      ) : null}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Columna derecha: moneda, cliente, pago, total, cobrar */}
            <div className="space-y-4">
              <Card
                className={
                  isUsdSale(saleCurrency)
                    ? "border-amber-400/70 bg-amber-50/30 dark:border-amber-600/40 dark:bg-amber-950/15"
                    : undefined
                }
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Moneda de cobro
                    {isUsdSale(saleCurrency) ? (
                      <SaleCurrencyBadge currency="USD" exchangeRate={exchangeRate} showRate className="ml-auto" />
                    ) : null}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Elegí la moneda <strong>antes</strong> de armar el carrito. En USD, los precios se convierten y la
                    factura se emite en dólares (DOL).
                  </p>
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
                  {saleCurrency === "USD" ? (
                    <div className="space-y-2 rounded-md border border-amber-300/60 bg-background/80 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <Label htmlFor="pos-exchange-rate" className="text-xs font-medium">
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
                        id="pos-exchange-rate"
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
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Cliente
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ClientePicker
                    searchValue={clientSearch}
                    onSearchChange={(value) => {
                      setClientSearch(value)
                      if (
                        selectedCliente &&
                        value.trim() !== getClienteDisplayName(selectedCliente)
                      ) {
                        setSelectedClientId(null)
                        setSelectedCliente(null)
                      }
                      if (!value.trim()) {
                        setSelectedClientId(null)
                        setSelectedCliente(null)
                      }
                    }}
                    results={clients}
                    selectedCliente={selectedCliente}
                    onSelect={(cliente) => {
                      setSelectedClientId(cliente.id)
                      setSelectedCliente(cliente)
                      setClientSearch(getClienteDisplayName(cliente))
                      setClients([])
                    }}
                    onClear={() => {
                      setSelectedClientId(null)
                      setSelectedCliente(null)
                      setClientSearch("")
                      setClients([])
                    }}
                    placeholder="Buscar cliente por nombre, CUIT, código o dirección…"
                    clearLabel="Consumidor final"
                  />
                  {requiresZeroItemIva ? (
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      Factura C: los ítems deben ir al 0% (exento); ARCA no admite IVA discriminado en este comprobante.
                    </p>
                  ) : null}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Método de pago</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {(["efectivo", "tarjeta", "transferencia", "mixto"] as const).map((method) => (
                      <Button
                        key={method}
                        variant={paymentMethod === method ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPaymentMethod(method)}
                      >
                        {method === "efectivo" && <Banknote className="h-4 w-4 mr-1" />}
                        {method === "tarjeta" && <CreditCard className="h-4 w-4 mr-1" />}
                        {method === "transferencia" && <Wallet className="h-4 w-4 mr-1" />}
                        {method === "mixto" && <Receipt className="h-4 w-4 mr-1" />}
                        {PAYMENT_LABELS[method]}
                      </Button>
                    ))}
                  </div>
                  {paymentMethod === "mixto" && (
                    <div className="space-y-2 pt-2 border-t">
                      <Label>Desglose (debe sumar el total)</Label>
                      <div className="grid grid-cols-1 gap-2">
                        <div>
                          <Label className="text-xs">Efectivo</Label>
                          <Input
                            type="number"
                            value={paymentDetails.efectivo || ""}
                            onChange={(e) =>
                              setPaymentDetails((p) => ({
                                ...p,
                                efectivo: Number(e.target.value) || 0,
                              }))
                            }
                            min={0}
                            step={0.01}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Tarjeta</Label>
                          <Input
                            type="number"
                            value={paymentDetails.tarjeta || ""}
                            onChange={(e) =>
                              setPaymentDetails((p) => ({
                                ...p,
                                tarjeta: Number(e.target.value) || 0,
                              }))
                            }
                            min={0}
                            step={0.01}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Transferencia</Label>
                          <Input
                            type="number"
                            value={paymentDetails.transferencia || ""}
                            onChange={(e) =>
                              setPaymentDetails((p) => ({
                                ...p,
                                transferencia: Number(e.target.value) || 0,
                              }))
                            }
                            min={0}
                            step={0.01}
                          />
                        </div>
                      </div>
                      {!mixtoValid && total > 0 && (
                        <p className="text-xs text-red-600">
                          Suma: {formatPosMoney(mixtoSum)} — Total: {formatPosMoney(total)}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4 space-y-3">
                  <Label>Notas (opcional)</Label>
                  <Textarea
                    placeholder="Máx. 1000 caracteres"
                    value={notes}
                    maxLength={1000}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="resize-none"
                  />
                  {cart.length > 0 && (
                    <div className="rounded-md border bg-muted/20 px-3 py-2 text-xs text-muted-foreground space-y-1">
                      <div className="flex justify-between">
                        <span>Neto gravado ({isUsdSale(saleCurrency) ? "USD" : "ARS"})</span>
                        <span className="tabular-nums">{formatPosMoney(ivaBreakdown.netoGravado)}</span>
                      </div>
                      {ivaBreakdown.iva21 > 0 ? (
                        <div className="flex justify-between">
                          <span>IVA 21% (contenido)</span>
                          <span className="tabular-nums">{formatPosMoney(ivaBreakdown.iva21)}</span>
                        </div>
                      ) : null}
                      {ivaBreakdown.iva105 > 0 ? (
                        <div className="flex justify-between">
                          <span>IVA 10,5% (contenido)</span>
                          <span className="tabular-nums">{formatPosMoney(ivaBreakdown.iva105)}</span>
                        </div>
                      ) : null}
                      {ivaBreakdown.ivaExento > 0 ? (
                        <div className="flex justify-between">
                          <span>Exento / 0%</span>
                          <span className="tabular-nums">{formatPosMoney(ivaBreakdown.ivaExento)}</span>
                        </div>
                      ) : null}
                    </div>
                  )}
                  <div
                    className={`text-2xl font-bold ${isUsdSale(saleCurrency) ? "text-amber-700 dark:text-amber-400" : "text-turquoise-600"}`}
                  >
                    Total: {formatPosMoney(total)}
                  </div>
                  {saleCurrency === "USD" && exchangeRate && total > 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Referencia ARS: {(total * exchangeRate).toLocaleString("es-AR", {
                        style: "currency",
                        currency: "ARS",
                        maximumFractionDigits: 0,
                      })}
                    </p>
                  ) : null}
                  {error && (
                    <div className="flex items-center gap-2 p-2 rounded bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-sm">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {error}
                    </div>
                  )}
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleCobrar}
                    disabled={cart.length === 0 || submitting || (paymentMethod === "mixto" && !mixtoValid) || apiKeyMissing}
                  >
                    {submitting ? "Procesando..." : isUsdSale(saleCurrency) ? "Cobrar en dólares (USD)" : "Cobrar"}
                  </Button>
                </CardContent>
              </Card>

            </div>
          </div>

          {/* Modal vista ampliada — Productos */}
          <Dialog open={openProductsModal} onOpenChange={setOpenProductsModal}>
            <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col gap-4 p-4 sm:p-6">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Productos — Vista ampliada
                </DialogTitle>
                <p className="text-sm text-muted-foreground">
                  Mostrando {productsModalList.length} producto{productsModalList.length !== 1 ? "s" : ""}.
                </p>
              </DialogHeader>
              <div className="flex flex-col gap-3 flex-1 min-h-0">
                <Input
                  placeholder="Buscar por nombre, código o categoría..."
                  value={searchProduct}
                  onChange={(e) => setSearchProduct(e.target.value)}
                  className="max-w-md"
                />
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="pos-show-backorder-modal"
                    checked={showBackorderProducts}
                    onCheckedChange={(c) => setShowBackorderProducts(c === true)}
                  />
                  <Label htmlFor="pos-show-backorder-modal" className="text-sm font-normal cursor-pointer">
                    Incluir venta por encargo (sin stock)
                  </Label>
                </div>
                <Tabs value={productsModalFilter} onValueChange={(v) => setProductsModalFilter(v as "all" | "active" | "inactive" | "out_of_stock")} className="flex-1 flex flex-col min-h-0">
                  <TabsList className="grid w-full max-w-lg grid-cols-4">
                    <TabsTrigger value="all">Todos</TabsTrigger>
                    <TabsTrigger value="active">Con stock</TabsTrigger>
                    <TabsTrigger value="inactive">Inactivos</TabsTrigger>
                    <TabsTrigger value="out_of_stock" disabled={!showBackorderProducts}>
                      Por encargo
                    </TabsTrigger>
                  </TabsList>
                <div className="border rounded-md overflow-auto flex-1 min-h-[320px] mt-3">
                  {loadingProducts ? (
                    <p className="p-4 text-sm text-muted-foreground">Cargando productos...</p>
                  ) : productsModalList.length === 0 ? (
                    <p className="p-4 text-sm text-muted-foreground">Sin resultados</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-slate-200 dark:bg-slate-800 [&_th]:bg-slate-200 [&_th]:dark:bg-slate-800 [&_th]:border-b [&_th]:border-border">
                          <th className="text-left p-2 w-14">Imagen</th>
                          <th className="text-left p-2">Código</th>
                          <th className="text-left p-2">Nombre</th>
                          <th className="text-left p-2">Categoría</th>
                          <th className="text-right p-2">Precio</th>
                          <th className="text-right p-2">Stock</th>
                          <th className="text-right p-2 w-24">Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productsModalList.map((p) => (
                          <tr key={p.id} className="border-t hover:bg-muted/30">
                            <td className="p-2">
                              <div className="relative h-10 w-10 rounded overflow-hidden bg-muted inline-block">
                                <Image
                                  src={getProductImageUrl(p, { size: 80 })}
                                  alt={p.name}
                                  fill
                                  className="object-cover"
                                  sizes="40px"
                                />
                              </div>
                            </td>
                            <td className="p-2 font-mono text-xs">{p.code ?? "—"}</td>
                            <td className="p-2">
                              <span className="font-medium">{p.name}</span>
                              {isPosBackorderOnly(p) && (
                                <Badge variant="outline" className="ml-1.5 text-xs border-amber-500 text-amber-700 dark:text-amber-300">
                                  Por encargo
                                </Badge>
                              )}
                              {isInactiveWithStock(p) && (
                                <Badge variant="secondary" className="ml-1.5 bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 text-xs">
                                  Inactivo
                                </Badge>
                              )}
                            </td>
                            <td className="p-2 text-muted-foreground">{p.category_name ?? "—"}</td>
                            <td className="p-2 text-right">${Number(p.price).toLocaleString("es-AR", FORMAT_NUM)}</td>
                            <td className="p-2 text-right">{isPosBackorderOnly(p) ? "0 (encargo)" : p.stock}</td>
                            <td className="p-2 text-right">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className={addedProductId === p.id ? "bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700 hover:text-white" : ""}
                                onClick={() => handleAddToCartClick(p)}
                                disabled={!canAddPosCatalogProduct(p) || addingProductId === p.id}
                              >
                                {addingProductId === p.id ? (
                                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                ) : addedProductId === p.id ? (
                                  <Check className="h-4 w-4 mr-1" />
                                ) : (
                                  <Plus className="h-4 w-4 mr-1" />
                                )}
                                {addingProductId === p.id ? "" : addedProductId === p.id ? "Agregado" : "Agregar"}
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
                </Tabs>
              </div>
            </DialogContent>
          </Dialog>

          {/* Modal vista ampliada — Carrito */}
          <Dialog open={openCartModal} onOpenChange={setOpenCartModal}>
            <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col gap-4 p-4 sm:p-6">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Carrito — Vista ampliada
                </DialogTitle>
                <p className="text-sm text-muted-foreground">
                  {cart.length === 0
                    ? "0 productos en el carrito"
                    : (() => {
                        const total = cart.reduce((s, i) => s + i.quantity, 0)
                        return `${total} producto${total !== 1 ? "s" : ""} agregado${total !== 1 ? "s" : ""} al carrito`
                      })()}
                </p>
              </DialogHeader>
              <div className="flex flex-col gap-3 flex-1 min-h-0">
                {cart.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">El carrito está vacío</p>
                ) : (
                  <>
                    <div className="border rounded-md overflow-auto flex-1 min-h-[280px]">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50 sticky top-0">
                          <tr>
                            <th className="text-left p-2 w-14">Imagen</th>
                            <th className="text-left p-2">Producto</th>
                            <th className="text-center p-2 w-28">Cantidad</th>
                            <th className="text-right p-2 w-28">P. unit.</th>
                            <th className="text-right p-2 w-28">IVA</th>
                            <th className="text-right p-2 w-24">Subtotal</th>
                            <th className="text-right p-2 w-20">Quitar</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cart.map((item) => (
                            <PosCartItemRow
                              key={getPosCartLineKey(item)}
                              line={item}
                              view="table"
                              onUpdateQuantity={updateCartQuantity}
                              onSetUnitPrice={setCartUnitPrice}
                              onSetIvaRate={setCartIvaRate}
                              onRemove={removeFromCart}
                              ivaRateDisabled={requiresZeroItemIva}
                              {...cartRowCurrencyProps}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="pt-2 border-t space-y-1 text-sm text-muted-foreground">
                      <p>
                        Neto gravado: ${ivaBreakdown.netoGravado.toLocaleString("es-AR", FORMAT_NUM)}
                      </p>
                      {ivaBreakdown.ivaTotal > 0 ? (
                        <p>
                          IVA contenido: ${ivaBreakdown.ivaTotal.toLocaleString("es-AR", FORMAT_NUM)}
                        </p>
                      ) : null}
                      <p className="text-lg font-semibold text-foreground">
                        Total: ${total.toLocaleString("es-AR", FORMAT_NUM)}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Alert producto inactivo (no se puede vender) */}
          {showInactiveProductAlert && (
            <Alert
              variant="warning"
              floating
              title="Producto inactivo"
              action={
                <Button variant="outline" size="sm" onClick={() => setShowInactiveProductAlert(false)}>
                  Cerrar
                </Button>
              }
            >
              Este producto se encuentra con stock pero inactivo. Activálo desde la sección de productos para poder venderlo.
            </Alert>
          )}

          {/* Alert flotante — Venta registrada */}
          {lastSale && (
            <Alert
              variant="success"
              floating
              title={lastSale.currency === "USD" ? "Venta en USD registrada" : "Venta registrada"}
              action={
                <div className="flex flex-col gap-2">
                  {lastSalePdfData && (
                    <Button
                      variant="default"
                      size="sm"
                      className="w-full"
                      onClick={() =>
                        generateSaleReceiptPdf({
                          sale: lastSalePdfData.sale,
                          cartItems: lastSalePdfData.cartItems,
                          clientName: lastSalePdfData.clientName,
                          clientPhone: lastSalePdfData.clientPhone,
                          clientAddress: lastSalePdfData.clientAddress,
                        })
                      }
                    >
                      Descargar comprobante de venta
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="w-full" onClick={clearCart}>
                    Nueva venta
                  </Button>
                </div>
              }
            >
              <div className="space-y-0.5 mt-1">
                <p className="font-mono font-medium">
                  {String(lastSale.sale_number ?? "").replace(/^[^\d]*/, "") || lastSale.sale_number}
                </p>
                <p>Total: {formatSaleMoney(lastSale.total_amount, lastSale.currency ?? "ARS")}</p>
                {lastSale.currency === "USD" ? (
                  <div className="text-xs space-y-1 pt-1">
                    <p className="text-amber-800 dark:text-amber-300">
                      Facturá en <strong>Facturación</strong> con moneda DOL y TC{" "}
                      {lastSale.exchange_rate
                        ? Number(lastSale.exchange_rate).toLocaleString("es-AR")
                        : "—"}{" "}
                      ARS/USD.
                    </p>
                    <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
                      <Link href="/facturacion">Ir a facturación →</Link>
                    </Button>
                  </div>
                ) : null}
                <p>Método: {PAYMENT_LABELS[lastSale.payment_method]}</p>
                {lastSalePdfData?.clientName ? (
                  <p className="text-sm">
                    Cliente: <span className="font-medium">{lastSalePdfData.clientName}</span>
                  </p>
                ) : null}
                {lastSalePdfData?.clientAddress || lastSale.client_address ? (
                  <p className="text-xs text-muted-foreground">
                    {lastSalePdfData?.clientAddress || lastSale.client_address}
                    {lastSale.client_city ? ` · ${lastSale.client_city}` : ""}
                  </p>
                ) : null}
              </div>
            </Alert>
          )}

          <SaleConfirmDialog
            open={confirmSaleOpen}
            onOpenChange={setConfirmSaleOpen}
            cart={cart}
            total={total}
            currency={saleCurrency}
            exchangeRate={exchangeRate}
            paymentMethod={paymentMethod}
            paymentLabel={PAYMENT_LABELS[paymentMethod]}
            selectedCliente={selectedCliente}
            submitting={submitting}
            onConfirm={() => void performCobrar()}
          />
        </div>
      </ERPLayout>
    </Protected>
  )
}
