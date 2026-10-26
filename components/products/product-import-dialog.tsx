"use client"

import { useEffect, useMemo, useRef, useState } from "react"
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  downloadImportTemplateCsv,
  parseDelimitedText,
  parseImportFile,
  type ProductImportItem,
} from "@/lib/product-import"
import {
  importProductsBulk,
  type ProductImportOptions,
  type ProductImportResult,
} from "@/lib/api"
import { FileSpreadsheet, Loader2, Upload } from "lucide-react"

interface ProductImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImported?: () => void
}

export function ProductImportDialog({ open, onOpenChange, onImported }: ProductImportDialogProps) {
  const [items, setItems] = useState<ProductImportItem[]>([])
  const [parseWarnings, setParseWarnings] = useState<string[]>([])
  const [fileName, setFileName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [previewResult, setPreviewResult] = useState<ProductImportResult | null>(null)
  const [importResult, setImportResult] = useState<ProductImportResult | null>(null)
  const [createMissingCategories, setCreateMissingCategories] = useState(true)
  const [updateDuplicates, setUpdateDuplicates] = useState(false)
  const [activateWithoutPrice, setActivateWithoutPrice] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setItems([])
    setParseWarnings([])
    setFileName(null)
    setError(null)
    setPreviewResult(null)
    setImportResult(null)
    setLoading(false)
  }, [open])

  const options: ProductImportOptions = useMemo(
    () => ({
      create_missing_categories: createMissingCategories,
      on_duplicate_code: updateDuplicates ? "update" : "skip",
      activate_without_price: activateWithoutPrice,
      default_iva_rate: 21,
      code_prefix: "IMP",
    }),
    [createMissingCategories, updateDuplicates, activateWithoutPrice]
  )

  const handleFile = async (file: File | null) => {
    if (!file) return
    setError(null)
    setPreviewResult(null)
    setImportResult(null)
    setLoading(true)
    try {
      const parsed = await parseImportFile(file)
      setItems(parsed.items)
      setParseWarnings(parsed.warnings)
      setFileName(file.name)
      if (parsed.items.length === 0) {
        setError("No se encontraron filas importables. Hace falta al menos un nombre por fila.")
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo leer el archivo")
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  const handlePaste = (text: string) => {
    setError(null)
    setPreviewResult(null)
    setImportResult(null)
    const parsed = parseDelimitedText(text)
    setItems(parsed.items)
    setParseWarnings(parsed.warnings)
    setFileName("pegado.csv")
    if (parsed.items.length === 0) {
      setError("El texto pegado no tiene filas válidas")
    }
  }

  const runImport = async (dryRun: boolean) => {
    if (items.length === 0) {
      setError("No hay filas para importar")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await importProductsBulk(items, { ...options, dry_run: dryRun })
      if (dryRun) {
        setPreviewResult(result)
        setImportResult(null)
      } else {
        setImportResult(result)
        setPreviewResult(null)
        onImported?.()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error en la importación")
    } finally {
      setLoading(false)
    }
  }

  const result = importResult || previewResult
  const previewRows = items.slice(0, 12)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar productos</DialogTitle>
          <DialogDescription>
            Podés subir CSV, TSV o Excel aunque falten código, precios, categoría o stock. Solo el
            nombre es obligatorio; el resto se completa o queda en borrador.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={downloadImportTemplateCsv}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Descargar plantilla
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.tsv,.txt,.xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                handleFile(e.target.files?.[0] ?? null)
                e.target.value = ""
              }}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              Elegir archivo
            </Button>
          </div>

          <div>
            <Label htmlFor="paste-import">O pegá una tabla (con encabezados)</Label>
            <textarea
              id="paste-import"
              className="mt-1 w-full min-h-[88px] rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="nombre,codigo,categoria,precio,mayorista,revendedor,stock"
              onBlur={(e) => {
                if (e.target.value.trim()) handlePaste(e.target.value)
              }}
            />
          </div>

          <div className="flex flex-col gap-2 text-sm">
            <label className="flex items-center gap-2">
              <Checkbox
                checked={createMissingCategories}
                onCheckedChange={(v) => setCreateMissingCategories(v === true)}
              />
              Crear categorías que no existan
            </label>
            <label className="flex items-center gap-2">
              <Checkbox
                checked={updateDuplicates}
                onCheckedChange={(v) => setUpdateDuplicates(v === true)}
              />
              Si el código ya existe, actualizar en lugar de omitir
            </label>
            <label className="flex items-center gap-2">
              <Checkbox
                checked={activateWithoutPrice}
                onCheckedChange={(v) => setActivateWithoutPrice(v === true)}
              />
              Activar aunque no tenga precio (por defecto queda borrador)
            </label>
          </div>

          {fileName && (
            <p className="text-sm text-muted-foreground">
              {fileName}: <strong>{items.length}</strong> filas listas
            </p>
          )}

          {parseWarnings.length > 0 && (
            <ul className="text-xs text-amber-700 dark:text-amber-400 list-disc pl-4 space-y-0.5">
              {parseWarnings.slice(0, 8).map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          {previewRows.length > 0 && (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="max-w-[200px] truncate">{row.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.code || <Badge variant="outline">auto</Badge>}
                      </TableCell>
                      <TableCell>{row.category || "—"}</TableCell>
                      <TableCell className="text-right">
                        {row.prices?.venta_local ?? row.price ?? "—"}
                      </TableCell>
                      <TableCell className="text-right">{row.stock ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {items.length > previewRows.length && (
                <p className="text-xs text-muted-foreground p-2">
                  … y {items.length - previewRows.length} filas más
                </p>
              )}
            </div>
          )}

          {result && (
            <div className="rounded-md border p-3 text-sm space-y-2">
              <p className="font-medium">
                {result.dry_run ? "Simulación" : "Resultado"}: {result.created}{" "}
                {result.dry_run ? "crearían" : "creados"}, {result.updated}{" "}
                {result.dry_run ? "actualizarían" : "actualizados"}, {result.skipped} omitidos,{" "}
                {result.errors} errores
              </p>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {result.rows
                  .filter((r) => r.status === "error" || r.warnings.length > 0)
                  .slice(0, 30)
                  .map((r) => (
                    <div key={r.index} className="text-xs text-muted-foreground">
                      #{r.index + 1} {r.name || "?"} [{r.status}]
                      {r.error ? ` — ${r.error}` : ""}
                      {r.warnings.length ? ` — ${r.warnings.join("; ")}` : ""}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cerrar
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={loading || items.length === 0}
            onClick={() => runImport(true)}
          >
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Simular
          </Button>
          <Button type="button" disabled={loading || items.length === 0} onClick={() => runImport(false)}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Importar {items.length > 0 ? `(${items.length})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
