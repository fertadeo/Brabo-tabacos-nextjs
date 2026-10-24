"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useConfirmBeforeClose } from "@/lib/use-confirm-before-close"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  getClientes,
  getClienteById,
  getProducts,
  createRepairOrder,
  addRepairOrderItem,
  type CreateRepairOrderBody,
  type Product,
  type Cliente,
} from "@/lib/api"
import { ClientePicker } from "@/components/cliente-picker"
import { getClienteDisplayName } from "@/lib/cliente-display"
import { pdfClientContactFields } from "@/lib/document-cliente-pdf"
import { generateRepairOrderReceptionPdf } from "@/lib/generate-repair-order-reception-pdf"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Wrench, Loader2, Search, UserPlus, Package, Plus, Trash2, ArrowLeft } from "lucide-react"
import Image from "next/image"
import { getProductImageUrl } from "@/lib/product-image-utils"
import { NewClientModal } from "@/components/new-client-modal"
import { CurrencyFieldInput } from "@/components/currency-field-input"
import { RepairOrderEquipmentFields } from "@/components/repair-order-equipment-fields"
import {
  emptyRepairEquipmentForm,
  buildEquipmentDescriptionString,
  validateRepairEquipmentFields,
  type RepairEquipmentFormValues,
} from "@/lib/repair-order-equipment"
import { PosManualItemCard } from "@/components/pos-manual-item-card"
import {
  pendingItemDisplayName,
  pendingItemToAddBody,
  type RepairOrderPendingItem,
} from "@/lib/repair-order-items"
import { cn } from "@/lib/utils"

interface NewRepairOrderModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (createdId?: number) => void
}

