"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  FileUp,
  Loader2,
  Pencil,
  Plus,
  Upload,
  UserPlus,
} from "lucide-react"
import { toast } from "sonner"
import {
  confirmPurchaseSupplierDocument,
  getPurchases,
  getSuppliers,
  parsePurchaseSupplierDocument,
  rematchPurchaseSupplierDocument,
  type MatchedPurchaseDocumentItem,
  type ParsePurchaseDocumentResult,
  type Purchase,
  type Supplier,
} from "@/lib/api"
import { SupplierModal } from "@/components/supplier-modal"
import { EditPurchaseModal } from "@/components/edit-purchase-modal"

interface ImportSupplierDocumentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface EditableItem extends MatchedPurchaseDocumentItem {
  update_stock: boolean
  update_cost: boolean
  unit_cost_input: string
}

type Step = "upload" | "review" | "summary" | "confirming"

function matchBadge(status: EditableItem["match_status"]) {
  if (status === "matched") return <Badge className="bg-green-600">Vinculado</Badge>
  if (status === "partial") return <Badge variant="secondary">Parcial</Badge>
  return <Badge variant="destructive">Sin match</Badge>
}

function suggestSupplierCode(name: string): string {
  const normalized = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
  return normalized.slice(0, 12) || "PROV"
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(value)
}

