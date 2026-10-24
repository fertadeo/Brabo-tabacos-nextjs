"use client"

import React, { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useConfirmBeforeClose } from "@/lib/use-confirm-before-close"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Search,
  CheckCircle,
  X,
  Edit,
  AlertCircle,
  Loader2,
  Package,
  DollarSign,
  Tag,
  Image as ImageIcon,
  ScanLine,
  Sparkles,
  Upload,
  Trash2,
  Plus
} from "lucide-react"
import Image from "next/image"
import {
  searchProductByBarcode,
  acceptBarcodeProduct,
  createProductFromBarcode,
  ignoreBarcodeProduct,
  validateBarcode,
  getCategories,
  Category,
  BarcodeLookupData,
  AcceptBarcodeRequest,
  CreateProductFromBarcodeRequest,
  Product,
  updateProductStock
} from "@/lib/api"
import { uploadImagesToWordPress } from "@/lib/woocommerce-media"
import { improveBarcodeImages } from "@/lib/barcode-image-utils"

interface BarcodeSearchModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  /** Si es true, activa modo carga rápida de stock por defecto */
  stockMode?: boolean
}

enum BarcodeSearchState {
  IDLE = 'idle',
  SEARCHING = 'searching',
  FOUND = 'found',
  EXISTS = 'exists',
  ADDING_STOCK = 'adding_stock',
  STOCK_ADDED = 'stock_added',
  NOT_FOUND = 'not_found',
  CREATING = 'creating',
  SUCCESS = 'success',
  ERROR = 'error',
  MODIFYING = 'modifying'
}

/** Sitios para re-enviar la búsqueda con prefer_site (mismo barcode, priorizar ese sitio). */
const RETAIL_SITES = [
  { name: "Mercado Libre", prefer_site: "mercadolibre" },
  { name: "Fravega", prefer_site: "fravega" },
  { name: "Garbarino", prefer_site: "garbarino" },
] as const

function BarcodeRetailLinks({
  barcode,
  onSearchInSite,
  searchingSite,
}: {
  barcode: string
  onSearchInSite: (preferSite: string, siteName: string) => void
  searchingSite: string | null
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        ¿No encontraste el producto que querías? Buscá de nuevo priorizando:
      </p>
      <div className="flex flex-wrap gap-2">
        {RETAIL_SITES.map(({ name, prefer_site }) => (
          <Button
            key={prefer_site}
            variant="outline"
            size="sm"
            className="h-8"
            disabled={!!searchingSite}
            onClick={() => onSearchInSite(prefer_site, name)}
          >
            {searchingSite === name ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Buscando…
              </>
            ) : (
              name
            )}
          </Button>
        ))}
      </div>
    </div>
  )
}

