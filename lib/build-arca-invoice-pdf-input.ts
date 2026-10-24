import {
  getProductById,
  getSale,
  type Cliente,
  type FacturarSaleRequest,
  type Sale,
  type SaleItemResponse,
} from "@/lib/api"
import { getSaleItemDisplayName, isSaleCustomItem, saleItemCatalogProductIds } from "@/lib/sale-items"
import { buildAfipQrUrl, parseAfipQrReceptorDoc } from "@/lib/arca-invoice-afip-qr"
import { toNumber } from "@/lib/arca-invoice-format"
import type { GenerateArcaInvoicePdfParams } from "@/lib/generate-arca-invoice-pdf"
import type { FacturacionEmisionData } from "@/lib/facturacion-errors"
import {
  getStoredFacturacionCuitEmisor,
  getStoredFacturacionPuntoVenta,
} from "@/lib/facturacion-settings"
import type { FacturacionPreviewLine } from "@/lib/facturacion-preview-lines"
import { mergeFacturarSaleRequestBody } from "@/lib/facturacion-request-preview"
import { condicionVentaLabelFromPayload } from "@/lib/condicion-venta"
import { facturadorTipoRequiereIva } from "@/lib/facturacion-comprobantes"
import { labelCondicionIvaReceptorForDisplay } from "@/lib/facturacion-cliente-fiscal"
import { extractDocFromArcaRequest, resolveReceptorDocForInvoicePdf } from "@/lib/facturacion-receptor-doc"
import { saleToClienteSnapshot } from "@/lib/sale-cliente"
import {
  buildArcaIvaDiscriminado,
  computeSaleIvaBreakdown,
  formatAlicuotaIvaArca,
  netFromInclusiveAmount,
  normalizeSaleIvaRate,
} from "@/lib/sale-iva"

const EMISOR_DEFAULT = {
  razonSocial: "FIGUEROA MAXIMILIANO IVAN JESUS",
  domicilio: "Luther King 1095 - Santa Rosa, La Pampa",
  condicionIva: "IVA Responsable Inscripto",
  ingresosBrutos: "2275400",
  inicioActividades: "03/01/2011",
}

export interface BuildArcaInvoicePdfInputArgs {
  saleId: number
  emision: FacturacionEmisionData
  facturarPayload: FacturarSaleRequest
  cliente: Cliente | null
  saleSnapshot?: Sale | null
  /** Vista previa sin número AFIP: no lanza error; marca comprobante como incompleto. */
  previewAllowMissingNumero?: boolean
  /** Texto bajo el título (ej. comprobante asociado en nota de crédito). */
  previewAviso?: string | null
  /** Ítems del comprobante histórico (refacturación). Si hay, no se usan los de la venta actual. */
  itemsOverride?: SaleItemResponse[] | null
  /** No mezclar docTipo/docNro de la venta vigente (PDF de un comprobante anterior). */
  skipSaleRequestOverlay?: boolean
}

async function resolveCatalogProductNames(
  items: SaleItemResponse[]
): Promise<Map<number, string>> {
  const ids = saleItemCatalogProductIds(items)
  const entries = await Promise.all(
    ids.map(async (id) => {
      try {
        const p = await getProductById(id)
        return [id, p.name] as const
      } catch {
        return [id, `Producto #${id}`] as const
      }
    })
  )
  return new Map(entries)
}

function saleItemDescription(
  item: SaleItemResponse,
  catalogNames: Map<number, string>
): string {
  const fromApi = getSaleItemDisplayName(item)
  if (isSaleCustomItem(item)) return fromApi
  if (item.product_id != null && catalogNames.has(item.product_id)) {
    return catalogNames.get(item.product_id)!
  }
  return fromApi
}

function saleItemCodigo(item: SaleItemResponse): string {
  if (isSaleCustomItem(item)) return "0"
  if (item.product_id != null) return String(item.product_id)
  return "0"
}

function lineSubtotal(item: SaleItemResponse): number {
  const fromApi = item.subtotal ?? item.total_price
  if (fromApi != null) return toNumber(fromApi)
  return toNumber(item.quantity) * toNumber(item.unit_price)
}

