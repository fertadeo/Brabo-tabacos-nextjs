"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Percent, RefreshCw, X } from "lucide-react"
import { PricingCategoryList } from "@/components/product-pricing/pricing-category-list"
import { PricingProductPreviewList } from "@/components/product-pricing/pricing-product-preview-list"
import { cn } from "@/lib/utils"
import { useToast } from "@/contexts/ToastContext"
import { getProducts, type Product } from "@/lib/api"
import { PreviewProductManualPriceDialog } from "@/components/product-pricing/preview-product-manual-price-dialog"
import {
  applyCategoryPriceAdjustmentWithMessage,
  getPricingCategories,
  previewCategoryPriceAdjustment,
  roundPrice,
  type CategoryAdjustmentPreview,
  type PriceSampleRow,
  type PricingCategoryRow,
} from "@/lib/product-pricing"

interface CategoryAdjustmentPanelProps {
  onApplied?: () => void
}

type CategoryTag =
  | { kind: "category"; id: number; label: string }
  | { kind: "uncategorized"; label: string }

function productMatchesSelection(
  product: Product,
  categoryIds: Set<number>,
  includeUncategorized: boolean
): boolean {
  if (!product.is_active) return false
  if (product.category_id != null && categoryIds.has(product.category_id)) return true
  if (includeUncategorized && (product.category_id == null || product.category_id === undefined)) {
    return true
  }
  return false
}

function mapProductToSample(product: Product, multiplier: number): PriceSampleRow {
  const current = Number(product.price) || 0
  return {
    id: product.id,
    code: product.code,
    name: product.name,
    category_id: product.category_id,
    category_name: product.category_name,
    current_price: current,
    new_price: roundPrice(current * multiplier),
  }
}