export function BarcodeSearchModal({ isOpen, onClose, onSuccess, stockMode = false }: BarcodeSearchModalProps) {
  const [barcode, setBarcode] = useState("")
  const [state, setState] = useState<BarcodeSearchState>(BarcodeSearchState.IDLE)
  const [previewData, setPreviewData] = useState<BarcodeLookupData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [loadingCategories, setLoadingCategories] = useState(false)
  const [stockQuantity, setStockQuantity] = useState(1)
  const [rapidStockMode, setRapidStockMode] = useState(stockMode)
  const [lastStockUpdate, setLastStockUpdate] = useState<{ name: string; added: number; newStock: number } | null>(null)
  
  // Datos para crear producto (modificar)
  const [formData, setFormData] = useState<CreateProductFromBarcodeRequest>({
    code: "",
    name: "",
    description: "",
    price: 0,
    stock: 0,
    category_id: undefined,
    images: []
  })
  
  // Datos para aceptar producto (aceptar)
  const [acceptData, setAcceptData] = useState<AcceptBarcodeRequest>({
    category_id: undefined,
    price: undefined,
    stock: 0,
    code: undefined
  })
  
  const [createdProduct, setCreatedProduct] = useState<Product | null>(null)
  const [imageUrlInput, setImageUrlInput] = useState("")
  const [uploadingImages, setUploadingImages] = useState(false)
  /** Nombre del sitio mientras se reenvía la búsqueda con prefer_site (ej. "Mercado Libre"). */
  const [searchingPreferSite, setSearchingPreferSite] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  // Cargar categorías cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      loadCategories()
      setRapidStockMode(stockMode)
      // Enfocar el input cuando se abre
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [isOpen, stockMode])

  // Resetear estado cuando se cierra el modal
  useEffect(() => {
    if (!isOpen) {
      setState(BarcodeSearchState.IDLE)
      setBarcode("")
      setPreviewData(null)
      setError(null)
      setCreatedProduct(null)
      setFormData({
        code: "",
        name: "",
        description: "",
        price: 0,
        stock: 0,
        category_id: undefined,
        images: []
      })
      setAcceptData({
        category_id: undefined,
        price: undefined,
        stock: 0,
        code: undefined
      })
      setImageUrlInput("")
      setUploadingImages(false)
      setSearchingPreferSite(null)
      setStockQuantity(1)
      setRapidStockMode(stockMode)
      setLastStockUpdate(null)
    }
  }, [isOpen, stockMode])

  const loadCategories = async () => {
    setLoadingCategories(true)
    try {
      const categoriesData = await getCategories()
      setCategories(categoriesData)
    } catch (err) {
      console.error('Error al cargar categorías:', err)
      setCategories([])
    } finally {
      setLoadingCategories(false)
    }
  }

  const resetForNextScan = () => {
    setBarcode("")
    setPreviewData(null)
    setError(null)
    setState(BarcodeSearchState.IDLE)
    setTimeout(() => {
      inputRef.current?.focus()
    }, 100)
  }

  const handleAddStock = async (productId: number, productData?: BarcodeLookupData) => {
    if (stockQuantity < 1) {
      setError("La cantidad debe ser al menos 1")
      return
    }

    setState(BarcodeSearchState.ADDING_STOCK)
    setError(null)

    try {
      const updated = await updateProductStock(productId, {
        stock: stockQuantity,
        operation: 'add'
      })

      const updateInfo = {
        name: updated.name,
        added: stockQuantity,
        newStock: updated.stock
      }
      setLastStockUpdate(updateInfo)
      onSuccess()

      if (rapidStockMode) {
        resetForNextScan()
        setLastStockUpdate(updateInfo)
      } else {
        setPreviewData(productData ? { ...productData, current_stock: updated.stock } : previewData)
        setState(BarcodeSearchState.STOCK_ADDED)
      }
    } catch (err) {
      console.error('Error al agregar stock:', err)
      setState(productData ? BarcodeSearchState.EXISTS : BarcodeSearchState.ERROR)
      setError(err instanceof Error ? err.message : 'Error al agregar stock')
    }
  }

  const handleBarcodeSearch = async () => {
    if (!barcode.trim()) {
      setError("Por favor, ingresa un código de barras")
      return
    }

    // Validar formato
    if (!validateBarcode(barcode.trim())) {
      setError("Formato de código de barras inválido. Debe tener 8, 12, 13 o 14 dígitos.")
      return
    }

    setState(BarcodeSearchState.SEARCHING)
    setError(null)
    setPreviewData(null)

    try {
      const data = await searchProductByBarcode(barcode.trim())
      
      if (data.exists_as_product) {
        setPreviewData(data)
        if (rapidStockMode && data.product_id && data.available_actions.add_stock) {
          await handleAddStock(data.product_id, data)
        } else {
          setState(BarcodeSearchState.EXISTS)
        }
      } else {
        // Mejorar imágenes (priorizar calidad, intentar OFF si es EAN)
        const images = await improveBarcodeImages(barcode.trim(), data.images || [])
        setState(BarcodeSearchState.FOUND)
        setPreviewData({ ...data, images })
        const suggestedPrice = typeof data.suggested_price === 'number' 
          ? data.suggested_price 
          : (data.suggested_price ? parseFloat(String(data.suggested_price)) : 0)
        
        setFormData({
          code: barcode.trim(),
          name: data.title,
          description: data.description || "",
          price: suggestedPrice || 0,
          stock: 0,
          category_id: undefined,
          images
        })
        setAcceptData({
          category_id: undefined,
          price: suggestedPrice || undefined,
          stock: 0,
          code: undefined
        })
      }
    } catch (err) {
      console.error('Error al buscar producto:', err)
      if (err instanceof Error && err.message.includes('404')) {
        setState(BarcodeSearchState.NOT_FOUND)
      } else {
        setState(BarcodeSearchState.ERROR)
        setError(err instanceof Error ? err.message : 'Error desconocido al buscar el producto')
      }
    }
  }

  /** Reenvía la búsqueda con el mismo barcode pero priorizando un sitio (Mercado Libre, Fravega, etc.). */
  const handleSearchInSite = async (preferSite: string, siteName: string) => {
    if (!barcode.trim()) return
    setSearchingPreferSite(siteName)
    setState(BarcodeSearchState.SEARCHING)
    setError(null)
    setPreviewData(null)

    try {
      const data = await searchProductByBarcode(barcode.trim(), { prefer_site: preferSite })

      if (data.exists_as_product) {
        setPreviewData(data)
        if (rapidStockMode && data.product_id && data.available_actions.add_stock) {
          await handleAddStock(data.product_id, data)
        } else {
          setState(BarcodeSearchState.EXISTS)
        }
      } else {
        const images = await improveBarcodeImages(barcode.trim(), data.images ?? [])
        setState(BarcodeSearchState.FOUND)
        setPreviewData({ ...data, images })
        const suggestedPrice =
          typeof data.suggested_price === "number"
            ? data.suggested_price
            : data.suggested_price != null
              ? parseFloat(String(data.suggested_price))
              : 0
        setFormData({
          code: barcode.trim(),
          name: data.title,
          description: data.description ?? "",
          price: suggestedPrice,
          stock: 0,
          category_id: undefined,
          images,
        })
        setAcceptData({
          category_id: undefined,
          price: suggestedPrice || undefined,
          stock: 0,
          code: undefined,
        })
      }
    } catch (err) {
      console.error("Error al buscar por sitio:", err)
      if (err instanceof Error && err.message.includes("404")) {
        setState(BarcodeSearchState.NOT_FOUND)
      } else {
        setState(BarcodeSearchState.ERROR)
        setError(err instanceof Error ? err.message : "Error al buscar en el sitio")
      }
    } finally {
      setSearchingPreferSite(null)
    }
  }

  const handleAccept = async () => {
    if (!previewData) return

    setState(BarcodeSearchState.CREATING)
    setError(null)

    try {
      const product = await acceptBarcodeProduct(barcode.trim(), acceptData)
      setCreatedProduct(product)
      setState(BarcodeSearchState.SUCCESS)
      
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 1500)
    } catch (err) {
      console.error('Error al aceptar producto:', err)
      setState(BarcodeSearchState.FOUND)
      setError(err instanceof Error ? err.message : 'Error al crear el producto')
    }
  }

  const handleModify = () => {
    setState(BarcodeSearchState.MODIFYING)
    setError(null)
  }

  const handleAddImageUrl = () => {
    const url = imageUrlInput.trim()
    if (!url) return
    try {
      new URL(url)
      if ((formData.images ?? []).length >= 5) {
        setError("Máximo 5 imágenes permitidas")
        return
      }
      setFormData((prev) => ({ ...prev, images: [...(prev.images ?? []), url] }))
      setImageUrlInput("")
      setError(null)
    } catch {
      setError("Por favor, ingresa una URL válida")
    }
  }

  const handleRemoveImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: (prev.images ?? []).filter((_, i) => i !== index),
    }))
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files?.length) return

    const remaining = 5 - (formData.images ?? []).length
    if (remaining <= 0) {
      setError("Máximo 5 imágenes permitidas")
      event.target.value = ""
      return
    }

    const toAdd = Array.from(files)
      .slice(0, remaining)
      .filter((f) => ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(f.type))

    if (!toAdd.length) {
      setError("Solo se permiten imágenes (jpeg, png, gif, webp)")
      event.target.value = ""
      return
    }

    setUploadingImages(true)
    setError(null)
    try {
      const uploads = await uploadImagesToWordPress(toAdd)
      setFormData((prev) => ({
        ...prev,
        images: [...(prev.images ?? []), ...uploads.map((upload) => upload.source_url)].slice(0, 5),
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error subiendo imágenes")
    } finally {
      setUploadingImages(false)
      event.target.value = ""
    }
  }

  const handleCreateWithModifications = async () => {
    // Validar formulario
    if (!formData.code.trim()) {
      setError("El código interno es obligatorio")
      return
    }
    if (!formData.name.trim()) {
      setError("El nombre es obligatorio")
      return
    }
    if (!formData.price || formData.price <= 0) {
      setError("El precio debe ser mayor a 0")
      return
    }

    setState(BarcodeSearchState.CREATING)
    setError(null)

    try {
      const product = await createProductFromBarcode(barcode.trim(), formData)
      setCreatedProduct(product)
      setState(BarcodeSearchState.SUCCESS)
      
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 1500)
    } catch (err) {
      console.error('Error al crear producto con modificaciones:', err)
      setState(BarcodeSearchState.MODIFYING)
      setError(err instanceof Error ? err.message : 'Error al crear el producto')
    }
  }

  const handleIgnore = async () => {
    try {
      await ignoreBarcodeProduct(barcode.trim())
      setState(BarcodeSearchState.IDLE)
      setPreviewData(null)
      setBarcode("")
    } catch (err) {
      console.error('Error al ignorar:', err)
      // No mostrar error crítico, solo cerrar preview
      setState(BarcodeSearchState.IDLE)
      setPreviewData(null)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (state === BarcodeSearchState.IDLE) {
        handleBarcodeSearch()
      } else if (state === BarcodeSearchState.EXISTS && previewData?.product_id) {
        handleAddStock(previewData.product_id, previewData)
      }
    }
  }

  const currentImages = formData.images ?? []

  const [handleOpenChange, confirmDialog] = useConfirmBeforeClose((open) => {
    if (!open) onClose()
  })

  return (
    <>
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5" />
            {stockMode ? "Carga de Stock con Lectora" : "Búsqueda por Código de Barras"}
          </DialogTitle>
          <DialogDescription>
            {stockMode
              ? "Escaneá productos existentes para sumar unidades al stock de forma rápida"
              : "Escanea o ingresa un código de barras para buscar información del producto"}
          </DialogDescription>
        </DialogHeader>

        {/* Estado: IDLE - Buscar código */}
        {state === BarcodeSearchState.IDLE && (
          <div className="space-y-4">
            {lastStockUpdate && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-sm dark:bg-green-950/40 dark:border-green-800/60">
                <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                <span className="text-green-800 dark:text-green-200">
                  +{lastStockUpdate.added} a <strong>{lastStockUpdate.name}</strong> — stock actual: {lastStockUpdate.newStock}
                </span>
              </div>
            )}
            {stockMode && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stock-quantity">Unidades a agregar</Label>
                  <Input
                    id="stock-quantity"
                    type="number"
                    min={1}
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  />
                </div>
                <div className="flex items-end pb-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="rapid-stock"
                      checked={rapidStockMode}
                      onCheckedChange={(checked) => setRapidStockMode(checked === true)}
                    />
                    <Label htmlFor="rapid-stock" className="text-sm font-normal cursor-pointer">
                      Carga continua (volver a escanear tras cada suma)
                    </Label>
                  </div>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="barcode">Código de Barras</Label>
              <div className="flex gap-2">
                <Input
                  id="barcode"
                  ref={inputRef}
                  value={barcode}
                  onChange={(e) => {
                    setBarcode(e.target.value)
                    setError(null)
                  }}
                  onKeyPress={handleKeyPress}
                  placeholder="Ingresa o escanea el código de barras"
                  className="flex-1"
                />
                <Button
                  onClick={handleBarcodeSearch}
                  disabled={!barcode.trim()}
                >
                  <Search className="h-4 w-4 mr-2" />
                  Buscar
                </Button>
              </div>
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-red-700">{error}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Estado: SEARCHING - Buscando */}
        {state === BarcodeSearchState.SEARCHING && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg font-medium">
              {searchingPreferSite ? `Buscando en ${searchingPreferSite}…` : "Buscando información…"}
            </p>
            <p className="text-sm text-muted-foreground">
              {searchingPreferSite
                ? "Priorizando resultados de ese sitio"
                : "Consultando bases de datos externas"}
            </p>
          </div>
        )}

        {/* Estado: FOUND - Datos encontrados (Preview) */}
        {state === BarcodeSearchState.FOUND && previewData && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  {previewData.preview_message || "Hemos encontrado:"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {previewData.images && previewData.images.length > 0 && (
                    <div className="md:col-span-1">
                      <Image
                        src={previewData.images[0]}
                        alt={previewData.title}
                        width={200}
                        height={200}
                        className="rounded-lg object-cover w-full"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    </div>
                  )}
                  <div className={previewData.images && previewData.images.length > 0 ? "md:col-span-2" : "md:col-span-3"}>
                    <h3 className="text-xl font-semibold mb-2">{previewData.title}</h3>
                    {previewData.description && (
                      <p className="text-muted-foreground mb-3">{previewData.description}</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {previewData.brand && (
                        <Badge variant="outline">
                          <Tag className="h-3 w-3 mr-1" />
                          {previewData.brand}
                        </Badge>
                      )}
                      {previewData.suggested_price && (
                        <Badge variant="outline">
                          <DollarSign className="h-3 w-3 mr-1" />
                          ${typeof previewData.suggested_price === 'number' 
                            ? previewData.suggested_price.toFixed(2) 
                            : parseFloat(String(previewData.suggested_price)).toFixed(2)}
                        </Badge>
                      )}
                      {previewData.category_suggestion && (
                        <Badge variant="outline">
                          <Package className="h-3 w-3 mr-1" />
                          {previewData.category_suggestion}
                        </Badge>
                      )}
                      <Badge variant="secondary">
                        Fuente: {previewData.source}
                      </Badge>
                    </div>
                    {previewData.source_site && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Encontrado en: <strong>{previewData.source_site}</strong>
                      </p>
                    )}
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span className="text-red-700">{error}</span>
                  </div>
                )}

                <Separator />

                <BarcodeRetailLinks
                  barcode={barcode}
                  onSearchInSite={handleSearchInSite}
                  searchingSite={searchingPreferSite}
                />

                <div className="flex gap-2 justify-end">
                  {previewData.available_actions.ignore && (
                    <Button
                      variant="outline"
                      onClick={handleIgnore}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Ignorar
                    </Button>
                  )}
                  {previewData.available_actions.modify && (
                    <Button
                      variant="outline"
                      onClick={handleModify}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Modificar
                    </Button>
                  )}
                  {previewData.available_actions.accept && (
                    <Button
                      onClick={handleAccept}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Aceptar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Estado: EXISTS - Producto ya existe */}
        {state === BarcodeSearchState.EXISTS && previewData && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                  Producto encontrado
                </CardTitle>
                <CardDescription>
                  Este producto ya está en el sistema. Podés sumar stock con la lectora.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-950/40 dark:border-blue-800/60">
                  <h3 className="font-semibold mb-2 text-foreground">{previewData.title}</h3>
                  {previewData.product_code && (
                    <p className="text-sm text-muted-foreground">
                      Código interno: <strong>{previewData.product_code}</strong>
                    </p>
                  )}
                  {typeof previewData.current_stock === 'number' && (
                    <p className="text-sm mt-1 text-foreground">
                      Stock actual: <strong>{previewData.current_stock}</strong> unidades
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="exists-stock-quantity">Unidades a agregar</Label>
                    <Input
                      id="exists-stock-quantity"
                      type="number"
                      min={1}
                      value={stockQuantity}
                      onChange={(e) => setStockQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && previewData.product_id) {
                          handleAddStock(previewData.product_id, previewData)
                        }
                      }}
                    />
                  </div>
                  <div className="flex items-end pb-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="exists-rapid-stock"
                        checked={rapidStockMode}
                        onCheckedChange={(checked) => setRapidStockMode(checked === true)}
                      />
                      <Label htmlFor="exists-rapid-stock" className="text-sm font-normal cursor-pointer">
                        Carga continua
                      </Label>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span className="text-red-700">{error}</span>
                  </div>
                )}

                <div className="flex justify-between gap-2">
                  <Button variant="outline" onClick={resetForNextScan}>
                    Escanear otro
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={onClose}>
                      Cerrar
                    </Button>
                    {previewData.product_id && previewData.available_actions.add_stock !== false && (
                      <Button onClick={() => handleAddStock(previewData.product_id!, previewData)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar {stockQuantity} unidad{stockQuantity !== 1 ? 'es' : ''}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Estado: ADDING_STOCK - Agregando stock */}
        {state === BarcodeSearchState.ADDING_STOCK && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg font-medium">Agregando stock...</p>
          </div>
        )}

        {/* Estado: STOCK_ADDED - Stock actualizado */}
        {state === BarcodeSearchState.STOCK_ADDED && lastStockUpdate && (
          <div className="space-y-4">
            <Card>
              <CardContent className="py-12 text-center space-y-4">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                <h3 className="text-lg font-semibold">Stock actualizado</h3>
                <p className="text-muted-foreground">
                  Se agregaron <strong>{lastStockUpdate.added}</strong> unidad{lastStockUpdate.added !== 1 ? 'es' : ''} a{" "}
                  <strong>{lastStockUpdate.name}</strong>.
                </p>
                <p className="text-sm text-muted-foreground">
                  Nuevo stock: <strong>{lastStockUpdate.newStock}</strong> unidades
                </p>
                <div className="flex justify-center gap-2 pt-4">
                  <Button variant="outline" onClick={resetForNextScan}>
                    Escanear otro
                  </Button>
                  <Button variant="outline" onClick={onClose}>
                    Cerrar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Estado: NOT_FOUND - No se encontraron datos */}
        {state === BarcodeSearchState.NOT_FOUND && (
          <div className="space-y-4">
            <Card>
              <CardContent className="py-12 text-center space-y-4">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
                <h3 className="text-lg font-semibold">No se encontraron datos</h3>
                <p className="text-muted-foreground">
                  El código de barras "{barcode}" no está registrado en nuestras bases de datos.
                </p>
                <p className="text-sm text-muted-foreground">
                  Puedes crear el producto manualmente desde el formulario de nuevo producto.
                </p>
                <div className="pt-4">
                  <BarcodeRetailLinks
                    barcode={barcode}
                    onSearchInSite={handleSearchInSite}
                    searchingSite={searchingPreferSite}
                  />
                </div>
                <div className="flex justify-center gap-2 pt-4">
                  <Button variant="outline" onClick={() => {
                    setState(BarcodeSearchState.IDLE)
                    setBarcode("")
                  }}>
                    Buscar Otro
                  </Button>
                  <Button variant="outline" onClick={onClose}>
                    Cerrar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Estado: MODIFYING - Modificar datos */}
        {state === BarcodeSearchState.MODIFYING && previewData && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Editar Datos del Producto</CardTitle>
                <CardDescription>
                  Modifica los datos antes de crear el producto
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Código Interno *</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      placeholder="Ej: PROD-001"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Precio *</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stock">Stock Inicial</Label>
                    <Input
                      id="stock"
                      type="number"
                      min="0"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Categoría</Label>
                    <Select
                      value={formData.category_id?.toString() || ""}
                      onValueChange={(value) => setFormData({ ...formData, category_id: value ? parseInt(value) : undefined })}
                      disabled={loadingCategories}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id.toString()}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    <h4 className="font-medium">Imágenes ({currentImages.length}/5)</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Podés mantener las imágenes detectadas, agregar por URL o subir desde el equipo.
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => imageInputRef.current?.click()}
                      disabled={currentImages.length >= 5 || uploadingImages}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {uploadingImages ? "Subiendo…" : "Subir imagen"}
                    </Button>
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      multiple
                      className="hidden"
                      onChange={handleImageUpload}
                    />

                    <div className="flex gap-2 flex-1 min-w-[220px]">
                      <Input
                        type="url"
                        value={imageUrlInput}
                        onChange={(e) => setImageUrlInput(e.target.value)}
                        placeholder="https://ejemplo.com/imagen.jpg"
                        disabled={currentImages.length >= 5}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            handleAddImageUrl()
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleAddImageUrl}
                        disabled={!imageUrlInput.trim() || currentImages.length >= 5}
                      >
                        Agregar URL
                      </Button>
                    </div>
                  </div>

                  {currentImages.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                      {currentImages.map((image, index) => (
                        <div key={`${image}-${index}`} className="relative group aspect-square rounded-lg overflow-hidden border bg-muted">
                          <Image
                            src={image}
                            alt={`Imagen ${index + 1}`}
                            fill
                            className="object-cover"
                            sizes="120px"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.src = "https://via.placeholder.com/120?text=Error"
                            }}
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleRemoveImage(index)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span className="text-red-700">{error}</span>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setState(BarcodeSearchState.FOUND)
                      setError(null)
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateWithModifications}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Crear Producto
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Estado: CREATING - Creando producto */}
        {state === BarcodeSearchState.CREATING && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg font-medium">Creando producto...</p>
          </div>
        )}

        {/* Estado: SUCCESS - Producto creado */}
        {state === BarcodeSearchState.SUCCESS && createdProduct && (
          <div className="space-y-4">
            <Card>
              <CardContent className="py-12 text-center space-y-4">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                <h3 className="text-lg font-semibold">Producto creado exitosamente</h3>
                <p className="text-muted-foreground">
                  El producto "{createdProduct.name}" ha sido creado correctamente.
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Estado: ERROR - Error general */}
        {state === BarcodeSearchState.ERROR && (
          <div className="space-y-4">
            <Card>
              <CardContent className="py-12 text-center space-y-4">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
                <h3 className="text-lg font-semibold">Error</h3>
                <p className="text-muted-foreground">{error || "Ocurrió un error inesperado"}</p>
                <div className="flex justify-center gap-2 pt-4">
                  <Button variant="outline" onClick={() => {
                    setState(BarcodeSearchState.IDLE)
                    setError(null)
                  }}>
                    Intentar de Nuevo
                  </Button>
                  <Button variant="outline" onClick={onClose}>
                    Cerrar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
    {confirmDialog}
    </>
  )
}
 