export function ImportSupplierDocumentModal({
  isOpen,
  onClose,
  onSuccess,
}: ImportSupplierDocumentModalProps) {
  const [step, setStep] = useState<Step>("upload")
  const [isParsing, setIsParsing] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [parseResult, setParseResult] = useState<ParsePurchaseDocumentResult | null>(null)
  const [items, setItems] = useState<EditableItem[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [supplierId, setSupplierId] = useState<string>("")
  const [purchaseId, setPurchaseId] = useState<string>("")
  const [createPurchase, setCreatePurchase] = useState(true)
  const [applyStock, setApplyStock] = useState(true)
  const [deliveryNoteNumber, setDeliveryNoteNumber] = useState("")
  const [deliveryDate, setDeliveryDate] = useState("")
  const [sourceInvoiceNumber, setSourceInvoiceNumber] = useState("")
  const [insuredValue, setInsuredValue] = useState("")
  const [notes, setNotes] = useState("")
  const [dragOver, setDragOver] = useState(false)
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false)
  const [isEditPurchaseOpen, setIsEditPurchaseOpen] = useState(false)

  const reset = useCallback(() => {
    setStep("upload")
    setParseResult(null)
    setItems([])
    setSupplierId("")
    setPurchaseId("")
    setCreatePurchase(true)
    setApplyStock(true)
    setDeliveryNoteNumber("")
    setDeliveryDate("")
    setSourceInvoiceNumber("")
    setInsuredValue("")
    setNotes("")
    setIsSupplierModalOpen(false)
    setIsEditPurchaseOpen(false)
  }, [])

  const loadSuppliers = useCallback(() => {
    getSuppliers({ all: true })
      .then((res) => {
        if (res.success) setSuppliers(res.data.suppliers)
      })
      .catch(() => toast.error("No se pudieron cargar los proveedores"))
  }, [])

  useEffect(() => {
    if (!isOpen) return
    loadSuppliers()
  }, [isOpen, loadSuppliers])

  const reloadPurchases = useCallback((nextSupplierId: string) => {
    if (!nextSupplierId) {
      setPurchases([])
      return
    }
    getPurchases({ supplier_id: parseInt(nextSupplierId, 10), status: "pending", all: true })
      .then((res) => {
        if (res.success) setPurchases(res.data.purchases ?? [])
      })
      .catch(() => setPurchases([]))
  }, [])

  useEffect(() => {
    reloadPurchases(supplierId)
  }, [supplierId, reloadPurchases])

  const handleClose = () => {
    reset()
    onClose()
  }

  const applyParseResult = (result: ParsePurchaseDocumentResult) => {
    setParseResult(result)
    setDeliveryNoteNumber(result.parsed.delivery_note_number ?? "")
    setDeliveryDate(result.parsed.delivery_date ?? new Date().toISOString().slice(0, 10))
    setSourceInvoiceNumber(result.parsed.source_invoice_number ?? "")
    setInsuredValue(result.parsed.insured_value != null ? String(result.parsed.insured_value) : "")
    if (result.suggested_supplier_id) {
      setSupplierId(String(result.suggested_supplier_id))
    }
    if (result.suggested_purchase_id) {
      setPurchaseId(String(result.suggested_purchase_id))
      setCreatePurchase(false)
    }
    setItems(
      result.items.map((item) => ({
        ...item,
        update_stock: !!item.product_id,
        update_cost: !!item.expected_unit_cost,
        unit_cost_input: item.expected_unit_cost != null ? String(item.expected_unit_cost) : "",
      }))
    )
    setStep("review")
  }

  const processFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Solo se admiten archivos PDF")
      return
    }
    setIsParsing(true)
    try {
      const response = await parsePurchaseSupplierDocument(file)
      if (response.success) {
        applyParseResult(response.data)
        if (response.data.warnings.length) {
          response.data.warnings.forEach((w) => toast.warning(w))
        } else {
          toast.success("Documento analizado correctamente")
        }
      }
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : "Error al analizar el PDF")
    } finally {
      setIsParsing(false)
    }
  }

  const rematchItemsForSupplier = async (nextSupplierId: string) => {
    if (!parseResult?.file_token || !nextSupplierId) return
    try {
      const res = await rematchPurchaseSupplierDocument(
        parseResult.file_token,
        parseInt(nextSupplierId, 10)
      )
      if (res.success) {
        setItems(
          res.data.items.map((item) => ({
            ...item,
            update_stock: !!item.product_id,
            update_cost: !!item.expected_unit_cost,
            unit_cost_input: item.expected_unit_cost != null ? String(item.expected_unit_cost) : "",
          }))
        )
      }
    } catch {
      /* mantener ítems actuales */
    }
  }

  const handleSupplierChange = async (value: string) => {
    setSupplierId(value)
    setPurchaseId("")
    await rematchItemsForSupplier(value)
  }

  const handleSupplierCreated = async (supplier: Supplier) => {
    loadSuppliers()
    setSupplierId(String(supplier.id))
    setPurchaseId("")
    await rematchItemsForSupplier(String(supplier.id))
    toast.success(`Proveedor ${supplier.name} seleccionado`)
  }

  const supplierCandidates = useMemo(() => {
    const fromParse = parseResult?.supplier_candidates ?? []
    if (fromParse.length > 0) return fromParse
    const detected = parseResult?.parsed.supplier_name?.trim()
    if (!detected) return []
    const upper = detected.toUpperCase()
    return suppliers
      .filter(
        (s) =>
          s.name.toUpperCase().includes(upper) ||
          upper.includes(s.name.toUpperCase()) ||
          (s.legal_name && s.legal_name.toUpperCase().includes(upper))
      )
      .slice(0, 8)
      .map((s) => ({ id: s.id, name: s.name }))
  }, [parseResult, suppliers])

  const selectedSupplier = suppliers.find((s) => String(s.id) === supplierId)
  const selectedPurchase = purchases.find((p) => String(p.id) === purchaseId)

  const goToSummary = () => {
    if (!supplierId) {
      toast.error("Seleccione o cree un proveedor antes de continuar")
      return
    }
    if (!deliveryNoteNumber.trim()) {
      toast.error("Ingrese el número de remito")
      return
    }
    if (!deliveryDate) {
      toast.error("Ingrese la fecha del remito")
      return
    }
    if (!createPurchase && !purchaseId) {
      toast.error("Seleccione una orden de compra o habilite crear OC automática")
      return
    }
    setStep("summary")
  }

  const handleConfirm = async () => {
    if (!parseResult?.file_token || !supplierId) return

    setIsConfirming(true)
    setStep("confirming")
    try {
      const response = await confirmPurchaseSupplierDocument({
        file_token: parseResult.file_token,
        supplier_id: parseInt(supplierId, 10),
        purchase_id: purchaseId ? parseInt(purchaseId, 10) : undefined,
        create_purchase_if_missing: createPurchase,
        delivery_note_number: deliveryNoteNumber.trim(),
        delivery_date: deliveryDate,
        source_invoice_number: sourceInvoiceNumber || undefined,
        insured_value: insuredValue ? parseFloat(insuredValue) : undefined,
        notes: notes || undefined,
        apply_stock: applyStock,
        items: items.map((item) => ({
          material_code: item.material_code,
          barcode: item.barcode,
          description: item.description,
          quantity: item.quantity,
          product_id: item.product_id,
          purchase_item_id: item.purchase_item_id,
          unit_cost: item.unit_cost_input ? parseFloat(item.unit_cost_input) : item.expected_unit_cost,
          update_stock: item.update_stock,
          update_cost: item.update_cost,
        })),
      })

      if (response.success) {
        const stockCount = response.data.stock_updates.length
        toast.success(
          `Remito ${response.data.delivery_note_number} registrado` +
            (applyStock ? ` · Stock actualizado en ${stockCount} producto(s)` : "")
        )
        response.data.warnings.forEach((w) => toast.warning(w))
        onSuccess()
        handleClose()
      }
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : "Error al confirmar")
      setStep("summary")
    } finally {
      setIsConfirming(false)
    }
  }

  const matchedCount = items.filter((i) => i.match_status === "matched").length
  const unmatchedCount = items.filter((i) => i.match_status === "unmatched").length
  const stockUpdatesCount = items.filter((i) => i.update_stock && i.product_id).length
  const costUpdatesCount = items.filter((i) => i.update_cost).length

  const detectedSupplierInitial = parseResult?.parsed.supplier_name
    ? {
        code: suggestSupplierCode(parseResult.parsed.supplier_name),
        name: parseResult.parsed.supplier_name,
        legal_name: parseResult.parsed.supplier_name,
        tax_id: parseResult.parsed.supplier_tax_id ?? "",
        id_type: parseResult.parsed.supplier_tax_id ? ("CUIT" as const) : undefined,
      }
    : undefined

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileUp className="h-5 w-5" />
              Importar documento del proveedor
            </DialogTitle>
            <DialogDescription>
              Suba el remito o factura PDF tal como lo envía el proveedor. Revise proveedor, ítems y
              confirme en el resumen final.
            </DialogDescription>
          </DialogHeader>

          {step === "upload" && (
            <div
              className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors ${
                dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/30"
              }`}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOver(false)
                const file = e.dataTransfer.files?.[0]
                if (file) void processFile(file)
              }}
            >
              {isParsing ? (
                <div className="flex flex-col items-center gap-3 py-6">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p>Analizando documento…</p>
                </div>
              ) : (
                <>
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="font-medium mb-1">Arrastre el PDF del proveedor aquí</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Compatible con remitos Invid/Jukebox y formatos similares
                  </p>
                  <Label htmlFor="supplier-pdf-upload" className="cursor-pointer">
                    <Button asChild variant="outline">
                      <span>Seleccionar archivo</span>
                    </Button>
                    <input
                      id="supplier-pdf-upload"
                      type="file"
                      accept="application/pdf,.pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) void processFile(file)
                      }}
                    />
                  </Label>
                </>
              )}
            </div>
          )}

          {step !== "upload" && parseResult && (
            <div className="space-y-4">
              {parseResult.duplicate_delivery_note && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" />
                  <span>Este número de remito ya existe en el sistema. Verifique antes de confirmar.</span>
                </div>
              )}

              {step === "summary" ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Resumen para revisión</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <p className="text-muted-foreground">Archivo</p>
                        <p className="font-medium">{parseResult.original_filename}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Proveedor</p>
                        <p className="font-medium">
                          {selectedSupplier?.name ?? "—"}
                          {parseResult.parsed.supplier_name &&
                          selectedSupplier?.name !== parseResult.parsed.supplier_name ? (
                            <span className="block text-xs text-muted-foreground">
                              Detectado en PDF: {parseResult.parsed.supplier_name}
                            </span>
                          ) : null}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Remito</p>
                        <p className="font-medium">
                          {deliveryNoteNumber} · {deliveryDate}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Orden de compra</p>
                        <p className="font-medium">
                          {createPurchase && !purchaseId
                            ? "Se creará automáticamente"
                            : selectedPurchase
                              ? `${selectedPurchase.purchase_number} (${selectedPurchase.status})`
                              : "—"}
                        </p>
                      </div>
                      {sourceInvoiceNumber ? (
                        <div>
                          <p className="text-muted-foreground">Factura origen</p>
                          <p className="font-medium">{sourceInvoiceNumber}</p>
                        </div>
                      ) : null}
                      {insuredValue ? (
                        <div>
                          <p className="text-muted-foreground">Valor asegurado</p>
                          <p className="font-medium">{formatCurrency(parseFloat(insuredValue))}</p>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{items.length} ítems</Badge>
                      <Badge className="bg-green-600">{matchedCount} vinculados</Badge>
                      {unmatchedCount > 0 ? (
                        <Badge variant="destructive">{unmatchedCount} sin match</Badge>
                      ) : null}
                      {applyStock ? (
                        <Badge variant="secondary">{stockUpdatesCount} actualizaciones de stock</Badge>
                      ) : (
                        <Badge variant="outline">Sin actualizar stock</Badge>
                      )}
                      {costUpdatesCount > 0 ? (
                        <Badge variant="secondary">{costUpdatesCount} actualizaciones de costo</Badge>
                      ) : null}
                    </div>

                    {notes ? (
                      <div>
                        <p className="text-muted-foreground">Notas</p>
                        <p>{notes}</p>
                      </div>
                    ) : null}

                    <div className="rounded-lg border overflow-x-auto max-h-64">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Cant.</TableHead>
                            <TableHead>Descripción</TableHead>
                            <TableHead>Producto ERP</TableHead>
                            <TableHead>Stock</TableHead>
                            <TableHead>Estado</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map((item, idx) => (
                            <TableRow key={`${item.material_code}-${idx}`}>
                              <TableCell>{item.quantity}</TableCell>
                              <TableCell className="max-w-[220px] truncate">{item.description}</TableCell>
                              <TableCell>{item.product_name ?? "Sin vincular"}</TableCell>
                              <TableCell>{item.update_stock && applyStock ? "Sí" : "No"}</TableCell>
                              <TableCell>{matchBadge(item.match_status)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Resumen</CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm space-y-2">
                        <p>
                          <span className="text-muted-foreground">Archivo:</span>{" "}
                          {parseResult.original_filename}
                        </p>
                        <div>
                          <p>
                            <span className="text-muted-foreground">Proveedor detectado:</span>{" "}
                            <span className="font-medium">
                              {parseResult.parsed.supplier_name ?? "—"}
                            </span>
                          </p>
                          {parseResult.parsed.supplier_tax_id ? (
                            <p className="text-xs text-muted-foreground">
                              CUIT: {parseResult.parsed.supplier_tax_id}
                            </p>
                          ) : null}
                        </div>
                        <p>
                          <span className="text-muted-foreground">Ítems:</span> {items.length} ·{" "}
                          <span className="text-green-600">{matchedCount} vinculados</span>
                          {unmatchedCount > 0 && (
                            <span className="text-red-600"> · {unmatchedCount} sin match</span>
                          )}
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="md:col-span-2">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          Asignar proveedor
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {supplierCandidates.length > 0 ? (
                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground">
                              Coincidencias en la base de datos:
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {supplierCandidates.map((candidate) => (
                                <Button
                                  key={candidate.id}
                                  type="button"
                                  size="sm"
                                  variant={supplierId === String(candidate.id) ? "default" : "outline"}
                                  onClick={() => void handleSupplierChange(String(candidate.id))}
                                >
                                  {candidate.name}
                                </Button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            No se encontraron coincidencias automáticas. Podés crear el proveedor o
                            buscarlo manualmente.
                          </p>
                        )}

                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => setIsSupplierModalOpen(true)}
                          >
                            <UserPlus className="h-4 w-4 mr-2" />
                            Agregar proveedor nuevo
                          </Button>
                        </div>

                        <div className="space-y-1">
                          <Label>O seleccionar manualmente</Label>
                          <Select value={supplierId} onValueChange={(v) => void handleSupplierChange(v)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar proveedor" />
                            </SelectTrigger>
                            <SelectContent>
                              {suppliers.map((s) => (
                                <SelectItem key={s.id} value={String(s.id)}>
                                  {s.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Datos del remito</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-1">
                        <Label>N° remito</Label>
                        <Input
                          value={deliveryNoteNumber}
                          onChange={(e) => setDeliveryNoteNumber(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Fecha</Label>
                        <Input
                          type="date"
                          value={deliveryDate}
                          onChange={(e) => setDeliveryDate(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Factura origen</Label>
                        <Input
                          value={sourceInvoiceNumber}
                          onChange={(e) => setSourceInvoiceNumber(e.target.value)}
                          placeholder="0004-00228449"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Valor asegurado</Label>
                        <Input
                          type="number"
                          value={insuredValue}
                          onChange={(e) => setInsuredValue(e.target.value)}
                          placeholder="599555.71"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Orden de compra</Label>
                      <Select
                        value={purchaseId || "none"}
                        onValueChange={(v) => setPurchaseId(v === "none" ? "" : v)}
                        disabled={createPurchase}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Opcional si crea OC automática" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin OC previa</SelectItem>
                          {purchases.map((p) => (
                            <SelectItem key={p.id} value={String(p.id)}>
                              {p.purchase_number} · {p.status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-wrap items-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!purchaseId}
                        onClick={() => setIsEditPurchaseOpen(true)}
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Editar orden
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-6 rounded-lg border p-4">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={createPurchase}
                        onCheckedChange={(v) => setCreatePurchase(!!v)}
                      />
                      Crear OC automática si no hay una seleccionada
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={applyStock} onCheckedChange={(v) => setApplyStock(!!v)} />
                      Actualizar stock al confirmar
                    </label>
                  </div>

                  <div className="rounded-lg border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cant.</TableHead>
                          <TableHead>Descripción</TableHead>
                          <TableHead>Cód. material</TableHead>
                          <TableHead>Producto ERP</TableHead>
                          <TableHead>Costo OC</TableHead>
                          <TableHead>Costo nuevo</TableHead>
                          <TableHead>Stock</TableHead>
                          <TableHead>Estado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item, idx) => (
                          <TableRow key={`${item.material_code}-${idx}`}>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell className="max-w-[220px]">
                              <p className="truncate text-sm" title={item.description}>
                                {item.description}
                              </p>
                              {item.barcode && (
                                <p className="text-xs text-muted-foreground">EAN: {item.barcode}</p>
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-xs">{item.material_code}</TableCell>
                            <TableCell>
                              {item.product_name ? (
                                <div>
                                  <p className="text-sm font-medium">{item.product_name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {item.product_code} · Stock: {item.current_stock ?? "—"}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">Sin vincular</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {item.expected_unit_cost != null
                                ? formatCurrency(item.expected_unit_cost)
                                : "—"}
                              {item.pending_quantity != null && (
                                <p className="text-xs text-muted-foreground">
                                  Pend: {item.pending_quantity}
                                </p>
                              )}
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                className="h-8 w-24"
                                value={item.unit_cost_input}
                                onChange={(e) => {
                                  const next = [...items]
                                  next[idx] = { ...next[idx], unit_cost_input: e.target.value }
                                  setItems(next)
                                }}
                              />
                              <label className="flex items-center gap-1 mt-1 text-xs">
                                <Checkbox
                                  checked={item.update_cost}
                                  onCheckedChange={(v) => {
                                    const next = [...items]
                                    next[idx] = { ...next[idx], update_cost: !!v }
                                    setItems(next)
                                  }}
                                />
                                Actualizar
                              </label>
                            </TableCell>
                            <TableCell>
                              <Checkbox
                                checked={item.update_stock}
                                disabled={!item.product_id || !applyStock}
                                onCheckedChange={(v) => {
                                  const next = [...items]
                                  next[idx] = { ...next[idx], update_stock: !!v }
                                  setItems(next)
                                }}
                              />
                            </TableCell>
                            <TableCell>{matchBadge(item.match_status)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="space-y-2">
                    <Label>Notas</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Observaciones sobre la recepción, diferencias, transporte…"
                      rows={2}
                    />
                  </div>

                  {parseResult.parsed.transport_company && (
                    <p className="text-sm text-muted-foreground">
                      Transporte detectado: {parseResult.parsed.transport_company}
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleClose} disabled={isConfirming}>
              Cancelar
            </Button>
            {step === "review" && (
              <>
                <Button variant="outline" onClick={() => setStep("upload")} disabled={isConfirming}>
                  Cambiar archivo
                </Button>
                <Button onClick={goToSummary} disabled={isConfirming}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Revisar resumen
                </Button>
              </>
            )}
            {step === "summary" && (
              <>
                <Button variant="outline" onClick={() => setStep("review")} disabled={isConfirming}>
                  Volver a editar
                </Button>
                <Button onClick={() => void handleConfirm()} disabled={isConfirming}>
                  {isConfirming ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Confirmando…
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Confirmar recepción
                    </>
                  )}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SupplierModal
        isOpen={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
        onSuccess={() => {}}
        mode="create"
        initialData={detectedSupplierInitial}
        onCreated={(supplier) => {
          setIsSupplierModalOpen(false)
          void handleSupplierCreated(supplier)
        }}
      />

      <EditPurchaseModal
        isOpen={isEditPurchaseOpen}
        purchaseId={purchaseId ? parseInt(purchaseId, 10) : null}
        onClose={() => setIsEditPurchaseOpen(false)}
        onSuccess={() => {
          reloadPurchases(supplierId)
          setIsEditPurchaseOpen(false)
        }}
        onDeleted={() => {
          setPurchaseId("")
          reloadPurchases(supplierId)
          setIsEditPurchaseOpen(false)
        }}
      />
    </>
  )
}