export async function buildArcaInvoicePdfInput(
  args: BuildArcaInvoicePdfInputArgs
): Promise<GenerateArcaInvoicePdfParams> {
  const { saleId, emision, facturarPayload, cliente, saleSnapshot, previewAllowMissingNumero, previewAviso, itemsOverride, skipSaleRequestOverlay } =
    args

  const saleRes = await getSale(saleId)
  const sale = saleRes.data
  const items =
    itemsOverride && itemsOverride.length > 0
      ? itemsOverride
      : sale.items?.length
        ? sale.items
        : saleSnapshot?.items ?? []

  if (!items.length) {
    throw new Error("La venta no tiene ítems para armar el comprobante PDF.")
  }

  const catalogNames = await resolveCatalogProductNames(items)
  const tipo = toNumber(emision.tipo ?? facturarPayload.tipo, 6)
  const puntoVenta = toNumber(
    emision.puntoVenta ?? facturarPayload.puntoVenta ?? getStoredFacturacionPuntoVenta(),
    1
  )
  const numeroParsed = emision.numero != null ? toNumber(emision.numero, NaN) : NaN
  const numeroMissing = !Number.isFinite(numeroParsed) || numeroParsed < 1
  const numero = numeroMissing
    ? previewAllowMissingNumero
      ? 0
      : null
    : numeroParsed
  if (numero == null) {
    throw new Error(
      "No se encontró el número de comprobante AFIP. El backend debe persistir punto de venta y número en la venta, o exponer GET /api/sales/:id/comprobante-arca con la respuesta guardada del facturador."
    )
  }

  const condicionVentaPdf = condicionVentaLabelFromPayload(facturarPayload)
  const clienteForDoc =
    cliente ?? saleToClienteSnapshot(sale) ?? (saleSnapshot ? saleToClienteSnapshot(saleSnapshot) : null)
  const fromSaleRequest = skipSaleRequestOverlay
    ? ({} as ReturnType<typeof extractDocFromArcaRequest>)
    : extractDocFromArcaRequest(sale)
  const fromQr = parseAfipQrReceptorDoc(emision.qrUrl)
  const mergedPayload = {
    ...facturarPayload,
    ...fromSaleRequest,
    ...(fromQr.docNro ? { docTipo: fromQr.docTipo ?? 80, docNro: fromQr.docNro } : {}),
  }
  const docHints =
    fromQr.docNro && fromQr.docNro > 0
      ? fromQr
      : fromSaleRequest.docNro && fromSaleRequest.docNro > 0
        ? { docTipo: fromSaleRequest.docTipo ?? 80, docNro: fromSaleRequest.docNro }
        : undefined
  const { docTipo, docNro } = resolveReceptorDocForInvoicePdf(
    mergedPayload,
    clienteForDoc,
    docHints
  )
  const condicionIva = facturarPayload.condicionIvaReceptor ?? 5
  const totalFromItems = items.reduce((sum, item) => sum + lineSubtotal(item), 0)
  const total = toNumber(
    emision.importe ?? (itemsOverride && itemsOverride.length > 0 ? totalFromItems : sale.total_amount)
  )
  const saleCurrency = String(sale.currency ?? "ARS").toUpperCase() === "USD" ? "USD" : "ARS"
  const tipoCambio =
    saleCurrency === "USD" && sale.exchange_rate != null
      ? toNumber(sale.exchange_rate, 1)
      : 1
  const afipMoneda = saleCurrency === "USD" ? "DOL" : "PES"
  const lineItemsForIva = items.map((item) => ({
    subtotal: lineSubtotal(item),
    iva_rate: normalizeSaleIvaRate(item.iva_rate),
  }))
  const ivaBreakdown = computeSaleIvaBreakdown(lineItemsForIva)
  const ivaDiscriminado = buildArcaIvaDiscriminado(lineItemsForIva)
  const ivaContenido = ivaBreakdown.ivaTotal

  const fechaEmision =
    emision.fechaEmision?.slice(0, 10) ??
    new Date(sale.sale_date || sale.created_at).toISOString().slice(0, 10)

  const cuitEmisor =
    emision.cuitEmisor?.replace(/\D/g, "") ||
    getStoredFacturacionCuitEmisor() ||
    process.env.NEXT_PUBLIC_FACTURADOR_CUIT_EMISOR?.replace(/\D/g, "") ||
    ""

  const qrUrl =
    numeroMissing && previewAllowMissingNumero
      ? ""
      : emision.qrUrl ??
        buildAfipQrUrl({
          fechaEmision,
          cuitEmisor: cuitEmisor || "0",
          puntoVenta,
          tipoComprobante: tipo,
          numeroComprobante: numero,
          importe: total,
          moneda: afipMoneda,
          cotizacion: tipoCambio,
          docTipoReceptor: docTipo,
          docNroReceptor: docNro,
          cae: emision.cae,
        })

  const receptorNombre =
    cliente?.name ?? saleSnapshot?.client_name ?? (docNro === 0 ? "" : "Consumidor final")

  return {
    emisor: {
      razonSocial: EMISOR_DEFAULT.razonSocial,
      domicilio: EMISOR_DEFAULT.domicilio,
      condicionIva: EMISOR_DEFAULT.condicionIva,
      cuit: cuitEmisor,
      ingresosBrutos: EMISOR_DEFAULT.ingresosBrutos,
      inicioActividades: EMISOR_DEFAULT.inicioActividades,
    },
    comprobante: {
      tipo,
      puntoVenta,
      numero,
      fechaEmision,
      concepto: (facturarPayload.concepto ?? 1) as 1 | 2 | 3,
    },
    receptor: {
      razonSocial: receptorNombre,
      docTipo,
      docNro,
      condicionIvaLabel: labelCondicionIvaReceptorForDisplay(condicionIva, cliente),
      domicilio: [cliente?.address, cliente?.city].filter(Boolean).join(", ") || undefined,
    },
    items: items.map((item) => {
      const rate = normalizeSaleIvaRate(item.iva_rate)
      const unitIncl = toNumber(item.unit_price)
      const lineIncl = lineSubtotal(item)
      return {
        codigo: saleItemCodigo(item),
        descripcion: saleItemDescription(item, catalogNames),
        cantidad: toNumber(item.quantity),
        unidadMedida: "unidades",
        precioUnitario: netFromInclusiveAmount(unitIncl, rate),
        bonificacionPct: 0,
        subtotal: netFromInclusiveAmount(lineIncl, rate),
        alicuotaIva: formatAlicuotaIvaArca(rate),
        subtotalConIva: lineIncl,
      }
    }),
    totales: {
      otrosTributos: 0,
      total,
      ivaDiscriminado,
      ivaContenido: ivaContenido > 0 ? ivaContenido : null,
    },
    cae: emision.cae,
    caeVencimiento: emision.vencimientoCaeIso,
    qrUrl,
    condicionVenta: condicionVentaPdf,
    pagina: "1/1",
    comprobanteIncompleto: numeroMissing && previewAllowMissingNumero,
    previewAviso: previewAviso ?? undefined,
    moneda: afipMoneda,
    tipoCambio,
    currencySymbol: saleCurrency === "USD" ? "U$S" : "$",
  }
}


