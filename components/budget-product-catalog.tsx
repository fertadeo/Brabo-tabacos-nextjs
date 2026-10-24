"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import type { Product } from "@/lib/api"
import { getProductImageUrl } from "@/lib/product-image-utils"
import {
  PC_BUILD_STEPS,
  filterProductsForPcStep,
  type PcBuildStep,
} from "@/lib/pc-build-steps"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Cpu,
  LayoutGrid,
  LayoutList,
  Loader2,
  Maximize2,
  Monitor,
  Plus,
  Search,
  SkipForward,
} from "lucide-react"

export type BudgetCatalogMode = "general" | "pc-build"
type ViewMode = "list" | "grid"

function formatMoney(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n)
}

function filterBySearch(products: Product[], q: string): Product[] {
  const term = q.trim().toLowerCase()
  if (!term) return products
  return products.filter(
    (p) =>
      p.name?.toLowerCase().includes(term) ||
      p.code?.toLowerCase().includes(term) ||
      p.category_name?.toLowerCase().includes(term)
  )
}

interface BudgetProductCatalogProps {
  products: Product[]
  loading?: boolean
  onAddProduct: (product: Product) => void
  lineProductIds?: number[]
  className?: string
}

function ViewModeToolbar({
  viewMode,
  onViewModeChange,
  onExpanded,
}: {
  viewMode: ViewMode
  onViewModeChange: (m: ViewMode) => void
  onExpanded: () => void
}) {
  return (
    <div className="flex items-center gap-1 shrink-0">
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
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={onExpanded}
        title="Vista ampliada"
      >
        <Maximize2 className="h-4 w-4" />
      </Button>
    </div>
  )
}

function ProductAddButton({
  inBudget,
  adding,
  onClick,
  disabled,
}: {
  inBudget: boolean
  adding?: boolean
  onClick: (e: React.MouseEvent) => void
  disabled?: boolean
}) {
  const showAdded = inBudget && !adding

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={disabled || adding}
      className={cn(
        "shrink-0 min-w-[108px]",
        showAdded &&
          "bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700 hover:text-white dark:bg-emerald-600 dark:border-emerald-600 dark:hover:bg-emerald-700"
      )}
      onClick={onClick}
    >
      {adding ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : showAdded ? (
        <>
          <Check className="h-4 w-4 mr-1" />
          Agregado
        </>
      ) : (
        <>
          <Plus className="h-4 w-4 mr-1" />
          Agregar
        </>
      )}
    </Button>
  )
}

function ProductListView({
  products,
  lineIds,
  addingProductId,
  onAdd,
}: {
  products: Product[]
  lineIds: Set<number>
  addingProductId: number | null
  onAdd: (p: Product) => void
}) {
  return (
    <div className="space-y-1.5 p-1">
      {products.map((p) => {
        const inBudget = lineIds.has(p.id)
        return (
          <div
            key={p.id}
            className="flex items-center gap-3 w-full p-2 rounded-lg border bg-card hover:bg-muted/50"
          >
            <div className="relative h-12 w-12 shrink-0 rounded-md overflow-hidden bg-muted">
              <Image
                src={getProductImageUrl(p, { size: 96 })}
                alt={p.name}
                fill
                className="object-cover"
                sizes="48px"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-snug line-clamp-2">{p.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {p.code}
                {p.category_name ? ` · ${p.category_name}` : ""}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatMoney(Number(p.price) || 0)} · Stock {p.stock ?? 0}
              </p>
            </div>
            <ProductAddButton
              inBudget={inBudget}
              adding={addingProductId === p.id}
              disabled={addingProductId != null && addingProductId !== p.id}
              onClick={(e) => {
                e.stopPropagation()
                onAdd(p)
              }}
            />
          </div>
        )
      })}
    </div>
  )
}

/** Cuadrícula estilo POS: tarjetas anchas con imagen + texto en fila (no mini-columnas verticales). */
function ProductGridView({
  products,
  lineIds,
  addingProductId,
  onAdd,
}: {
  products: Product[]
  lineIds: Set<number>
  addingProductId: number | null
  onAdd: (p: Product) => void
}) {
  return (
    <div className="grid grid-cols-1 gap-2 p-1 sm:grid-cols-2">
      {products.map((p) => {
        const inBudget = lineIds.has(p.id)
        return (
          <div
            key={p.id}
            className="flex flex-col gap-2 rounded-lg border bg-card p-3 hover:bg-muted/40 transition-colors"
          >
            <div className="flex items-start gap-3 min-w-0">
              <div className="relative h-14 w-14 shrink-0 rounded-md overflow-hidden bg-muted">
                <Image
                  src={getProductImageUrl(p, { size: 112 })}
                  alt={p.name}
                  fill
                  className="object-cover"
                  sizes="56px"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-snug line-clamp-2">{p.name}</p>
                <p className="text-xs font-mono text-muted-foreground truncate mt-0.5">{p.code}</p>
                <p className="text-sm font-semibold tabular-nums mt-1">{formatMoney(Number(p.price) || 0)}</p>
                <p className="text-[11px] text-muted-foreground">Stock {p.stock ?? 0}</p>
              </div>
            </div>
            <ProductAddButton
              inBudget={inBudget}
              adding={addingProductId === p.id}
              disabled={addingProductId != null && addingProductId !== p.id}
              onClick={(e) => {
                e.stopPropagation()
                onAdd(p)
              }}
            />
          </div>
        )
      })}
    </div>
  )
}

