"use client"

import { useState, useEffect, useRef } from "react"
import { ERPLayout } from "@/components/erp-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Package, Search, Plus, AlertTriangle, TrendingDown, TrendingUp, Filter, Download, Eye, Loader2, X, ScanLine } from "lucide-react"
import { ProductDetailModal } from "@/components/product-detail-modal"
import { NewProductModal } from "@/components/new-product-modal"
import { BarcodeSearchModal } from "@/components/barcode-search-modal"
import { getProductStats, ProductStats, getProducts, Product } from "@/lib/api"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function StockPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [stats, setStats] = useState<ProductStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false)
  const [isBarcodeStockModalOpen, setIsBarcodeStockModalOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<string>("none")
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false)
  const filterMenuRef = useRef<HTMLDivElement>(null)

  // Función para obtener productos de la API
  const fetchProducts = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('📦 [STOCK_PAGE] Iniciando carga de productos...')
      
      const productsData = await getProducts()
      
      console.log('📦 [STOCK_PAGE] Datos recibidos:', {
        type: typeof productsData,
        isArray: Array.isArray(productsData),
        data: productsData
      })
      
      // Verificar que sea un array antes de usarlo
      if (Array.isArray(productsData)) {
        console.log('📦 [STOCK_PAGE] Productos cargados exitosamente:', {
          count: productsData.length,
          products: productsData.slice(0, 3).map(p => ({ // Solo mostrar los primeros 3 para no saturar el log
            id: p.id,
            code: p.code,
            name: p.name,
            stock: p.stock,
            price: p.price,
            is_active: p.is_active
          }))
        })
        setProducts(productsData)
        setError(null) // Limpiar errores anteriores
      } else {
        console.error('📦 [STOCK_PAGE] Error: productsData no es un array:', {
          received: productsData,
          type: typeof productsData,
          constructor: (productsData as any)?.constructor?.name
        })
        setProducts([])
        setError(`Error: Los datos recibidos no tienen el formato esperado. Tipo recibido: ${typeof productsData}`)
      }
    } catch (err) {
      console.error('📦 [STOCK_PAGE] Error al cargar productos:', {
        error: err,
        message: err instanceof Error ? err.message : 'Error desconocido',
        stack: err instanceof Error ? err.stack : undefined
      })
      setError(err instanceof Error ? err.message : 'Error desconocido al cargar los productos')
    } finally {
      setLoading(false)
    }
  }

  // Función para obtener estadísticas de productos
  const fetchStats = async () => {
    try {
      setStatsLoading(true)
      console.log('📊 [STOCK_PAGE] Iniciando carga de estadísticas...')
      
      const statsData = await getProductStats()
      
      console.log('📊 [STOCK_PAGE] Datos de estadísticas recibidos:', {
        type: typeof statsData,
        isNull: statsData === null,
        data: statsData
      })
      
      if (statsData) {
        console.log('📊 [STOCK_PAGE] Estadísticas cargadas exitosamente:', {
          totalProducts: statsData.total_products,
          activeProducts: statsData.active_products,
          totalStockValue: statsData.total_stock_value,
          lowStockCount: statsData.low_stock_count,
          outOfStockCount: statsData.out_of_stock_count
        })
        setStats(statsData)
      } else {
        console.warn('📊 [STOCK_PAGE] No se obtuvieron estadísticas - datos nulos')
        setStats(null)
      }
    } catch (err) {
      console.error('📊 [STOCK_PAGE] Error al cargar estadísticas:', {
        error: err,
        message: err instanceof Error ? err.message : 'Error desconocido',
        stack: err instanceof Error ? err.stack : undefined
      })
      setStats(null)
    } finally {
      setStatsLoading(false)
    }
  }

  // Función para cargar todos los datos
  const loadData = async () => {
    console.log('📊 [STOCK_PAGE] Cargando datos completos...')
    
    // Cargar productos primero (crítico)
    await fetchProducts()
    
    // Intentar cargar estadísticas por separado (no crítico)
    try {
      await fetchStats()
    } catch (statsError) {
      console.warn('📊 [STOCK_PAGE] No se pudieron cargar las estadísticas:', statsError)
      // No bloquear la aplicación si las estadísticas fallan
    }
  }

  // Cargar datos al montar el componente
  useEffect(() => {
    loadData()
  }, [])

  // Cerrar menú de filtros al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
        setIsFilterMenuOpen(false)
      }
    }

    if (isFilterMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isFilterMenuOpen])

  // Obtener categorías únicas de los productos
  const categories = Array.from(
    new Set(products.map(p => p.category_name).filter(Boolean))
  ).sort() as string[]

  // Filtrar y ordenar productos
  let filteredProducts = products.filter(product => {
    // Filtro por búsqueda (nombre o SKU/código)
    const matchesSearch = searchTerm === "" || 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.code.toLowerCase().includes(searchTerm.toLowerCase())
    
    // Filtro por categoría
    const matchesCategory = filterCategory === "all" || 
      product.category_name === filterCategory
    
    // Filtro por estado (activos/inactivos)
    const matchesStatus = filterStatus === "all" ||
      (filterStatus === "active" && product.is_active) ||
      (filterStatus === "inactive" && !product.is_active)
    
    return matchesSearch && matchesCategory && matchesStatus
  })

  // Ordenar productos
  if (sortBy !== "none") {
    filteredProducts = [...filteredProducts].sort((a, b) => {
      switch (sortBy) {
        case "stock-asc":
          return a.stock - b.stock
        case "stock-desc":
          return b.stock - a.stock
        case "price-asc":
          return a.price - b.price
        case "price-desc":
          return b.price - a.price
        case "name-asc":
          return a.name.localeCompare(b.name)
        case "name-desc":
          return b.name.localeCompare(a.name)
        default:
          return 0
      }
    })
  }

  // Mapear estadísticas de la API a formato de UI
  const mapStatsForUI = (apiStats: ProductStats | null) => {
    if (!apiStats) return {
      totalProducts: 0,
      activeProducts: 0,
      criticalStock: 0,
      totalValue: 0,
      averageStock: 0
    }

    return {
      totalProducts: apiStats.total_products || 0,
      activeProducts: parseInt(apiStats.active_products) || 0,
      criticalStock: (apiStats.low_stock_count || 0) + (apiStats.out_of_stock_count || 0),
      totalValue: parseFloat(apiStats.total_stock_value?.replace(/[^\d.-]/g, '') || '0') || 0,
      averageStock: products.length > 0 ? Math.round(products.reduce((sum, p) => sum + p.stock, 0) / products.length) : 0
    }
  }

  const uiStats = mapStatsForUI(stats)

  const handleViewProduct = (product: Product) => {
    setSelectedProduct(product)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedProduct(null)
  }

  const handleCloseNewProductModal = () => {
    setIsNewProductModalOpen(false)
  }

  const handleProductCreated = () => {
    // Recargar la lista de productos después de crear uno nuevo
    fetchProducts()
    fetchStats()
  }

  // Función para determinar el estado del stock
  const getStockStatus = (stock: number, minStock: number, maxStock: number) => {
    if (stock <= minStock) return "critico"
    if (stock >= maxStock * 0.8) return "alto"
    return "normal"
  }

  return (
    <ERPLayout activeItem="stock">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gestión de Stock</h1>
            <p className="text-muted-foreground">Administra tu inventario y controla los niveles de stock</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button variant="outline" onClick={() => setIsBarcodeStockModalOpen(true)}>
              <ScanLine className="h-4 w-4 mr-2" />
              Cargar stock con lectora
            </Button>
            <Button onClick={() => setIsNewProductModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Producto
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Productos</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : uiStats.totalProducts}
              </div>
              <p className="text-xs text-muted-foreground">
                {uiStats.activeProducts} activos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stock Crítico</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {statsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : uiStats.criticalStock}
              </div>
              <p className="text-xs text-muted-foreground">Productos bajo mínimo</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
              <TrendingUp className="h-4 w-4 text-turquoise-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : `$${uiStats.totalValue.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`}
              </div>
              <p className="text-xs text-muted-foreground">Valor del inventario</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Promedio Stock</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : uiStats.averageStock}
              </div>
              <p className="text-xs text-muted-foreground">Unidades por producto</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardHeader>
            <CardTitle>Inventario</CardTitle>
            <CardDescription>Lista completa de productos en stock</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Buscar por nombre o SKU..." 
                    className="pl-8" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="relative" ref={filterMenuRef}>
                <Button 
                  variant="outline" 
                  onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                  className="relative"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filtros
                  {(sortBy !== "none" || filterCategory !== "all" || filterStatus !== "all") && (
                    <span className="ml-2 h-2 w-2 rounded-full bg-primary"></span>
                  )}
                </Button>
                
                {isFilterMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-popover border rounded-md shadow-lg z-50 p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-sm">Filtros</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => setIsFilterMenuOpen(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Ordenar por:</label>
                      <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Sin ordenar" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin ordenar</SelectItem>
                          <SelectItem value="stock-asc">Menor stock</SelectItem>
                          <SelectItem value="stock-desc">Mayor stock</SelectItem>
                          <SelectItem value="price-asc">Menor precio</SelectItem>
                          <SelectItem value="price-desc">Mayor precio</SelectItem>
                          <SelectItem value="name-asc">Nombre (A-Z)</SelectItem>
                          <SelectItem value="name-desc">Nombre (Z-A)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Categoría:</label>
                      <Select value={filterCategory} onValueChange={setFilterCategory}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Todas las categorías" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas las categorías</SelectItem>
                          {categories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Estado:</label>
                      <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="active">Activos</SelectItem>
                          <SelectItem value="inactive">Inactivos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setSortBy("none")
                        setFilterCategory("all")
                        setFilterStatus("all")
                      }}
                    >
                      Limpiar filtros
                    </Button>
                  </div>
                )}
              </div>
              <Button variant="outline" onClick={loadData} disabled={loading || statsLoading}>
                {(loading || statsLoading) ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {(loading || statsLoading) ? 'Cargando...' : 'Actualizar'}
              </Button>
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="font-medium">Error al cargar los productos</span>
                </div>
                <p className="text-red-600 mt-1">{error}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={loadData}
                  className="mt-2"
                >
                  Reintentar
                </Button>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mr-2" />
                <span>Cargando productos...</span>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Stock Actual</TableHead>
                    <TableHead>Stock Mín/Máx</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        {searchTerm ? 'No se encontraron productos que coincidan con la búsqueda' : 'No hay productos disponibles'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts.map((product) => {
                      const stockStatus = getStockStatus(product.stock, product.min_stock, product.max_stock)
                      return (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">{product.code}</TableCell>
                          <TableCell>
                            <div className="font-medium">{product.name}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{product.category_name || 'Sin categoría'}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">{product.stock}</TableCell>
                          <TableCell>
                            {product.min_stock} / {product.max_stock}
                          </TableCell>
                          <TableCell>${product.price.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                stockStatus === "critico" ? "destructive" : 
                                stockStatus === "alto" ? "default" : "secondary"
                              }
                            >
                              {stockStatus === "critico" ? "Crítico" : 
                               stockStatus === "alto" ? "Alto" : "Normal"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="ghost" size="sm" onClick={() => handleViewProduct(product)}>
                                <Eye className="h-4 w-4 mr-1" />
                                Ver
                              </Button>
                              <Button variant="ghost" size="sm">
                                Editar
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <ProductDetailModal product={selectedProduct} isOpen={isModalOpen} onClose={handleCloseModal} />
        <NewProductModal 
          isOpen={isNewProductModalOpen} 
          onClose={handleCloseNewProductModal} 
          onSuccess={handleProductCreated}
        />
        <BarcodeSearchModal
          isOpen={isBarcodeStockModalOpen}
          onClose={() => setIsBarcodeStockModalOpen(false)}
          onSuccess={() => {
            fetchProducts()
            fetchStats()
          }}
          stockMode
        />
      </div>
    </ERPLayout>
  )
}
