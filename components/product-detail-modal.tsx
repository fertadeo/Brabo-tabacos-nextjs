"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useConfirmBeforeClose } from "@/lib/use-confirm-before-close"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Package, DollarSign, AlertTriangle, TrendingUp, Edit, Trash2, Image as ImageIcon, ChevronLeft, ChevronRight, Loader2, QrCode, ScanLine, Printer, RefreshCw, Ruler, Truck, ExternalLink } from "lucide-react"
import Image from "next/image"
import { Product, updateProduct, syncProductToWooCommerce, getProductById } from "@/lib/api"
import { getAllProductImages } from "@/lib/product-image-utils"
import { formatSaleIvaRateLabel, productIvaRate } from "@/lib/sale-iva"
import { useToast } from "@/contexts/ToastContext"
import QRCodeSVG from "react-qr-code"
import JsBarcode from "jsbarcode"
import { generateProductCodes } from "@/lib/product-codes"

interface ProductDetailModalProps {
  product: Product | null
  isOpen: boolean
  onClose: () => void
  onDelete?: (id: number) => void | Promise<void>
  onEdit?: (product: Product) => void
  onSyncSuccess?: () => void
}

export function ProductDetailModal({ product, isOpen, onClose, onDelete, onEdit, onSyncSuccess }: ProductDetailModalProps) {
  const { showToast } = useToast()
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [isImageLoading, setIsImageLoading] = useState(true)
  const [isGeneratingCodes, setIsGeneratingCodes] = useState(false)
  const [isSyncingWooCommerce, setIsSyncingWooCommerce] = useState(false)
  const [localProduct, setLocalProduct] = useState<Product | null>(null)
  const barcodeCanvasRef = useRef<HTMLCanvasElement>(null)
  const qrContainerRef = useRef<HTMLDivElement>(null)

  const displayedProduct = localProduct ?? product

  // Resetear índice de imagen cuando cambia el producto o se abre el modal
  useEffect(() => {
    if (isOpen && product) {
      setLocalProduct(null)
      setSelectedImageIndex(0)
      setIsImageLoading(true)
    }
  }, [isOpen, product])

  // Resetear estado de carga cuando cambia la imagen seleccionada
  useEffect(() => {
    setIsImageLoading(true)
  }, [selectedImageIndex])

  // Generar código de barras cuando el producto cambia. Se difiere al siguiente frame
  // para que el canvas del Dialog esté montado y con dimensiones (evita que no se vea al abrir).
  useEffect(() => {
    if (!displayedProduct?.barcode || !isOpen) return

    const drawBarcode = () => {
      const canvas = barcodeCanvasRef.current
      if (!canvas) return
      try {
        JsBarcode(canvas, displayedProduct.barcode!, {
          format: "CODE128",
          width: 1.6,
          height: 60,
          displayValue: true,
          fontSize: 12,
          margin: 8
        })
      } catch (err) {
        console.error("Error al generar código de barras:", err)
      }
    }

    const rafId = requestAnimationFrame(() => {
      requestAnimationFrame(drawBarcode)
    })
    return () => cancelAnimationFrame(rafId)
  }, [displayedProduct?.barcode, displayedProduct?.id, isOpen])

  const generateSku = () => {
    const timestamp = Date.now().toString().slice(-6)
    const random = Math.random().toString(36).substring(2, 5).toUpperCase()
    return `PROD-${timestamp}-${random}`
  }

  const isQrFromErpDomain = (qr: string | null | undefined) =>
    Boolean(qr && /https?:\/\/sistema\.mfcomputers\.com\.ar\b/i.test(qr))

  const handleSyncToWooCommerce = async () => {
    if (!displayedProduct) return
    try {
      setIsSyncingWooCommerce(true)
      await syncProductToWooCommerce(displayedProduct.id)
      const updated = await getProductById(displayedProduct.id)
      setLocalProduct(updated)
      onSyncSuccess?.()
      showToast({ message: "Producto sincronizado con WooCommerce correctamente.", type: "success" })
    } catch (err) {
      console.error("Error al sincronizar con WooCommerce:", err)
      showToast({
        message: err instanceof Error ? err.message : "Error al sincronizar con WooCommerce",
        type: "error",
      })
    } finally {
      setIsSyncingWooCommerce(false)
    }
  }

  const handleDelete = async () => {
    if (!displayedProduct || !onDelete) return
    if (window.confirm("¿Estás seguro de que quieres eliminar este producto? (borrado lógico)")) {
      try {
        await Promise.resolve(onDelete(displayedProduct.id))
        onClose()
      } catch (err) {
        console.error("Error al eliminar producto:", err)
      }
    }
  }

  const handleGenerateCodes = async (opts?: { force?: boolean }) => {
    if (!displayedProduct) return

    const alreadyGenerated = Boolean(displayedProduct.barcode && displayedProduct.qr_code)
    if (alreadyGenerated && !opts?.force) return

    try {
      setIsGeneratingCodes(true)

      const hasSku = Boolean(displayedProduct.code && displayedProduct.code.trim())
      const finalSku = hasSku ? displayedProduct.code.trim() : generateSku()

      const codes = generateProductCodes(
        finalSku,
        displayedProduct.woocommerce_id ?? null,
        displayedProduct.woocommerce_slug ?? null
      )

      const updated = await updateProduct(displayedProduct.id, {
        ...(hasSku ? {} : { code: finalSku }),
        barcode: codes.barcode,
        qr_code: codes.qr_code
      })

      setLocalProduct(updated)
    } catch (err) {
      console.error("Error al generar/guardar códigos:", err)
      alert(err instanceof Error ? err.message : "Error al generar/guardar códigos")
    } finally {
      setIsGeneratingCodes(false)
    }
  }

  const openPrintWindow = (title: string, bodyHtml: string) => {
    // OJO: con "noreferrer/noopener" algunos navegadores abren la ventana
    // pero no devuelven referencia, quedando en blanco (about:blank).
    const printWindow = window.open("about:blank", "_blank", "width=900,height=650")
    if (!printWindow) return

    const escapeHtml = (input: string) =>
      input
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")

    printWindow.document.open()
    printWindow.document.write(`<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      @page { margin: 12mm; }
      body { background: #fff; font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; color: #111; }
      .wrap { display: grid; gap: 14px; }
      .header { margin-bottom: 4px; }
      .name { font-size: 16px; font-weight: 700; margin: 0 0 4px; }
      .meta { font-size: 12px; margin: 0; color: #555; }
      .card { border: 1px solid #ddd; border-radius: 10px; padding: 14px; }
      .card h2 { font-size: 12px; margin: 0 0 10px; color: #333; letter-spacing: .02em; text-transform: uppercase; }
      .center { display: flex; align-items: center; justify-content: center; }
      img { display:block; max-width: 100%; height: auto; }
      .hint { font-size: 11px; color: #666; margin-top: 10px; text-align: center; word-break: break-word; }
      .actions { margin-top: 10px; display: flex; gap: 8px; }
      .btn { border: 1px solid #111; background: #111; color: #fff; padding: 10px 12px; border-radius: 8px; font-size: 12px; cursor: pointer; }
      .btn.secondary { background: #fff; color: #111; }
      @media print { .actions { display: none; } }
    </style>
  </head>
  <body>
    ${bodyHtml}
  </body>
</html>`)
    printWindow.document.close()
    // Asegurar foco/render antes de imprimir
    try {
      printWindow.focus()
    } catch {}
  }

  const getQrSvgDataUrl = () => {
    const svgEl = qrContainerRef.current?.querySelector("svg")
    if (!svgEl) return null
    let svg = svgEl.outerHTML
    if (!/xmlns=/.test(svg)) {
      svg = svg.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"')
    }
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  }

  const handlePrintBarcode = () => {
    if (!displayedProduct?.barcode) return
    if (barcodeCanvasRef.current) {
      try {
        JsBarcode(barcodeCanvasRef.current, displayedProduct.barcode, {
          format: "CODE128",
          width: 2,
          height: 90,
          displayValue: true,
          fontSize: 16,
          margin: 10
        })
      } catch (err) {
        console.error("Error al generar código de barras (print):", err)
      }
    }
    const png =
      barcodeCanvasRef.current ? barcodeCanvasRef.current.toDataURL("image/png") : null
    if (!png) return

    openPrintWindow(
      `Código de barras - ${displayedProduct.code}`,
      `<div class="wrap">
        <div class="header">
          <p class="name">${displayedProduct.name}</p>
          <p class="meta">Código: <strong>${displayedProduct.code}</strong></p>
        </div>
        <div class="card">
          <h2>Código de barras</h2>
          <div class="center" style="background:#fff;border-radius:8px;padding:10px;">
            <img src="${png}" alt="Código de barras" />
          </div>
          <div class="hint">${displayedProduct.barcode}</div>
        </div>
        <div class="actions">
          <button class="btn" onclick="window.print()">Imprimir</button>
          <button class="btn secondary" onclick="window.close()">Cerrar</button>
        </div>
      </div>`
    )
  }

  const handlePrintQr = () => {
    if (!displayedProduct?.qr_code) return
    const qrImg = getQrSvgDataUrl()
    if (!qrImg) return

    openPrintWindow(
      `Código QR - ${displayedProduct.code}`,
      `<div class="wrap">
        <div class="header">
          <p class="name">${displayedProduct.name}</p>
          <p class="meta">Código: <strong>${displayedProduct.code}</strong></p>
        </div>
        <div class="card">
          <h2>Código QR</h2>
          <div class="center" style="background:#fff;border-radius:8px;padding:10px;">
            <img src="${qrImg}" alt="Código QR" style="width:260px;max-width:100%;" />
          </div>
          <div class="hint">Escaneá para ver el producto</div>
        </div>
        <div class="actions">
          <button class="btn" onclick="window.print()">Imprimir</button>
          <button class="btn secondary" onclick="window.close()">Cerrar</button>
        </div>
      </div>`
    )
  }

  const [handleOpenChange, confirmDialog] = useConfirmBeforeClose((open) => {
    if (!open) onClose()
  })

  if (!displayedProduct) return null

  // Función para determinar el estado del stock
  const getStockStatus = (stock: number, minStock: number, maxStock: number) => {
    if (stock <= minStock) return "critico"
    if (stock >= maxStock * 0.8) return "alto"
    return "normal"
  }

  const stockStatus = getStockStatus(displayedProduct.stock, displayedProduct.min_stock, displayedProduct.max_stock)
  const allImages = getAllProductImages(displayedProduct)
  const hasImages = allImages.length > 0
  const currentImage = hasImages ? allImages[selectedImageIndex] : null

  const handlePreviousImage = () => {
    setSelectedImageIndex((prev) => (prev > 0 ? prev - 1 : allImages.length - 1))
  }

  const handleNextImage = () => {
    setSelectedImageIndex((prev) => (prev < allImages.length - 1 ? prev + 1 : 0))
  }

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case "critico":
        return "destructive"
      case "alto":
        return "default"
      default:
        return "secondary"
    }
  }

  const getEstadoText = (estado: string) => {
    switch (estado) {
      case "critico":
        return "Crítico"
      case "alto":
        return "Alto"
      default:
        return "Normal"
    }
  }

  const codesGenerated = Boolean(displayedProduct.barcode && displayedProduct.qr_code)
  const qrWrongDomain = isQrFromErpDomain(displayedProduct.qr_code ?? null)
  const skuMissing = !displayedProduct.code || !displayedProduct.code.trim()
  const wcBaseUrl = (process.env.NEXT_PUBLIC_WOOCOMMERCE_URL || "https://mfcomputers.com.ar").replace(/\/+$/, "")
  const wcSlug = displayedProduct.woocommerce_slug?.replace(/^\/+|\/+$/g, "").trim()
  const wcProductUrl = wcSlug ? `${wcBaseUrl}/${wcSlug}` : null

  const expectedQr = !skuMissing
    ? generateProductCodes(
        displayedProduct.code.trim(),
        displayedProduct.woocommerce_id ?? null,
        displayedProduct.woocommerce_slug ?? null
      ).qr_code
    : null

  const qrNeedsUpdate = Boolean(expectedQr && displayedProduct.qr_code && displayedProduct.qr_code !== expectedQr)

  return (
    <>
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[96vw] max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{displayedProduct.name}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-[minmax(360px,460px)_minmax(0,1fr)]">
          {/* Galería de imágenes del producto */}
          <div className="space-y-4">
            {/* Imagen principal */}
            <div className="relative aspect-square rounded-lg overflow-hidden bg-muted group">
              {currentImage ? (
                <>
                  {/* Spinner de carga */}
                  {isImageLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted z-10">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  )}
                  <Image
                    src={currentImage}
                    alt={`${displayedProduct.name || 'Producto'} - Imagen ${selectedImageIndex + 1}`}
                    fill
                    className={`object-cover transition-opacity duration-300 ${
                      isImageLoading ? 'opacity-0' : 'opacity-100'
                    }`}
                    sizes="(max-width: 768px) 100vw, 50vw"
                    onLoad={() => {
                      // Ocultar spinner cuando la imagen carga
                      setIsImageLoading(false)
                    }}
                    onLoadingComplete={() => {
                      // Asegurar que cuando Next.js confirme la carga, ocultar el spinner
                      setIsImageLoading(false)
                    }}
                    onError={(e) => {
                      // Fallback si la imagen falla al cargar
                      const target = e.target as HTMLImageElement
                      target.src = `https://via.placeholder.com/400x400?text=${encodeURIComponent(displayedProduct.name || 'Producto')}`
                      setIsImageLoading(false)
                    }}
                  />
                  {/* Botones de navegación (solo si hay más de una imagen) */}
                  {allImages.length > 1 && !isImageLoading && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/70 text-white z-20"
                        onClick={handlePreviousImage}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/70 text-white z-20"
                        onClick={handleNextImage}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      {/* Indicador de imagen actual */}
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-2 py-1 rounded z-20">
                        {selectedImageIndex + 1} / {allImages.length}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <ImageIcon className="h-16 w-16 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Miniaturas de imágenes (si hay más de una) */}
            {allImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {allImages.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`relative flex-shrink-0 w-20 h-20 rounded-md overflow-hidden border-2 transition-all ${
                      selectedImageIndex === index
                        ? 'border-primary ring-2 ring-primary/20'
                        : 'border-transparent hover:border-muted-foreground/50'
                    }`}
                  >
                    <Image
                      src={image}
                      alt={`Miniatura ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="80px"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = `https://via.placeholder.com/80x80?text=${encodeURIComponent(displayedProduct.name || 'Producto')}`
                      }}
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Acciones rápidas */}
            <div className="flex flex-wrap gap-2">
              {onEdit && (
                <Button
                  variant="outline"
                  className="flex-1 min-w-0 bg-transparent hover:bg-primary/10 hover:text-primary hover:border-primary/50 dark:hover:bg-primary/20 dark:hover:text-primary transition-colors"
                  onClick={() => onEdit(displayedProduct)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              )}
              <Button
                variant="outline"
                className="bg-transparent hover:bg-blue-500/10 hover:text-blue-600 hover:border-blue-500/50 dark:hover:text-blue-400 transition-colors"
                onClick={handleSyncToWooCommerce}
                disabled={isSyncingWooCommerce}
              >
                {isSyncingWooCommerce ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                {isSyncingWooCommerce ? "Sincronizando…" : "Sync WooCommerce"}
              </Button>
              {wcProductUrl && (
                <Button
                  variant="outline"
                  className="bg-transparent hover:bg-emerald-500/10 hover:text-emerald-600 hover:border-emerald-500/50 dark:hover:text-emerald-400 transition-colors"
                  asChild
                >
                  <a href={wcProductUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Ir al producto en WooCommerce
                  </a>
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="outline"
                  size="icon"
                  className="bg-transparent hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50 dark:hover:bg-destructive/20 dark:hover:text-destructive transition-colors"
                  onClick={handleDelete}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Detalles del producto */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{displayedProduct.category_name || 'Sin categoría'}</Badge>
              <Badge variant={getEstadoColor(stockStatus)}>{getEstadoText(stockStatus)}</Badge>
              <Badge variant={displayedProduct.is_active ? "default" : "secondary"}>
                {displayedProduct.is_active ? "Activo" : "Inactivo"}
              </Badge>
              {displayedProduct.allow_backorders && (
                <Badge variant="outline" className="border-amber-500/50 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30">
                  <Truck className="h-3 w-3 mr-1" />
                  Por encargo
                </Badge>
              )}
            </div>

            {displayedProduct.allow_backorders && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  Este producto permite reserva: Permitir, pero se avisará al cliente.
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  Se puede vender con stock 0; en WooCommerce equivale a &quot;Permitir reservas&quot; con aviso al cliente.
                </p>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Precio:</span>
                <span className="font-semibold text-lg">${Math.round(Number(displayedProduct.price)).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                <Badge variant="outline" className="text-xs">
                  IVA {formatSaleIvaRateLabel(productIvaRate(displayedProduct))}
                </Badge>
                <span className="text-xs text-muted-foreground">(precio con IVA incluido)</span>
              </div>

              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Código:</span>
                <span className="font-mono">{displayedProduct.code || "-"}</span>
              </div>

              {displayedProduct.woocommerce_id && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">ID WooCommerce:</span>
                  <span className="font-mono text-sm">{displayedProduct.woocommerce_id}</span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">ID:</span>
                <span className="font-mono text-sm">{displayedProduct.id}</span>
              </div>
            </div>

            <Separator />

            {/* Stock Information */}
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Información de Stock
              </h4>

              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-turquoise-600">{displayedProduct.stock}</p>
                  <p className="text-xs text-muted-foreground">Actual</p>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-orange-600">{displayedProduct.min_stock}</p>
                  <p className="text-xs text-muted-foreground">Mínimo</p>
                </div>
              </div>

              {displayedProduct.stock <= displayedProduct.min_stock && !displayedProduct.allow_backorders && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-red-700 dark:text-red-400">
                    Stock por debajo del mínimo recomendado
                  </span>
                </div>
              )}
            </div>

            {/* Peso y dimensiones (envíos) */}
            {(displayedProduct.weight != null || displayedProduct.length != null || displayedProduct.width != null || displayedProduct.height != null) && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Ruler className="h-4 w-4" />
                    Peso y dimensiones (envíos)
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    {displayedProduct.weight != null && (
                      <div>
                        <p className="text-muted-foreground">Peso</p>
                        <p className="font-medium">{displayedProduct.weight} kg</p>
                      </div>
                    )}
                    {displayedProduct.length != null && (
                      <div>
                        <p className="text-muted-foreground">Largo</p>
                        <p className="font-medium">{displayedProduct.length} cm</p>
                      </div>
                    )}
                    {displayedProduct.width != null && (
                      <div>
                        <p className="text-muted-foreground">Ancho</p>
                        <p className="font-medium">{displayedProduct.width} cm</p>
                      </div>
                    )}
                    {displayedProduct.height != null && (
                      <div>
                        <p className="text-muted-foreground">Alto</p>
                        <p className="font-medium">{displayedProduct.height} cm</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Códigos de barras y QR */}
            <>
              <div className="space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h4 className="font-semibold flex items-center gap-2">
                    <ScanLine className="h-4 w-4" />
                    Códigos de Identificación
                  </h4>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      className={(codesGenerated && !qrWrongDomain && !qrNeedsUpdate)
                        ? "border-green-300 bg-green-50 text-green-800 hover:bg-green-50 hover:text-green-800 dark:border-green-800 dark:bg-green-950/30 dark:text-green-200"
                        : "border-yellow-300 bg-yellow-50 text-yellow-800 hover:bg-yellow-50 hover:text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-200"
                      }
                      onClick={(codesGenerated && !qrWrongDomain && !qrNeedsUpdate)
                        ? undefined
                        : () => handleGenerateCodes({ force: qrWrongDomain || qrNeedsUpdate })}
                      disabled={(codesGenerated && !qrWrongDomain && !qrNeedsUpdate) || isGeneratingCodes}
                    >
                      {(codesGenerated && !qrWrongDomain && !qrNeedsUpdate)
                        ? "Códigos Generados"
                        : (isGeneratingCodes
                          ? "Generando..."
                          : (qrWrongDomain
                            ? "QR con dominio ERP (regenerar)"
                            : (qrNeedsUpdate
                              ? "Actualizar QR (usar slug)"
                              : (skuMissing ? "Este producto no tiene código (generar)" : "Este producto no tiene códigos generados"))))}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {/* Código de barras */}
                  <div className="min-w-0 bg-muted/50 p-4 rounded-lg border">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="text-xs text-muted-foreground">Código de barras</p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={handlePrintBarcode}
                        disabled={!displayedProduct.barcode}
                        title="Imprimir código de barras"
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                    </div>
                    {displayedProduct.barcode ? (
                      <div className="overflow-x-auto">
                        <div className="flex justify-center min-w-fit">
                          <canvas ref={barcodeCanvasRef} className="block" />
                        </div>
                      </div>
                    ) : (
                      <div className="h-[92px] flex items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
                        No generado
                      </div>
                    )}
                    <p className="text-[11px] text-center text-muted-foreground mt-2 font-mono break-all">
                      {displayedProduct.barcode || "-"}
                    </p>
                  </div>

                  {/* Código QR */}
                  <div className="min-w-0 bg-muted/50 p-4 rounded-lg border">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <QrCode className="h-3 w-3" />
                        Código QR
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={handlePrintQr}
                        disabled={!displayedProduct.qr_code}
                        title="Imprimir código QR"
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                    </div>
                    {displayedProduct.qr_code ? (
                      <div className="flex justify-center">
                        <div ref={qrContainerRef} className="bg-white p-2 rounded w-fit max-w-full">
                          <QRCodeSVG
                            value={displayedProduct.qr_code || ""}
                            size={140}
                            level="M"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="h-[156px] flex items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
                        No generado
                      </div>
                    )}
                    <p className="text-xs text-center text-muted-foreground mt-2">
                      {displayedProduct.qr_code ? "Escaneá para ver el producto" : "Generalo para compartir"}
                    </p>
                  </div>
                </div>
              </div>
              <Separator />
            </>

            {/* Información adicional */}
            <div className="space-y-3">
              <h4 className="font-semibold">Información Adicional</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Creado:</span>
                  <span>{new Date(displayedProduct.created_at).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Actualizado:</span>
                  <span>{new Date(displayedProduct.updated_at).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Descripción - Ocupa todo el ancho */}
        {displayedProduct.description && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="font-semibold">Descripción</h4>
              <div 
                className="text-sm text-muted-foreground leading-relaxed [&_p]:my-2 [&_p]:mb-3 
                  [&_strong]:font-semibold [&_strong]:text-foreground 
                  [&_h1]:text-lg [&_h1]:font-bold [&_h1]:my-3 [&_h1]:text-foreground
                  [&_h2]:text-base [&_h2]:font-bold [&_h2]:my-2 [&_h2]:text-foreground
                  [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:my-2 [&_h3]:text-foreground
                  [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:my-2
                  [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:my-2
                  [&_li]:my-1 [&_li]:text-muted-foreground
                  [&_a]:text-primary [&_a]:underline hover:[&_a]:text-primary/80
                  [&_br]:block [&_br]:content-[''] [&_br]:my-1"
                dangerouslySetInnerHTML={{ __html: displayedProduct.description }}
              />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
    {confirmDialog}
    </>
  )
}