export function CategoryAdjustmentPanel({ onApplied }: CategoryAdjustmentPanelProps) {
  const { showToast } = useToast()
  const [categories, setCategories] = useState<PricingCategoryRow[]>([])
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [includeUncategorized, setIncludeUncategorized] = useState(false)
  const [percentage, setPercentage] = useState("")
  const [syncWoo, setSyncWoo] = useState(false)
  const [preview, setPreview] = useState<CategoryAdjustmentPreview | null>(null)
  const [previewProducts, setPreviewProducts] = useState<PriceSampleRow[]>([])
  const [includedProductIds, setIncludedProductIds] = useState<Set<number>>(new Set())
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingProduct, setEditingProduct] = useState<PriceSampleRow | null>(null)
  const [editPriceDialogOpen, setEditPriceDialogOpen] = useState(false)
  const [manuallyPricedIds, setManuallyPricedIds] = useState<Set<number>>(new Set())

  const numericCategories = useMemo(
    () => categories.filter((c) => c.category_id != null),
    [categories]
  )
  const uncategorizedRow = useMemo(
    () => categories.find((c) => c.category_id == null),
    [categories]
  )

  const selectionTags = useMemo((): CategoryTag[] => {
    const tags: CategoryTag[] = []
    for (const row of numericCategories) {
      const id = row.category_id as number
      if (selectedIds.has(id)) {
        tags.push({ kind: "category", id, label: row.category_name })
      }
    }
    if (includeUncategorized && uncategorizedRow) {
      tags.push({ kind: "uncategorized", label: uncategorizedRow.category_name })
    }
    return tags
  }, [numericCategories, selectedIds, includeUncategorized, uncategorizedRow])

  const clearPreviewState = () => {
    setPreview(null)
    setPreviewProducts([])
    setIncludedProductIds(new Set())
    setManuallyPricedIds(new Set())
    setEditingProduct(null)
    setEditPriceDialogOpen(false)
  }

  const handleManualPriceSaved = (productId: number, newPrice: number) => {
    const multiplier = preview?.multiplier ?? 1
    setPreviewProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? {
              ...p,
              current_price: newPrice,
              new_price: roundPrice(newPrice * multiplier),
            }
          : p
      )
    )
    setManuallyPricedIds((prev) => new Set(prev).add(productId))
    onApplied?.()
  }

  const loadCategories = useCallback(async () => {
    setLoadingCategories(true)
    setError(null)
    try {
      const rows = await getPricingCategories()
      setCategories(rows)
      const ids = rows
        .filter((c) => c.category_id != null)
        .map((c) => c.category_id as number)
      setSelectedIds(new Set(ids))
      const unc = rows.find((c) => c.category_id == null)
      setIncludeUncategorized(!!unc && unc.product_count > 0)
      clearPreviewState()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar categorías")
    } finally {
      setLoadingCategories(false)
    }
  }, [])

  useEffect(() => {
    void loadCategories()
  }, [loadCategories])

  const allNumericSelected =
    numericCategories.length > 0 &&
    numericCategories.every((c) => selectedIds.has(c.category_id as number))

  const toggleAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(numericCategories.map((c) => c.category_id as number)))
    } else {
      setSelectedIds(new Set())
    }
    clearPreviewState()
  }

  const toggleCategory = (id: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
    clearPreviewState()
  }

  const removeTag = (tag: CategoryTag) => {
    if (tag.kind === "category") {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(tag.id)
        return next
      })
    } else {
      setIncludeUncategorized(false)
    }
    clearPreviewState()
  }

  const hasSelection = selectedIds.size > 0 || includeUncategorized

  const parsedPercentage = parseFloat(percentage.replace(",", "."))
  const percentageValid =
    percentage.trim() !== "" && !Number.isNaN(parsedPercentage) && parsedPercentage !== 0

  const buildBody = () => ({
    category_ids: Array.from(selectedIds),
    include_uncategorized: includeUncategorized,
    percentage: parsedPercentage,
  })

  const includedCount = includedProductIds.size
  const allPreviewIncluded =
    previewProducts.length > 0 && previewProducts.every((p) => includedProductIds.has(p.id))
  const somePreviewIncluded = previewProducts.some((p) => includedProductIds.has(p.id))

  const toggleAllPreviewProducts = (checked: boolean) => {
    if (checked) {
      setIncludedProductIds(new Set(previewProducts.map((p) => p.id)))
    } else {
      setIncludedProductIds(new Set())
    }
  }

  const togglePreviewProduct = (id: number, checked: boolean) => {
    setIncludedProductIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const runPreview = async () => {
    if (!hasSelection) {
      showToast({ message: "Seleccioná al menos una categoría o productos sin categoría", type: "error" })
      return
    }
    if (!percentageValid) {
      showToast({ message: "Ingresá un porcentaje distinto de cero", type: "error" })
      return
    }
    setLoadingPreview(true)
    setError(null)
    clearPreviewState()
    try {
      const data = await previewCategoryPriceAdjustment({
        ...buildBody(),
        preview_limit: 10,
      })

      const dataProducts = await getProducts(1, 10000, true)
      let allActive: Product[] = []
      if (dataProducts && typeof dataProducts === "object" && "products" in dataProducts) {
        allActive = dataProducts.products
      } else if (Array.isArray(dataProducts)) {
        allActive = dataProducts
      }

      const affected = allActive
        .filter((p) => productMatchesSelection(p, selectedIds, includeUncategorized))
        .map((p) => mapProductToSample(p, data.multiplier))
        .sort((a, b) => a.name.localeCompare(b.name, "es"))

      setPreview(data)
      setPreviewProducts(affected)
      setIncludedProductIds(new Set(affected.map((p) => p.id)))
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error en vista previa"
      setError(msg)
      showToast({ message: msg, type: "error" })
    } finally {
      setLoadingPreview(false)
    }
  }

  const runApply = async () => {
    if (!hasSelection || !percentageValid) return
    if (preview && includedCount === 0) {
      showToast({ message: "Seleccioná al menos un producto para actualizar", type: "error" })
      return
    }
    const sign = parsedPercentage > 0 ? "+" : ""
    const excludedIds = [
      ...new Set([
        ...previewProducts.filter((p) => !includedProductIds.has(p.id)).map((p) => p.id),
        ...manuallyPricedIds,
      ]),
    ]
    const msg = preview
      ? `¿Confirmar actualización de ${includedCount} producto(s) con ${sign}${parsedPercentage}%?${
          excludedIds.length > 0 ? ` (${excludedIds.length} excluido(s))` : ""
        }`
      : `¿Aplicar ${sign}${parsedPercentage}% a las categorías seleccionadas?`
    if (!window.confirm(msg)) return

    setApplying(true)
    setError(null)
    try {
      const { data, message } = await applyCategoryPriceAdjustmentWithMessage({
        ...buildBody(),
        sync_to_woocommerce: syncWoo,
        ...(excludedIds.length > 0 ? { exclude_product_ids: excludedIds } : {}),
      })
      let detail = message
      if (data.woocommerce_sync && syncWoo) {
        detail += ` · WooCommerce: ${data.woocommerce_sync.synced} ok`
        if (data.woocommerce_sync.failed > 0) {
          detail += `, ${data.woocommerce_sync.failed} fallidos`
        }
      }
      showToast({ message: detail, type: "success", duration: 6000 })
      clearPreviewState()
      setPercentage("")
      onApplied?.()
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : "Error al aplicar"
      setError(errMsg)
      showToast({ message: errMsg, type: "error" })
    } finally {
      setApplying(false)
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <Percent className="h-5 w-5 shrink-0" />
          Ajuste por categoría
        </CardTitle>
        <CardDescription className="text-sm">
          Elegí categorías y un porcentaje (positivo aumenta, negativo descuenta). Los precios se
          redondean a 2 decimales.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6 pt-0 sm:pt-0">
        {error && (
          <p className="text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/5 p-3">
            {error}
          </p>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full sm:w-auto"
          onClick={() => void loadCategories()}
          disabled={loadingCategories}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loadingCategories ? "animate-spin" : ""}`} />
          Recargar categorías
        </Button>

        {selectionTags.length > 0 && (
          <div className="space-y-2">
            <Label className="text-muted-foreground">Categorías seleccionadas</Label>
            <div className="flex flex-wrap gap-2">
              {selectionTags.map((tag) => (
                <Badge
                  key={tag.kind === "category" ? `cat-${tag.id}` : "uncategorized"}
                  variant="secondary"
                  className="pl-2.5 pr-1 py-1 gap-1 text-sm font-normal"
                >
                  {tag.label}
                  <button
                    type="button"
                    className="rounded-sm p-0.5 hover:bg-muted-foreground/20 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    aria-label={`Quitar ${tag.label}`}
                    onClick={() => removeTag(tag)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {loadingCategories ? (
          <div className="flex items-center gap-2 text-muted-foreground py-8">
            <Loader2 className="h-5 w-5 animate-spin" />
            Cargando categorías…
          </div>
        ) : (
          <PricingCategoryList
            numericCategories={numericCategories}
            uncategorizedRow={uncategorizedRow}
            selectedIds={selectedIds}
            includeUncategorized={includeUncategorized}
            allNumericSelected={allNumericSelected}
            onToggleAll={toggleAll}
            onToggleCategory={toggleCategory}
            onToggleUncategorized={(checked) => {
              setIncludeUncategorized(checked)
              clearPreviewState()
            }}
          />
        )}

        <div className="grid gap-4 sm:grid-cols-2 sm:max-w-xl">
          <div className="space-y-2">
            <Label htmlFor="pricing-percentage">Porcentaje (%)</Label>
            <Input
              id="pricing-percentage"
              type="number"
              step="0.01"
              placeholder="Ej: 15 o -5"
              value={percentage}
              onChange={(e) => {
                setPercentage(e.target.value)
                clearPreviewState()
              }}
            />
          </div>
        </div>

        <label className="flex min-h-10 items-start gap-3 text-sm cursor-pointer rounded-lg border p-3 sm:border-0 sm:p-0">
          <Checkbox
            className="mt-0.5"
            checked={syncWoo}
            onCheckedChange={(v) => setSyncWoo(v === true)}
          />
          <span>Sincronizar con WooCommerce al aplicar</span>
        </label>

        <div
          className={cn(
            "flex flex-col gap-2 sm:flex-row sm:flex-wrap",
            preview && "pb-20 sm:pb-0"
          )}
        >
          <Button
            type="button"
            variant="secondary"
            className="w-full sm:w-auto"
            onClick={() => void runPreview()}
            disabled={loadingPreview || loadingCategories || !hasSelection || !percentageValid}
          >
            {loadingPreview && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Vista previa
          </Button>
          <Button
            type="button"
            className="w-full sm:w-auto"
            onClick={() => void runApply()}
            disabled={
              applying ||
              loadingCategories ||
              !hasSelection ||
              !percentageValid ||
              (preview != null && includedCount === 0)
            }
          >
            {applying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Aplicar cambios
          </Button>
        </div>

        {/* Barra fija en móvil al tener vista previa */}
        {preview && (
          <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
            <div className="mx-auto max-w-7xl flex flex-col gap-2">
              <p className="text-xs text-center text-muted-foreground tabular-nums">
                {includedCount}/{previewProducts.length} seleccionados · {preview.percentage > 0 ? "+" : ""}
                {preview.percentage}%
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => void runPreview()}
                  disabled={loadingPreview || !hasSelection || !percentageValid}
                >
                  {loadingPreview ? <Loader2 className="h-4 w-4 animate-spin" /> : "Vista previa"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void runApply()}
                  disabled={applying || includedCount === 0}
                >
                  {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aplicar"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {preview && previewProducts.length > 0 && (
          <div className="space-y-3 rounded-lg border bg-muted/30 p-3 sm:p-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">
                {includedCount} de {previewProducts.length} producto(s) seleccionados
              </p>
              <p className="text-xs text-muted-foreground">
                Multiplicador {preview.multiplier.toFixed(4)} ({preview.percentage > 0 ? "+" : ""}
                {preview.percentage}%)
              </p>
            </div>
            <div className="max-h-[min(60vh,28rem)] overflow-y-auto -mx-1 px-1">
              <PricingProductPreviewList
                products={previewProducts}
                includedProductIds={includedProductIds}
                manuallyPricedIds={manuallyPricedIds}
                allIncluded={allPreviewIncluded}
                someIncluded={somePreviewIncluded}
                onToggleAll={toggleAllPreviewProducts}
                onToggleProduct={togglePreviewProduct}
                onEditProduct={(row) => {
                  setEditingProduct(row)
                  setEditPriceDialogOpen(true)
                }}
              />
            </div>
          </div>
        )}

        {preview && previewProducts.length === 0 && (
          <p className="text-sm text-muted-foreground rounded-lg border bg-muted/30 p-4">
            No hay productos activos en las categorías seleccionadas.
          </p>
        )}

        <PreviewProductManualPriceDialog
          product={editingProduct}
          open={editPriceDialogOpen}
          onOpenChange={setEditPriceDialogOpen}
          syncToWooCommerce={syncWoo}
          previewMultiplier={preview?.multiplier ?? 1}
          onSaved={handleManualPriceSaved}
        />
      </CardContent>
    </Card>
  )
}
