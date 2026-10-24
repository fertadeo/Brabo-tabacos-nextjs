"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useConfirmBeforeClose } from "@/lib/use-confirm-before-close"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getProducts, addRepairOrderItem } from "@/lib/api"
import type { Product } from "@/lib/api"
import { PosManualItemCard } from "@/components/pos-manual-item-card"
import { CurrencyFieldInput } from "@/components/currency-field-input"
import { getProductImageUrl } from "@/lib/product-image-utils"
import Image from "next/image"
import { Package, Loader2, Search, LayoutList, LayoutGrid } from "lucide-react"
import { cn } from "@/lib/utils"

interface RepairOrderAddItemModalProps {
  orderId: number | string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function RepairOrderAddItemModal({
  orderId,
  isOpen,
  onClose,
  onSuccess,
}: RepairOrderAddItemModalProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [productSearchQuery, setProductSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<"list" | "grid">("list")
  const [productId, setProductId] = useState<number | "">("")
  const [quantity, setQuantity] = useState("1")
  const [unitPrice, setUnitPrice] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedProduct = products.find((p) => p.id === productId)

  const filteredProducts = useMemo(() => {
    const q = productSearchQuery.trim().toLowerCase()
    if (!q) return products
    return products.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        (p.code && p.code.toLowerCase().includes(q)),
    )
  }, [products, productSearchQuery])

  useEffect(() => {
    if (!isOpen) return
    setLoadingProducts(true)
    setProductSearchQuery("")
    setViewMode("list")
    setProductId("")
    setQuantity("1")
    setUnitPrice(0)
    setError(null)
    const fetchProducts = async () => {
      try {
        const res = await getProducts(1, 200)
        const list = Array.isArray(res) ? res : (res as { products: Product[] }).products || []
        setProducts(list)
      } catch {
        setProducts([])
      } finally {
        setLoadingProducts(false)
      }
    }
    fetchProducts()
  }, [isOpen])

  useEffect(() => {
    if (selectedProduct != null) {
      const p = Number(selectedProduct.price ?? 0)
      if (!unitPrice || unitPrice === 0) setUnitPrice(p)
    }
  }, [selectedProduct?.id])

  const clearProductSelection = () => {
    setProductId("")
    setProductSearchQuery("")
    setUnitPrice(0)
  }

  const selectProduct = (p: Product) => {
    setProductId(p.id)
    setProductSearchQuery(p.name ?? "")
    const price = Number(p.price ?? 0)
    if (!unitPrice || unitPrice === 0) setUnitPrice(price)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!productId || !quantity || !unitPrice) {
      setError("Completá producto, cantidad y precio unitario")
      return
    }
    const q = parseInt(quantity, 10)
    const price = unitPrice
    if (isNaN(q) || q < 1 || price < 0) {
      setError("Cantidad debe ser ≥ 1 y precio ≥ 0")
      return
    }
    setLoading(true)
    setError(null)
    try {
      await addRepairOrderItem(orderId, {
        product_id: productId,
        quantity: q,
        unit_price: price,
      })
      onSuccess()
      onClose()
      setProductId("")
      setQuantity("1")
      setUnitPrice(0)
      setProductSearchQuery("")
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al agregar ítem")
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => onClose()

  const [handleOpenChange, confirmDialog] = useConfirmBeforeClose((open) => {
    if (!open) handleClose()
  })

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="flex max-h-[min(90vh,calc(100vh-2rem))] w-full min-w-0 max-w-[min(56rem,calc(100vw-1.5rem))] flex-col gap-4 overflow-x-hidden overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="min-w-0 shrink-0 space-y-2 text-left">
            <DialogTitle className="flex items-center gap-2 pr-8">
              <Package className="h-5 w-5 shrink-0" />
              Agregar material
            </DialogTitle>
            <DialogDescription className="break-words">
              Producto del catálogo o ítem manual (sin stock). El stock de catálogo se descuenta al aceptar el
              presupuesto; los ítems manuales no mueven inventario.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="min-w-0 space-y-4">
            <div className="min-w-0 space-y-2">
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                <Label className="text-sm">Buscar producto</Label>
                <div className="flex rounded-md border">
                  <Button
                    type="button"
                    variant={viewMode === "list" ? "secondary" : "ghost"}
                    size="sm"
                    className="rounded-r-none h-8 px-2"
                    onClick={() => setViewMode("list")}
                    title="Vista lista"
                  >
                    <LayoutList className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant={viewMode === "grid" ? "secondary" : "ghost"}
                    size="sm"
                    className="rounded-l-none h-8 px-2"
                    onClick={() => setViewMode("grid")}
                    title="Vista cuadrícula"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="relative min-w-0 max-w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="text"
                  placeholder={loadingProducts ? "Cargando productos…" : "Buscar por nombre o código"}
                  value={productSearchQuery}
                  onChange={(e) => {
                    const v = e.target.value
                    setProductSearchQuery(v)
                    if (!v.trim()) clearProductSelection()
                    else setProductId("")
                  }}
                  disabled={loadingProducts}
                  className={cn("pl-9", productId ? "pr-20" : "")}
                />
                {!!productId && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 text-xs"
                    onClick={clearProductSelection}
                  >
                    Limpiar
                  </Button>
                )}
              </div>
            </div>

            {!productId && (
              <div className="min-w-0 max-w-full overflow-hidden rounded-md border bg-background">
                <div className="space-y-0.5 border-b px-3 py-2 text-xs text-muted-foreground break-words">
                  {loadingProducts ? (
                    "Cargando productos…"
                  ) : filteredProducts.length > 0 ? (
                    <>
                      <span className="font-medium text-foreground">
                        {filteredProducts.length} producto{filteredProducts.length !== 1 ? "s" : ""}
                      </span>
                      <span className="block">Seleccioná uno o usá la búsqueda para acotar la lista.</span>
                    </>
                  ) : (
                    "Sin resultados para la búsqueda actual"
                  )}
                </div>
                {!loadingProducts && filteredProducts.length > 0 && (
                  <div
                    className={cn(
                      "min-w-0 max-w-full overflow-x-hidden overflow-y-auto overscroll-contain",
                      viewMode === "list"
                        ? "max-h-[min(42vh,380px)] min-h-[180px]"
                        : "max-h-[min(42vh,380px)] min-h-[180px] p-2",
                    )}
                  >
                    {viewMode === "list" ? (
                      <ul className="divide-y">
                        {filteredProducts.map((p) => (
                          <li key={p.id}>
                            <button
                              type="button"
                              className="flex w-full min-w-0 max-w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-muted"
                              onClick={() => selectProduct(p)}
                            >
                              <span className="relative flex-shrink-0 block w-11 h-11 rounded overflow-hidden bg-muted">
                                <Image
                                  src={getProductImageUrl(p, { size: 96 })}
                                  alt=""
                                  fill
                                  className="object-cover"
                                  sizes="44px"
                                />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="font-medium block truncate">{p.name}</span>
                                <span className="block truncate text-xs text-muted-foreground">
                                  {p.code ? `${p.code} · ` : ""}Stock: {p.stock ?? 0}
                                </span>
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="grid min-w-0 w-full grid-cols-2 gap-2 sm:grid-cols-3">
                        {filteredProducts.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            className="flex min-w-0 max-w-full flex-col gap-2 rounded-lg border bg-card p-2 text-left transition-colors hover:bg-muted/50"
                            onClick={() => selectProduct(p)}
                          >
                            <div className="relative aspect-square max-h-[100px] w-full min-w-0 overflow-hidden rounded bg-muted">
                              <Image
                                src={getProductImageUrl(p, { size: 160 })}
                                alt=""
                                fill
                                className="object-cover"
                                sizes="(max-width:640px) 50vw, 33vw"
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-medium line-clamp-2 leading-snug">{p.name}</p>
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                {p.code ? `${p.code} · ` : ""}St: {p.stock ?? 0}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {!!productId && selectedProduct && (
              <div className="min-w-0 max-w-full rounded-md border bg-muted/30 p-3">
                <p className="mb-2 text-xs text-muted-foreground">Producto seleccionado</p>
                <div className="flex min-w-0 items-center gap-3">
                  <span className="relative block h-12 w-12 shrink-0 overflow-hidden rounded bg-muted">
                    <Image
                      src={getProductImageUrl(selectedProduct, { size: 96 })}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{selectedProduct.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {selectedProduct.code ? `${selectedProduct.code} · ` : ""}Stock:{" "}
                      {selectedProduct.stock ?? 0}
                    </span>
                  </span>
                </div>
              </div>
            )}

            <PosManualItemCard
              onAdd={async (payload) => {
                setLoading(true)
                setError(null)
                try {
                  await addRepairOrderItem(orderId, {
                    description: payload.description,
                    quantity: payload.quantity,
                    unit_price: payload.unit_price,
                  })
                  onSuccess()
                  onClose()
                } catch (e: unknown) {
                  setError(e instanceof Error ? e.message : "Error al agregar ítem manual")
                } finally {
                  setLoading(false)
                }
              }}
              disabled={loading}
              addLabel="Agregar ítem manual"
              inputIdPrefix="repair-add-item-manual"
            />

            <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="min-w-0 space-y-2">
                <Label>Cantidad</Label>
                <Input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="min-w-0"
                />
              </div>
              <div className="min-w-0 space-y-2">
                <Label>Precio unitario ($)</Label>
                <CurrencyFieldInput
                  className="min-w-0"
                  placeholder="$0,00"
                  value={unitPrice}
                  onValueChange={setUnitPrice}
                />
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter className="min-w-0 shrink-0 gap-2 sm:justify-end">
              <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Agregar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {confirmDialog}
    </>
  )
}
