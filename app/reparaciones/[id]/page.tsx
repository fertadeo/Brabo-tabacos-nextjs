"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { ERPLayout } from "@/components/erp-layout"
import { Protected } from "@/components/protected"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  getRepairOrder,
  getClienteById,
  getClientes,
  getProductById,
  updateRepairOrder,
  sendRepairOrderBudget,
  acceptRepairOrder,
  cancelRepairOrder,
  updateRepairOrderStatus,
  getRepairOrderPayments,
  parseRepairOrderPaymentsPayload,
  deleteRepairOrderItem,
  REPAIR_ORDER_STATUS_LABELS,
  type RepairOrder,
  type RepairOrderItem,
  type RepairOrderStatus,
  type RepairOrderPayment,
  type Cliente,
} from "@/lib/api"
import { ClientePicker } from "@/components/cliente-picker"
import { SaleClienteSection } from "@/components/sale-cliente-section"
import { getClienteDisplayName } from "@/lib/cliente-display"
import { pdfClientContactFields } from "@/lib/document-cliente-pdf"
import { RepairOrderAddItemModal } from "@/components/repair-order-add-item-modal"
import { RepairOrderEditItemModal } from "@/components/repair-order-edit-item-modal"
import {
  getRepairOrderItemDisplayName,
  isRepairOrderCustomItem,
  repairOrderItemsToPdfLines,
} from "@/lib/repair-order-items"
import { RepairOrderPaymentModal } from "@/components/repair-order-payment-modal"
import { RepairOrderAcceptanceDocumentModal } from "@/components/repair-order-acceptance-document-modal"
import {
  RepairOrderEquipmentFields,
  RepairOrderEquipmentReadOnly,
} from "@/components/repair-order-equipment-fields"
import { CurrencyFieldInput } from "@/components/currency-field-input"
import {
  emptyRepairEquipmentForm,
  buildEquipmentDescriptionString,
  validateRepairEquipmentFields,
  parseEquipmentDescriptionString,
  type RepairEquipmentFormValues,
} from "@/lib/repair-order-equipment"
import { generateRepairOrderReceptionPdf } from "@/lib/generate-repair-order-reception-pdf"
import {
  ArrowLeft,
  Wrench,
  Send,
  CheckCircle,
  XCircle,
  Loader2,
  Package,
  DollarSign,
  FileText,
  FileDown,
  Edit2,
  Trash2,
  Plus,
  Search,
} from "lucide-react"
import { toast } from "sonner"

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—"
  try {
    return new Date(dateStr).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  } catch {
    return dateStr
  }
}

function formatMoney(value: string | number) {
  const n = typeof value === "string" ? parseFloat(value) : value
  if (Number.isNaN(n)) return "—"
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n)
}

function getStatusVariant(s: RepairOrderStatus): "default" | "secondary" | "destructive" | "outline" {
  switch (s) {
    case "entregado":
      return "default"
    case "cancelado":
      return "destructive"
    case "consulta_recibida":
    case "presupuestado":
      return "secondary"
    default:
      return "outline"
  }
}

function getStatusClassName(status: RepairOrderStatus): string {
  switch (status) {
    case "consulta_recibida":
      return "bg-sky-100 text-sky-800 border-sky-200"
    case "presupuestado":
      return "bg-amber-100 text-amber-800 border-amber-200"
    case "aceptado":
      return "bg-indigo-100 text-indigo-800 border-indigo-200"
    case "en_proceso_reparacion":
      return "bg-violet-100 text-violet-800 border-violet-200"
    case "listo_entrega":
      return "bg-emerald-100 text-emerald-800 border-emerald-200"
    case "entregado":
      return "bg-green-100 text-green-800 border-green-200"
    case "cancelado":
      return "bg-red-100 text-red-800 border-red-200"
    default:
      return ""
  }
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
}

