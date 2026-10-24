"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { AlertTriangle, Loader2, UploadCloud } from "lucide-react"
import {
  importWooCommerceOrphans,
  type Category,
  type WooCommerceOrphansImportData,
} from "@/lib/api"
import { useToast } from "@/contexts/ToastContext"

const CATEGORY_DEFAULT = "__server_default__"

interface WooCommerceOrphansImportDialogProps {
  categories: Category[]
  disabled?: boolean
  onImportCompleted?: () => void
  /** Modo controlado: permite abrir el diálogo desde el padre (p. ej. tras vincular con WooCommerce). */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function WooCommerceOrphansImportDialog({
  categories,
  disabled = false,
  onImportCompleted,
  open: controlledOpen,
  onOpenChange,
}: WooCommerceOrphansImportDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = (next: boolean) => {
    onOpenChange?.(next)
    if (!isControlled) setInternalOpen(next)
  }
  const [categoryChoice, setCategoryChoice] = useState<string>(CATEGORY_DEFAULT)
  const [simulationOnly, setSimulationOnly] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<WooCommerceOrphansImportData | null>(null)
  const { showToast } = useToast()

  const categoryIdNum =
    categoryChoice === CATEGORY_DEFAULT ? undefined : parseInt(categoryChoice, 10)

  const runImport = async (dryRun: boolean) => {
    setLoading(true)
    setError(null)
    try {
      const res = await importWooCommerceOrphans({
        dryRun,
        categoryId: categoryIdNum,
      })
      setLastResult(res.data)
      showToast({
        type: res.data.errors > 0 ? "error" : "success",
        message: res.message,
      })
      if (!dryRun) {
        onImportCompleted?.()
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al ejecutar la importación"
      setError(msg)
      showToast({ type: "error", message: msg })
    } finally {
      setLoading(false)
    }
  }

  const handleSimulate = () => runImport(true)

  const handleRealImport = () => {
    if (
      !window.confirm(
        "Se crearán productos inactivos en el ERP según el resultado de la migración. ¿Continuar con la importación real?"
      )
    ) {
      return
    }
    runImport(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" disabled={disabled} className="gap-2">
          <UploadCloud className="h-4 w-4" />
          Migración desde WooCommerce
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Migración desde WooCommerce</DialogTitle>
          <DialogDescription>
            Importa productos huérfanos (presentes en WooCommerce y aún no dados de alta en el ERP),
            incluidos los que no tienen SKU en la tienda: el backend debe generar código en el ERP y
            enlazar <code className="text-xs">woocommerce_id</code>. Los nuevos productos se crean
            inactivos en la categoría elegida. Primero ejecutá una simulación para revisar los números.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="orphan-category">Categoría destino</Label>
            <Select value={categoryChoice} onValueChange={setCategoryChoice}>
              <SelectTrigger id="orphan-category">
                <SelectValue placeholder="Elegí categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={CATEGORY_DEFAULT}>
                  Predeterminada del servidor (si está configurada)
                </SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Si no elegís categoría, el backend debe tener{" "}
              <code className="rounded bg-muted px-1">ERP_ORPHAN_IMPORT_CATEGORY_ID</code> o
              devolverá error 400.
            </p>
          </div>

          <div className="flex items-start gap-3 rounded-md border border-border p-3">
            <Checkbox
              id="simulation-only"
              checked={simulationOnly}
              onCheckedChange={(v) => setSimulationOnly(v === true)}
              className="mt-0.5"
            />
            <div className="space-y-1">
              <Label htmlFor="simulation-only" className="cursor-pointer font-medium">
                Solo simulación (dry run)
              </Label>
              <p className="text-xs text-muted-foreground">
                Recomendado: activado mientras revisás el resumen. Desactivá para habilitar la
                importación real.
              </p>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {lastResult && (
            <div className="space-y-3 rounded-md border border-muted bg-muted/30 p-4 text-sm">
              <p className="font-medium text-foreground">
                Último resultado {lastResult.dry_run ? "(simulación)" : "(importación real)"}
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <Stat label="Creados" value={lastResult.created} />
                <Stat label="Omitidos (ya en ERP)" value={lastResult.skipped} />
                <Stat label="Con código generado" value={lastResult.imported_with_generated_code} />
                <Stat label="Errores" value={lastResult.errors} />
                <Stat label="Padres WC revisados" value={lastResult.scanned_wc_products} />
                {lastResult.category_id != null && (
                  <Stat label="Categoría ID" value={lastResult.category_id} />
                )}
                {lastResult.scanned_without_wc_sku != null && lastResult.scanned_without_wc_sku > 0 && (
                  <Stat label="Huérfanos sin SKU en WC (escaneo)" value={lastResult.scanned_without_wc_sku} />
                )}
                {lastResult.created_without_wc_sku != null && lastResult.created_without_wc_sku > 0 && (
                  <Stat label="Creados sin SKU en WC" value={lastResult.created_without_wc_sku} />
                )}
              </div>
              {lastResult.created_codes.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Códigos afectados</p>
                  <div className="max-h-28 overflow-y-auto rounded border bg-background p-2 font-mono text-xs">
                    {lastResult.created_codes.join(", ")}
                  </div>
                </div>
              )}
              {lastResult.error_details.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Detalle de errores</p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-24">Código</TableHead>
                        <TableHead>Mensaje</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lastResult.error_details.map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono text-xs">{row.code ?? "—"}</TableCell>
                          <TableCell className="text-xs">{row.message ?? "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cerrar
          </Button>
          <Button type="button" variant="secondary" onClick={handleSimulate} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Ejecutar simulación
          </Button>
          <Button
            type="button"
            onClick={handleRealImport}
            disabled={loading || simulationOnly}
            title={
              simulationOnly
                ? "Desactivá «Solo simulación» para importar de verdad"
                : "Importar productos en el ERP"
            }
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Importar de verdad
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-border bg-background px-2 py-1.5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value.toLocaleString("es-AR")}</p>
    </div>
  )
}
