"use client"

import Link from "next/link"
import { ERPLayout } from "@/components/erp-layout"
import { Protected } from "@/components/protected"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Pagination } from "@/components/ui/pagination"
import { useRole } from "@/app/hooks/useRole"
import {
  getProducts,
  deleteProduct,
  deleteProductPermanent,
  getProductStats,
  getCategories,
  type ProductStats,
  type Category,
  type Product,
  type LinkWooCommerceIdsSummary,
} from "@/lib/api"
import { useState, useEffect, useMemo } from "react"
import { ProductDetailModal } from "@/components/product-detail-modal"
import { NewProductModal } from "@/components/new-product-modal"
import { EditProductModal } from "@/components/edit-product-modal"
import { BarcodeSearchModal } from "@/components/barcode-search-modal"
import { getProductImageUrl } from "@/lib/product-image-utils"
import { filterProductCatalog } from "@/lib/product-catalog-filter"
import { formatSaleIvaRateLabel, productIvaRate } from "@/lib/sale-iva"
import { ProductExportDialog } from "@/components/product-export-dialog"
import { ProductImportDialog } from "@/components/products/product-import-dialog"
import { LinkWooCommerceIdsButton, LinkWooCommerceSummary } from "@/components/products/link-woocommerce-ids-button"
import { FEATURE_WOOCOMMERCE } from "@/lib/features"
import Image from "next/image"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Package,
  Search,
  Plus,
  Edit,
  Trash2,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Eye,
  Filter,
  Download,
  LayoutGrid,
  LayoutList,
  Image as ImageIcon,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileCheck,
  FileEdit,
  PackagePlus,
  Truck,
  BadgePercent,
  Upload,
} from "lucide-react"