/** Completa cliente e ítems cuando la API solo envía IDs. */
async function enrichRepairOrderForDisplay(data: RepairOrder): Promise<RepairOrder> {
  let next: RepairOrder = { ...data }
  try {
    if (next.client_id && !next.client?.name) {
      const c = await getClienteById(next.client_id)
      next = {
        ...next,
        client: {
          id: c.id,
          name: c.name,
          phone: c.phone,
          email: c.email,
          address: c.address,
          city: c.city,
          code: c.code,
        },
      }
    }
  } catch {
    /* mantener datos sin nombre */
  }
  if (!next.items?.length) return next
  const needProduct = next.items.some(
    (i) => i.product_id != null && i.product_id > 0 && !i.product?.name && !i.product_name?.trim()
  )
  if (!needProduct) return next
  const pids = [
    ...new Set(
      next.items
        .filter((i) => i.product_id != null && i.product_id > 0 && !i.product?.name)
        .map((i) => i.product_id as number)
    ),
  ]
  const productMap: Record<number, NonNullable<RepairOrderItem["product"]>> = {}
  await Promise.all(
    pids.map(async (pid) => {
      try {
        const p = await getProductById(pid)
        productMap[pid] = {
          id: p.id,
          name: p.name,
          code: p.code,
          stock: p.stock,
        }
      } catch {
        /* ignorar */
      }
    })
  )
  return {
    ...next,
    items: next.items.map((item) => {
      if (item.product?.name || isRepairOrderCustomItem(item)) return item
      const pid = item.product_id
      if (pid == null) return item
      const p = productMap[pid]
      return p ? { ...item, product: p } : item
    }),
  }
}

function canManageRepairItems(status: RepairOrderStatus): boolean {
  return status === "consulta_recibida" || status === "presupuestado"
}

function canModifyRepairItem(status: RepairOrderStatus, item: RepairOrderItem): boolean {
  if (status === "entregado" || status === "cancelado") return false
  if (canManageRepairItems(status)) return true
  return !item.stock_deducted
}

