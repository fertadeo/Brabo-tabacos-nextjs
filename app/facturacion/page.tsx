"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ERPLayout } from "@/components/erp-layout"
import { Protected } from "@/components/protected"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileText,
  FileUp,
  LayoutTemplate,
  Link2,
  MoreHorizontal,
  RefreshCcw,
  Search,
  Loader2,
  Send,
  Archive,
  ArchiveRestore,
} from "lucide-react"
import {
  emitirNotaCreditoSale,
  facturarSale,
  getClienteById,
  getFacturarSugerencia,
  getRepairOrders,
  getSale,
  getSales,
  openSaleSourcePdf,
  downloadSaleSourcePdf,
  fetchSaleSourcePdfBlob,
  resolveSaleIdForRepairOrderFacturacion,
  setFacturacionArchivedForSales,
  type Cliente,
  type EmitirNotaCreditoError,
  type FacturarSaleRequest,
  type FacturarSaleError,
  type FacturarSugerenciaData,
  type NotaCreditoEmisionData,
  type RepairOrder,
  type Sale,
  type SaleComprobanteHistorial,
} from "@/lib/api"
import {
  REPAIR_ORDER_FACTURABLE_STATUSES,
  billableStats,
  filterBillables,
  mergeFacturacionBillables,
  type ArcaStatus,
  type BillableRow,
} from "@/lib/facturacion-billables"
import { cacheFacturacionEmision, getCachedFacturacionEmision } from "@/lib/facturacion-emision-cache"
import {
  buildArcaInvoicePdfInput,
  buildArcaInvoicePdfInputFromPreviewLines,
} from "@/lib/build-arca-invoice-pdf-input"
import { generateArcaInvoicePdfFromBuildArgs, type GenerateArcaInvoicePdfParams } from "@/lib/generate-arca-invoice-pdf"
import { fetchSaleArcaEmision, type ResolvedSaleArcaEmision } from "@/lib/fetch-sale-arca-emision"
import { fetchSaleArcaNotaCreditoEmision } from "@/lib/fetch-sale-arca-nota-credito-emision"
import {
  emisionFromHistorialComprobante,
  facturarPayloadFromHistorialComprobante,
  historialComprobanteLabel,
  historialPreviewAviso,
  itemsFromHistorialComprobante,
} from "@/lib/facturacion-historial"
import {
  buildDefaultFacturarFormRequest,
  getEmitirConDefaultsGuardados,
  getStoredFacturacionCuitEmisor,
  getStoredFacturacionPuntoVenta,
  saveFacturacionFormDefaults,
  setEmitirConDefaultsGuardados,
} from "@/lib/facturacion-settings"
import { canEmitNotaCredito, canFacturarSaleViaApi, canReemitirComprobante, saleCanRefacturar, saleHasComprobanteHistorial, saleHasNotaCreditoEmitida } from "@/lib/facturacion-nota-credito"
import { externalInvoiceBadgeLabel, IMPORTED_SALE_BADGE, IMPORTED_SALE_FISCAL_HINT, isImportedSale, isLinkedPosExternalSale, LINKED_POS_SALE_HINT } from "@/lib/sale-import"
import {
  formatComprobanteAfipReferencia,
  getNotaCreditoTipoForFactura,
  getTipoComprobanteLabel,
} from "@/lib/facturacion-comprobantes"
import {
  extractFacturacionEmisionFromResponse,
  formatFacturacionErrorForUi,
  resolveFacturacionError,
  resolveFacturacionErrorFromSale,
  type FacturacionErrorInfo,
} from "@/lib/facturacion-errors"
import { resolveFacturacionApiError } from "@/lib/resolve-facturacion-api-error"
import { ArcaInvoiceTemplateDialog } from "@/components/arca-invoice-template-dialog"
import { ImportClientInvoiceModal } from "@/components/import-client-invoice-modal"
import { ResizableTableHead } from "@/components/resizable-table-head"
import { ArcaInvoiceTemplatePreview } from "@/components/arca-invoice-template-preview"
import { FacturacionArcaPreviewPanel } from "@/components/facturacion-arca-preview-panel"
import { FacturacionEmitConfirmDialog } from "@/components/facturacion-emit-confirm-dialog"
import { FacturacionFiscalConfigPanel } from "@/components/facturacion-fiscal-config-panel"
import { FacturacionHistorialList, historialDownloadKey } from "@/components/facturacion-historial"
import { SaleCurrencyBadge } from "@/components/sale-currency-badge"
import { SaleCurrencyNotice } from "@/components/sale-currency-notice"
import { ClienteInfoCard } from "@/components/cliente-picker"
import { getClienteDisplayName } from "@/lib/cliente-display"
import { FacturacionErrorAlert } from "@/components/facturacion-error-alert"
import { TipoComprobanteBadge } from "@/components/tipo-comprobante-badge"
import { formatTaxConditionLabel } from "@/lib/client-tax-condition"
import {
  getEmisorRegimenFromApi,
  getEmisorRegimenLabel,
  labelCondicionIvaReceptor,
  resolveFacturacionDesdeCliente,
  resolveTipoComprobanteFromCondicionIvaReceptor,
  validateFacturacionItemIva,
} from "@/lib/facturacion-cliente-fiscal"
import type { ArcaPadronResult } from "@/lib/arca-padron"
import {
  applyPadronToFacturarForm,
  applyReceptorCuitToFacturarForm,
} from "@/lib/facturacion-receptor-doc"
import {
  formatFacturacionFecha,
  loadFacturacionPreview,
  mapSaleItemsToPreviewLines,
  type FacturacionPreviewLine,
} from "@/lib/facturacion-preview-lines"
import {
  applyClienteToFacturarForm,
  buildFacturarFormForSale,
  buildFacturarPayload,
  clienteCuitDigitos,
  validateFacturarReceptorFiscal,
} from "@/lib/facturacion-form-from-cliente"
import {
  condicionVentaFieldsFromSale,
  defaultCondicionVentaCodigoFromPayment,
} from "@/lib/condicion-venta"
import { useResizableTableColumns } from "@/lib/use-resizable-table-columns"
import { formatSaleMoney, isUsdSale } from "@/lib/pos-usd"
import { useRole } from "@/app/hooks/useRole"
import { Checkbox } from "@/components/ui/checkbox"
import {
  canSuperadminArchiveBillable,
  isBillableArchivedInFacturacion,
  resolveBillableArchiveSaleId,
} from "@/lib/facturacion-archive"

const ARCA_STATUS_OPTIONS = ["all", "pending", "success", "error", "not_issued"] as const

const FACTURACION_TABLE_COL_IDS = [
  "comprobante",
  "cliente",
  "fecha",
  "estadoArca",
  "tipoFactura",
  "total",
  "acciones",
] as const

const FACTURACION_TABLE_COL_DEFAULTS: Record<(typeof FACTURACION_TABLE_COL_IDS)[number], number> = {
  comprobante: 176,
  cliente: 200,
  fecha: 152,
  estadoArca: 160,
  tipoFactura: 100,
  total: 112,
  acciones: 104,
}

const FACTURACION_TABLE_COL_MINS: Record<(typeof FACTURACION_TABLE_COL_IDS)[number], number> = {
  comprobante: 100,
  cliente: 88,
  fecha: 120,
  estadoArca: 110,
  tipoFactura: 72,
  total: 88,
  acciones: 88,
}

const FACTURACION_TABLE_COLS_STORAGE_KEY = "mf_facturacion_table_col_widths"

const estadoBadge: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Procesando", variant: "secondary" },
  success: { label: "Facturado", variant: "default" },
  error: { label: "Error", variant: "destructive" },
  not_issued: { label: "Sin emitir", variant: "outline" },
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 }).format(value)

function formatBillableAmount(
  value: number,
  sale?: { currency?: string; exchange_rate?: number | null } | null
): string {
  if (isUsdSale(sale?.currency)) {
    return formatSaleMoney(value, "USD", { maximumFractionDigits: 2, minimumFractionDigits: 2 })
  }
  return formatCurrency(value)
}

const formatDateTime = (value?: string | null) => {
  if (!value) return "-"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString("es-AR")
}

/** Venta real o vista previa para UI (órdenes de reparación sin venta vinculada aún). */
function billableToDisplaySale(row: BillableRow | null): Sale | null {
  if (!row) return null
  if (row.sale) return row.sale
  if (row.kind !== "repair_order" || !row.repairOrder) return null
  const arcaStatus = row.arcaStatus === "not_issued" ? null : row.arcaStatus
  return {
    id: row.linkedSaleId ?? 0,
    sale_number: row.reference,
    client_id: row.clientId,
    client_name: row.clientName,
    total_amount: row.totalAmount,
    payment_method: "efectivo",
    sale_date: row.date,
    arca_status: arcaStatus,
    arca_cae: row.arcaCae,
    arca_cae_vto: row.arcaCaeVto,
    arca_last_attempt_at: row.arcaLastAttemptAt,
    arca_error_code: row.arcaErrorCode,
    arca_error_message: row.arcaErrorMessage,
    created_at: row.repairOrder.created_at,
    updated_at: row.repairOrder.updated_at,
  }
}

/** Solo dígitos para validar CUIT/CUIL/DNI */
function soloDigitos(s?: string | null): string {
  return (s ?? "").replace(/\D/g, "")
}

/** Formato visual CUIT/CUIL argentino (11 dígitos) */
function formatCuitMostrar(raw?: string | null): string {
  const d = soloDigitos(raw)
  if (d.length !== 11) return raw?.trim() || "—"
  return `${d.slice(0, 2)}-${d.slice(2, 10)}-${d.slice(10)}`
}

function getBillableEmittedTipo(row: BillableRow): number | null {
  if (row.arcaStatus !== "success") return null
  const sale = row.sale
  if (sale?.arca_tipo != null && Number.isFinite(sale.arca_tipo)) return sale.arca_tipo
  const saleId = sale?.id ?? row.linkedSaleId ?? null
  if (!saleId) return null
  const cached = getCachedFacturacionEmision(saleId)
  const tipo = cached?.emision?.tipo ?? cached?.facturarPayload?.tipo
  return typeof tipo === "number" && Number.isFinite(tipo) ? tipo : null
}