export default function ProductosPage() {
  const { hasAnyOfRoles, isAdmin } = useRole()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false)
  const [isBarcodeSearchModalOpen, setIsBarcodeSearchModalOpen] = useState(false)
  const [productToEdit, setProductToEdit] = useState<Product | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalProducts, setTotalProducts] = useState(0)
  const [productStats, setProductStats] = useState<ProductStats | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [allProducts, setAllProducts] = useState<Product[]>([]) // Todos los productos cargados
  const [productsLoaded, setProductsLoaded] = useState(false) // Flag para saber si ya se cargaron todos los productos
  const [viewMode, setViewMode] = useState<"list" | "grid">("list")
  const [categories, setCategories] = useState<Category[]>([])
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all")
  const [filterStock, setFilterStock] = useState<"all" | "low" | "out">("all")
  const [filterDateModification, setFilterDateModification] = useState<"all" | "last7" | "last30" | "last90">("all")
  const [sortBy, setSortBy] = useState<"name" | "code" | "price" | "stock" | "category" | "updated_at">("name")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [productTab, setProductTab] = useState<"published" | "draft" | "deleted">("published")
  const limit = 50 // Productos por página
  const [linkSummary, setLinkSummary] = useState<LinkWooCommerceIdsSummary | null>(null)
  const [lastLinkAt, setLastLinkAt] = useState<string | null>(null)
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)

  const STORAGE_KEYS = {
    viewMode: "productos-view-mode",
    sortBy: "productos-sort-by",
    sortOrder: "productos-sort-order",
  } as const

  // Cargar preferencias desde localStorage al montar (solo en cliente)
  useEffect(() => {
    if (typeof window === "undefined") return
    const savedView = localStorage.getItem(STORAGE_KEYS.viewMode)
    if (savedView === "grid") setViewMode("grid")
    const savedSortBy = localStorage.getItem(STORAGE_KEYS.sortBy)
    if (savedSortBy && ["name", "code", "price", "stock", "category", "updated_at"].includes(savedSortBy)) {
      setSortBy(savedSortBy as typeof sortBy)
    }
    const savedSortOrder = localStorage.getItem(STORAGE_KEYS.sortOrder)
    if (savedSortOrder === "asc" || savedSortOrder === "desc") {
      setSortOrder(savedSortOrder)
    }
  }, [])

  const handleViewModeChange = (mode: "list" | "grid") => {
    setViewMode(mode)
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.viewMode, mode)
    }
  }

  const handleSortChange = (field: typeof sortBy) => {
    const newOrder =
      sortBy === field && sortOrder === "asc" ? "desc" : sortBy === field ? "asc" : "asc"
    setSortBy(field)
    setSortOrder(newOrder)
    setCurrentPage(1)
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.sortBy, field)
      localStorage.setItem(STORAGE_KEYS.sortOrder, newOrder)
    }
  }

  // Cargar productos, categorías y estadísticas al montar el componente
  useEffect(() => {
    loadAllProducts()
    loadProductStats()
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      const data = await getCategories()
      setCategories(data ?? [])
    } catch (err) {
      console.error("Error al cargar categorías:", err)
      setCategories([])
    }
  }

  const filteredCatalog = useMemo(
    () =>
      filterProductCatalog(allProducts, {
        productTab,
        searchTerm,
        filterCategory,
        filterStatus,
        filterStock,
        filterDateModification,
        sortBy,
        sortOrder,
      }),
    [
      allProducts,
      productTab,
      searchTerm,
      filterCategory,
      filterStatus,
      filterStock,
      filterDateModification,
      sortBy,
      sortOrder,
    ]
  )

  // Actualizar productos mostrados cuando cambie la página o el catálogo filtrado
  useEffect(() => {
    if (!productsLoaded) return
    const startIndex = (currentPage - 1) * limit
    const endIndex = startIndex + limit
    setProducts(filteredCatalog.slice(startIndex, endIndex))
    setTotalPages(Math.ceil(filteredCatalog.length / limit))
    setTotalProducts(filteredCatalog.length)
  }, [currentPage, filteredCatalog, productsLoaded])

  const loadProductStats = async () => {
    try {
      const stats = await getProductStats()
      setProductStats(stats)
    } catch (err) {
      console.error('Error al cargar estadísticas de productos:', err)
    }
  }

  // Cargar todos los productos (activos e inactivos) para las pestañas Publicados / Borrador / Eliminados
  const loadAllProducts = async () => {
    try {
      setLoading(true)
      setError(null)
      // active_only=false para que la API devuelva activos e inactivos
      const data = await getProducts(1, 10000, false)
      
      let allProductsData: Product[] = []
      
      // Verificar si la respuesta tiene estructura paginada
      if (data && typeof data === 'object' && 'products' in data && 'pagination' in data) {
        allProductsData = data.products
      } else if (Array.isArray(data)) {
        allProductsData = data
      }
      
      // Guardar todos los productos para búsqueda
      setAllProducts(allProductsData)
      setProductsLoaded(true)
    } catch (err) {
      console.error('Error al cargar productos:', err)
      setError(err instanceof Error ? err.message : 'Error al cargar productos')
      setProducts([])
      setAllProducts([])
      setTotalPages(1)
      setTotalProducts(0)
    } finally {
      setLoading(false)
    }
  }

  // Función para recargar productos (usada después de crear/eliminar)
  const loadProducts = async () => {
    await loadAllProducts()
  }

  const handleDeleteProduct = async (id: number) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este producto? Se moverá a la papelera.')) {
      return
    }
    try {
      await deleteProduct(id)
      await loadProducts()
      await loadProductStats()
    } catch (err) {
      console.error('Error al eliminar producto:', err)
      alert(err instanceof Error ? err.message : 'Error al eliminar producto')
    }
  }

  const handleDeletePermanent = async (id: number) => {
    if (!window.confirm('¿Eliminar permanentemente? Esta acción no se puede deshacer.')) {
      return
    }
    try {
      await deleteProductPermanent(id)
      await loadProducts()
      await loadProductStats()
    } catch (err) {
      console.error('Error al eliminar producto permanentemente:', err)
      alert(err instanceof Error ? err.message : 'Error al eliminar permanentemente')
    }
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleViewProduct = (product: Product) => {
    setSelectedProduct(product)
    setIsDetailModalOpen(true)
  }

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false)
    setSelectedProduct(null)
  }

  const handleLinkCompleted = async (summary: LinkWooCommerceIdsSummary) => {
    setLinkSummary(summary)
    setLastLinkAt(new Date().toISOString())
    await loadProducts()
    await loadProductStats()
  }

  // Verificar si el usuario puede realizar acciones de administración
  const canManageProducts = isAdmin()
  const canLinkWooCommerce =
    FEATURE_WOOCOMMERCE && hasAnyOfRoles(['gerencia', 'admin', 'superadmin'])
  const canBatchPricing = hasAnyOfRoles(['gerencia', 'admin', 'superadmin'])

  const hasActiveFilters =
    filterCategory !== "all" || filterStatus !== "all" || filterStock !== "all" || filterDateModification !== "all"

  // KPIs solo sobre productos activos (publicados: con stock físico o por encargo). Excluye borrador y eliminados.
  const activeStats = useMemo(() => {
    if (!productsLoaded || !allProducts.length) return null
    const active = allProducts.filter((p) => p.is_active && (p.stock > 0 || !!p.allow_backorders))
    const withPhysical = active.filter((p) => p.stock > 0)
    const withReservation = active.filter((p) => !!p.allow_backorders)
    const stockValue = active.reduce((sum, p) => sum + Number(p.price || 0) * (p.stock || 0), 0)
    const stockQuantity = active.reduce((sum, p) => sum + (p.stock || 0), 0)
    // Valor de productos por encargo: suma de precios (catálogo). Con stock 0, precio×stock sería 0; aquí mostramos el valor de esos productos.
    const reservationStockValue = withReservation.reduce((sum, p) => sum + Number(p.price || 0), 0)
    const lowStock = withPhysical.filter((p) => p.stock <= (p.min_stock ?? 0)).length
    const outOfStock = active.filter((p) => p.stock === 0).length
    return {
      totalActive: active.length,
      withPhysicalCount: withPhysical.length,
      withReservationCount: withReservation.length,
      reservationStockValue,
      totalStockValue: stockValue,
      totalStockQuantity: stockQuantity,
      lowStockCount: lowStock,
      outOfStockCount: outOfStock,
    }
  }, [allProducts, productsLoaded])

  const clearFilters = () => {
    setFilterCategory("all")
    setFilterStatus("all")
    setFilterStock("all")
    setFilterDateModification("all")
    setCurrentPage(1)
  }

  return (
    <Protected requiredRoles={['gerencia', 'ventas', 'logistica', 'finanzas', 'admin']}>
      <ERPLayout activeItem="productos">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Gestión de Productos</h1>
              <p className="text-muted-foreground">
                Administra el catálogo de productos del sistema
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex gap-2 md:justify-end">
                {canLinkWooCommerce && (
                  <LinkWooCommerceIdsButton
                    onCompleted={handleLinkCompleted}
                    disabled={loading}
                    showSummary={false}
                  />
                )}
                {canBatchPricing && (
                  <Button variant="outline" asChild>
                    <Link href="/productos/actualizacion-precios">
                      <BadgePercent className="h-4 w-4 mr-2" />
                      Actualización de precios
                    </Link>
                  </Button>
                )}
                {canManageProducts && (
                  <Button variant="outline" onClick={() => setIsImportDialogOpen(true)} disabled={loading}>
                    <Upload className="h-4 w-4 mr-2" />
                    Importar
                  </Button>
                )}
                <Button variant="outline" onClick={() => setIsExportDialogOpen(true)} disabled={loading}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setIsBarcodeSearchModalOpen(true)}
                >
                  <PackagePlus className="h-4 w-4 mr-2" />
                  Cargar producto con cod. barra
                </Button>
                <Button onClick={() => setIsNewProductModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Producto
                </Button>
              </div>
              {canLinkWooCommerce && linkSummary && (
                <LinkWooCommerceSummary
                  categories={categories}
                  summary={linkSummary}
                  lastRunAt={lastLinkAt}
                  onDraftImportCompleted={async () => {
                    await loadProducts()
                    await loadProductStats()
                  }}
                />
              )}
            </div>
          </div>

          {/* Stats Cards: solo productos activos (publicados). Diferenciamos stock físico y por encargo. */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total activos</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeStats?.totalActive ?? 0}</div>
                <p className="text-xs text-muted-foreground">
                  {activeStats != null
                    ? `${activeStats.withPhysicalCount} con stock físico, ${activeStats.withReservationCount} por encargo`
                    : "Solo publicados"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Stock físico</CardTitle>
                <TrendingUp className="h-4 w-4 text-turquoise-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-turquoise-600">
                  {activeStats?.totalStockQuantity?.toLocaleString("es-AR") ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">Unidades en inventario (activos)</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Valor inventario</CardTitle>
                <CheckCircle className="h-4 w-4 text-turquoise-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${activeStats != null
                    ? activeStats.totalStockValue.toLocaleString("es-AR", { maximumFractionDigits: 0 })
                    : "0"}
                </div>
                <p className="text-xs text-muted-foreground">Solo stock físico (activos)</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Stock bajo</CardTitle>
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {activeStats?.lowStockCount ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">Requieren reposición (activos)</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Por encargo</CardTitle>
                <Truck className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">
                   ${activeStats != null
                    ? activeStats.reservationStockValue.toLocaleString("es-AR", { maximumFractionDigits: 0 })
                    : "0"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {activeStats?.withReservationCount ?? 0} cant productos
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Products Table */}
          <Card>
            <CardHeader>
              <CardTitle>Lista de Productos</CardTitle>
              <CardDescription>
                Catálogo completo de productos del sistema
                <br />
                <span className="text-xs text-muted-foreground">
                  💡 Haga clic en cualquier fila para ver los detalles del producto
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={productTab} onValueChange={(v) => { setProductTab(v as "published" | "draft" | "deleted"); setCurrentPage(1) }} className="mb-4">
                <TabsList className="grid w-full max-w-md grid-cols-3 mb-5">
                  <TabsTrigger value="published" className="flex items-center gap-2">
                    <FileCheck className="h-4 w-4" />
                    Publicados
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {allProducts.filter((p) => p.is_active && (p.stock > 0 || !!p.allow_backorders)).length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="draft" className="flex items-center gap-2">
                    <FileEdit className="h-4 w-4" />
                    Borrador
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {allProducts.filter((p) => p.is_active && p.stock === 0 && !p.allow_backorders).length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="deleted" className="flex items-center gap-2">
                    <Trash2 className="h-4 w-4" />
                    Eliminados
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {allProducts.filter((p) => !p.is_active).length}
                    </Badge>
                  </TabsTrigger>
                </TabsList>
              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-red-800 dark:text-red-200 text-sm">
                    Error: {error}
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={loadProducts}
                    className="mt-2"
                  >
                    Reintentar
                  </Button>
                </div>
              )}

              <div className="flex flex-col gap-4 mb-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por SKU, nombre o categoría..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value)
                          setCurrentPage(1)
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex rounded-md border">
                      <Button
                        variant={viewMode === "list" ? "secondary" : "ghost"}
                        size="sm"
                        className="rounded-r-none"
                        onClick={() => handleViewModeChange("list")}
                        title="Vista lista"
                      >
                        <LayoutList className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={viewMode === "grid" ? "secondary" : "ghost"}
                        size="sm"
                        className="rounded-l-none"
                        onClick={() => handleViewModeChange("grid")}
                        title="Vista cuadrícula"
                      >
                        <LayoutGrid className="h-4 w-4" />
                      </Button>
                    </div>
                    {hasActiveFilters && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearFilters}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Limpiar filtros
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Select
                    value={filterCategory}
                    onValueChange={(v) => {
                      setFilterCategory(v)
                      setCurrentPage(1)
                    }}
                  >
                    <SelectTrigger className="w-[180px]">
                      <Filter className="h-4 w-4 mr-2 opacity-50" />
                      <SelectValue placeholder="Categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las categorías</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id.toString()}>
                          {cat.name}
                        </SelectItem>
                      ))}
                      <SelectItem value="none">Sin categoría</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={filterStatus}
                    onValueChange={(v: "all" | "active" | "inactive") => {
                      setFilterStatus(v)
                      setCurrentPage(1)
                    }}
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los estados</SelectItem>
                      <SelectItem value="active">Activos</SelectItem>
                      <SelectItem value="inactive">Inactivos</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={filterStock}
                    onValueChange={(v: "all" | "low" | "out") => {
                      setFilterStock(v)
                      setCurrentPage(1)
                    }}
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Stock" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todo el stock</SelectItem>
                      <SelectItem value="low">Stock bajo</SelectItem>
                      <SelectItem value="out">Sin stock</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={filterDateModification}
                    onValueChange={(v: "all" | "last7" | "last30" | "last90") => {
                      setFilterDateModification(v)
                      setCurrentPage(1)
                    }}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Modificado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Cualquier fecha</SelectItem>
                      <SelectItem value="last7">Últimos 7 días</SelectItem>
                      <SelectItem value="last30">Últimos 30 días</SelectItem>
                      <SelectItem value="last90">Últimos 90 días</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-1 border-l pl-3 ml-1">
                    <Select
                      value={sortBy}
                      onValueChange={(v: typeof sortBy) => handleSortChange(v)}
                    >
                      <SelectTrigger className="w-[140px] border-0 pl-0">
                        <ArrowUpDown className="h-4 w-4 mr-1.5 opacity-50" />
                        <SelectValue placeholder="Ordenar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="name">Nombre</SelectItem>
                        <SelectItem value="code">Código</SelectItem>
                        <SelectItem value="price">Precio</SelectItem>
                        <SelectItem value="stock">Stock</SelectItem>
                        <SelectItem value="category">Categoría</SelectItem>
                        <SelectItem value="updated_at">Fecha de modificación</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        const newOrder = sortOrder === "asc" ? "desc" : "asc"
                        setSortOrder(newOrder)
                        setCurrentPage(1)
                        if (typeof window !== "undefined") {
                          localStorage.setItem(STORAGE_KEYS.sortOrder, newOrder)
                        }
                      }}
                      title={sortOrder === "asc" ? "Ascendente (clic para descendente)" : "Descendente (clic para ascendente)"}
                    >
                      {sortOrder === "asc" ? (
                        <ArrowUp className="h-4 w-4" />
                      ) : (
                        <ArrowDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {!loading && (
                <p className="text-sm text-muted-foreground mb-3">
                  {totalProducts > limit ? (
                    <>
                      Mostrando {(currentPage - 1) * limit + 1} a {Math.min(currentPage * limit, totalProducts)} de {totalProducts} resultados
                    </>
                  ) : (
                    <>Mostrando {totalProducts} resultado{totalProducts !== 1 ? 's' : ''}</>
                  )}
                </p>
              )}

              {loading ? (
                viewMode === "grid" ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <Card key={i} className="overflow-hidden">
                        <Skeleton className="aspect-square w-full rounded-none" />
                        <CardContent className="p-3 space-y-2">
                          <Skeleton className="h-3 w-16" />
                          <Skeleton className="h-4 w-full" />
                          <div className="flex justify-between gap-2">
                            <Skeleton className="h-4 w-14" />
                            <Skeleton className="h-5 w-10 rounded-full" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Código</TableHead>
                          <TableHead>Producto</TableHead>
                          <TableHead>Precio</TableHead>
                          <TableHead>IVA</TableHead>
                          <TableHead>Stock</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Array.from({ length: 10 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Skeleton className="h-10 w-10 shrink-0 rounded-md" />
                                <Skeleton className="h-4 w-32" />
                              </div>
                            </TableCell>
                            <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-14 rounded-full" /></TableCell>
                            <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )
              ) : viewMode === "grid" ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {products?.map((product) => (
                    <Card
                      key={product.id}
                      className="overflow-hidden cursor-pointer hover:shadow-md hover:border-primary/50 transition-all group"
                      onClick={() => handleViewProduct(product)}
                    >
                      <div className="relative aspect-square bg-muted overflow-hidden">
                        <Image
                          src={getProductImageUrl(product, { size: 200 })}
                          alt={product.name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.display = "none"
                            const fallback = target.parentElement?.querySelector(".product-image-fallback")
                            if (fallback) {
                              const el = fallback as HTMLElement
                              el.classList.remove("hidden")
                              el.classList.add("flex", "items-center", "justify-center")
                            }
                          }}
                        />
                        <div className="product-image-fallback hidden absolute inset-0 bg-muted">
                          <ImageIcon className="h-12 w-12 text-muted-foreground" />
                        </div>
                        {product.stock <= product.min_stock && (
                          <div className="absolute top-1 right-1">
                            <AlertTriangle className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          </div>
                        )}
                        {product.stock === 0 && (
                          <div className="absolute top-1 right-1">
                            <AlertTriangle className="h-4 w-4 text-red-500 fill-red-500" />
                          </div>
                        )}
                      </div>
                      <CardContent className="p-3">
                        <p className="font-mono text-xs text-muted-foreground truncate" title={product.code}>
                          {product.code}
                        </p>
                        <p className="font-medium text-sm truncate" title={product.name}>
                          {product.name}
                        </p>
                        <div className="flex items-center justify-between mt-2 gap-1 flex-wrap">
                          <span className="font-semibold text-turquoise-600">
                            ${Math.round(Number(product.price)).toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </span>
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {formatSaleIvaRateLabel(productIvaRate(product))}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 flex-wrap justify-end mt-1">
                          {product.allow_backorders && (
                            <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-700 dark:text-amber-400">
                              Por encargo
                            </Badge>
                          )}
                          <Badge
                            variant={!product.is_active ? "destructive" : (product.stock > 0) ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {!product.is_active ? "Inactivo" : `${product.stock} u.`}
                          </Badge>
                        </div>
                        <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 flex-1"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleViewProduct(product)
                            }}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          {canManageProducts && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setProductToEdit(product)
                                }}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-red-600 hover:text-red-700"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (productTab === "deleted") {
                                    handleDeletePermanent(product.id)
                                  } else {
                                    handleDeleteProduct(product.id)
                                  }
                                }}
                                title={productTab === "deleted" ? "Eliminar permanentemente" : "Mover a papelera"}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Precio</TableHead>
                      <TableHead>IVA</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products?.map((product) => (
                      <TableRow 
                        key={product.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => handleViewProduct(product)}
                      >
                        <TableCell className="font-medium">{product.code}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted">
                              <Image
                                src={getProductImageUrl(product, { size: 80 })}
                                alt={product.name}
                                fill
                                className="object-cover"
                                sizes="40px"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement
                                  target.style.display = "none"
                                  const fallback = target.parentElement?.querySelector(".list-thumb-fallback")
                                  if (fallback) {
                                    (fallback as HTMLElement).classList.remove("hidden")
                                    ;(fallback as HTMLElement).classList.add("flex", "items-center", "justify-center")
                                  }
                                }}
                              />
                              <div className="list-thumb-fallback hidden absolute inset-0 bg-muted">
                                <ImageIcon className="h-5 w-5 text-muted-foreground" />
                              </div>
                            </div>
                            <span className="font-medium truncate">{product.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>${Math.round(Number(product.price)).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {formatSaleIvaRateLabel(productIvaRate(product))}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span>{product.stock}</span>
                            {product.stock <= product.min_stock && (
                              <AlertTriangle className="h-4 w-4 text-yellow-500" />
                            )}
                            {product.stock === 0 && (
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 flex-wrap">
                            {product.allow_backorders && (
                              <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-700 dark:text-amber-400">
                                Por encargo
                              </Badge>
                            )}
                            <Badge 
                              variant={!product.is_active ? "destructive" : (product.stock > 0) ? "default" : "secondary"}
                            >
                              {!product.is_active ? "Inactivo" : product.stock > 0 ? "Activo" : "Sin stock"}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleViewProduct(product)
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {canManageProducts && (
                              <>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setProductToEdit(product)
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost" 
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (productTab === "deleted") {
                                      handleDeletePermanent(product.id)
                                    } else {
                                      handleDeleteProduct(product.id)
                                    }
                                  }}
                                  className="text-red-600 hover:text-red-700"
                                  title={productTab === "deleted" ? "Eliminar permanentemente" : "Mover a papelera"}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {/* Paginación */}
              {!loading && products.length > 0 && (
                <div className="mt-4">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                    isLoading={loading}
                  />
                </div>
              )}
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Modal de detalle del producto */}
        <ProductDetailModal
          product={selectedProduct}
          isOpen={isDetailModalOpen}
          onClose={handleCloseDetailModal}
          onDelete={handleDeleteProduct}
          onEdit={(p) => {
            setProductToEdit(p)
            setIsDetailModalOpen(false)
          }}
          onSyncSuccess={() => {
            loadProducts()
            loadProductStats()
          }}
        />

        {/* Modal de edición de producto */}
        <EditProductModal
          product={productToEdit}
          isOpen={!!productToEdit}
          onClose={() => setProductToEdit(null)}
          onSuccess={(updated) => {
            if (updated && selectedProduct?.id === updated.id) {
              setSelectedProduct(updated)
            }
            setProductToEdit(null)
            loadProducts()
            loadProductStats()
          }}
        />

        {/* Modal de nuevo producto */}
        <NewProductModal
          isOpen={isNewProductModalOpen}
          onClose={() => setIsNewProductModalOpen(false)}
          onSuccess={() => {
            loadProducts()
            loadProductStats()
          }}
        />

        <ProductExportDialog
          open={isExportDialogOpen}
          onOpenChange={setIsExportDialogOpen}
          filteredProducts={filteredCatalog}
          allProducts={allProducts}
        />

        <ProductImportDialog
          open={isImportDialogOpen}
          onOpenChange={setIsImportDialogOpen}
          onImported={() => {
            loadProducts()
            loadProductStats()
          }}
        />

        {/* Modal de búsqueda por código de barras */}
        <BarcodeSearchModal
          isOpen={isBarcodeSearchModalOpen}
          onClose={() => setIsBarcodeSearchModalOpen(false)}
          onSuccess={() => {
            loadProducts()
            loadProductStats()
          }}
        />
      </ERPLayout>
    </Protected>
  )
}
