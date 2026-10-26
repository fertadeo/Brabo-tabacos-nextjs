"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  createOrder,
  getClientes,
  getOrders,
  getProducts,
  type Cliente,
  type Order,
  type Product,
} from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"
import { getClienteDisplayName } from "@/lib/cliente-display"
import {
  DEFAULT_PRICE_LIST_SLUG,
  PRICE_LIST_OPTIONS,
  resolveProductListPrice,
  type PriceListSlug,
} from "@/lib/price-lists"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ArrowLeft,
  Check,
  Loader2,
  Minus,
  PackagePlus,
  Plus,
  Search,
  ShoppingBag,
  Truck,
  User,
} from "lucide-react"

type CartLine = {
  product: Product
  quantity: number
  unit_price: number
}

type Tab = "nuevo" | "hoy"

function todayISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export default function PreventaPage() {
  const { isAuthenticated, isLoading: authLoading, user, logout } = useAuth()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>("nuevo")

  const [clients, setClients] = useState<Cliente[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loadingCatalog, setLoadingCatalog] = useState(true)
  const [clientQuery, setClientQuery] = useState("")
  const [productQuery, setProductQuery] = useState("")
  const [selectedClient, setSelectedClient] = useState<Cliente | null>(null)
  const [priceListSlug, setPriceListSlug] = useState<PriceListSlug>(DEFAULT_PRICE_LIST_SLUG)
  const [cart, setCart] = useState<CartLine[]>([])
  const [notes, setNotes] = useState("")
  const [deliveryDate, setDeliveryDate] = useState(todayISO())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const [todayOrders, setTodayOrders] = useState<Order[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login")
    }
  }, [authLoading, isAuthenticated, router])

  const loadCatalog = useCallback(async () => {
    setLoadingCatalog(true)
    try {
      const [prods, clientsRes] = await Promise.all([
        getProducts(1, 0, true),
        getClientes(1, 500),
      ])
      const list = Array.isArray(prods) ? prods : prods.products || []
      setProducts(list.filter((p) => p.is_active !== false))
      setClients(clientsRes?.clients || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar catálogo")
    } finally {
      setLoadingCatalog(false)
    }
  }, [])

  const loadTodayOrders = useCallback(async () => {
    setLoadingOrders(true)
    try {
      const res = await getOrders({
        canal_venta: "preventa",
        date_from: todayISO(),
        date_to: todayISO(),
        limit: 100,
        page: 1,
      })
      const orders = res?.data?.orders || []
      setTodayOrders(orders)
    } catch {
      setTodayOrders([])
    } finally {
      setLoadingOrders(false)
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return
    loadCatalog()
    loadTodayOrders()
  }, [isAuthenticated, loadCatalog, loadTodayOrders])

  const filteredClients = useMemo(() => {
    const q = clientQuery.trim().toLowerCase()
    if (!q) return clients.slice(0, 20)
    return clients
      .filter((c) => {
        const name = getClienteDisplayName(c).toLowerCase()
        const code = String(c.code || "").toLowerCase()
        const phone = String(c.phone || "").toLowerCase()
        return name.includes(q) || code.includes(q) || phone.includes(q)
      })
      .slice(0, 30)
  }, [clients, clientQuery])

  const filteredProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase()
    if (!q) return products.slice(0, 40)
    return products
      .filter((p) => {
        return (
          p.name.toLowerCase().includes(q) ||
          String(p.code || "").toLowerCase().includes(q)
        )
      })
      .slice(0, 40)
  }, [products, productQuery])

  const total = useMemo(
    () => cart.reduce((s, l) => s + l.quantity * l.unit_price, 0),
    [cart]
  )

  function addProduct(p: Product) {
    const unit = resolveProductListPrice(p, priceListSlug)
    setCart((prev) => {
      const ex = prev.find((l) => l.product.id === p.id)
      if (ex) {
        return prev.map((l) =>
          l.product.id === p.id ? { ...l, quantity: l.quantity + 1 } : l
        )
      }
      return [...prev, { product: p, quantity: 1, unit_price: unit }]
    })
  }

  function setQty(productId: number, delta: number) {
    setCart((prev) =>
      prev
        .map((l) =>
          l.product.id === productId
            ? { ...l, quantity: l.quantity + delta }
            : l
        )
        .filter((l) => l.quantity > 0)
    )
  }

  function applyPriceList(slug: PriceListSlug) {
    setPriceListSlug(slug)
    setCart((prev) =>
      prev.map((l) => ({
        ...l,
        unit_price: resolveProductListPrice(l.product, slug),
      }))
    )
  }

  async function submitOrder() {
    if (!selectedClient) {
      setError("Elegí un cliente")
      return
    }
    if (cart.length === 0) {
      setError("Agregá al menos un producto")
      return
    }
    setSubmitting(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const res = await createOrder({
        client_id: selectedClient.id,
        canal_venta: "preventa",
        status: "pendiente_preparacion",
        delivery_date: deliveryDate || undefined,
        delivery_address: selectedClient.address || undefined,
        delivery_city: selectedClient.city || undefined,
        delivery_phone: selectedClient.phone || undefined,
        delivery_contact: getClienteDisplayName(selectedClient),
        notes: notes || `Preventa calle — ${user?.username || user?.email || "repartidor"}`,
        price_list: priceListSlug,
        items: cart.map((l) => ({
          product_id: l.product.id,
          quantity: l.quantity,
          unit_price: l.unit_price,
          description: l.product.name,
        })),
      })
      const num = res.data?.order_number || `#${res.data?.id}`
      setSuccessMsg(`Pedido ${num} cargado`)
      setCart([])
      setNotes("")
      setSelectedClient(null)
      setClientQuery("")
      await loadTodayOrders()
      setTab("hoy")
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear el pedido")
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col pb-24">
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-amber-400" />
            <div>
              <p className="text-sm font-semibold leading-tight">Preventa calle</p>
              <p className="text-[11px] text-slate-400">
                {user?.username || user?.email || "Repartidor"}
              </p>
            </div>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" asChild className="text-slate-300">
              <Link href="/pedidos?canal=preventa">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-400"
              onClick={() => logout()}
            >
              Salir
            </Button>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-1 rounded-lg bg-slate-900 p-1">
          <button
            type="button"
            className={`rounded-md py-2 text-sm font-medium ${
              tab === "nuevo" ? "bg-amber-500 text-slate-950" : "text-slate-300"
            }`}
            onClick={() => setTab("nuevo")}
          >
            Nuevo pedido
          </button>
          <button
            type="button"
            className={`rounded-md py-2 text-sm font-medium ${
              tab === "hoy" ? "bg-amber-500 text-slate-950" : "text-slate-300"
            }`}
            onClick={() => {
              setTab("hoy")
              loadTodayOrders()
            }}
          >
            Pedidos de hoy
            {todayOrders.length > 0 ? (
              <Badge className="ml-1 bg-slate-950 text-amber-400">{todayOrders.length}</Badge>
            ) : null}
          </button>
        </div>
      </header>

      {error ? (
        <p className="mx-4 mt-3 rounded-md border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}
      {successMsg ? (
        <p className="mx-4 mt-3 flex items-center gap-2 rounded-md border border-emerald-900 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-300">
          <Check className="h-4 w-4" /> {successMsg}
        </p>
      ) : null}

      {tab === "hoy" ? (
        <section className="space-y-3 p-4">
          <p className="text-xs text-slate-400">
            Solo canal <strong className="text-amber-400">preventa</strong> · {todayISO()}
          </p>
          {loadingOrders ? (
            <div className="flex justify-center py-10 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : todayOrders.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">
              Todavía no hay pedidos de calle hoy
            </p>
          ) : (
            todayOrders.map((o) => (
              <div
                key={o.id}
                className="rounded-xl border border-slate-800 bg-slate-900/80 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {o.order_number || `PED-${o.id}`}
                    </p>
                    <p className="text-sm text-slate-400">
                      {o.client_name || `Cliente #${o.client_id}`}
                    </p>
                  </div>
                  <Badge variant="outline" className="border-amber-700 text-amber-400">
                    {o.status}
                  </Badge>
                </div>
                <p className="mt-2 text-lg font-semibold tabular-nums">
                  $
                  {Number(o.total_amount || 0).toLocaleString("es-AR", {
                    maximumFractionDigits: 0,
                  })}
                </p>
              </div>
            ))
          )}
        </section>
      ) : (
        <section className="space-y-4 p-4">
          {loadingCatalog ? (
            <div className="flex justify-center py-10 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label className="text-slate-300">Cliente</Label>
                {selectedClient ? (
                  <div className="flex items-center justify-between rounded-xl border border-amber-800/50 bg-amber-950/20 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-amber-400" />
                      <span className="text-sm font-medium">
                        {getClienteDisplayName(selectedClient)}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedClient(null)}
                    >
                      Cambiar
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                      <Input
                        className="border-slate-700 bg-slate-900 pl-9"
                        placeholder="Buscar cliente…"
                        value={clientQuery}
                        onChange={(e) => setClientQuery(e.target.value)}
                      />
                    </div>
                    <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-slate-800">
                      {filteredClients.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-800"
                          onClick={() => {
                            setSelectedClient(c)
                            setClientQuery("")
                          }}
                        >
                          <User className="h-3.5 w-3.5 text-slate-500" />
                          {getClienteDisplayName(c)}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-slate-300">Lista de precio</Label>
                  <Select
                    value={priceListSlug}
                    onValueChange={(v) => applyPriceList(v as PriceListSlug)}
                  >
                    <SelectTrigger className="border-slate-700 bg-slate-900">
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
                <div className="space-y-1">
                  <Label className="text-slate-300">Entrega</Label>
                  <Input
                    type="date"
                    className="border-slate-700 bg-slate-900"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Productos</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <Input
                    className="border-slate-700 bg-slate-900 pl-9"
                    placeholder="Buscar producto…"
                    value={productQuery}
                    onChange={(e) => setProductQuery(e.target.value)}
                  />
                </div>
                <div className="max-h-52 space-y-1 overflow-y-auto rounded-lg border border-slate-800">
                  {filteredProducts.map((p) => {
                    const price = resolveProductListPrice(p, priceListSlug)
                    return (
                      <button
                        key={p.id}
                        type="button"
                        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-slate-800"
                        onClick={() => addProduct(p)}
                      >
                        <span className="truncate">
                          <span className="font-medium">{p.name}</span>
                          <span className="ml-2 text-xs text-slate-500">{p.code}</span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2 tabular-nums text-amber-400">
                          ${Math.round(price).toLocaleString("es-AR")}
                          <PackagePlus className="h-4 w-4" />
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {cart.length > 0 ? (
                <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
                    <ShoppingBag className="h-4 w-4" /> Pedido ({cart.length})
                  </div>
                  {cart.map((l) => (
                    <div
                      key={l.product.id}
                      className="flex items-center justify-between gap-2 border-t border-slate-800 pt-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm">{l.product.name}</p>
                        <p className="text-xs text-slate-500 tabular-nums">
                          ${Math.round(l.unit_price).toLocaleString("es-AR")} c/u
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="h-8 w-8 border-slate-700"
                          onClick={() => setQty(l.product.id, -1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-7 text-center tabular-nums">{l.quantity}</span>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="h-8 w-8 border-slate-700"
                          onClick={() => setQty(l.product.id, 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Input
                    className="mt-2 border-slate-700 bg-slate-950"
                    placeholder="Notas (opcional)"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              ) : null}
            </>
          )}
        </section>
      )}

      {tab === "nuevo" ? (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-800 bg-slate-950/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-lg items-center gap-3">
            <div className="flex-1">
              <p className="text-xs text-slate-400">Total preventa</p>
              <p className="text-xl font-bold tabular-nums text-amber-400">
                ${Math.round(total).toLocaleString("es-AR")}
              </p>
            </div>
            <Button
              className="h-12 flex-1 bg-amber-500 text-slate-950 hover:bg-amber-400"
              disabled={submitting || !selectedClient || cart.length === 0}
              onClick={submitOrder}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Confirmar pedido"
              )}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