export default function RepairOrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = params?.id as string | undefined
  const [order, setOrder] = useState<RepairOrder | null>(null)
  const [payments, setPayments] = useState<RepairOrderPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [addItemOpen, setAddItemOpen] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [acceptanceDocOpen, setAcceptanceDocOpen] = useState(false)
  const [acceptDialogOpen, setAcceptDialogOpen] = useState(false)
  const [daysToClaim, setDaysToClaim] = useState("30")
  const [accepting, setAccepting] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [equipmentFields, setEquipmentFields] = useState<RepairEquipmentFormValues>(() =>
    emptyRepairEquipmentForm()
  )
  const [editForm, setEditForm] = useState({
    customer_declared_fault: "",
    diagnosis: "",
    work_description: "",
    reception_date: "",
    delivery_date_estimated: "",
    labor_amount: 0,
    notes: "",
  })
  const [saving, setSaving] = useState(false)
  const [editClientId, setEditClientId] = useState<number | null>(null)
  const [editSelectedCliente, setEditSelectedCliente] = useState<Cliente | null>(null)
  const [editClientSearch, setEditClientSearch] = useState("")
  const [editClients, setEditClients] = useState<Cliente[]>([])
  const [editingItem, setEditingItem] = useState<RepairOrderItem | null>(null)

  const loadOrder = async () => {
    if (!id) return
    setLoading(true)
    try {
      const res = await getRepairOrder(id)
      const data = res.data as RepairOrder
      const enriched = await enrichRepairOrderForDisplay(data)
      setOrder(enriched)
      const eq = parseEquipmentDescriptionString(enriched.equipment_description || "")
      setEquipmentFields({
        brandModel: eq.brandModel,
        equipmentType: eq.equipmentType,
        equipmentTypeOther: eq.equipmentTypeOther,
        serialNumber: eq.serialNumber,
      })
      setEditForm({
        customer_declared_fault: enriched.customer_declared_fault || "",
        diagnosis: enriched.diagnosis || "",
        work_description: enriched.work_description || "",
        reception_date: enriched.reception_date?.slice(0, 10) || "",
        delivery_date_estimated: enriched.delivery_date_estimated?.slice(0, 10) || "",
        labor_amount: parseFloat(String(enriched.labor_amount || "0")) || 0,
        notes: enriched.notes || "",
      })
      setEditClientId(enriched.client_id)
      setEditSelectedCliente(null)
      setEditClientSearch(enriched.client?.name ?? "")
      setEditClients([])
      if (enriched.client_id) {
        void getClienteById(enriched.client_id)
          .then((cliente) => {
            setEditSelectedCliente(cliente)
            setEditClientSearch(getClienteDisplayName(cliente))
          })
          .catch(() => setEditSelectedCliente(null))
      }
    } catch (e: unknown) {
      const err = e as { status?: number }
      if (err?.status === 404) {
        toast.error("Orden no encontrada")
        router.push("/reparaciones")
        return
      }
      toast.error("Error al cargar la orden")
    } finally {
      setLoading(false)
    }
  }

  const loadPayments = async () => {
    if (!id) return
    try {
      const res = await getRepairOrderPayments(id)
      setPayments(parseRepairOrderPaymentsPayload(res.data))
    } catch {
      setPayments([])
    }
  }

  useEffect(() => {
    loadOrder()
  }, [id])

  useEffect(() => {
    if (order) loadPayments()
  }, [order?.id])

  useEffect(() => {
    if (!editMode || editClientSearch.trim().length < 2) {
      setEditClients([])
      return
    }
    const t = setTimeout(() => {
      getClientes(1, 20, editClientSearch.trim(), "active")
        .then((r) => setEditClients(r.clients || []))
        .catch(() => setEditClients([]))
    }, 300)
    return () => clearTimeout(t)
  }, [editMode, editClientSearch])

  const refreshOrder = () => {
    loadOrder()
    loadPayments()
  }

  const canEdit =
    order &&
    order.status !== "entregado" &&
    order.status !== "cancelado"

  useEffect(() => {
    if (
      searchParams.get("edit") === "1" &&
      order &&
      order.status !== "entregado" &&
      order.status !== "cancelado"
    ) {
      setEditMode(true)
    }
  }, [searchParams, order?.id, order?.status])

  const handleSendBudget = async () => {
    if (!id || !order) return
    try {
      await sendRepairOrderBudget(id)
      toast.success("Presupuesto enviado. Estado: Presupuestado.")
      refreshOrder()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al enviar presupuesto")
    }
  }

  const handleAccept = async () => {
    if (!id) return
    setAccepting(true)
    try {
      const days = parseInt(daysToClaim, 10)
      await acceptRepairOrder(id, Number.isNaN(days) ? undefined : { days_to_claim: days })
      toast.success("Orden aceptada. Stock descontado.")
      setAcceptDialogOpen(false)
      refreshOrder()
      setAcceptanceDocOpen(true)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al aceptar presupuesto")
    } finally {
      setAccepting(false)
    }
  }

  const handleCancel = async () => {
    if (!id || !confirm("¿Cancelar esta orden? Se devolverá el stock si ya fue descontado.")) return
    try {
      await cancelRepairOrder(id)
      toast.success("Orden cancelada.")
      refreshOrder()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al cancelar")
    }
  }

  const handleStatusChange = async (newStatus: "en_proceso_reparacion" | "listo_entrega" | "entregado") => {
    if (!id) return
    try {
      await updateRepairOrderStatus(id, newStatus)
      toast.success("Estado actualizado.")
      refreshOrder()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al cambiar estado")
    }
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !order) return
    const eqErr = validateRepairEquipmentFields(equipmentFields)
    const eqMsg = Object.values(eqErr)[0]
    if (eqMsg) {
      toast.error(eqMsg)
      return
    }
    if (!editForm.customer_declared_fault.trim()) {
      toast.error("Indicá la falla declarada por el cliente")
      return
    }
    if (!editClientId) {
      toast.error("Seleccioná un cliente")
      return
    }
    setSaving(true)
    try {
      const labor = editForm.labor_amount
      await updateRepairOrder(id, {
        client_id: editClientId,
        equipment_description: buildEquipmentDescriptionString(equipmentFields),
        customer_declared_fault: editForm.customer_declared_fault.trim(),
        diagnosis: editForm.diagnosis || undefined,
        work_description: editForm.work_description || undefined,
        reception_date: editForm.reception_date,
        delivery_date_estimated: editForm.delivery_date_estimated || undefined,
        labor_amount: Number.isNaN(labor) ? undefined : labor,
        notes: editForm.notes || undefined,
      })
      toast.success("Orden actualizada.")
      setEditMode(false)
      refreshOrder()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  const handleDownloadReceptionPdf = async () => {
    if (!order) return
    let clientFields = pdfClientContactFields(order)
    if (!clientFields.clientAddressLines?.length && order.client_id) {
      try {
        clientFields = pdfClientContactFields(await getClienteById(order.client_id))
      } catch {
        /* usar snapshot de la orden */
      }
    }
    generateRepairOrderReceptionPdf({
      repair_number: order.repair_number,
      reception_date: order.reception_date,
      clientName: clientFields.clientName,
      clientPhone: clientFields.clientPhone,
      clientEmail: clientFields.clientEmail,
      clientAddressLines: clientFields.clientAddressLines,
      clientCode: clientFields.clientCode,
      clientCuit: clientFields.clientCuit,
      clientTaxCondition: clientFields.clientTaxCondition,
      equipment_description: order.equipment_description || "",
      customer_declared_fault: order.customer_declared_fault?.trim() || "—",
      diagnosis: order.diagnosis?.trim() || undefined,
      work_description: order.work_description?.trim() || undefined,
      delivery_date_estimated: order.delivery_date_estimated?.slice(0, 10) || undefined,
      lineItems: repairOrderItemsToPdfLines(order.items ?? []),
      labor_amount: parseFloat(String(order.labor_amount || "0")) || 0,
    })
  }

  const handleDeleteItem = async (itemId: number) => {
    if (!id || !confirm("¿Quitar este ítem? Si ya se descontó stock, se devolverá.")) return
    try {
      await deleteRepairOrderItem(id, itemId)
      toast.success("Ítem eliminado.")
      refreshOrder()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al eliminar ítem")
    }
  }

  if (!id) return null
  const balance = order
    ? parseFloat(order.total_amount || "0") - parseFloat(order.amount_paid || "0")
    : 0

  if (loading && !order) {
    return (
      <Protected requiredRoles={["gerencia", "ventas", "admin"]}>
        <ERPLayout activeItem="reparaciones">
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </ERPLayout>
      </Protected>
    )
  }

  if (!order) {
    return (
      <Protected requiredRoles={["gerencia", "ventas", "admin"]}>
        <ERPLayout activeItem="reparaciones">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Orden no encontrada.</p>
            <Button variant="link" asChild>
              <Link href="/reparaciones">Volver al listado</Link>
            </Button>
          </div>
        </ERPLayout>
      </Protected>
    )
  }

  const status = order.status
  const items = order.items ?? []
  const nextActionLabel: Partial<Record<RepairOrderStatus, string>> = {
    consulta_recibida: "Enviar presupuesto",
    presupuestado: "Aceptar presupuesto",
    aceptado: "Pasar a en reparación",
    en_proceso_reparacion: "Marcar como listo para entrega",
    listo_entrega: "Marcar como entregado",
  }

  return (
    <Protected requiredRoles={["gerencia", "ventas", "admin"]}>
      <ERPLayout activeItem="reparaciones">
        <div className="space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild>
                <Link href="/reparaciones">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl font-bold">{order.repair_number}</h1>
                <p className="text-muted-foreground">
                  {order.client?.name ?? `Cliente #${order.client_id}`}
                </p>
              </div>
              <Badge variant={getStatusVariant(status)} className={getStatusClassName(status)}>
                {REPAIR_ORDER_STATUS_LABELS[status] ?? status}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {canEdit && !editMode && (
                <Button variant="default" size="sm" onClick={() => setEditMode(true)}>
                  <Edit2 className="h-4 w-4 mr-1" /> Editar orden
                </Button>
              )}
              {canEdit && editMode && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (order) {
                      const eq = parseEquipmentDescriptionString(order.equipment_description || "")
                      setEquipmentFields({
                        brandModel: eq.brandModel,
                        equipmentType: eq.equipmentType,
                        equipmentTypeOther: eq.equipmentTypeOther,
                        serialNumber: eq.serialNumber,
                      })
                      setEditForm({
                        customer_declared_fault: order.customer_declared_fault || "",
                        diagnosis: order.diagnosis || "",
                        work_description: order.work_description || "",
                        reception_date: order.reception_date?.slice(0, 10) || "",
                        delivery_date_estimated: order.delivery_date_estimated?.slice(0, 10) || "",
                        labor_amount: parseFloat(String(order.labor_amount || "0")) || 0,
                        notes: order.notes || "",
                      })
                      setEditClientId(order.client_id)
                      setEditClientSearch(order.client?.name ?? "")
                      setEditClients([])
                    }
                    setEditMode(false)
                  }}
                >
                  Cancelar edición
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleDownloadReceptionPdf}>
                <FileDown className="h-4 w-4 mr-1" /> PDF recepción
              </Button>
            </div>
          </div>

          {editMode && (
            <div className="rounded-lg border border-primary/40 bg-primary/5 px-4 py-3 text-sm">
              Estás editando la orden. Guardá los cambios en el formulario de datos o modificá los
              materiales desde la tabla inferior.
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Datos de la orden</CardTitle>
                <CardDescription>Equipo, falla del cliente, diagnóstico técnico y fechas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!editMode ? (
                  <>
                    <SaleClienteSection
                      clientId={order.client_id}
                      saleSnapshot={order}
                      fallbackName={order.client?.name}
                    />
                    <RepairOrderEquipmentReadOnly equipmentDescription={order.equipment_description} />
                    {(order.customer_declared_fault?.trim() || order.diagnosis) && (
                      <div className="space-y-2 border-t pt-3">
                        {order.customer_declared_fault?.trim() && (
                          <p>
                            <strong>Falla declarada por el cliente:</strong>{" "}
                            {order.customer_declared_fault}
                          </p>
                        )}
                        {order.diagnosis && (
                          <p>
                            <strong>Diagnóstico técnico:</strong> {order.diagnosis}
                          </p>
                        )}
                      </div>
                    )}
                    {order.work_description && (
                      <p><strong>Trabajo a realizar:</strong> {order.work_description}</p>
                    )}
                    <p><strong>Recepción:</strong> {formatDate(order.reception_date)}</p>
                    {order.delivery_date_estimated && (
                      <p><strong>Entrega estimada:</strong> {formatDate(order.delivery_date_estimated)}
                      </p>
                    )}
                    <p><strong>Mano de obra:</strong> {formatMoney(order.labor_amount)}</p>
                    {order.notes && <p><strong>Notas:</strong> {order.notes}</p>}
                  </>
                ) : (
                  <form onSubmit={handleSaveEdit} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Cliente *</Label>
                      <ClientePicker
                        searchValue={editClientSearch}
                        onSearchChange={(value) => {
                          setEditClientSearch(value)
                          if (
                            editSelectedCliente &&
                            value.trim() !== getClienteDisplayName(editSelectedCliente)
                          ) {
                            setEditClientId(null)
                            setEditSelectedCliente(null)
                          }
                        }}
                        results={editClients}
                        selectedCliente={editSelectedCliente}
                        onSelect={(cliente) => {
                          setEditClientId(cliente.id)
                          setEditSelectedCliente(cliente)
                          setEditClientSearch(getClienteDisplayName(cliente))
                          setEditClients([])
                        }}
                        onClear={() => {
                          setEditClientId(null)
                          setEditSelectedCliente(null)
                          setEditClientSearch("")
                          setEditClients([])
                        }}
                        placeholder="Buscar por nombre, CUIT, código o dirección…"
                        clearLabel="Quitar cliente"
                      />
                    </div>
                    <div className="rounded-lg border p-3 space-y-2">
                      <Label>Equipo</Label>
                      <RepairOrderEquipmentFields
                        idPrefix="edit_ro"
                        value={equipmentFields}
                        onChange={setEquipmentFields}
                      />
                    </div>
                    <div>
                      <Label>Falla declarada por el cliente *</Label>
                      <Textarea
                        value={editForm.customer_declared_fault}
                        onChange={(e) =>
                          setEditForm((p) => ({ ...p, customer_declared_fault: e.target.value }))
                        }
                        rows={2}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Lo que indica el cliente al dejar el equipo; distinto del diagnóstico del técnico.
                      </p>
                    </div>
                    <div>
                      <Label>Diagnóstico técnico</Label>
                      <Textarea
                        value={editForm.diagnosis}
                        onChange={(e) => setEditForm((p) => ({ ...p, diagnosis: e.target.value }))}
                        rows={2}
                      />
                    </div>
                    <div>
                      <Label>Trabajo a realizar</Label>
                      <Textarea
                        value={editForm.work_description}
                        onChange={(e) =>
                          setEditForm((p) => ({ ...p, work_description: e.target.value }))
                        }
                        rows={2}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Fecha recepción</Label>
                        <Input
                          type="date"
                          value={editForm.reception_date}
                          onChange={(e) =>
                            setEditForm((p) => ({ ...p, reception_date: e.target.value }))
                          }
                        />
                      </div>
                      <div>
                        <Label>Fecha estimada entrega</Label>
                        <Input
                          type="date"
                          value={editForm.delivery_date_estimated}
                          onChange={(e) =>
                            setEditForm((p) => ({ ...p, delivery_date_estimated: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Mano de obra ($)</Label>
                      <CurrencyFieldInput
                        placeholder="$0,00"
                        value={editForm.labor_amount}
                        onValueChange={(n) =>
                          setEditForm((p) => ({ ...p, labor_amount: n }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Notas</Label>
                      <Input
                        value={editForm.notes}
                        onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" disabled={saving}>
                        {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                        Guardar
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          if (order) {
                            const eq = parseEquipmentDescriptionString(order.equipment_description || "")
                            setEquipmentFields({
                              brandModel: eq.brandModel,
                              equipmentType: eq.equipmentType,
                              equipmentTypeOther: eq.equipmentTypeOther,
                              serialNumber: eq.serialNumber,
                            })
                            setEditForm({
                              customer_declared_fault: order.customer_declared_fault || "",
                              diagnosis: order.diagnosis || "",
                              work_description: order.work_description || "",
                              reception_date: order.reception_date?.slice(0, 10) || "",
                              delivery_date_estimated: order.delivery_date_estimated?.slice(0, 10) || "",
                              labor_amount: parseFloat(String(order.labor_amount || "0")) || 0,
                              notes: order.notes || "",
                            })
                          }
                          setEditMode(false)
                        }}
                        disabled={saving}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Totales y saldo</CardTitle>
                <CardDescription>Monto total y pagos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <p><strong>Total:</strong> {formatMoney(order.total_amount)}</p>
                <p><strong>Pagado:</strong> {formatMoney(order.amount_paid)}</p>
                <p><strong>Saldo pendiente:</strong> {formatMoney(balance)}</p>
                {(status === "aceptado" ||
                  status === "en_proceso_reparacion" ||
                  status === "listo_entrega") && (
                  <Button
                    className="mt-2"
                    variant="outline"
                    size="sm"
                    onClick={() => setPaymentOpen(true)}
                  >
                    <DollarSign className="h-4 w-4 mr-1" /> Registrar pago
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Materiales (ítems)
              </CardTitle>
              <CardDescription>
                Productos del catálogo o ítems manuales. Agregar/editar antes de aceptar el presupuesto;
                después solo líneas sin stock descontado.
              </CardDescription>
              {canEdit && canManageRepairItems(status) && (
                <Button
                  size="sm"
                  className="mt-2"
                  onClick={() => setAddItemOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-1" /> Agregar ítem
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <p className="text-muted-foreground">Sin ítems. Agregá materiales desde el botón superior.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead>P. unit.</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      {canEdit && <TableHead className="w-[100px] text-right">Acciones</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <span className="font-medium">{getRepairOrderItemDisplayName(item)}</span>
                          {isRepairOrderCustomItem(item) && (
                            <span className="block text-xs text-muted-foreground">Ítem manual</span>
                          )}
                          {!isRepairOrderCustomItem(item) && item.stock_deducted ? (
                            <span className="block text-xs text-muted-foreground">Stock descontado</span>
                          ) : null}
                        </TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{formatMoney(item.unit_price)}</TableCell>
                        <TableCell className="text-right">{formatMoney(item.total_price)}</TableCell>
                        {canEdit && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-0.5">
                              {canModifyRepairItem(status, item) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Editar cantidad y precio"
                                  onClick={() => setEditingItem(item)}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                              )}
                              {canModifyRepairItem(status, item) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive"
                                  title="Quitar ítem"
                                  onClick={() => handleDeleteItem(item.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pagos y movimientos</CardTitle>
              <CardDescription>
                Historial de cobros registrados en esta orden (coherente con el total pagado arriba).
              </CardDescription>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aún no hay pagos registrados. Usá &quot;Registrar pago&quot; cuando el cliente abone (desde estado
                  aceptado, en reparación o listo para entrega).
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{formatDate(p.payment_date)}</TableCell>
                        <TableCell>{PAYMENT_METHOD_LABELS[p.method] ?? p.method}</TableCell>
                        <TableCell className="text-right">{formatMoney(p.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Acciones</CardTitle>
              <CardDescription>Transiciones de estado según el flujo de la orden</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {nextActionLabel[status] && (
                <div className="w-full rounded-md border bg-muted/30 p-3 mb-2">
                  <p className="text-sm text-muted-foreground">Siguiente paso recomendado</p>
                  <p className="font-medium">{nextActionLabel[status]}</p>
                </div>
              )}
              {status === "consulta_recibida" && (
                <Button onClick={handleSendBudget}>
                  <Send className="h-4 w-4 mr-1" /> Enviar presupuesto
                </Button>
              )}
              {status === "presupuestado" && (
                <>
                  <Button onClick={() => setAcceptDialogOpen(true)}>
                    <CheckCircle className="h-4 w-4 mr-1" /> Aceptar presupuesto
                  </Button>
                  <Button variant="destructive" onClick={handleCancel}>
                    <XCircle className="h-4 w-4 mr-1" /> Cancelar orden
                  </Button>
                </>
              )}
              {status === "aceptado" && (
                <>
                  <Button onClick={() => handleStatusChange("en_proceso_reparacion")}>
                    En proceso de reparación
                  </Button>
                  <Button variant="outline" onClick={() => setPaymentOpen(true)}>
                    <DollarSign className="h-4 w-4 mr-1" /> Registrar pago
                  </Button>
                </>
              )}
              {status === "en_proceso_reparacion" && (
                <>
                  <Button onClick={() => handleStatusChange("listo_entrega")}>
                    Listo entrega
                  </Button>
                  <Button variant="outline" onClick={() => setPaymentOpen(true)}>
                    <DollarSign className="h-4 w-4 mr-1" /> Registrar pago
                  </Button>
                </>
              )}
              {status === "listo_entrega" && (
                <>
                  <Button onClick={() => handleStatusChange("entregado")}>
                    Marcar como entregado
                  </Button>
                  <Button variant="outline" onClick={() => setPaymentOpen(true)}>
                    <DollarSign className="h-4 w-4 mr-1" /> Registrar pago
                  </Button>
                </>
              )}
              {(status === "entregado" || status === "cancelado") && (
                <p className="text-muted-foreground text-sm">
                  No hay acciones disponibles para este estado.
                </p>
              )}
              {(status === "aceptado" ||
                status === "en_proceso_reparacion" ||
                status === "listo_entrega" ||
                status === "entregado") && (
                <Button variant="outline" onClick={() => setAcceptanceDocOpen(true)}>
                  <FileText className="h-4 w-4 mr-1" /> Ver documento de aceptación
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        <RepairOrderAddItemModal
          orderId={id}
          isOpen={addItemOpen}
          onClose={() => setAddItemOpen(false)}
          onSuccess={refreshOrder}
        />
        <RepairOrderEditItemModal
          orderId={id}
          item={editingItem}
          isOpen={!!editingItem}
          onClose={() => setEditingItem(null)}
          onSuccess={refreshOrder}
        />
        <RepairOrderPaymentModal
          orderId={id}
          balance={balance}
          isOpen={paymentOpen}
          onClose={() => setPaymentOpen(false)}
          onSuccess={refreshOrder}
        />
        <RepairOrderAcceptanceDocumentModal
          orderId={id}
          isOpen={acceptanceDocOpen}
          onClose={() => setAcceptanceDocOpen(false)}
        />

        <Dialog open={acceptDialogOpen} onOpenChange={setAcceptDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Aceptar presupuesto</DialogTitle>
              <DialogDescription>
                Al aceptar, se descontará el stock de los materiales. Podés indicar los días para retiro (aviso al cliente).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Días para retiro (aviso)</Label>
                <Input
                  type="number"
                  min={1}
                  className="w-full max-w-[7rem]"
                  value={daysToClaim}
                  onChange={(e) => setDaysToClaim(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAcceptDialogOpen(false)} disabled={accepting}>
                Cancelar
              </Button>
              <Button onClick={handleAccept} disabled={accepting}>
                {accepting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Aceptar presupuesto
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </ERPLayout>
    </Protected>
  )
}