export interface BuildArcaInvoicePreviewFromLinesArgs {
  facturarPayload: FacturarSaleRequest
  lines: FacturacionPreviewLine[]
  receptorRazonSocial: string
  cliente?: Cliente | null
  fechaEmision?: string | null
  totalAmount: number
  /** Moneda de la venta (USD → preview en DOL) */
  saleCurrency?: string | null
  exchangeRate?: number | null
  /** Tipo WSFE (factura o nota de crédito). Por defecto `facturarPayload.tipo`. */
  tipoComprobante?: number
  /** Aviso en el borrador (ej. comprobante asociado en NC). */
  previewAviso?: string | null
}

/** Borrador visual del comprobante ARCA antes de emitir (sin CAE, número ni QR). */
export function buildArcaInvoicePdfInputFromPreviewLines(
  args: BuildArcaInvoicePreviewFromLinesArgs
): GenerateArcaInvoicePdfParams {
  const payload = mergeFacturarSaleRequestBody(args.facturarPayload)
  const tipo = args.tipoComprobante ?? toNumber(payload.tipo, 6)
  const puntoVenta = toNumber(payload.puntoVenta ?? getStoredFacturacionPuntoVenta(), 1)
  const { docTipo, docNro } = resolveReceptorDocForInvoicePdf(payload, args.cliente)
  const condicionIva = payload.condicionIvaReceptor ?? 5
  const requiereIva = facturadorTipoRequiereIva(tipo)

  const lineItemsForIva = args.lines.map((line) => ({
    subtotal: line.subtotal,
    iva_rate: line.ivaRate,
  }))
  const ivaBreakdown = computeSaleIvaBreakdown(lineItemsForIva)
  const ivaDiscriminado = requiereIva ? buildArcaIvaDiscriminado(lineItemsForIva) : {
    netoGravado: 0,
    iva27: 0,
    iva21: 0,
    iva105: 0,
    iva5: 0,
    iva25: 0,
    iva0: 0,
  }

  const fechaEmision =
    args.fechaEmision?.slice(0, 10) ?? new Date().toISOString().slice(0, 10)

  const cuitEmisor =
    payload.cuitEmisor?.replace(/\D/g, "") ||
    getStoredFacturacionCuitEmisor() ||
    process.env.NEXT_PUBLIC_FACTURADOR_CUIT_EMISOR?.replace(/\D/g, "") ||
    ""

  const condicionVentaPdf = condicionVentaLabelFromPayload(payload)
  const saleCurrency = String(args.saleCurrency ?? "ARS").toUpperCase() === "USD" ? "USD" : "ARS"
  const tipoCambio =
    saleCurrency === "USD" && args.exchangeRate != null
      ? toNumber(args.exchangeRate, 1)
      : 1
  const afipMoneda = saleCurrency === "USD" ? "DOL" : "PES"

  return {
    emisor: {
      razonSocial: EMISOR_DEFAULT.razonSocial,
      domicilio: EMISOR_DEFAULT.domicilio,
      condicionIva: EMISOR_DEFAULT.condicionIva,
      cuit: cuitEmisor,
      ingresosBrutos: EMISOR_DEFAULT.ingresosBrutos,
      inicioActividades: EMISOR_DEFAULT.inicioActividades,
    },
    comprobante: {
      tipo,
      puntoVenta,
      numero: 0,
      fechaEmision,
      concepto: (payload.concepto ?? 1) as 1 | 2 | 3,
    },
    receptor: {
      razonSocial: args.receptorRazonSocial,
      docTipo,
      docNro,
      condicionIvaLabel: labelCondicionIvaReceptorForDisplay(condicionIva, args.cliente),
      domicilio: [args.cliente?.address, args.cliente?.city].filter(Boolean).join(", ") || undefined,
    },
    items: args.lines.map((line, index) => ({
      codigo: String(index + 1),
      descripcion: line.description,
      cantidad: line.quantity,
      unidadMedida: "unidades",
      precioUnitario: requiereIva
        ? netFromInclusiveAmount(line.unitPrice, line.ivaRate)
        : line.unitPrice,
      bonificacionPct: 0,
      subtotal: requiereIva
        ? netFromInclusiveAmount(line.subtotal, line.ivaRate)
        : line.subtotal,
      alicuotaIva: requiereIva ? formatAlicuotaIvaArca(line.ivaRate) : "0%",
      subtotalConIva: line.subtotal,
    })),
    totales: {
      otrosTributos: 0,
      total: args.totalAmount,
      ivaDiscriminado,
      ivaContenido:
        requiereIva && ivaBreakdown.ivaTotal > 0 ? ivaBreakdown.ivaTotal : null,
    },
    cae: "",
    caeVencimiento: null,
    qrUrl: "",
    condicionVenta: condicionVentaPdf,
    pagina: "1/1",
    comprobanteIncompleto: true,
    previewAviso: args.previewAviso ?? undefined,
    moneda: afipMoneda,
    tipoCambio,
    currencySymbol: saleCurrency === "USD" ? "U$S" : "$",
  }
}