export default function FacturacionPage() {
  const { isSuperAdmin } = useRole()
  const superadminArchiveEnabled = isSuperAdmin()
  const {
    widths: tableColWidths,
    beginResize: beginTableColResize,
    resetWidths: resetTableColumns,
    totalWidth: tableTotalWidth,
  } = useResizableTableColumns(
    FACTURACION_TABLE_COLS_STORAGE_KEY,
    FACTURACION_TABLE_COL_DEFAULTS,
    FACTURACION_TABLE_COL_MINS
  )
  const [billables, setBillables] = useState<BillableRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<(typeof ARCA_STATUS_OPTIONS)[number]>("all")
  const [selectedBillableKey, setSelectedBillableKey] = useState<string | null>(null)
  const [isEmitModalOpen, setIsEmitModalOpen] = useState(false)
  /** `view` = solo lectura del comprobante ya emitido; `emit` = formulario de facturación */
  const [invoiceModalMode, setInvoiceModalMode] = useState<"emit" | "view">("emit")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [errorTitle, setErrorTitle] = useState<string | null>(null)
  const [errorDetail, setErrorDetail] = useState<FacturacionErrorInfo | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [retryAfterHint, setRetryAfterHint] = useState<string | null>(null)
  const [form, setForm] = useState<FacturarSaleRequest>(() => buildDefaultFacturarFormRequest())
  const [showAdvancedEmitForm, setShowAdvancedEmitForm] = useState(() => !getEmitirConDefaultsGuardados())
  const [defaultsSavedHint, setDefaultsSavedHint] = useState(false)
  const [rememberFiscalDefaults, setRememberFiscalDefaults] = useState(false)
  const [isGeneratingArcaPdf, setIsGeneratingArcaPdf] = useState(false)
  const [historialDownloadingKey, setHistorialDownloadingKey] = useState<string | null>(null)
  const [historialViewingKey, setHistorialViewingKey] = useState<string | null>(null)
  const [historialPreviewOpen, setHistorialPreviewOpen] = useState(false)
  const [historialPreviewData, setHistorialPreviewData] = useState<GenerateArcaInvoicePdfParams | null>(null)
  const [historialPreviewError, setHistorialPreviewError] = useState<string | null>(null)
  const [historialPreviewTitle, setHistorialPreviewTitle] = useState<string>("Comprobante")
  const [creditNoteSale, setCreditNoteSale] = useState<Sale | null>(null)
  const [creditNoteArcaResolved, setCreditNoteArcaResolved] = useState<ResolvedSaleArcaEmision | null>(null)
  const [creditNoteArcaPreview, setCreditNoteArcaPreview] = useState<GenerateArcaInvoicePdfParams | null>(null)
  const [creditNoteArcaLoading, setCreditNoteArcaLoading] = useState(false)
  const [creditNoteArcaError, setCreditNoteArcaError] = useState<string | null>(null)
  const [creditNoteSubmitting, setCreditNoteSubmitting] = useState(false)
  const [creditNoteEmitError, setCreditNoteEmitError] = useState<string | null>(null)
  const [creditNoteErrorDetail, setCreditNoteErrorDetail] = useState<FacturacionErrorInfo | null>(null)
  const [creditNoteEmitSuccess, setCreditNoteEmitSuccess] = useState<string | null>(null)
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false)
  const [isImportInvoiceOpen, setIsImportInvoiceOpen] = useState(false)
  const [importLinkSaleId, setImportLinkSaleId] = useState<number | undefined>()
  const [importLinkClientId, setImportLinkClientId] = useState<number | undefined>()
  const [importLinkHint, setImportLinkHint] = useState<string | undefined>()
  const [editLinkSaleId, setEditLinkSaleId] = useState<number | undefined>()
  const [viewInvoiceData, setViewInvoiceData] = useState<GenerateArcaInvoicePdfParams | null>(null)
  const [viewSourcePdfUrl, setViewSourcePdfUrl] = useState<string | null>(null)
  const [viewInvoiceLoading, setViewInvoiceLoading] = useState(false)
  const [viewInvoiceError, setViewInvoiceError] = useState<string | null>(null)
  const [viewInvoiceIncomplete, setViewInvoiceIncomplete] = useState(false)
  const [showArchivedFacturacion, setShowArchivedFacturacion] = useState(false)
  const [selectedArchiveSaleIds, setSelectedArchiveSaleIds] = useState<Set<number>>(() => new Set())
  const [isArchiveSubmitting, setIsArchiveSubmitting] = useState(false)

  const [modalCliente, setModalCliente] = useState<Cliente | null>(null)
  const [modalClienteLoading, setModalClienteLoading] = useState(false)
  const [isConfirmEmitOpen, setIsConfirmEmitOpen] = useState(false)
  const [confirmLines, setConfirmLines] = useState<FacturacionPreviewLine[]>([])
  const [confirmSaleDate, setConfirmSaleDate] = useState<string | null>(null)
  const [confirmFechaCbte, setConfirmFechaCbte] = useState<string | null>(null)
  const [confirmLinesLoading, setConfirmLinesLoading] = useState(false)
  const [confirmLinesError, setConfirmLinesError] = useState<string | null>(null)
  const [fiscalSugerenciaMotivo, setFiscalSugerenciaMotivo] = useState<string | null>(null)
  const [facturarSugerencia, setFacturarSugerencia] = useState<FacturarSugerenciaData | null>(null)
  const fiscalLoadedBillableKeyRef = useRef<string | null>(null)

  const [emisorCuitMostrar, setEmisorCuitMostrar] = useState<string>(() => {
    const stored = typeof window !== "undefined" ? getStoredFacturacionCuitEmisor() : null
    if (stored) return formatCuitMostrar(stored)
    const env = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_FACTURADOR_CUIT_EMISOR?.trim() : ""
    if (env) return formatCuitMostrar(env)
    return "Configurá el CUIT en Configuración → Facturación ARCA, variable NEXT_PUBLIC_FACTURADOR_CUIT_EMISOR o FACTURADOR_CUIT_EMISOR en el servidor."
  })

  useEffect(() => {
    const stored = getStoredFacturacionCuitEmisor()
    if (stored) {
      setEmisorCuitMostrar(formatCuitMostrar(stored))
      return
    }
    const env = process.env.NEXT_PUBLIC_FACTURADOR_CUIT_EMISOR?.trim()
    if (env) setEmisorCuitMostrar(formatCuitMostrar(env))
    else {
      setEmisorCuitMostrar(
        "Configurá el CUIT en Configuración → Facturación ARCA, variable NEXT_PUBLIC_FACTURADOR_CUIT_EMISOR o FACTURADOR_CUIT_EMISOR en el servidor."
      )
    }
  }, [isEmitModalOpen, isConfirmEmitOpen, invoiceModalMode])

  useEffect(() => {
    if ((!isEmitModalOpen && !isConfirmEmitOpen) || invoiceModalMode !== "emit") return
    setShowAdvancedEmitForm(!getEmitirConDefaultsGuardados())
    setDefaultsSavedHint(false)
  }, [invoiceModalMode, selectedBillableKey])

  const selectedBillable = useMemo(
    () => billables.find((row) => row.key === selectedBillableKey) ?? null,
    [billables, selectedBillableKey]
  )

  const selectedSale = useMemo(() => billableToDisplaySale(selectedBillable), [selectedBillable])

  const creditNotePreview = useMemo(() => {
    if (!creditNoteSale) return null
    const cached = getCachedFacturacionEmision(creditNoteSale.id)
    const resolved = creditNoteArcaResolved
    const tipoFactura =
      creditNoteSale.arca_tipo ??
      resolved?.emision.tipo ??
      cached?.emision.tipo ??
      cached?.facturarPayload.tipo ??
      buildDefaultFacturarFormRequest().tipo ??
      6
    const ncTipo = getNotaCreditoTipoForFactura(tipoFactura)
    const pv =
      creditNoteSale.arca_punto_venta ??
      resolved?.emision.puntoVenta ??
      cached?.emision.puntoVenta ??
      cached?.facturarPayload.puntoVenta ??
      getStoredFacturacionPuntoVenta() ??
      undefined
    const numero =
      creditNoteSale.arca_numero ??
      resolved?.emision.numero ??
      cached?.emision.numero ??
      undefined
    return {
      cached,
      resolved,
      tipoFactura,
      ncTipo,
      ncLabel: ncTipo != null ? getTipoComprobanteLabel(ncTipo) : null,
      facturaRef:
        numero != null ? formatComprobanteAfipReferencia(tipoFactura, pv, numero) : null,
      importe: resolved?.emision.importe ?? cached?.emision.importe ?? creditNoteSale.total_amount,
      cae: creditNoteSale.arca_cae ?? resolved?.emision.cae ?? cached?.emision.cae,
      fechaEmision:
        resolved?.emision.fechaEmision ??
        (creditNoteSale.sale_date ? String(creditNoteSale.sale_date).slice(0, 10) : null),
    }
  }, [creditNoteSale, creditNoteArcaResolved])

  useEffect(() => {
    if (!creditNoteSale) {
      setCreditNoteArcaResolved(null)
      setCreditNoteEmitError(null)
      setCreditNoteErrorDetail(null)
      setCreditNoteEmitSuccess(null)
      return
    }
    let cancelled = false
    void fetchSaleArcaEmision(creditNoteSale).then((resolved) => {
      if (!cancelled) setCreditNoteArcaResolved(resolved)
    })
    return () => {
      cancelled = true
    }
  }, [creditNoteSale])

  useEffect(() => {
    if (!creditNoteSale || !creditNotePreview?.ncTipo) {
      setCreditNoteArcaPreview(null)
      setCreditNoteArcaLoading(false)
      setCreditNoteArcaError(null)
      return
    }

    let cancelled = false
    setCreditNoteArcaLoading(true)
    setCreditNoteArcaError(null)
    setCreditNoteArcaPreview(null)

    void (async () => {
      try {
        const saleRes = await getSale(creditNoteSale.id)
        const sale = saleRes.data
        const items = mapSaleItemsToPreviewLines(sale.items ?? [])
        if (items.length === 0) {
          throw new Error("La venta no tiene ítems para armar la vista previa de la nota de crédito.")
        }

        let cliente: Cliente | null = null
        if (sale.client_id) {
          try {
            cliente = await getClienteById(sale.client_id)
          } catch {
            cliente = null
          }
        }

        const facturarPayload =
          creditNotePreview.resolved?.facturarPayload ??
          creditNotePreview.cached?.facturarPayload ??
          buildDefaultFacturarFormRequest()

        const preview = buildArcaInvoicePdfInputFromPreviewLines({
          facturarPayload,
          lines: items,
          receptorRazonSocial: cliente?.name ?? sale.client_name ?? "Consumidor final",
          cliente,
          fechaEmision:
            creditNotePreview.fechaEmision ?? new Date().toISOString().slice(0, 10),
          totalAmount: creditNotePreview.importe,
          tipoComprobante: creditNotePreview.ncTipo!,
          previewAviso: creditNotePreview.facturaRef
            ? `Anula comprobante ${creditNotePreview.facturaRef}`
            : "Nota de crédito — borrador previo a emisión",
        })

        if (!cancelled) setCreditNoteArcaPreview(preview)
      } catch (e) {
        if (!cancelled) {
          setCreditNoteArcaError(
            e instanceof Error ? e.message : "No se pudo generar la vista previa de la nota de crédito."
          )
        }
      } finally {
        if (!cancelled) setCreditNoteArcaLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [creditNoteSale, creditNotePreview])

  const filteredBillables = useMemo(
    () => filterBillables(billables, query, statusFilter as ArcaStatus | "all"),
    [billables, query, statusFilter]
  )

  const selectableArchiveRows = useMemo(
    () =>
      filteredBillables.filter((row) => {
        const saleId = resolveBillableArchiveSaleId(row)
        if (!saleId) return false
        if (isBillableArchivedInFacturacion(row)) return true
        return canSuperadminArchiveBillable(row)
      }),
    [filteredBillables]
  )

  const allSelectableArchiveChecked =
    selectableArchiveRows.length > 0 &&
    selectableArchiveRows.every((row) => {
      const id = resolveBillableArchiveSaleId(row)
      return id != null && selectedArchiveSaleIds.has(id)
    })

  const toggleArchiveRowSelection = (row: BillableRow) => {
    const saleId = resolveBillableArchiveSaleId(row)
    if (!saleId) return
    setSelectedArchiveSaleIds((prev) => {
      const next = new Set(prev)
      if (next.has(saleId)) next.delete(saleId)
      else next.add(saleId)
      return next
    })
  }

  const toggleSelectAllArchiveRows = () => {
    if (allSelectableArchiveChecked) {
      setSelectedArchiveSaleIds(new Set())
      return
    }
    const next = new Set<number>()
    for (const row of selectableArchiveRows) {
      const id = resolveBillableArchiveSaleId(row)
      if (id != null) next.add(id)
    }
    setSelectedArchiveSaleIds(next)
  }

  const submitFacturacionArchive = async (archived: boolean) => {
    const saleIds = [...selectedArchiveSaleIds]
    if (!saleIds.length) return
    setIsArchiveSubmitting(true)
    setErrorMsg(null)
    try {
      const res = await setFacturacionArchivedForSales(saleIds, archived)
      setSuccessMsg(res.message)
      setSelectedArchiveSaleIds(new Set())
      await loadBillables()
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "No se pudo actualizar el archivo de facturación.")
    } finally {
      setIsArchiveSubmitting(false)
    }
  }

  const stats = useMemo(() => billableStats(billables), [billables])

  const clienteFiscalSnapshot = useMemo(() => {
    if (!modalCliente) return null
    const fiscal = resolveFacturacionDesdeCliente(modalCliente)
    return {
      condicionIvaReceptor: fiscal.condicionIvaReceptor,
      tipoComprobante: fiscal.tipoComprobante,
    }
  }, [modalCliente])

  const loadBillables = async () => {
    setIsLoading(true)
    setErrorMsg(null)
    try {
      const [salesRes, ...repairResponses] = await Promise.all([
        getSales({
          page: 1,
          limit: 200,
          include_facturacion_archived: showArchivedFacturacion,
        }),
        ...REPAIR_ORDER_FACTURABLE_STATUSES.map((status) =>
          getRepairOrders({ status, page: 1, limit: 100 })
        ),
      ])
      const sales = salesRes?.data?.sales ?? []
      const repairOrders = repairResponses.flatMap((res) => {
        const data = res.data as { repair_orders?: RepairOrder[] }
        return data?.repair_orders ?? []
      })
      const merged = mergeFacturacionBillables(sales, repairOrders, {
        showArchived: showArchivedFacturacion,
      })
      setBillables(merged)
      if (!selectedBillableKey && merged.length > 0) setSelectedBillableKey(merged[0].key)
    } catch (error) {
      setErrorMsg(
        error instanceof Error ? error.message : "No se pudo obtener ventas y reparaciones para facturación."
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadBillables()
  }, [showArchivedFacturacion])

  function openImportInvoiceModal(options?: {
    saleId?: number
    clientId?: number
    hint?: string
  }) {
    setEditLinkSaleId(undefined)
    setImportLinkSaleId(options?.saleId)
    setImportLinkClientId(options?.clientId)
    setImportLinkHint(options?.hint)
    setIsImportInvoiceOpen(true)
  }

  function openEditLinkModal(row: BillableRow) {
    if (row.kind !== "sale" || !row.sale || !isLinkedPosExternalSale(row.sale)) return
    setImportLinkSaleId(undefined)
    setImportLinkClientId(undefined)
    setImportLinkHint(undefined)
    setEditLinkSaleId(row.sale.id)
    setIsImportInvoiceOpen(true)
  }

  function closeImportInvoiceModal() {
    setIsImportInvoiceOpen(false)
    setImportLinkSaleId(undefined)
    setImportLinkClientId(undefined)
    setImportLinkHint(undefined)
    setEditLinkSaleId(undefined)
  }

  const handleEmitCreditNote = async () => {
    if (!creditNoteSale) return
    setCreditNoteSubmitting(true)
    setCreditNoteEmitError(null)
    setCreditNoteErrorDetail(null)
    setCreditNoteEmitSuccess(null)
    try {
      const puntoVenta = getStoredFacturacionPuntoVenta()
      const res = await emitirNotaCreditoSale(creditNoteSale.id, {
        motivo: "error_emision",
        confirmar: true,
        observaciones: "Factura emitida por error operativo",
        ...(puntoVenta != null ? { puntoVenta } : {}),
      })
      const nc = res.data?.notaCredito
      const ncRef =
        nc?.tipo != null && nc?.puntoVenta != null && nc?.numero != null
          ? formatComprobanteAfipReferencia(nc.tipo, nc.puntoVenta, nc.numero)
          : null
      const cae = nc?.cae ?? res.data?.sale?.arca_nc_cae ?? "—"
      const successBase =
        ncRef
          ? `Nota de crédito ${ncRef} emitida. CAE: ${cae}`
          : `Nota de crédito emitida. CAE: ${cae}`
      const updatedSale = res.data?.sale
      if (updatedSale) setCreditNoteSale(updatedSale)
      await loadBillables()

      if (updatedSale) {
        try {
          await downloadArcaPdfForNotaCredito(updatedSale, nc ?? null, { reportErrorOnPage: false })
          setCreditNoteEmitSuccess(`${successBase} PDF descargado. Si hace falta, editá la venta y refacturá.`)
        } catch (pdfErr) {
          const pdfMsg = pdfErr instanceof Error ? pdfErr.message : "No se pudo generar el PDF"
          setCreditNoteEmitSuccess(`${successBase} (PDF no descargado: ${pdfMsg})`)
        }
      } else {
        setCreditNoteEmitSuccess(successBase)
      }
    } catch (e) {
      const err = e as EmitirNotaCreditoError
      const resolved = resolveFacturacionApiError(err)
      setCreditNoteErrorDetail(resolved)
      setCreditNoteEmitError(formatFacturacionErrorForUi(resolved, err.requestId))
      console.error("[FACTURAR UI] Error al emitir nota de crédito:", {
        message: err.message,
        status: err.status,
        code: resolved.code,
        diagnosis: resolved.diagnosis,
        remoteDetail: resolved.remoteDetail,
        data: err.data,
      })
    } finally {
      setCreditNoteSubmitting(false)
    }
  }

  useEffect(() => {
    if (
      selectedBillableKey == null ||
      invoiceModalMode !== "emit" ||
      !selectedSale ||
      (!isEmitModalOpen && !isConfirmEmitOpen)
    ) {
      return
    }

    if (fiscalLoadedBillableKeyRef.current === selectedBillableKey) {
      return
    }

    const sale = selectedSale
    let cancelled = false
    setModalClienteLoading(true)
    setModalCliente(null)

    const cargar = async () => {
      try {
        let saleId = sale.id
        if (selectedBillable?.kind === "repair_order" && selectedBillable.linkedSaleId) {
          saleId = selectedBillable.linkedSaleId
        }

        const sugerenciaPromise =
          saleId > 0 ? getFacturarSugerencia(saleId).catch(() => null) : Promise.resolve(null)

        if (!sale.client_id) {
          const sugerencia = await sugerenciaPromise
          if (!cancelled) {
            setModalCliente(null)
            setForm(buildFacturarFormForSale(null, sugerencia))
            setFacturarSugerencia(sugerencia)
            fiscalLoadedBillableKeyRef.current = selectedBillableKey
            setFiscalSugerenciaMotivo(sugerencia?.sugerencia?.motivo ?? null)
            console.log("[FACTURAR UI] Venta sin client_id → consumidor final (docTipo 99 / docNro 0).")
          }
          return
        }

        const [cliente, sugerencia] = await Promise.all([
          getClienteById(sale.client_id),
          sugerenciaPromise,
        ])
        if (cancelled) return
        setModalCliente(cliente)
        const nextForm = buildFacturarFormForSale(cliente, sugerencia)
        setForm(nextForm)
        setFacturarSugerencia(sugerencia)
        fiscalLoadedBillableKeyRef.current = selectedBillableKey
        setFiscalSugerenciaMotivo(sugerencia?.sugerencia?.motivo ?? null)
        console.log("[FACTURAR UI] Formulario fiscal desde cliente ERP:", {
          clientId: sale.client_id,
          docTipo: nextForm.docTipo,
          docNro: nextForm.docNro,
          condicionIvaReceptor: nextForm.condicionIvaReceptor,
          tipo: nextForm.tipo,
          cuil_cuit: cliente.cuil_cuit,
          primary_tax_id: cliente.primary_tax_id,
        })
      } catch (e) {
        console.warn("[FACTURAR UI] No se pudo cargar cliente/sugerencia fiscal:", e)
        if (!cancelled) {
          setModalCliente(null)
          setForm(buildFacturarFormForSale(null, null))
          setFacturarSugerencia(null)
          setFiscalSugerenciaMotivo(null)
        }
      } finally {
        if (!cancelled) setModalClienteLoading(false)
      }
    }

    void cargar()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recargar al abrir emisión o cambiar fila
  }, [
    selectedBillableKey,
    invoiceModalMode,
    selectedSale?.id,
    isEmitModalOpen,
    isConfirmEmitOpen,
  ])

  useEffect(() => {
    if (!isEmitModalOpen && !isConfirmEmitOpen) {
      fiscalLoadedBillableKeyRef.current = null
      setModalCliente(null)
      setModalClienteLoading(false)
    }
  }, [isEmitModalOpen, isConfirmEmitOpen])

  const requestEmitConfirmation = () => {
    if (!selectedBillable || !selectedSale) {
      setErrorMsg("Seleccioná una venta u orden de reparación antes de facturar.")
      return
    }

    if ((form.concepto === 2 || form.concepto === 3) && (!form.fechaServicioDesde || !form.fechaServicioHasta)) {
      setErrorMsg("Para concepto 2 o 3 tenés que indicar fecha de servicio desde y hasta (YYYY-MM-DD).")
      setIsEmitModalOpen(true)
      setShowAdvancedEmitForm(true)
      return
    }

    setErrorMsg(null)
    setErrorTitle(null)
    setErrorDetail(null)
    setIsEmitModalOpen(false)
    setIsConfirmEmitOpen(true)
  }

  const itemIvaValidationError = useMemo(() => {
    if (!isConfirmEmitOpen || confirmLines.length === 0) return null
    const tipo = form.tipo ?? resolveFacturacionDesdeCliente(modalCliente).tipoComprobante
    return validateFacturacionItemIva(tipo, confirmLines)
  }, [isConfirmEmitOpen, confirmLines, form.tipo, modalCliente])

  const facturarPayloadForEmit = useMemo(
    () => buildFacturarPayload(form, modalCliente),
    [form, modalCliente]
  )

  const receptorFiscalValidationError = useMemo(() => {
    if (!isConfirmEmitOpen || modalClienteLoading || !selectedSale) return null
    return validateFacturarReceptorFiscal(selectedSale, modalCliente, facturarPayloadForEmit)
  }, [isConfirmEmitOpen, modalClienteLoading, selectedSale, facturarPayloadForEmit, modalCliente])

  useEffect(() => {
    if (creditNoteSale && isImportedSale(creditNoteSale)) {
      setErrorTitle(IMPORTED_SALE_BADGE)
      setErrorMsg(IMPORTED_SALE_FISCAL_HINT)
      setCreditNoteSale(null)
    }
  }, [creditNoteSale])

  const startEmitFromTable = (rowKey: string) => {
    setSelectedBillableKey(rowKey)
    setInvoiceModalMode("emit")
    setIsEmitModalOpen(false)
    setErrorMsg(null)
    const row = billables.find((b) => b.key === rowKey)
    if (row?.sale && saleCanRefacturar(row.sale)) {
      setForm((prev) => ({ ...prev, force: true }))
    }
    setIsConfirmEmitOpen(true)
  }

  useEffect(() => {
    if (!isConfirmEmitOpen || !selectedBillable) return

    let cancelled = false
    setConfirmLinesLoading(true)
    setConfirmLinesError(null)

    void (async () => {
      try {
        const preview = await loadFacturacionPreview(selectedBillable)
        if (cancelled) return
        setConfirmLines(preview.lines)
        setConfirmSaleDate(preview.saleDate ?? selectedBillable.date ?? null)
        setConfirmFechaCbte(preview.fechaCbte ?? null)
        if (preview.lines.length === 0) {
          setConfirmLinesError("No hay ítems para mostrar en el comprobante.")
        }
      } catch (e) {
        if (cancelled) return
        const msg = e instanceof Error ? e.message : "No se pudo cargar el detalle del comprobante."
        setConfirmLinesError(msg)
        setConfirmLines([])
      } finally {
        if (!cancelled) setConfirmLinesLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recargar al abrir confirmación o cambiar fila
  }, [isConfirmEmitOpen, selectedBillableKey, invoiceModalMode])

  useEffect(() => {
    if (!isConfirmEmitOpen || !selectedSale) return
    setForm((prev) => {
      if (prev.condicionVentaCodigo) return prev
      const fromSale = condicionVentaFieldsFromSale(selectedSale)
      return {
        ...prev,
        condicionVentaCodigo:
          fromSale.condicionVentaCodigo ??
          defaultCondicionVentaCodigoFromPayment(selectedSale.payment_method),
        ...(fromSale.condicionVenta ? { condicionVenta: fromSale.condicionVenta } : {}),
        ...(fromSale.condicionVentaTexto ? { condicionVentaTexto: fromSale.condicionVentaTexto } : {}),
        ...(fromSale.fechaVencimientoPago ? { fechaVencimientoPago: fromSale.fechaVencimientoPago } : {}),
      }
    })
  }, [isConfirmEmitOpen, selectedSale?.id, selectedSale?.payment_method])

  useEffect(() => {
    if (!isConfirmEmitOpen) {
      setConfirmLines([])
      setConfirmSaleDate(null)
      setConfirmFechaCbte(null)
      setConfirmLinesError(null)
      setConfirmLinesLoading(false)
    }
  }, [isConfirmEmitOpen])

  useEffect(() => {
    if (!isEmitModalOpen || invoiceModalMode !== "view" || !selectedSale) {
      setViewInvoiceData(null)
      setViewSourcePdfUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
      setViewInvoiceError(null)
      setViewInvoiceIncomplete(false)
      setViewInvoiceLoading(false)
      return
    }

    let cancelled = false
    let objectUrl: string | null = null
    const billable = selectedBillable

    async function loadComprobantePreview() {
      setViewInvoiceLoading(true)
      setViewInvoiceError(null)
      setViewInvoiceData(null)
      setViewSourcePdfUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })

      if (!selectedSale) {
        if (!cancelled) setViewInvoiceLoading(false)
        return
      }

      let saleForArca: Sale = selectedSale
      if (saleForArca.id < 1 && billable?.linkedSaleId) {
        try {
          const saleRes = await getSale(billable.linkedSaleId)
          saleForArca = { ...(saleRes.data as Sale), client_name: billable.clientName }
        } catch {
          if (!cancelled) {
            setViewInvoiceError("No se pudo cargar la venta vinculada a esta reparación.")
            setViewInvoiceLoading(false)
          }
          return
        }
      } else if (saleForArca.id < 1) {
        if (!cancelled) {
          setViewInvoiceError("Esta reparación no tiene venta vinculada para mostrar el comprobante.")
          setViewInvoiceLoading(false)
        }
        return
      }

      if (isImportedSale(saleForArca)) {
        try {
          const blob = await fetchSaleSourcePdfBlob(saleForArca.id)
          const url = URL.createObjectURL(blob)
          if (cancelled) {
            URL.revokeObjectURL(url)
            return
          }
          objectUrl = url
          setViewSourcePdfUrl(url)
        } catch (e) {
          if (!cancelled) {
            setViewInvoiceError(
              e instanceof Error ? e.message : "No se pudo cargar el PDF original vinculado."
            )
          }
        } finally {
          if (!cancelled) setViewInvoiceLoading(false)
        }
        return
      }

      const resolved = await fetchSaleArcaEmision(saleForArca)
      if (!resolved) {
        if (!cancelled) {
          setViewInvoiceError("No hay CAE registrado para este comprobante.")
          setViewInvoiceLoading(false)
        }
        return
      }

      try {
        let cliente = modalCliente
        if (saleForArca.client_id && (!cliente || cliente.id !== saleForArca.client_id)) {
          try {
            cliente = await getClienteById(saleForArca.client_id)
          } catch {
            cliente = null
          }
        }

        const data = await buildArcaInvoicePdfInput({
          saleId: saleForArca.id,
          emision: resolved.emision,
          facturarPayload: resolved.facturarPayload,
          cliente,
          saleSnapshot: saleForArca,
          previewAllowMissingNumero: true,
        })

        if (!cancelled) {
          setViewInvoiceData(data)
          setViewInvoiceIncomplete(resolved.incomplete)
        }
      } catch (e) {
        if (!cancelled) {
          setViewInvoiceError(
            e instanceof Error ? e.message : "No se pudo cargar la vista del comprobante."
          )
        }
      } finally {
        if (!cancelled) setViewInvoiceLoading(false)
      }
    }

    void loadComprobantePreview()
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [isEmitModalOpen, invoiceModalMode, selectedSale, selectedBillable, modalCliente])

  const downloadArcaPdfForSale = async (
    sale: Sale,
    emisionOverride?: ReturnType<typeof extractFacturacionEmisionFromResponse>,
    payloadOverride?: FacturarSaleRequest,
    options?: { reportErrorOnPage?: boolean }
  ) => {
    const resolved =
      emisionOverride != null
        ? {
            emision: emisionOverride,
            facturarPayload: payloadOverride ?? getCachedFacturacionEmision(sale.id)?.facturarPayload ?? buildDefaultFacturarFormRequest(),
            incomplete: emisionOverride.numero == null || emisionOverride.numero < 1,
            sources: ["session"] as const,
          }
        : await fetchSaleArcaEmision(sale)

    if (!resolved?.emision.cae) {
      const msg =
        "No hay datos de emisión guardados para esta venta. Emití nuevamente en esta sesión o usá el PDF de MultiCUIT."
      if (options?.reportErrorOnPage !== false) setErrorMsg(msg)
      throw new Error(msg)
    }

    if (resolved.incomplete) {
      const msg =
        "No se puede generar el PDF: falta el número de comprobante AFIP. Pedí al backend que persista punto de venta y número al emitir."
      if (options?.reportErrorOnPage !== false) setErrorMsg(msg)
      throw new Error(msg)
    }

    const emision = resolved.emision

    setIsGeneratingArcaPdf(true)
    try {
      let cliente = modalCliente
      if (sale.client_id && (!cliente || cliente.id !== sale.client_id)) {
        try {
          cliente = await getClienteById(sale.client_id)
        } catch {
          cliente = null
        }
      }
      await generateArcaInvoicePdfFromBuildArgs({
        saleId: sale.id,
        emision,
        facturarPayload: payloadOverride ?? resolved.facturarPayload,
        cliente,
        saleSnapshot: sale,
      })
    } catch (e) {
      console.error("[FACTURAR UI] Error al generar PDF ARCA:", e)
      const msg = e instanceof Error ? e.message : "No se pudo generar el PDF del comprobante ARCA."
      if (options?.reportErrorOnPage !== false) setErrorMsg(msg)
      throw e instanceof Error ? e : new Error(msg)
    } finally {
      setIsGeneratingArcaPdf(false)
    }
  }

  const downloadArcaPdfForNotaCredito = async (
    sale: Sale,
    ncOverride?: NotaCreditoEmisionData | null,
    options?: { reportErrorOnPage?: boolean }
  ) => {
    const resolved = await fetchSaleArcaNotaCreditoEmision(sale, ncOverride)
    if (!resolved?.emision.cae) {
      const msg =
        "No hay datos de la nota de crédito guardados para esta venta. Emití la NC en esta sesión o verificá que el backend persista arca_nc_*."
      if (options?.reportErrorOnPage !== false) setCreditNoteEmitError(msg)
      throw new Error(msg)
    }
    if (resolved.incomplete) {
      const msg = "No se puede generar el PDF: falta el número de comprobante AFIP de la nota de crédito."
      if (options?.reportErrorOnPage !== false) setCreditNoteEmitError(msg)
      throw new Error(msg)
    }

    setIsGeneratingArcaPdf(true)
    try {
      let cliente: Cliente | null = null
      if (sale.client_id) {
        try {
          cliente = await getClienteById(sale.client_id)
        } catch {
          cliente = null
        }
      }
      await generateArcaInvoicePdfFromBuildArgs({
        saleId: sale.id,
        emision: resolved.emision,
        facturarPayload: resolved.facturarPayload,
        cliente,
        saleSnapshot: sale,
        previewAviso: resolved.comprobanteAsociadoRef
          ? `Anula comprobante ${resolved.comprobanteAsociadoRef}`
          : undefined,
      })
    } catch (e) {
      console.error("[FACTURAR UI] Error al generar PDF NC:", e)
      const msg = e instanceof Error ? e.message : "No se pudo generar el PDF de la nota de crédito."
      if (options?.reportErrorOnPage !== false) setCreditNoteEmitError(msg)
      throw e instanceof Error ? e : new Error(msg)
    } finally {
      setIsGeneratingArcaPdf(false)
    }
  }

  const downloadArcaPdfForHistorial = async (sale: Sale, row: SaleComprobanteHistorial) => {
    const emision = emisionFromHistorialComprobante(row)
    if (!emision?.cae) {
      setErrorTitle("Sin datos del comprobante")
      setErrorMsg("Este comprobante del historial no tiene CAE guardado.")
      return
    }
    const key = historialDownloadKey(row)
    setHistorialDownloadingKey(key)
    setIsGeneratingArcaPdf(true)
    try {
      let cliente: Cliente | null = modalCliente
      if (sale.client_id && (!cliente || cliente.id !== sale.client_id)) {
        try {
          cliente = await getClienteById(sale.client_id)
        } catch {
          cliente = null
        }
      }
      await generateArcaInvoicePdfFromBuildArgs({
        saleId: sale.id,
        emision,
        facturarPayload: facturarPayloadFromHistorialComprobante(row),
        cliente,
        saleSnapshot: sale,
        previewAviso: historialPreviewAviso(row),
        itemsOverride: itemsFromHistorialComprobante(row),
        skipSaleRequestOverlay: true,
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No se pudo generar el PDF del comprobante histórico."
      setErrorTitle("Error al descargar comprobante")
      setErrorMsg(msg)
    } finally {
      setIsGeneratingArcaPdf(false)
      setHistorialDownloadingKey(null)
    }
  }

  const viewArcaPdfForHistorial = async (sale: Sale, row: SaleComprobanteHistorial) => {
    const emision = emisionFromHistorialComprobante(row)
    if (!emision?.cae) {
      setErrorTitle("Sin datos del comprobante")
      setErrorMsg("Este comprobante del historial no tiene CAE guardado.")
      return
    }
    const key = historialDownloadKey(row)
    setHistorialViewingKey(key)
    setHistorialPreviewError(null)
    setHistorialPreviewData(null)
    setHistorialPreviewTitle(historialComprobanteLabel(row))
    setHistorialPreviewOpen(true)
    try {
      let cliente: Cliente | null = modalCliente
      if (sale.client_id && (!cliente || cliente.id !== sale.client_id)) {
        try {
          cliente = await getClienteById(sale.client_id)
        } catch {
          cliente = null
        }
      }
      const data = await buildArcaInvoicePdfInput({
        saleId: sale.id,
        emision,
        facturarPayload: facturarPayloadFromHistorialComprobante(row),
        cliente,
        saleSnapshot: sale,
        previewAviso: historialPreviewAviso(row),
        itemsOverride: itemsFromHistorialComprobante(row),
        skipSaleRequestOverlay: true,
        previewAllowMissingNumero: true,
      })
      setHistorialPreviewData(data)
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No se pudo mostrar el comprobante histórico."
      setHistorialPreviewError(msg)
    } finally {
      setHistorialViewingKey(null)
    }
  }

  const onSubmitFacturar = async (payloadOverride?: FacturarSaleRequest) => {
    if (!selectedBillable || !selectedSale) {
      setErrorMsg("Seleccioná una venta u orden de reparación antes de facturar.")
      return
    }

    if (!canFacturarSaleViaApi(selectedSale)) {
      setErrorTitle(
        isImportedSale(selectedSale)
          ? externalInvoiceBadgeLabel(selectedSale) || IMPORTED_SALE_BADGE
          : "Comprobante ya emitido"
      )
      setErrorMsg(
        isImportedSale(selectedSale)
          ? IMPORTED_SALE_FISCAL_HINT
          : "Esta venta ya tiene comprobante fiscal registrado."
      )
      return
    }

    if ((form.concepto === 2 || form.concepto === 3) && (!form.fechaServicioDesde || !form.fechaServicioHasta)) {
      setErrorMsg("Para concepto 2 o 3 tenés que indicar fecha de servicio desde y hasta (YYYY-MM-DD).")
      return
    }

    const tipo = form.tipo ?? resolveFacturacionDesdeCliente(modalCliente).tipoComprobante
    const ivaErr = validateFacturacionItemIva(tipo, confirmLines)
    if (ivaErr) {
      setErrorMsg(ivaErr)
      setErrorTitle("IVA incompatible con el comprobante")
      return
    }

    const payloadPreview = payloadOverride ?? buildFacturarPayload(form, modalCliente)
    const receptorErr = validateFacturarReceptorFiscal(selectedSale, modalCliente, payloadPreview)
    if (receptorErr) {
      setErrorMsg(receptorErr)
      setErrorTitle("Datos fiscales del receptor incompletos")
      return
    }

    if (modalClienteLoading) {
      setErrorMsg("Esperá a que terminen de cargarse los datos fiscales del cliente.")
      return
    }

    setIsSubmitting(true)
    setErrorMsg(null)
    setErrorTitle(null)
    setErrorDetail(null)
    setSuccessMsg(null)
    setRetryAfterHint(null)
    try {
      let saleId = selectedSale.id

      if (selectedBillable.kind === "repair_order") {
        saleId = await resolveSaleIdForRepairOrderFacturacion(
          selectedBillable.id,
          selectedBillable.linkedSaleId
        )
      }

      const payloadBase = payloadOverride ?? buildFacturarPayload(form, modalCliente)
      const payload =
        selectedSale && saleCanRefacturar(selectedSale)
          ? { ...payloadBase, force: true }
          : payloadBase
      console.log("[FACTURAR UI] Emitiendo comprobante:", {
        billableKind: selectedBillable.kind,
        saleId,
        reference: selectedBillable.reference,
        clientId: selectedSale.client_id,
        payload,
        payloadJson: JSON.stringify(payload),
        emisorCuitUi: emisorCuitMostrar,
        receptorDoc: {
          docTipo: payload.docTipo,
          docNro: payload.docNro,
          clienteCuilEnErp: modalCliente?.cuil_cuit ?? modalCliente?.primary_tax_id ?? null,
        },
      })

      const response = await facturarSale(saleId, payload)
      const emision = extractFacturacionEmisionFromResponse(response)
      const cae = emision?.cae ?? response?.data?.arca?.cae ?? response?.data?.sale?.arca_cae
      const vto = emision?.vencimientoCaeIso
      const partes = ["Factura emitida correctamente en ARCA."]
      if (cae) partes.push(`CAE: ${cae}.`)
      if (vto) partes.push(`Vencimiento CAE: ${vto}.`)
      if (emision?.facturaId) partes.push(`ID comprobante: ${emision.facturaId}.`)
      if (emision) {
        cacheFacturacionEmision(saleId, emision, payload)
      }
      setSuccessMsg(partes.join(" "))
      setIsConfirmEmitOpen(false)
      setInvoiceModalMode("view")
      setIsEmitModalOpen(true)
      await loadBillables()
    } catch (error: unknown) {
      const err = error as FacturarSaleError
      const isNetwork =
        error instanceof TypeError ||
        err?.name === "TypeError" ||
        /failed to fetch|network|load failed/i.test(String(err?.message ?? ""))

      const payloadAttempt = payloadOverride ?? buildFacturarPayload(form, modalCliente)
      const resolved = resolveFacturacionApiError(err, {
        isNetwork,
        payload: payloadAttempt,
      })

      console.error("[FACTURAR UI] Error al emitir comprobante:", {
        message: err?.message,
        name: err?.name,
        status: err?.status,
        code: resolved.code,
        retryAfter: err?.retryAfter,
        requestId: err?.requestId,
        facturacionError: resolved,
        diagnosis: resolved.diagnosis,
        receptorContext: resolved.receptorContext,
        remoteDetail: resolved.remoteDetail,
        issues: resolved.issues,
        data: err?.data,
        responsePayload: err?.responsePayload,
        rawResponseText: err?.rawResponseText,
        payloadEnviado: payloadAttempt,
        stack: err?.stack,
      })

      setErrorTitle(resolved.title)
      setErrorDetail(resolved)
      setErrorMsg(formatFacturacionErrorForUi(resolved, err?.requestId))

      if (err?.status === 429 && err?.retryAfter != null) {
        setRetryAfterHint(`Límite alcanzado. Reintentá luego de: ${String(err.retryAfter)}.`)
      } else if (resolved.code === "RATE_LIMITED" && err?.retryAfter != null) {
        setRetryAfterHint(`Reintentá después de: ${String(err.retryAfter)}.`)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Protected requiredRoles={["gerencia", "ventas", "finanzas", "admin"]}>
      <ERPLayout activeItem="facturacion" wideContent>
        <div className="space-y-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Facturación ARCA</h1>
              <p className="text-muted-foreground">
                Emisión vía MF API. Predeterminado:{" "}
                <strong>{getTipoComprobanteLabel(buildDefaultFacturarFormRequest().tipo)}</strong>
                {" — "}
                <Link href="/configuracion?tab=facturacion" className="text-primary underline-offset-4 hover:underline">
                  Configurar en Facturación ARCA
                </Link>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => openImportInvoiceModal()}>
                <FileUp className="mr-2 h-4 w-4" />
                Importar factura PDF
              </Button>
              <Button variant="outline" onClick={() => setIsTemplateDialogOpen(true)}>
                <LayoutTemplate className="mr-2 h-4 w-4" />
                Ver plantilla factura
              </Button>
              <Button variant="outline" onClick={() => void loadBillables()} disabled={isLoading}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Actualizar ventas
              </Button>
            </div>
          </div>

          <ArcaInvoiceTemplateDialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen} />
          <ImportClientInvoiceModal
            isOpen={isImportInvoiceOpen}
            onClose={closeImportInvoiceModal}
            onSuccess={() => void loadBillables()}
            defaultClientId={importLinkClientId}
            defaultLinkSaleId={importLinkSaleId}
            linkSaleHint={importLinkHint}
            editLinkSaleId={editLinkSaleId}
          />

          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Ventas cargadas</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{stats.total}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Facturadas</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-2 text-2xl font-semibold text-emerald-600">
                <CheckCircle2 className="h-5 w-5" /> {stats.success}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Pendientes</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-2 text-2xl font-semibold text-amber-600">
                <Clock3 className="h-5 w-5" /> {stats.pending}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Con error</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-2 text-2xl font-semibold text-red-600">
                <AlertTriangle className="h-5 w-5" /> {stats.error}
              </CardContent>
            </Card>
          </div>

          {errorMsg && !isConfirmEmitOpen && !isEmitModalOpen && errorDetail ? (
            <FacturacionErrorAlert
              info={errorDetail}
              title={errorTitle ?? undefined}
              requestId={undefined}
            />
          ) : errorMsg && !isConfirmEmitOpen && !isEmitModalOpen ? (
            <Alert
              variant="error"
              title={errorTitle ?? "No se pudo completar la facturación"}
              description={errorMsg}
            />
          ) : null}

          {errorMsg && (isConfirmEmitOpen || isEmitModalOpen) && errorDetail ? (
            <FacturacionErrorAlert
              floating
              compact
              info={errorDetail}
              title={errorTitle ?? "No se pudo emitir el comprobante"}
              onDismiss={() => {
                setErrorMsg(null)
                setErrorTitle(null)
                setErrorDetail(null)
                setRetryAfterHint(null)
              }}
            />
          ) : errorMsg && (isConfirmEmitOpen || isEmitModalOpen) ? (
            <Alert
              floating
              variant="error"
              title={errorTitle ?? "No se pudo emitir el comprobante"}
              description={errorMsg}
              action={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setErrorMsg(null)
                    setErrorTitle(null)
                    setErrorDetail(null)
                    setRetryAfterHint(null)
                  }}
                >
                  Cerrar
                </Button>
              }
            />
          ) : null}
          {retryAfterHint ? <Alert variant="warning" title="Backoff recomendado" description={retryAfterHint} /> : null}
          {successMsg ? <Alert variant="success" title="Facturación realizada" description={successMsg} /> : null}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Ventas y reparaciones facturables
              </CardTitle>
              <CardDescription>
                Incluye ventas POS y órdenes de reparación en estado Aceptado o Entregado. Facturadas: ver comprobante, reemitir o anular por error con nota de crédito (cuando el backend lo habilite). Arrastrá el borde derecho de cada encabezado para ajustar el ancho de las columnas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="relative flex-1">
                  <Search className="text-muted-foreground absolute left-2 top-2.5 h-4 w-4" />
                  <Input
                    className="pl-8"
                    placeholder="Buscar por venta, reparación, cliente o ID"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as (typeof ARCA_STATUS_OPTIONS)[number])}>
                  <SelectTrigger className="w-full md:w-[220px]">
                    <SelectValue placeholder="Estado ARCA" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="not_issued">Sin emitir</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground shrink-0"
                  onClick={resetTableColumns}
                >
                  Restablecer columnas
                </Button>
              </div>

              {superadminArchiveEnabled ? (
                <div className="flex flex-col gap-3 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-3 sm:flex-row sm:flex-wrap sm:items-center">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="facturacion-show-archived"
                      checked={showArchivedFacturacion}
                      onCheckedChange={(checked) => {
                        setShowArchivedFacturacion(checked === true)
                        setSelectedArchiveSaleIds(new Set())
                      }}
                    />
                    <Label htmlFor="facturacion-show-archived" className="text-sm font-normal cursor-pointer">
                      Mostrar archivadas
                    </Label>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
                    <span className="text-muted-foreground text-xs">
                      {selectedArchiveSaleIds.size > 0
                        ? `${selectedArchiveSaleIds.size} seleccionada(s)`
                        : "Seleccioná comprobantes con error o emitidos como prueba"}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={selectedArchiveSaleIds.size === 0 || isArchiveSubmitting}
                      onClick={() => void submitFacturacionArchive(true)}
                    >
                      {isArchiveSubmitting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Archive className="mr-2 h-4 w-4" />
                      )}
                      Archivar / ocultar
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={selectedArchiveSaleIds.size === 0 || isArchiveSubmitting}
                      onClick={() => void submitFacturacionArchive(false)}
                    >
                      <ArchiveRestore className="mr-2 h-4 w-4" />
                      Restaurar
                    </Button>
                  </div>
                </div>
              ) : null}

              <div className="rounded-md border overflow-x-auto">
              <Table
                className="w-full"
                style={{ tableLayout: "fixed", minWidth: tableTotalWidth }}
              >
                <colgroup>
                  {FACTURACION_TABLE_COL_IDS.map((colId) => (
                    <col key={colId} style={{ width: tableColWidths[colId] }} />
                  ))}
                </colgroup>
                <TableHeader>
                  <TableRow>
                    {superadminArchiveEnabled ? (
                      <th className="h-10 w-10 px-2 text-left align-middle font-medium text-muted-foreground">
                        <Checkbox
                          aria-label="Seleccionar todas las filas archivables"
                          checked={allSelectableArchiveChecked}
                          onCheckedChange={toggleSelectAllArchiveRows}
                          disabled={selectableArchiveRows.length === 0}
                        />
                      </th>
                    ) : null}
                    <ResizableTableHead columnId="comprobante" onResizeStart={beginTableColResize}>
                      Comprobante
                    </ResizableTableHead>
                    <ResizableTableHead columnId="cliente" onResizeStart={beginTableColResize}>
                      Cliente
                    </ResizableTableHead>
                    <ResizableTableHead columnId="fecha" onResizeStart={beginTableColResize}>
                      Fecha
                    </ResizableTableHead>
                    <ResizableTableHead columnId="estadoArca" onResizeStart={beginTableColResize}>
                      Estado ARCA
                    </ResizableTableHead>
                    <ResizableTableHead columnId="tipoFactura" onResizeStart={beginTableColResize}>
                      Tipo factura
                    </ResizableTableHead>
                    <ResizableTableHead
                      columnId="total"
                      className="text-right"
                      onResizeStart={beginTableColResize}
                    >
                      Total
                    </ResizableTableHead>
                    <ResizableTableHead
                      columnId="acciones"
                      className="text-center"
                      onResizeStart={beginTableColResize}
                      resizable={false}
                    >
                      Acciones
                    </ResizableTableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={superadminArchiveEnabled ? 8 : 7}>Cargando comprobantes...</TableCell>
                    </TableRow>
                  ) : filteredBillables.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={superadminArchiveEnabled ? 8 : 7}>
                        No hay ventas ni reparaciones para los filtros aplicados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredBillables.map((row) => {
                      const status = row.arcaStatus
                      const emittedTipo = getBillableEmittedTipo(row)
                      const archivedRow = isBillableArchivedInFacturacion(row)
                      const archiveSaleId = resolveBillableArchiveSaleId(row)
                      const rowSelectable =
                        superadminArchiveEnabled &&
                        archiveSaleId != null &&
                        (archivedRow || canSuperadminArchiveBillable(row))
                      return (
                        <TableRow
                          key={row.key}
                          className={archivedRow ? "opacity-60 bg-muted/30" : undefined}
                        >
                          {superadminArchiveEnabled ? (
                            <TableCell className="w-10 px-2">
                              {rowSelectable ? (
                                <Checkbox
                                  aria-label={`Seleccionar ${row.reference}`}
                                  checked={archiveSaleId != null && selectedArchiveSaleIds.has(archiveSaleId)}
                                  onCheckedChange={() => toggleArchiveRowSelection(row)}
                                />
                              ) : null}
                            </TableCell>
                          ) : null}
                          <TableCell className="overflow-hidden font-medium">
                            <div className="flex min-w-0 items-center gap-2">
                              <span className="truncate" title={row.reference}>
                                {row.reference}
                              </span>
                              {archivedRow ? (
                                <Badge variant="secondary" className="shrink-0 text-[10px] font-normal">
                                  Archivada
                                </Badge>
                              ) : null}
                              {row.kind === "repair_order" ? (
                                <Badge variant="outline" className="shrink-0 text-xs font-normal">
                                  Reparación
                                  {row.repairStatusLabel ? ` · ${row.repairStatusLabel}` : ""}
                                </Badge>
                              ) : null}
                              {isUsdSale(row.currency ?? row.sale?.currency) ? (
                                <SaleCurrencyBadge
                                  currency="USD"
                                  exchangeRate={row.exchangeRate ?? row.sale?.exchange_rate}
                                  showRate
                                  className="shrink-0 text-[10px]"
                                />
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell className="overflow-hidden">
                            <span className="block truncate" title={row.clientName}>
                              {row.clientName}
                            </span>
                          </TableCell>
                          <TableCell className="overflow-hidden whitespace-nowrap">
                            {formatDateTime(row.date)}
                          </TableCell>
                          <TableCell className="overflow-hidden whitespace-normal">
                            <div className="space-y-1">
                              <Badge variant={estadoBadge[status].variant}>{estadoBadge[status].label}</Badge>
                              {row.sale && isImportedSale(row.sale) ? (
                                <Badge variant="secondary" className="text-xs font-normal">
                                  {externalInvoiceBadgeLabel(row.sale) || IMPORTED_SALE_BADGE}
                                </Badge>
                              ) : null}
                              {row.arcaNcStatus === "success" || (row.sale && saleHasNotaCreditoEmitida(row.sale)) ? (
                                <Badge variant="outline" className="text-xs font-normal text-amber-800 dark:text-amber-300">
                                  Anulada con NC
                                </Badge>
                              ) : row.sale && saleHasComprobanteHistorial(row.sale) ? (
                                <Badge variant="outline" className="text-xs font-normal">
                                  Con historial
                                </Badge>
                              ) : row.arcaNcStatus === "error" && row.sale?.arca_nc_error_message ? (
                                <p className="text-muted-foreground max-w-full text-xs leading-snug">
                                  NC: {row.sale.arca_nc_error_message}
                                </p>
                              ) : null}
                              {status === "error" && (row.arcaErrorCode || row.arcaErrorMessage) ? (
                                <p
                                  className="text-muted-foreground max-w-full text-xs leading-snug"
                                  title={row.arcaErrorMessage ?? undefined}
                                >
                                  {resolveFacturacionErrorFromSale(row.arcaErrorCode, row.arcaErrorMessage)
                                    ?.title ?? row.arcaErrorCode}
                                </p>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell>
                            {status === "success" ? (
                              emittedTipo != null ? (
                                <TipoComprobanteBadge tipo={emittedTipo} />
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular-nums whitespace-nowrap">
                            <div className="flex flex-col items-end gap-0.5">
                              <span>{formatBillableAmount(row.totalAmount, row.sale)}</span>
                              {isUsdSale(row.currency ?? row.sale?.currency) &&
                              (row.exchangeRate ?? row.sale?.exchange_rate) ? (
                                <span className="text-[10px] text-muted-foreground">
                                  TC {Number(row.exchangeRate ?? row.sale?.exchange_rate).toLocaleString("es-AR")}
                                </span>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell className="text-center align-middle">
                            {status === "success" ? (() => {
                              const sale = row.sale
                              const showEditLink = Boolean(sale && isLinkedPosExternalSale(sale))
                              const showNc = Boolean(sale && canEmitNotaCredito(sale))
                              const showRefacturar = Boolean(sale && saleCanRefacturar(sale))
                              const showReemit = Boolean(sale && canReemitirComprobante(sale) && !showRefacturar)
                              const showMenu = showEditLink || showNc || showReemit || showRefacturar

                              return (
                                <div className="mx-auto flex w-[6.5rem] items-center justify-center gap-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 gap-1.5 px-2.5"
                                    title="Ver comprobante"
                                    disabled={row.kind === "repair_order" && !row.linkedSaleId}
                                    onClick={() => {
                                      setSelectedBillableKey(row.key)
                                      setInvoiceModalMode("view")
                                      setIsEmitModalOpen(true)
                                    }}
                                  >
                                    <Eye className="h-3.5 w-3.5 shrink-0" />
                                    <span>Ver</span>
                                  </Button>
                                  {showMenu ? (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 shrink-0 text-muted-foreground"
                                          aria-label="Más acciones"
                                        >
                                          <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="w-56">
                                        {showEditLink ? (
                                          <DropdownMenuItem onClick={() => openEditLinkModal(row)}>
                                            <Link2 className="mr-2 h-4 w-4" />
                                            Modificar vinculación
                                          </DropdownMenuItem>
                                        ) : null}
                                        {showEditLink && (showNc || showReemit || showRefacturar) ? (
                                          <DropdownMenuSeparator />
                                        ) : null}
                                        {showNc ? (
                                          <DropdownMenuItem
                                            className="text-amber-700 focus:text-amber-800 dark:text-amber-400 dark:focus:text-amber-300"
                                            onClick={() => setCreditNoteSale(sale!)}
                                          >
                                            <AlertTriangle className="mr-2 h-4 w-4" />
                                            Emitir nota de crédito
                                          </DropdownMenuItem>
                                        ) : null}
                                        {showRefacturar ? (
                                          <DropdownMenuItem onClick={() => startEmitFromTable(row.key)}>
                                            <RefreshCcw className="mr-2 h-4 w-4" />
                                            Refacturar
                                          </DropdownMenuItem>
                                        ) : null}
                                        {showReemit ? (
                                          <DropdownMenuItem onClick={() => startEmitFromTable(row.key)}>
                                            <RefreshCcw className="mr-2 h-4 w-4" />
                                            Reemitir comprobante
                                          </DropdownMenuItem>
                                        ) : null}
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  ) : (
                                    <span className="inline-block h-8 w-8 shrink-0" aria-hidden />
                                  )}
                                </div>
                              )
                            })() : (
                              <div className="mx-auto flex w-[6.5rem] items-center justify-center gap-1">
                                <Button
                                  size="sm"
                                  className="h-8 gap-1.5 px-2.5"
                                  onClick={() => startEmitFromTable(row.key)}
                                >
                                  <Send className="h-3.5 w-3.5 shrink-0" />
                                  <span>Emitir</span>
                                </Button>
                                {row.kind === "sale" && row.sale ? (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 shrink-0 text-muted-foreground"
                                        aria-label="Más acciones"
                                      >
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-56">
                                      <DropdownMenuItem
                                        onClick={() =>
                                          openImportInvoiceModal({
                                            saleId: row.sale!.id,
                                            clientId: row.clientId ?? undefined,
                                            hint: `Vincular PDF externo a ${row.reference} · ${row.clientName}`,
                                          })
                                        }
                                      >
                                        <FileUp className="mr-2 h-4 w-4" />
                                        Vincular PDF externo
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                ) : (
                                  <span className="inline-block h-8 w-8 shrink-0" aria-hidden />
                                )}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>

          <Dialog
            open={isEmitModalOpen}
            onOpenChange={(open) => {
              setIsEmitModalOpen(open)
              if (!open) setInvoiceModalMode("emit")
            }}
          >
            <DialogContent
              className={
                invoiceModalMode === "view"
                  ? "flex max-h-[92vh] max-w-4xl flex-col gap-0 overflow-hidden p-0"
                  : "flex max-h-[92vh] max-w-2xl flex-col gap-0 overflow-hidden p-0"
              }
            >
              <DialogHeader
                className={
                  invoiceModalMode === "view" || invoiceModalMode === "emit"
                    ? "shrink-0 border-b px-6 py-4"
                    : undefined
                }
              >
                <DialogTitle>{invoiceModalMode === "view" ? "Comprobante emitido" : "Emitir comprobante"}</DialogTitle>
                <DialogDescription>
                  {invoiceModalMode === "view"
                    ? selectedSale
                      ? `${selectedSale.sale_number} · ${selectedSale.client_name || "Consumidor final"} · CAE ${selectedSale.arca_cae ?? "—"}`
                      : "Comprobante ARCA / AFIP."
                    : "Backend emite en ARCA y devuelve trazabilidad normalizada."}
                </DialogDescription>
              </DialogHeader>

              {!selectedSale ? (
                <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
                  <Alert
                    variant="warning"
                    title="Sin comprobante seleccionado"
                    description="Seleccioná una venta u orden de reparación para habilitar la facturación."
                  />
                </div>
              ) : invoiceModalMode === "view" ? (
                <>
                  {selectedSale && isImportedSale(selectedSale) ? (
                    <div className="border-b px-6 py-3">
                      <Alert
                        variant="warning"
                        title={externalInvoiceBadgeLabel(selectedSale) || IMPORTED_SALE_BADGE}
                        description={
                          selectedSale.sale_source === "pos_external"
                            ? LINKED_POS_SALE_HINT
                            : IMPORTED_SALE_FISCAL_HINT
                        }
                      />
                    </div>
                  ) : null}
                  <div className="min-h-0 flex-1 overflow-y-auto bg-muted/40 p-4 md:p-6">
                    {selectedSale ? (
                      <FacturacionHistorialList
                        sale={selectedSale}
                        downloadingKey={historialDownloadingKey}
                        viewingKey={historialViewingKey}
                        onDownload={(row) => void downloadArcaPdfForHistorial(selectedSale, row)}
                        onView={(row) => void viewArcaPdfForHistorial(selectedSale, row)}
                      />
                    ) : null}
                    {viewInvoiceLoading ? (
                      <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
                        <Loader2 className="h-8 w-8 animate-spin" />
                        <p className="text-sm">Cargando comprobante…</p>
                      </div>
                    ) : viewInvoiceError ? (
                      <Alert variant="warning" title="No se puede mostrar el comprobante" description={viewInvoiceError} />
                    ) : viewSourcePdfUrl ? (
                      <iframe
                        src={viewSourcePdfUrl}
                        title="Factura PDF original"
                        className="h-[min(72vh,820px)] w-full rounded-lg border bg-white shadow-sm"
                      />
                    ) : viewInvoiceData ? (
                      <>
                        {viewInvoiceIncomplete ? (
                          <Alert
                            variant="warning"
                            className="mb-4"
                            title="Comprobante parcial"
                            description="Se muestran venta, ítems y CAE desde la API. Faltan número AFIP y QR exactos: el backend debe guardar punto de venta, tipo y número al emitir, o exponer la respuesta ARCA guardada."
                          />
                        ) : null}
                        <ArcaInvoiceTemplatePreview data={viewInvoiceData} />
                      </>
                    ) : null}
                  </div>
                  <DialogFooter className="shrink-0 flex-col gap-3 border-t px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap gap-2">
                      {selectedSale && isImportedSale(selectedSale) ? (
                        <>
                          <Button
                            variant="default"
                            size="sm"
                            disabled={!viewSourcePdfUrl}
                            onClick={() =>
                              void downloadSaleSourcePdf(
                                selectedSale.id,
                                `${selectedSale.sale_number}-externa.pdf`
                              ).catch((err) =>
                                setErrorMsg(
                                  err instanceof Error ? err.message : "No se pudo descargar el PDF"
                                )
                              )
                            }
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Descargar PDF original
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={!viewSourcePdfUrl}
                            onClick={() =>
                              void openSaleSourcePdf(selectedSale.id).catch((err) =>
                                setErrorMsg(
                                  err instanceof Error ? err.message : "No se pudo abrir el PDF"
                                )
                              )
                            }
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Abrir en pestaña nueva
                          </Button>
                        </>
                      ) : (
                      <Button
                        variant="default"
                        size="sm"
                        disabled={
                          isGeneratingArcaPdf ||
                          !selectedSale.arca_cae ||
                          (selectedBillable?.kind === "repair_order" && !selectedBillable.linkedSaleId)
                        }
                        onClick={() => void downloadArcaPdfForSale(selectedSale, undefined, undefined, { reportErrorOnPage: true })}
                      >
                        {isGeneratingArcaPdf ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="mr-2 h-4 w-4" />
                        )}
                        {isGeneratingArcaPdf ? "Generando…" : "Descargar PDF"}
                      </Button>
                      )}
                      {selectedSale && isLinkedPosExternalSale(selectedSale) ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setIsEmitModalOpen(false)
                            if (selectedBillable) openEditLinkModal(selectedBillable)
                          }}
                        >
                          Modificar vinculación
                        </Button>
                      ) : null}
                      {selectedSale && saleHasNotaCreditoEmitida(selectedSale) ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isGeneratingArcaPdf}
                          onClick={() =>
                            void (async () => {
                              try {
                                await downloadArcaPdfForNotaCredito(selectedSale, null, {
                                  reportErrorOnPage: false,
                                })
                              } catch (e) {
                                const msg =
                                  e instanceof Error ? e.message : "No se pudo descargar la nota de crédito."
                                setErrorTitle("Error al descargar nota de crédito")
                                setErrorMsg(msg)
                              }
                            })()
                          }
                        >
                          {isGeneratingArcaPdf ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="mr-2 h-4 w-4" />
                          )}
                          Descargar nota de crédito
                        </Button>
                      ) : selectedSale && canEmitNotaCredito(selectedSale) ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setCreditNoteSale(selectedSale)
                            setIsEmitModalOpen(false)
                          }}
                        >
                          Emitir nota de crédito
                        </Button>
                      ) : null}
                      {selectedSale && saleCanRefacturar(selectedSale) && selectedBillableKey ? (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => startEmitFromTable(selectedBillableKey)}
                        >
                          <RefreshCcw className="mr-2 h-4 w-4" />
                          Refacturar
                        </Button>
                      ) : null}
                      {selectedSale.arca_cae ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void navigator.clipboard.writeText(selectedSale.arca_cae ?? "")}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Copiar CAE
                        </Button>
                      ) : null}
                      <Button variant="outline" size="sm" asChild>
                        <a
                          href="https://www.afip.gob.ar/fe/consultar/default.asp"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          AFIP
                        </a>
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground"
                      disabled={selectedSale ? isImportedSale(selectedSale) : false}
                      title={
                        selectedSale && isImportedSale(selectedSale)
                          ? IMPORTED_SALE_FISCAL_HINT
                          : selectedSale && saleCanRefacturar(selectedSale)
                            ? "Emitir una nueva factura después de la nota de crédito"
                            : undefined
                      }
                      onClick={() => {
                        if (selectedSale && saleCanRefacturar(selectedSale) && selectedBillableKey) {
                          startEmitFromTable(selectedBillableKey)
                          return
                        }
                        setInvoiceModalMode("emit")
                      }}
                    >
                      {selectedSale && saleCanRefacturar(selectedSale) ? "Refacturar…" : "Reemitir…"}
                    </Button>
                  </DialogFooter>
                </>
              ) : (
                <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
                <div className="space-y-4">
                  <div className="rounded-lg border p-3 text-sm space-y-1">
                    <div className="font-medium">{selectedSale.sale_number}</div>
                    {selectedBillable?.kind === "repair_order" ? (
                      <div className="text-muted-foreground text-sm">
                        Orden de reparación
                        {selectedBillable.repairStatusLabel ? ` · ${selectedBillable.repairStatusLabel}` : ""}
                        {selectedBillable.linkedSaleId
                          ? ` · Venta vinculada #${selectedBillable.linkedSaleId}`
                          : " · Se generará la venta POS al emitir"}
                      </div>
                    ) : null}
                    <div className="text-muted-foreground">
                      Fecha de venta: {formatFacturacionFecha(selectedSale.sale_date)}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      Al facturar, el backend asigna la fecha del comprobante según la venta (ver confirmación).
                    </div>
                    <div className="text-muted-foreground">CUIT emisor: {emisorCuitMostrar}</div>
                    <div className="text-muted-foreground">
                      Monto: {formatBillableAmount(selectedSale.total_amount, selectedSale)}
                    </div>
                    {isUsdSale(selectedSale.currency) ? (
                      <SaleCurrencyNotice
                        variant="facturacion"
                        currency={selectedSale.currency}
                        exchangeRate={selectedSale.exchange_rate}
                        totalAmount={selectedSale.total_amount}
                        className="mt-2"
                      />
                    ) : null}
                    <div className="text-muted-foreground">Último intento: {formatDateTime(selectedSale.arca_last_attempt_at)}</div>
                    <div className="text-muted-foreground">CAE actual: {selectedSale.arca_cae || "-"}</div>
                    {selectedSale.arca_cae_vto ? (
                      <div className="text-muted-foreground">Vencimiento CAE: {selectedSale.arca_cae_vto}</div>
                    ) : null}
                  </div>

                  {modalClienteLoading ? (
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                      Cargando datos del cliente…
                    </div>
                  ) : modalCliente ? (
                    <ClienteInfoCard cliente={modalCliente} />
                  ) : (
                    <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-5 text-center space-y-1">
                      <p className="text-sm font-medium">
                        {getClienteDisplayName(null)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {selectedSale.client_name
                          ? `Nombre en venta: ${selectedSale.client_name} — sin ficha completa en el ERP.`
                          : "La venta no tiene cliente asociado; se facturará como consumidor final."}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono pt-1">
                        CUIT/CUIL receptor: docTipo 99 / docNro 0
                      </p>
                    </div>
                  )}

                  {selectedBillable?.arcaStatus === "error" &&
                  (selectedSale.arca_error_code || selectedSale.arca_error_message) ? (
                    <Alert
                      variant="warning"
                      title={
                        resolveFacturacionErrorFromSale(
                          selectedSale.arca_error_code,
                          selectedSale.arca_error_message
                        )?.title ?? "Último intento fallido"
                      }
                      description={formatFacturacionErrorForUi(
                        resolveFacturacionErrorFromSale(
                          selectedSale.arca_error_code,
                          selectedSale.arca_error_message
                        ) ?? resolveFacturacionError({ rawMessage: selectedSale.arca_error_message })
                      )}
                    />
                  ) : null}

                  {errorMsg && isEmitModalOpen && !isConfirmEmitOpen && errorDetail ? (
                    <FacturacionErrorAlert
                      info={errorDetail}
                      title={errorTitle ?? "Error al facturar"}
                      compact
                    />
                  ) : errorMsg && isEmitModalOpen && !isConfirmEmitOpen ? (
                    <Alert variant="error" title={errorTitle ?? "Error al facturar"} description={errorMsg} />
                  ) : null}

                  {!modalClienteLoading && invoiceModalMode === "emit" ? (
                    <Alert
                      variant="info"
                      title="Tipo de factura según condición fiscal"
                      description={
                        <div className="space-y-2 text-sm">
                          <p>
                            Configuración actual:{" "}
                            <TipoComprobanteBadge tipo={form.tipo} className="align-middle" /> (
                            {getTipoComprobanteLabel(form.tipo)}), condición IVA receptor{" "}
                            {form.condicionIvaReceptor} (
                            {labelCondicionIvaReceptor(form.condicionIvaReceptor ?? 5)}).
                            {modalCliente?.tax_condition ? (
                              <>
                                {" "}
                                Cliente en ERP: {formatTaxConditionLabel(modalCliente.tax_condition)}.
                              </>
                            ) : null}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            Podés cambiar tipo y condición en opciones avanzadas; la vista previa y el POST usan esos
                            valores. ARCA puede rechazar combinaciones inválidas.{" "}
                            {fiscalSugerenciaMotivo ? `Sugerencia API: ${fiscalSugerenciaMotivo}` : null}
                          </p>
                        </div>
                      }
                    />
                  ) : null}

                  {!showAdvancedEmitForm ? (
                    <div className="space-y-3">
                      <Alert
                        variant="info"
                        title="Emisión con configuración guardada"
                        description={
                          <div className="space-y-1 text-sm">
                            <p className="flex flex-wrap items-center gap-2">
                              Se emitirá <TipoComprobanteBadge tipo={form.tipo} /> (
                              {getTipoComprobanteLabel(form.tipo)}), condición IVA receptor{" "}
                              <strong>{form.condicionIvaReceptor}</strong> (
                              {labelCondicionIvaReceptor(form.condicionIvaReceptor ?? 5)}), concepto{" "}
                              <strong>{form.concepto === 1 ? "Productos" : form.concepto === 2 ? "Servicios" : "Productos + servicios"}</strong>.
                            </p>
                            <p className="text-muted-foreground text-xs">
                              El documento del receptor se deduce del cliente de la venta (consumidor final si no hay CUIT).
                            </p>
                          </div>
                        }
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => setShowAdvancedEmitForm(true)}>
                          Opciones avanzadas
                        </Button>
                        <Button type="button" variant="ghost" size="sm" asChild>
                          <Link href="/configuracion?tab=facturacion">Cambiar en Configuración</Link>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <form
                      className="space-y-4"
                      onSubmit={(e) => {
                        e.preventDefault()
                        requestEmitConfirmation()
                      }}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium">Configuración fiscal</p>
                        {getEmitirConDefaultsGuardados() ? (
                          <Button type="button" variant="ghost" size="sm" onClick={() => setShowAdvancedEmitForm(false)}>
                            Volver a emisión rápida
                          </Button>
                        ) : null}
                      </div>

                      <FacturacionFiscalConfigPanel
                        value={form}
                        onChange={setForm}
                        cliente={modalCliente}
                        sugerencia={facturarSugerencia}
                        showSaveAsDefault
                        saveAsDefault={rememberFiscalDefaults}
                        onSaveAsDefaultChange={(checked) => {
                          setRememberFiscalDefaults(checked)
                          if (checked) {
                            saveFacturacionFormDefaults({
                              tipo: form.tipo ?? 6,
                              condicionIvaReceptor: form.condicionIvaReceptor ?? 5,
                              concepto: (form.concepto ?? 1) as 1 | 2 | 3,
                            })
                            setEmitirConDefaultsGuardados(true)
                            setDefaultsSavedHint(true)
                            setTimeout(() => setDefaultsSavedHint(false), 2500)
                          }
                        }}
                      />

                      <div className="flex flex-wrap gap-2">
                        <Button type="submit" size="sm">
                          <Send className="mr-2 h-4 w-4" />
                          Revisar y confirmar emisión
                        </Button>
                        <Button type="button" variant="ghost" size="sm" asChild>
                          <Link href="/configuracion?tab=facturacion">Configuración ARCA global</Link>
                        </Button>
                      </div>
                    </form>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setForm((prev) => ({ ...prev, force: true }))}
                      disabled={form.force === true}
                    >
                      Habilitar reintento forzado
                    </Button>
                    {form.force ? <Badge variant="outline">force=true activo</Badge> : null}
                  </div>

                  <p className="text-muted-foreground text-xs">
                    Usá reintento forzado solo si la venta ya tuvo facturación previa y operaciones lo confirma.
                  </p>
                </div>
                </div>
              )}
              <DialogFooter className="shrink-0 border-t px-6 py-4">
                {invoiceModalMode === "view" ? (
                  <Button variant="outline" onClick={() => setIsEmitModalOpen(false)}>
                    Cerrar
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => setIsEmitModalOpen(false)} disabled={isSubmitting}>
                      Cancelar
                    </Button>
                    <Button
                      onClick={requestEmitConfirmation}
                      disabled={isSubmitting || !selectedSale || modalClienteLoading}
                    >
                      <Send className="mr-2 h-4 w-4" />
                      Revisar y confirmar emisión
                    </Button>
                  </>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <FacturacionEmitConfirmDialog
            open={isConfirmEmitOpen}
            onOpenChange={(open) => {
              setIsConfirmEmitOpen(open)
              if (!open && !isEmitModalOpen) setErrorMsg(null)
            }}
            billable={selectedBillable}
            sale={selectedSale}
            cliente={modalCliente}
            clienteLoading={modalClienteLoading}
            form={form}
            lines={confirmLines}
            saleDate={confirmSaleDate}
            fechaCbte={confirmFechaCbte}
            linesLoading={confirmLinesLoading}
            linesError={confirmLinesError}
            itemIvaError={itemIvaValidationError}
            receptorFiscalError={receptorFiscalValidationError}
            emitError={errorDetail}
            emitErrorTitle={errorTitle}
            emitErrorRequestId={undefined}
            facturarPayload={facturarPayloadForEmit}
            emisorCuitLabel={emisorCuitMostrar}
            isSubmitting={isSubmitting}
            onConfigure={() => {
              setShowAdvancedEmitForm(true)
              setIsConfirmEmitOpen(false)
              setIsEmitModalOpen(true)
            }}
            facturarSugerencia={facturarSugerencia}
            onFiscalFormApply={(next, { saveAsDefault }) => {
              setForm(next)
              setShowAdvancedEmitForm(true)
              if (saveAsDefault) {
                saveFacturacionFormDefaults({
                  tipo: next.tipo ?? 6,
                  condicionIvaReceptor: next.condicionIvaReceptor ?? 5,
                  concepto: (next.concepto ?? 1) as 1 | 2 | 3,
                })
                setEmitirConDefaultsGuardados(true)
              }
            }}
            manualFiscalConfig={form.fiscalManualConfig === true}
            selectedBillableKey={selectedBillableKey}
            onReceptorCuitChange={(raw: string) =>
              setForm((prev) => applyReceptorCuitToFacturarForm(prev, raw, clienteFiscalSnapshot))
            }
            onPadronApply={(data: ArcaPadronResult) =>
              setForm((prev) => applyPadronToFacturarForm(prev, data))
            }
            onPadronReset={() => {
              if (modalCliente) {
                setForm((prev) => applyClienteToFacturarForm(prev, modalCliente))
              } else {
                setForm((prev) => applyReceptorCuitToFacturarForm(prev, "", null))
              }
            }}
            onCondicionVentaCodigoChange={(codigo) =>
              setForm((prev) => ({
                ...prev,
                condicionVentaCodigo: codigo,
                ...(codigo !== "OTRO" ? { condicionVentaTexto: undefined } : {}),
              }))
            }
            onCondicionVentaTextoChange={(texto) =>
              setForm((prev) => ({ ...prev, condicionVentaTexto: texto }))
            }
            onConfirm={(payload) => void onSubmitFacturar(payload)}
            onManualPayloadApply={(body) =>
              setForm((prev) => ({
                ...prev,
                ...body,
                fiscalManualConfig: true,
              }))
            }
          />

          <Dialog
            open={historialPreviewOpen}
            onOpenChange={(open) => {
              setHistorialPreviewOpen(open)
              if (!open) {
                setHistorialPreviewData(null)
                setHistorialPreviewError(null)
                setHistorialViewingKey(null)
              }
            }}
          >
            <DialogContent className="flex max-h-[92vh] max-w-4xl flex-col gap-0 overflow-hidden p-0">
              <DialogHeader className="shrink-0 border-b px-6 py-4">
                <DialogTitle>{historialPreviewTitle}</DialogTitle>
                <DialogDescription>Vista del comprobante guardado en el historial de la venta.</DialogDescription>
              </DialogHeader>
              <div className="min-h-0 flex-1 overflow-y-auto bg-muted/40 p-4 md:p-6">
                {historialViewingKey ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <p className="text-sm">Cargando comprobante…</p>
                  </div>
                ) : historialPreviewError ? (
                  <Alert variant="warning" title="No se puede mostrar" description={historialPreviewError} />
                ) : historialPreviewData ? (
                  <ArcaInvoiceTemplatePreview data={historialPreviewData} />
                ) : null}
              </div>
              <DialogFooter className="shrink-0 border-t px-6 py-4">
                <Button variant="outline" onClick={() => setHistorialPreviewOpen(false)}>
                  Cerrar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={creditNoteSale != null} onOpenChange={(open) => !open && setCreditNoteSale(null)}>
            <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>¿Fue un error?</DialogTitle>
                <DialogDescription>
                  Si la factura fiscal se emitió por error y no corresponde a una venta real, la vía correcta ante
                  AFIP es una <strong>nota de crédito</strong> por el mismo importe, referenciando el comprobante original.
                </DialogDescription>
              </DialogHeader>

              {creditNoteSale && creditNotePreview ? (
                <div className="space-y-4 text-sm">
                  <div className="rounded-lg border p-3 space-y-2">
                    <div>
                      <span className="text-muted-foreground">Venta: </span>
                      <span className="font-medium">{creditNoteSale.sale_number}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Importe a anular: </span>
                      <span className="font-medium">{formatCurrency(creditNotePreview.importe)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Factura original: </span>
                      <span className="font-medium">
                        {getTipoComprobanteLabel(creditNotePreview.tipoFactura)}
                        {creditNotePreview.facturaRef ? ` — ${creditNotePreview.facturaRef}` : ""}
                      </span>
                    </div>
                    {creditNotePreview.cae ? (
                      <div>
                        <span className="text-muted-foreground">CAE factura: </span>
                        <span className="font-mono">{creditNotePreview.cae}</span>
                      </div>
                    ) : null}
                    {creditNotePreview.ncLabel ? (
                      <div>
                        <span className="text-muted-foreground">Nota de crédito sugerida: </span>
                        <span className="font-medium">{creditNotePreview.ncLabel}</span>
                      </div>
                    ) : (
                      <Alert
                        variant="warning"
                        title="Tipo de NC no definido"
                        description="No se pudo inferir la nota de crédito desde el tipo de factura. El backend debe mapear tipo factura → tipo NC."
                      />
                    )}
                  </div>

                  {!creditNotePreview.facturaRef ? (
                    <Alert
                      variant="warning"
                      title="Faltan datos del comprobante original"
                      description="Para emitir la NC, el backend debe persistir punto de venta y número AFIP al facturar. Si facturaste en otra sesión, abrí la venta desde este navegador o pedí el dato a soporte."
                    />
                  ) : null}

                  <FacturacionArcaPreviewPanel
                    title="Vista previa de la nota de crédito ARCA"
                    description="Borrador de la NC con los mismos ítems e importes que la factura original. El número y CAE se asignan al emitir."
                    data={creditNoteArcaPreview}
                    loading={creditNoteArcaLoading}
                    error={creditNoteArcaError}
                    defaultOpen
                  />

                  {creditNoteEmitSuccess ? (
                    <Alert variant="success" title="Nota de crédito emitida" description={creditNoteEmitSuccess} />
                  ) : null}
                  {creditNoteEmitError && creditNoteErrorDetail ? (
                    <FacturacionErrorAlert info={creditNoteErrorDetail} title="Error al emitir NC" />
                  ) : creditNoteEmitError ? (
                    <Alert variant="error" title="Error al emitir NC" description={creditNoteEmitError} />
                  ) : null}

                  {saleHasNotaCreditoEmitida(creditNoteSale) ? (
                    <Alert
                      variant="info"
                      title="Nota de crédito ya emitida"
                      description={
                        creditNoteSale.arca_nc_cae
                          ? `CAE NC: ${creditNoteSale.arca_nc_cae}. Podés editar la venta y refacturar para emitir un nuevo comprobante.`
                          : "Esta venta ya tiene una nota de crédito registrada. Podés editar la venta y refacturar."
                      }
                    />
                  ) : null}
                </div>
              ) : null}

              <DialogFooter className="gap-2 sm:gap-0 sm:justify-between">
                <div className="flex flex-wrap gap-2">
                  {creditNoteSale && saleHasNotaCreditoEmitida(creditNoteSale) ? (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={creditNoteSubmitting || isGeneratingArcaPdf}
                      onClick={() =>
                        void downloadArcaPdfForNotaCredito(creditNoteSale, null, { reportErrorOnPage: true })
                      }
                    >
                      {isGeneratingArcaPdf ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="mr-2 h-4 w-4" />
                      )}
                      Descargar PDF NC
                    </Button>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => setCreditNoteSale(null)}>
                    Cerrar
                  </Button>
                  {creditNoteSale && saleCanRefacturar(creditNoteSale) ? (
                    <Button
                      onClick={() => {
                        const key =
                          billables.find((b) => b.sale?.id === creditNoteSale.id)?.key ??
                          selectedBillableKey ??
                          `sale-${creditNoteSale.id}`
                        setCreditNoteSale(null)
                        startEmitFromTable(key)
                      }}
                    >
                      <RefreshCcw className="mr-2 h-4 w-4" />
                      Refacturar
                    </Button>
                  ) : (
                  <Button
                    disabled={
                      creditNoteSubmitting ||
                      creditNoteArcaLoading ||
                      isGeneratingArcaPdf ||
                      !creditNoteSale ||
                      !canEmitNotaCredito(creditNoteSale) ||
                      creditNotePreview?.ncTipo == null
                    }
                    onClick={() => void handleEmitCreditNote()}
                  >
                    {creditNoteSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Emitiendo…
                      </>
                    ) : (
                      "Emitir nota de crédito"
                    )}
                  </Button>
                  )}
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </ERPLayout>
    </Protected>
  )
}