function ProductsExpandedModal({
  open,
  onOpenChange,
  products,
  lineIds,
  addingProductId,
  onAdd,
  title,
  initialSearch,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  products: Product[]
  lineIds: Set<number>
  addingProductId: number | null
  onAdd: (p: Product) => void
  title: string
  initialSearch?: string
}) {
  const [modalSearch, setModalSearch] = useState("")

  useEffect(() => {
    if (open) setModalSearch(initialSearch ?? "")
  }, [open, initialSearch])

  const filtered = useMemo(() => filterBySearch(products, modalSearch), [products, modalSearch])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col gap-4 p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            {title}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {filtered.length} producto{filtered.length !== 1 ? "s" : ""}
            {modalSearch.trim() && products.length !== filtered.length
              ? ` (de ${products.length} en esta vista)`
              : ""}
          </p>
        </DialogHeader>
        <div className="relative shrink-0">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-9"
            placeholder="Buscar por nombre, código o categoría…"
            value={modalSearch}
            onChange={(e) => setModalSearch(e.target.value)}
            autoFocus
          />
        </div>
        <div className="border rounded-md overflow-auto flex-1 min-h-[360px]">
          {filtered.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground text-center">Sin resultados</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-200 dark:bg-slate-800 border-b">
                  <th className="text-left p-2.5 w-14">Imagen</th>
                  <th className="text-left p-2.5">Código</th>
                  <th className="text-left p-2.5">Nombre</th>
                  <th className="text-left p-2.5">Categoría</th>
                  <th className="text-right p-2.5">Precio</th>
                  <th className="text-right p-2.5">Stock</th>
                  <th className="text-right p-2.5 w-28">Acción</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const inBudget = lineIds.has(p.id)
                  return (
                    <tr key={p.id} className="border-t hover:bg-muted/30">
                      <td className="p-2">
                        <div className="relative h-10 w-10 rounded overflow-hidden bg-muted">
                          <Image
                            src={getProductImageUrl(p, { size: 80 })}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="40px"
                          />
                        </div>
                      </td>
                      <td className="p-2 font-mono text-xs">{p.code ?? "—"}</td>
                      <td className="p-2 font-medium">{p.name}</td>
                      <td className="p-2 text-muted-foreground">{p.category_name ?? "—"}</td>
                      <td className="p-2 text-right tabular-nums">{formatMoney(Number(p.price) || 0)}</td>
                      <td className="p-2 text-right">{p.stock ?? 0}</td>
                      <td className="p-2 text-right">
                        <ProductAddButton
                          inBudget={inBudget}
                          adding={addingProductId === p.id}
                          disabled={addingProductId != null && addingProductId !== p.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            onAdd(p)
                          }}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function BudgetProductCatalog({
  products,
  loading = false,
  onAddProduct,
  lineProductIds = [],
  className,
}: BudgetProductCatalogProps) {
  const [mode, setMode] = useState<BudgetCatalogMode>("general")
  const [viewMode, setViewMode] = useState<ViewMode>("list")
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [pcStepIndex, setPcStepIndex] = useState(0)
  const [advanceOnAdd, setAdvanceOnAdd] = useState(true)
  const [expandedOpen, setExpandedOpen] = useState(false)
  const [addingProductId, setAddingProductId] = useState<number | null>(null)

  const lineIds = useMemo(() => new Set(lineProductIds), [lineProductIds])

  const categories = useMemo(() => {
    const map = new Map<number, string>()
    for (const p of products) {
      if (p.category_id != null && p.category_name) {
        map.set(p.category_id, p.category_name)
      }
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "es"))
  }, [products])

  const currentPcStep: PcBuildStep = PC_BUILD_STEPS[pcStepIndex] ?? PC_BUILD_STEPS[0]

  const generalProducts = useMemo(() => {
    let list = products
    if (categoryFilter !== "all") {
      const cid = parseInt(categoryFilter, 10)
      if (!Number.isNaN(cid)) list = list.filter((p) => p.category_id === cid)
    }
    return filterBySearch(list, search)
  }, [products, search, categoryFilter])

  const pcStepProducts = useMemo(() => {
    const stepList = filterProductsForPcStep(products, currentPcStep)
    return filterBySearch(stepList, search)
  }, [products, currentPcStep, search])

  const displayProducts = mode === "pc-build" ? pcStepProducts : generalProducts

  const handleAdd = (p: Product) => {
    if (addingProductId != null) return
    setAddingProductId(p.id)
    window.setTimeout(() => {
      onAddProduct(p)
      setAddingProductId(null)
      if (mode === "pc-build" && advanceOnAdd && pcStepIndex < PC_BUILD_STEPS.length - 1) {
        setPcStepIndex((i) => i + 1)
        setSearch("")
      }
    }, 280)
  }

  const emptyMessage =
    mode === "pc-build"
      ? "No hay productos para este paso. Probá otra búsqueda o el botón Siguiente."
      : "Sin resultados. Ajustá la búsqueda o la categoría."

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={mode === "general" ? "default" : "outline"}
          onClick={() => {
            setMode("general")
            setSearch("")
          }}
        >
          Catálogo general
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "pc-build" ? "default" : "outline"}
          className="gap-1.5"
          onClick={() => {
            setMode("pc-build")
            setPcStepIndex(0)
            setSearch("")
          }}
        >
          <Cpu className="h-4 w-4" />
          Armado de PC
        </Button>
      </div>

      {mode === "pc-build" && (
        <div className="rounded-lg border bg-gradient-to-br from-primary/5 via-background to-background p-3 space-y-3">
          <div>
            <p className="text-xs font-medium text-primary uppercase tracking-wide">
              Paso {pcStepIndex + 1} de {PC_BUILD_STEPS.length}
            </p>
            <h3 className="text-base font-semibold flex items-center gap-2 mt-0.5">
              {currentPcStep.label}
              {currentPcStep.optional && (
                <Badge variant="outline" className="text-[10px] font-normal">
                  Opcional
                </Badge>
              )}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">{currentPcStep.description}</p>
          </div>
          <div className="flex gap-1 overflow-x-auto pb-1">
            {PC_BUILD_STEPS.map((step, i) => (
              <button
                key={step.id}
                type="button"
                onClick={() => {
                  setPcStepIndex(i)
                  setSearch("")
                }}
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium border transition-colors",
                  i === pcStepIndex
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted border-transparent"
                )}
              >
                {step.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pcStepIndex === 0}
                onClick={() => setPcStepIndex((i) => Math.max(0, i - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pcStepIndex >= PC_BUILD_STEPS.length - 1}
                onClick={() => setPcStepIndex((i) => Math.min(PC_BUILD_STEPS.length - 1, i + 1))}
              >
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </Button>
              {currentPcStep.optional && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="gap-1 text-muted-foreground"
                  onClick={() => setPcStepIndex((i) => Math.min(PC_BUILD_STEPS.length - 1, i + 1))}
                >
                  <SkipForward className="h-4 w-4" />
                  Omitir
                </Button>
              )}
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                className="rounded border-input"
                checked={advanceOnAdd}
                onChange={(e) => setAdvanceOnAdd(e.target.checked)}
              />
              Avanzar al agregar
            </label>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-9 h-9"
            placeholder={
              mode === "pc-build"
                ? `Buscar en ${currentPcStep.label.toLowerCase()}…`
                : "Nombre, código o categoría…"
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={loading}
          />
        </div>
        {mode === "general" && categories.length > 0 && (
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[170px] h-9">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <ViewModeToolbar
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onExpanded={() => setExpandedOpen(true)}
        />
      </div>

      <div className="rounded-lg border overflow-hidden bg-background shadow-sm">
        <div className="border-b px-3 py-2 text-xs text-muted-foreground flex items-center justify-between gap-2 bg-muted/30">
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Cargando catálogo…
            </span>
          ) : (
            <>
              <span>
                <span className="font-medium text-foreground">{displayProducts.length}</span> productos
              </span>
              {mode === "pc-build" && (
                <span className="hidden sm:flex items-center gap-1">
                  <Monitor className="h-3 w-3" />
                  Armado guiado
                </span>
              )}
            </>
          )}
        </div>
        <div
          className={cn(
            "overflow-y-auto overscroll-contain",
            viewMode === "list" ? "max-h-[min(58vh,520px)]" : "max-h-[min(58vh,560px)]"
          )}
        >
          {loading ? (
            <div className="flex justify-center py-20 text-muted-foreground">
              <Loader2 className="h-7 w-7 animate-spin" />
            </div>
          ) : displayProducts.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">{emptyMessage}</p>
          ) : viewMode === "list" ? (
            <ProductListView
              products={displayProducts}
              lineIds={lineIds}
              addingProductId={addingProductId}
              onAdd={handleAdd}
            />
          ) : (
            <ProductGridView
              products={displayProducts}
              lineIds={lineIds}
              addingProductId={addingProductId}
              onAdd={handleAdd}
            />
          )}
        </div>
      </div>

      <ProductsExpandedModal
        open={expandedOpen}
        onOpenChange={setExpandedOpen}
        products={displayProducts}
        lineIds={lineIds}
        addingProductId={addingProductId}
        onAdd={handleAdd}
        initialSearch={search}
        title={mode === "pc-build" ? `Productos — ${currentPcStep.label}` : "Productos — Vista ampliada"}
      />
    </div>
  )
}
