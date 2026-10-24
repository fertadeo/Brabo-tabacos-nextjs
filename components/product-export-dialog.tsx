"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import type { Product } from "@/lib/api"
import {
  DEFAULT_PRODUCT_EXPORT_COLUMNS,
  PRODUCT_EXPORT_COLUMNS,
  exportProducts,
  type ProductExportColumnId,
  type ProductExportFormat,
} from "@/lib/export-products"
import { Download, FileSpreadsheet, FileText, ImageIcon, Loader2 } from "lucide-react"

const STORAGE_COLUMNS = "productos-export-columns"
const STORAGE_IMAGE = "productos-export-image"
const STORAGE_FORMAT = "productos-export-format"

interface ProductExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  filteredProducts: Product[]
  allProducts: Product[]
}

function readStoredColumns(): ProductExportColumnId[] {
  if (typeof window === "undefined") return DEFAULT_PRODUCT_EXPORT_COLUMNS
  try {
    const raw = localStorage.getItem(STORAGE_COLUMNS)
    if (!raw) return DEFAULT_PRODUCT_EXPORT_COLUMNS
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return DEFAULT_PRODUCT_EXPORT_COLUMNS
    const allowed = new Set(PRODUCT_EXPORT_COLUMNS.map((column) => column.id))
    const columns = parsed.filter((id): id is ProductExportColumnId => allowed.has(id as ProductExportColumnId))
    return columns.length > 0 ? columns : DEFAULT_PRODUCT_EXPORT_COLUMNS
  } catch {
    return DEFAULT_PRODUCT_EXPORT_COLUMNS
  }
}

export function ProductExportDialog({
  open,
  onOpenChange,
  filteredProducts,
  allProducts,
}: ProductExportDialogProps) {
  const [format, setFormat] = useState<ProductExportFormat>("csv")
  const [includeImage, setIncludeImage] = useState(false)
  const [scope, setScope] = useState<"filtered" | "all">("filtered")
  const [columns, setColumns] = useState<ProductExportColumnId[]>(DEFAULT_PRODUCT_EXPORT_COLUMNS)
  const [exporting, setExporting] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setColumns(readStoredColumns())
    setIncludeImage(localStorage.getItem(STORAGE_IMAGE) === "1")
    const storedFormat = localStorage.getItem(STORAGE_FORMAT)
    setFormat(storedFormat === "pdf" ? "pdf" : "csv")
    setScope("filtered")
    setError(null)
    setProgress(null)
    setExporting(false)
  }, [open])

  const products = scope === "filtered" ? filteredProducts : allProducts
  const selected = useMemo(() => new Set(columns), [columns])

  const toggleColumn = (id: ProductExportColumnId, checked: boolean) => {
    setColumns((current) => {
      if (checked) return current.includes(id) ? current : [...current, id]
      return current.filter((column) => column !== id)
    })
  }

  const handleExport = async () => {
    if (columns.length === 0 || products.length === 0) return
    setExporting(true)
    setError(null)
    setProgress(null)
    try {
      localStorage.setItem(STORAGE_COLUMNS, JSON.stringify(columns))
      localStorage.setItem(STORAGE_IMAGE, includeImage ? "1" : "0")
      localStorage.setItem(STORAGE_FORMAT, format)
      await exportProducts({
        products,
        columns,
        includeImage,
        format,
        onProgress: (done, total) => setProgress({ done, total }),
      })
      onOpenChange(false)
    } catch (err) {
      console.error("Error al exportar productos:", err)
      setError(err instanceof Error ? err.message : "No se pudo generar el archivo")
    } finally {
      setExporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !exporting && onOpenChange(next)}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Exportar productos</DialogTitle>
          <DialogDescription>
            Elegí el formato, si querés la imagen y qué columnas incluir. La descarga usa el catálogo que está cargado ahora.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <p className="text-sm font-medium">Formato</p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={format === "csv" ? "default" : "outline"}
                onClick={() => setFormat("csv")}
                disabled={exporting}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                CSV
              </Button>
              <Button
                type="button"
                variant={format === "pdf" ? "default" : "outline"}
                onClick={() => setFormat("pdf")}
                disabled={exporting}
              >
                <FileText className="h-4 w-4 mr-2" />
                PDF
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Qué productos</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button
                type="button"
                variant={scope === "filtered" ? "default" : "outline"}
                onClick={() => setScope("filtered")}
                disabled={exporting}
                className="h-auto py-2 whitespace-normal"
              >
                Vista actual ({filteredProducts.length})
              </Button>
              <Button
                type="button"
                variant={scope === "all" ? "default" : "outline"}
                onClick={() => setScope("all")}
                disabled={exporting}
                className="h-auto py-2 whitespace-normal"
              >
                Catálogo completo ({allProducts.length})
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              La vista actual incluye la pestaña, la búsqueda y los filtros, de todas las páginas.
            </p>
          </div>

          <label className="flex items-start gap-3 rounded-md border p-3 cursor-pointer">
            <Checkbox
              checked={includeImage}
              onCheckedChange={(checked) => setIncludeImage(checked === true)}
              disabled={exporting}
              className="mt-0.5"
            />
            <span className="space-y-1">
              <span className="flex items-center gap-2 text-sm font-medium">
                <ImageIcon className="h-4 w-4" />
                Incluir imagen del producto
              </span>
              <span className="block text-xs text-muted-foreground">
                {format === "csv"
                  ? "Con imagen, el archivo se abre en Excel y muestra la foto. Sin imagen, se descarga un CSV."
                  : "En el PDF se incrusta la foto del producto."}
              </span>
            </span>
          </label>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">Columnas</p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={exporting}
                  onClick={() => setColumns(PRODUCT_EXPORT_COLUMNS.map((column) => column.id))}
                >
                  Todas
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={exporting}
                  onClick={() => setColumns([])}
                >
                  Ninguna
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRODUCT_EXPORT_COLUMNS.map((column) => {
                const id = `export-col-${column.id}`
                return (
                  <Label key={column.id} htmlFor={id} className="font-normal cursor-pointer">
                    <Checkbox
                      id={id}
                      checked={selected.has(column.id)}
                      onCheckedChange={(checked) => toggleColumn(column.id, checked === true)}
                      disabled={exporting}
                    />
                    {column.label}
                  </Label>
                )
              })}
            </div>
          </div>

          {progress && includeImage && (
            <p className="text-sm text-muted-foreground">
              Preparando imágenes {progress.done} de {progress.total}…
            </p>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {products.length === 0 && (
            <p className="text-sm text-amber-700">No hay productos para exportar con esta selección.</p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={exporting}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleExport}
            disabled={exporting || columns.length === 0 || products.length === 0}
          >
            {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Descargar {format === "pdf" ? "PDF" : includeImage ? "Excel" : "CSV"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