export function NewRepairOrderModal({ isOpen, onClose, onSuccess }: NewRepairOrderModalProps) {
  const [clientSearch, setClientSearch] = useState("")
  const [clients, setClients] = useState<Cliente[]>([])
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null)
  const [newClientModalOpen, setNewClientModalOpen] = useState(false)
  const today = () => new Date().toISOString().slice(0, 10)
  const [equipment, setEquipment] = useState<RepairEquipmentFormValues>(() => emptyRepairEquipmentForm())
  const [formData, setFormData] = useState({
    client_id: 0,
    customer_declared_fault: "",
    diagnosis: "",
    work_description: "",
    reception_date: today(),
    delivery_date_estimated: "",
    labor_amount: 0,
    notes: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Materiales (productos) a utilizar en la reparación
  const [products, setProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [pendingItems, setPendingItems] = useState<RepairOrderPendingItem[]>([])
  const [productSearchQuery, setProductSearchQuery] = useState("")
  const [newItemProductId, setNewItemProductId] = useState<number | "">("")
  const [newItemQuantity, setNewItemQuantity] = useState("1")
  const [newItemUnitPrice, setNewItemUnitPrice] = useState(0)
  const [step, setStep] = useState<1 | 2>(1)
  const pendingItemsTotal = useMemo(
    () => pendingItems.reduce((acc, item) => acc + item.quantity * item.unit_price, 0),
    [pendingItems]
  )

  // Búsqueda de clientes
  useEffect(() => {
    if (!isOpen) return
    if (clientSearch.trim().length < 2) {
      setClients([])
      return
    }
    const t = setTimeout(() => {
      getClientes(1, 20, clientSearch.trim(), "active")
        .then((r) => setClients(r.clients || []))
        .catch(() => setClients([]))
    }, 300)
    return () => clearTimeout(t)
  }, [isOpen, clientSearch])

  // Cargar todos los productos al abrir (paginando la API hasta completar)
  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    setLoadingProducts(true)
    const PAGE_SIZE = 500
    ;(async () => {
      const all: Product[] = []
      try {
        let page = 1
        for (;;) {
          const res = await getProducts(page, PAGE_SIZE)
          const list = Array.isArray(res) ? res : (res as { products: Product[] }).products || []
          if (list.length === 0) break
          all.push(...list)
          const pag =
            !Array.isArray(res) && res && typeof res === "object" && "pagination" in res
              ? (res as { pagination: { totalPages?: number; page?: number } }).pagination
              : null
          const totalPages = Math.max(1, pag?.totalPages ?? 1)
          if (list.length < PAGE_SIZE || page >= totalPages) break
          page += 1
          if (page > 200) break // límite de seguridad
        }
        if (!cancelled) setProducts(all)
      } catch {
        if (!cancelled) setProducts([])
      } finally {
        if (!cancelled) setLoadingProducts(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isOpen])

  const selectedProduct = products.find((p) => p.id === newItemProductId)

  // Filtrar productos por búsqueda (nombre o código); sin tope — se muestran todos los cargados
  const filteredProducts = useMemo(() => {
    const q = productSearchQuery.trim().toLowerCase()
    if (q.length < 1) return products
    return products.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        (p.code && p.code.toLowerCase().includes(q))
    )
  }, [products, productSearchQuery])

  // Al abrir el modal, resetear formulario y búsqueda (fecha de recepción = hoy)
  useEffect(() => {
    if (!isOpen) return
    setEquipment(emptyRepairEquipmentForm())
    setFormData((prev) => ({
      ...prev,
      client_id: 0,
      customer_declared_fault: "",
      diagnosis: "",
      work_description: "",
      reception_date: today(),
      delivery_date_estimated: "",
      labor_amount: 0,
      notes: "",
    }))
    setClientSearch("")
    setClients([])
    setSelectedCliente(null)
    setPendingItems([])
    setProductSearchQuery("")
    setNewItemProductId("")
    setNewItemQuantity("1")
    setNewItemUnitPrice(0)
    setStep(1)
  }, [isOpen])

  const handleNewClientSuccess = (created?: { id: number; name: string }) => {
    setNewClientModalOpen(false)
    if (!created?.id) return
    void getClienteById(created.id)
      .then((cliente) => {
        setFormData((prev) => ({ ...prev, client_id: cliente.id }))
        setSelectedCliente(cliente)
        setClientSearch(getClienteDisplayName(cliente))
        setClients([])
      })
      .catch(() => {
        setFormData((prev) => ({ ...prev, client_id: created.id }))
        setSelectedCliente({
          id: created.id,
          code: "",
          client_type: "minorista",
          sales_channel: "sistema_mf",
          name: created.name,
          email: "",
          phone: "",
          city: "",
          country: "AR",
          is_active: 1,
          created_at: "",
          updated_at: "",
        })
        setClientSearch(created.name)
      })
  }

  const addPendingItem = () => {
    if (!selectedProduct || !newItemQuantity || !newItemUnitPrice) return
    const q = parseInt(newItemQuantity, 10)
    const price = newItemUnitPrice
    if (isNaN(q) || q < 1 || price < 0) return
    setPendingItems((prev) => [
      ...prev,
      {
        kind: "catalog",
        product_id: selectedProduct.id,
        product_name: selectedProduct.name,
        quantity: q,
        unit_price: price,
      },
    ])
    setProductSearchQuery("")
    setNewItemProductId("")
    setNewItemQuantity("1")
    setNewItemUnitPrice(0)
  }

  const selectProductForItem = (p: Product) => {
    setNewItemProductId(p.id)
    setProductSearchQuery(p.name)
    if (!newItemUnitPrice || newItemUnitPrice === 0)
      setNewItemUnitPrice(Number(p.price ?? 0))
  }

  const clearProductSelection = () => {
    setNewItemProductId("")
    setProductSearchQuery("")
    setNewItemUnitPrice(0)
  }

  const addPendingManualItem = (payload: {
    description: string
    quantity: number
    unit_price: number
  }) => {
    setPendingItems((prev) => [
      ...prev,
      {
        kind: "custom",
        description: payload.description.trim(),
        quantity: payload.quantity,
        unit_price: payload.unit_price,
      },
    ])
  }

  const removePendingItem = (index: number) => {
    setPendingItems((prev) => prev.filter((_, i) => i !== index))
  }

  const validate = (): boolean => {
    const err: Record<string, string> = {}
    if (!formData.client_id) err.client_id = "Seleccioná o buscá un cliente. Si no existe, crealo."
    Object.assign(err, validateRepairEquipmentFields(equipment))
    if (!formData.customer_declared_fault.trim()) {
      err.customer_declared_fault = "Indicá la falla que declara el cliente"
    }
    if (!formData.reception_date) err.reception_date = "Fecha de recepción obligatoria"
    if (formData.delivery_date_estimated && formData.reception_date) {
      if (new Date(formData.delivery_date_estimated) < new Date(formData.reception_date)) {
        err.delivery_date_estimated = "La fecha estimada de entrega no puede ser anterior a la de recepción"
      }
    }
    setFieldErrors(err)
    return Object.keys(err).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    setError(null)
    try {
      const body: CreateRepairOrderBody = {
        client_id: formData.client_id,
        equipment_description: buildEquipmentDescriptionString(equipment),
        customer_declared_fault: formData.customer_declared_fault.trim(),
        reception_date: formData.reception_date,
      }
      if (formData.diagnosis.trim()) body.diagnosis = formData.diagnosis.trim()
      if (formData.work_description.trim()) body.work_description = formData.work_description.trim()
      if (formData.delivery_date_estimated.trim()) body.delivery_date_estimated = formData.delivery_date_estimated
      const labor = formData.labor_amount
      if (!Number.isNaN(labor) && labor > 0) body.labor_amount = labor
      if (formData.notes.trim()) body.notes = formData.notes.trim()

      const res = await createRepairOrder(body)
      const order = res.data
      const orderId = order?.id
      if (orderId && pendingItems.length > 0) {
        for (const item of pendingItems) {
          await addRepairOrderItem(orderId, pendingItemToAddBody(item))
        }
      }

      if (order?.repair_number) {
        let clientFields = selectedCliente ? pdfClientContactFields(selectedCliente) : null
        if (!clientFields && formData.client_id) {
          try {
            clientFields = pdfClientContactFields(await getClienteById(formData.client_id))
          } catch {
            clientFields = null
          }
        }
        const clientName =
          clientFields?.clientName ??
          order.client?.name ??
          selectedCliente?.name ??
          "Cliente"
        generateRepairOrderReceptionPdf({
          repair_number: order.repair_number,
          reception_date: String(order.reception_date || formData.reception_date),
          clientName,
          clientPhone: clientFields?.clientPhone,
          clientEmail: clientFields?.clientEmail,
          clientAddressLines: clientFields?.clientAddressLines,
          clientCode: clientFields?.clientCode,
          clientCuit: clientFields?.clientCuit,
          clientTaxCondition: clientFields?.clientTaxCondition,
          equipment_description:
            order.equipment_description || buildEquipmentDescriptionString(equipment),
          customer_declared_fault: formData.customer_declared_fault.trim(),
          diagnosis: formData.diagnosis.trim() || undefined,
          work_description: formData.work_description.trim() || undefined,
          delivery_date_estimated: formData.delivery_date_estimated.trim() || undefined,
          lineItems: pendingItems.map((i) => ({
            product_name: pendingItemDisplayName(i),
            quantity: i.quantity,
            unit_price: i.unit_price,
          })),
          labor_amount: formData.labor_amount,
        })
      }

      onSuccess(orderId)
      onClose()
      setEquipment(emptyRepairEquipmentForm())
      setFormData((prev) => ({
        ...prev,
        client_id: 0,
        customer_declared_fault: "",
        diagnosis: "",
        work_description: "",
        reception_date: "",
        delivery_date_estimated: "",
        labor_amount: 0,
        notes: "",
      }))
      setClientSearch("")
      setClients([])
      setSelectedCliente(null)
      setPendingItems([])
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error al crear la orden"
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) onClose()
  }

  const [handleOpenChange, confirmDialog] = useConfirmBeforeClose((open) => {
    if (!open) handleClose()
  })

  return (
    <>
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          "overflow-y-auto",
          step === 2
            ? "max-w-[min(1200px,calc(100vw-1.5rem))] w-[calc(100vw-1.5rem)] sm:max-w-[min(1200px,calc(100vw-2rem))] max-h-[min(92vh,920px)] gap-3 p-4 sm:p-6"
            : "max-w-2xl max-h-[90vh]"
        )}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            {step === 1 ? "Nueva orden de reparación" : "Paso 2: Materiales a utilizar"}
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? "Registrá la entrada del equipo. El estado inicial será «Consulta recibida»."
              : "Agregá productos del catálogo o ítems manuales (sin stock). El stock de catálogo se descuenta cuando el cliente acepte el presupuesto."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {step === 1 ? (
            <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Cliente *</Label>
              <ClientePicker
                searchValue={clientSearch}
                onSearchChange={(value) => {
                  setClientSearch(value)
                  if (selectedCliente && value.trim() !== getClienteDisplayName(selectedCliente)) {
                    setFormData((prev) => ({ ...prev, client_id: 0 }))
                    setSelectedCliente(null)
                  }
                  if (!value.trim()) {
                    setFormData((prev) => ({ ...prev, client_id: 0 }))
                    setSelectedCliente(null)
                  }
                }}
                results={clients}
                selectedCliente={selectedCliente}
                onSelect={(cliente) => {
                  setFormData((prev) => ({ ...prev, client_id: cliente.id }))
                  setSelectedCliente(cliente)
                  setClientSearch(getClienteDisplayName(cliente))
                  setClients([])
                }}
                onClear={() => {
                  setFormData((prev) => ({ ...prev, client_id: 0 }))
                  setSelectedCliente(null)
                  setClientSearch("")
                  setClients([])
                }}
                placeholder="Buscar por nombre, CUIT, código o dirección…"
                clearLabel="Limpiar"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setNewClientModalOpen(true)}
              >
                <UserPlus className="h-4 w-4" />
                Crear nuevo cliente
              </Button>
              {fieldErrors.client_id && (
                <p className="text-sm text-destructive">{fieldErrors.client_id}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="reception_date">Fecha de recepción *</Label>
              <Input
                id="reception_date"
                type="date"
                value={formData.reception_date}
                onChange={(e) => setFormData((prev) => ({ ...prev, reception_date: e.target.value }))}
                max={today()}
              />
              {fieldErrors.reception_date && (
                <p className="text-sm text-destructive">{fieldErrors.reception_date}</p>
              )}
            </div>
          </div>

          <div className="rounded-lg border p-4 space-y-1">
            <p className="text-sm font-medium">Equipo</p>
            <p className="text-xs text-muted-foreground mb-3">
              Marca/modelo, tipo y número de serie se guardan en la orden para identificar el equipo.
            </p>
            <RepairOrderEquipmentFields
              idPrefix="new_ro"
              value={equipment}
              onChange={setEquipment}
              errors={fieldErrors}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer_declared_fault">Falla declarada por el cliente *</Label>
            <Textarea
              id="customer_declared_fault"
              placeholder="Qué cuenta el cliente que le pasa al equipo…"
              value={formData.customer_declared_fault}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, customer_declared_fault: e.target.value }))
              }
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              No es el diagnóstico técnico: eso va en el campo siguiente, cuando el técnico evalúe el equipo.
            </p>
            {fieldErrors.customer_declared_fault && (
              <p className="text-sm text-destructive">{fieldErrors.customer_declared_fault}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="diagnosis">Diagnóstico técnico (presupuesto)</Label>
            <Textarea
              id="diagnosis"
              placeholder="Evaluación del técnico / presupuesto"
              value={formData.diagnosis}
              onChange={(e) => setFormData((prev) => ({ ...prev, diagnosis: e.target.value }))}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="work_description">Trabajo a realizar</Label>
            <Textarea
              id="work_description"
              placeholder="Detalle del trabajo para el cliente"
              value={formData.work_description}
              onChange={(e) => setFormData((prev) => ({ ...prev, work_description: e.target.value }))}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="delivery_date_estimated">Fecha estimada de entrega</Label>
              <Input
                id="delivery_date_estimated"
                type="date"
                value={formData.delivery_date_estimated}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, delivery_date_estimated: e.target.value }))
                }
                min={formData.reception_date || undefined}
              />
              {fieldErrors.delivery_date_estimated && (
                <p className="text-sm text-destructive">{fieldErrors.delivery_date_estimated}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="labor_amount">Mano de obra ($)</Label>
              <CurrencyFieldInput
                id="labor_amount"
                placeholder="$0,00"
                value={formData.labor_amount}
                onValueChange={(n) =>
                  setFormData((prev) => ({ ...prev, labor_amount: n }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas internas</Label>
            <Textarea
              id="notes"
              placeholder="Notas opcionales"
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              rows={1}
            />
          </div>

          {/* Resumen materiales (Paso 1) */}
          <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                <span className="font-medium">Materiales a utilizar (opcional)</span>
              </div>
              {pendingItems.length > 0 && (
                <span className="text-sm text-muted-foreground">{pendingItems.length} material(es) agregado(s)</span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Podés agregar productos del stock ahora o después de crear la orden.
            </p>
            <Button type="button" variant="outline" onClick={() => setStep(2)} className="w-full sm:w-auto">
              <Package className="h-4 w-4 mr-2" />
              {pendingItems.length > 0 ? "Ver o editar materiales (Paso 2)" : "Agregar materiales (Paso 2)"}
            </Button>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Crear orden
            </Button>
          </DialogFooter>
            </>
          ) : (
            <>
          <div className="rounded-lg border p-3 md:p-4 space-y-4 bg-muted/20">
            <Button
              type="button"
              variant="ghost"
              className="-ml-2"
              onClick={() => setStep(1)}
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Volver al resumen (Paso 1)
            </Button>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:items-start">
              <div className="space-y-3 min-h-0 flex flex-col">
                <div className="space-y-2">
                  <Label className="text-sm">Buscar producto</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      type="text"
                      placeholder={loadingProducts ? "Cargando productos..." : "Buscar por nombre o código"}
                      value={productSearchQuery}
                      onChange={(e) => {
                        setProductSearchQuery(e.target.value)
                        if (!e.target.value.trim()) clearProductSelection()
                        else setNewItemProductId("")
                      }}
                      disabled={loadingProducts}
                      className={`pl-9 ${newItemProductId ? "pr-16" : ""}`}
                    />
                    {!!newItemProductId && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 text-xs"
                        onClick={clearProductSelection}
                      >
                        Limpiar
                      </Button>
                    )}
                  </div>
                </div>

                {!newItemProductId && (
                  <div className="rounded-md border bg-background overflow-hidden">
                    <div className="px-3 py-2 text-xs text-muted-foreground border-b space-y-0.5">
                      {loadingProducts ? (
                        "Cargando productos..."
                      ) : filteredProducts.length > 0 ? (
                        <>
                          <span className="font-medium text-foreground">
                            {filteredProducts.length} producto{filteredProducts.length !== 1 ? "s" : ""}
                          </span>
                          <span className="block">
                            Seleccioná uno o usá la búsqueda para acotar la lista.
                          </span>
                        </>
                      ) : (
                        "Sin resultados para la búsqueda actual"
                      )}
                    </div>
                    {filteredProducts.length > 0 && (
                      <ul className="max-h-[min(58vh,580px)] min-h-[220px] overflow-y-auto divide-y overscroll-contain">
                        {filteredProducts.map((p) => (
                          <li key={p.id}>
                            <button
                              type="button"
                              className="w-full px-3 py-2.5 text-left text-sm hover:bg-muted flex items-center gap-3"
                              onClick={() => selectProductForItem(p)}
                            >
                              <span className="relative flex-shrink-0 block w-11 h-11 rounded overflow-hidden bg-muted">
                                <Image
                                  src={getProductImageUrl(p, { size: 96 })}
                                  alt=""
                                  fill
                                  className="object-cover"
                                  sizes="44px"
                                />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="font-medium block truncate">{p.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {p.code ? `${p.code} · ` : ""}Stock: {p.stock ?? 0}
                                </span>
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {!!newItemProductId && selectedProduct && (
                  <div className="rounded-md border bg-background p-3">
                    <p className="text-xs text-muted-foreground mb-2">Producto seleccionado</p>
                    <div className="flex items-center gap-3">
                      <span className="relative flex-shrink-0 block w-12 h-12 rounded overflow-hidden bg-muted">
                        <Image
                          src={getProductImageUrl(selectedProduct, { size: 96 })}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      </span>
                      <span className="min-w-0">
                        <span className="text-sm font-medium block truncate">{selectedProduct.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {selectedProduct.code ? `${selectedProduct.code} · ` : ""}Stock: {selectedProduct.stock ?? 0}
                        </span>
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <PosManualItemCard
                  onAdd={addPendingManualItem}
                  disabled={loading}
                  addLabel="Agregar ítem manual a la orden"
                  inputIdPrefix="repair-new-manual"
                />

                <div className="rounded-md border bg-background p-3 space-y-3">
                  <p className="text-sm font-medium">Agregar material del catálogo</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Cantidad</Label>
                      <Input
                        type="number"
                        min={1}
                        value={newItemQuantity}
                        onChange={(e) => setNewItemQuantity(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Precio unitario ($)</Label>
                      <CurrencyFieldInput
                        placeholder="$0,00"
                        value={newItemUnitPrice}
                        onValueChange={setNewItemUnitPrice}
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    className="w-full"
                    onClick={addPendingItem}
                    disabled={!selectedProduct || !newItemQuantity || !newItemUnitPrice || loadingProducts}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Agregar material a la orden
                  </Button>
                </div>

                <div className="rounded-md border bg-background">
                  <div className="flex items-center justify-between px-3 py-2 border-b">
                    <p className="text-sm font-medium">Materiales cargados</p>
                    <span className="text-xs text-muted-foreground">
                      {pendingItems.length} item(s)
                    </span>
                  </div>
                  {pendingItems.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      Aun no agregaste materiales.
                    </div>
                  ) : (
                    <div className="max-h-[min(42vh,420px)] overflow-auto overscroll-contain">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-14"></TableHead>
                            <TableHead>Producto</TableHead>
                            <TableHead className="w-20">Cant.</TableHead>
                            <TableHead className="text-right">P. unit.</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="w-10"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pendingItems.map((item, index) => {
                            const prod =
                              item.kind === "catalog"
                                ? products.find((x) => x.id === item.product_id)
                                : undefined
                            return (
                              <TableRow key={`${item.kind}-${index}`}>
                                <TableCell className="w-14">
                                  {prod ? (
                                    <span className="relative inline-block w-10 h-10 rounded overflow-hidden bg-muted">
                                      <Image
                                        src={getProductImageUrl(prod, { size: 80 })}
                                        alt=""
                                        fill
                                        className="object-cover"
                                        sizes="40px"
                                      />
                                    </span>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">Manual</span>
                                  )}
                                </TableCell>
                                <TableCell className="font-medium">
                                  {pendingItemDisplayName(item)}
                                  {item.kind === "custom" && (
                                    <span className="block text-xs text-muted-foreground">Ítem manual</span>
                                  )}
                                </TableCell>
                                <TableCell>{item.quantity}</TableCell>
                                <TableCell className="text-right">
                                  ${item.unit_price.toLocaleString("es-AR")}
                                </TableCell>
                                <TableCell className="text-right">
                                  ${(item.quantity * item.unit_price).toLocaleString("es-AR")}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive"
                                    onClick={() => removePendingItem(index)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                  <div className="flex items-center justify-between border-t px-3 py-2 text-sm">
                    <span className="text-muted-foreground">Total de materiales</span>
                    <span className="font-semibold">
                      ${pendingItemsTotal.toLocaleString("es-AR")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t pt-3">
            <Button type="button" onClick={() => setStep(1)} className="w-full sm:w-auto">
              <ArrowLeft className="h-4 w-4 mr-2" /> Guardar materiales y volver al Paso 1
            </Button>
          </DialogFooter>
            </>
          )}

        </form>
      </DialogContent>
    </Dialog>
    {confirmDialog}
    <NewClientModal
      isOpen={newClientModalOpen}
      onClose={() => setNewClientModalOpen(false)}
      onSuccess={handleNewClientSuccess}
    />
    </>
  )
}
