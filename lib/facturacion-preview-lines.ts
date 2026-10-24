import {

  getFacturarSugerencia,

  getRepairOrderItems,

  getSale,

  parseFacturarSugerenciaDefaults,

  type FacturarSugerenciaIvaLine,

  type RepairOrderItem,

  type SaleItemResponse,

} from "@/lib/api"

import type { BillableRow } from "@/lib/facturacion-billables"

import { getSaleItemDisplayName } from "@/lib/sale-items"

import { normalizeSaleIvaRate, type SaleIvaRate } from "@/lib/sale-iva"



export interface FacturacionPreviewLine {

  description: string

  quantity: number

  unitPrice: number

  subtotal: number

  ivaRate: SaleIvaRate

  /** Neto gravado (desde sugerencia API o cálculo local). */

  neto?: number

  /** IVA discriminado de la línea. */

  iva?: number

}



export interface FacturacionPreviewResult {

  lines: FacturacionPreviewLine[]

  totalAmount?: number

  netoTotal?: number

  ivaTotal?: number

  /** Fecha comercial de la venta (desde sugerencia API). */

  saleDate?: string

  /** Fecha del comprobante que enviará el backend al facturar. */

  fechaCbte?: string

}



function parseMoney(value: string | number | undefined | null): number {

  if (typeof value === "number" && !Number.isNaN(value)) return value

  if (typeof value === "string") {

    const n = parseFloat(value.replace(",", "."))

    return Number.isNaN(n) ? 0 : n

  }

  return 0

}



function mapSugerenciaLine(line: FacturarSugerenciaIvaLine): FacturacionPreviewLine {

  const subtotal = parseMoney(line.lineTotal)

  const qty = line.quantity && line.quantity > 0 ? line.quantity : 1

  const unitPrice =

    line.unitPrice != null && line.unitPrice > 0

      ? parseMoney(line.unitPrice)

      : subtotal / qty



  return {

    description: line.descripcion,

    quantity: qty,

    unitPrice,

    subtotal,

    ivaRate: normalizeSaleIvaRate(line.ivaRate),

    neto: parseMoney(line.neto),

    iva: parseMoney(line.iva),

  }

}



export function mapSaleItemsToPreviewLines(items: SaleItemResponse[]): FacturacionPreviewLine[] {
  return mapSaleItems(items)
}

function mapSaleItems(items: SaleItemResponse[]): FacturacionPreviewLine[] {

  return items.map((item) => {

    const subtotal =

      item.subtotal ?? item.total_price ?? item.quantity * parseMoney(item.unit_price)

    return {

      description: getSaleItemDisplayName(item),

      quantity: item.quantity,

      unitPrice: parseMoney(item.unit_price),

      subtotal: parseMoney(subtotal),

      ivaRate: normalizeSaleIvaRate(item.iva_rate),

    }

  })

}



/** Empareja línea fiscal de sugerencia con ítem de venta (productId, descripción o índice). */
export function findMatchingIvaDesgloseLine(

  item: SaleItemResponse,

  index: number,

  desglose: FacturarSugerenciaIvaLine[]

): FacturarSugerenciaIvaLine | undefined {

  if (desglose.length === 0) return undefined



  if (item.product_id != null && item.product_id > 0) {

    const byProduct = desglose.find((line) => line.productId === item.product_id)

    if (byProduct) return byProduct

  }



  const name = getSaleItemDisplayName(item).trim().toLowerCase()

  if (name) {

    const byDesc = desglose.find((line) => line.descripcion.trim().toLowerCase() === name)

    if (byDesc) return byDesc

  }



  if (index < desglose.length) return desglose[index]

  return undefined

}



/** Cantidad y precio unitario desde la venta; neto/IVA desde sugerencia si hay match. */
export function mapSaleItemsWithIvaDesglose(

  saleItems: SaleItemResponse[],

  desglose: FacturarSugerenciaIvaLine[]

): FacturacionPreviewLine[] {

  return saleItems.map((item, index) => {

    const line = mapSaleItems([item])[0]

    const fiscal = findMatchingIvaDesgloseLine(item, index, desglose)

    if (!fiscal) return line

    return {

      ...line,

      neto: parseMoney(fiscal.neto),

      iva: parseMoney(fiscal.iva),

    }

  })

}



function buildPreviewFromSaleItems(

  saleItems: SaleItemResponse[],

  desglose: FacturarSugerenciaIvaLine[],

  opts: {

    saleDate?: string

    fechaCbte?: string

    totalAmount?: number

  } = {}

): FacturacionPreviewResult {

  const lines =

    saleItems.length > 0

      ? mapSaleItemsWithIvaDesglose(saleItems, desglose)

      : desglose.map(mapSugerenciaLine)

  const netoTotal = lines.reduce((acc, l) => acc + (l.neto ?? 0), 0)

  const ivaTotal = lines.reduce((acc, l) => acc + (l.iva ?? 0), 0)



  return {

    lines,

    totalAmount: opts.totalAmount,

    netoTotal: Math.round(netoTotal * 100) / 100,

    ivaTotal: Math.round(ivaTotal * 100) / 100,

    saleDate: opts.saleDate,

    fechaCbte: opts.fechaCbte,

  }

}



function repairItemDescription(item: RepairOrderItem): string {

  return (

    item.product_name?.trim() ||

    item.description?.trim() ||

    item.product?.name?.trim() ||

    (item.product_id ? `Producto #${item.product_id}` : "Ítem")

  )

}



function mapRepairItems(items: RepairOrderItem[], laborAmount?: string | null): FacturacionPreviewLine[] {

  const lines: FacturacionPreviewLine[] = items.map((item) => ({

    description: repairItemDescription(item),

    quantity: item.quantity,

    unitPrice: parseMoney(item.unit_price),

    subtotal: parseMoney(item.total_price),

    ivaRate: normalizeSaleIvaRate(item.iva_rate),

  }))

  const labor = parseMoney(laborAmount)

  if (labor > 0) {

    lines.push({

      description: "Mano de obra",

      quantity: 1,

      unitPrice: labor,

      subtotal: labor,

      ivaRate: 21,

    })

  }

  return lines

}



/** Carga líneas de venta o reparación para el resumen previo a emitir en ARCA. */

export async function loadFacturacionPreviewLines(billable: BillableRow): Promise<FacturacionPreviewLine[]> {

  const result = await loadFacturacionPreview(billable)

  return result.lines

}

/** Formato legible para fechas YYYY-MM-DD o ISO de la API de facturación. */

export function formatFacturacionFecha(value?: string | null): string {

  if (!value?.trim()) return "—"

  const iso = value.trim().slice(0, 10)

  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {

    const [y, m, d] = iso.split("-")

    return `${d}/${m}/${y}`

  }

  try {

    return new Date(value).toLocaleDateString("es-AR")

  } catch {

    return value

  }

}



/** Carga preview fiscal; para ventas intenta GET /facturar/sugerencia primero. */

export async function loadFacturacionPreview(billable: BillableRow): Promise<FacturacionPreviewResult> {

  if (billable.kind === "sale") {

    const saleId = billable.sale?.id ?? billable.id

    const [saleRes, sugerencia] = await Promise.all([

      getSale(saleId).catch(() => null),

      getFacturarSugerencia(saleId).catch(() => null),

    ])



    const saleItems = saleRes?.data?.items?.length

      ? saleRes.data.items

      : (billable.sale?.items ?? [])

    const fiscalDates = sugerencia ? parseFacturarSugerenciaDefaults(sugerencia) : {}

    const desglose = sugerencia?.ivaDesglose ?? []



    return buildPreviewFromSaleItems(saleItems, desglose, {

      saleDate: fiscalDates.saleDate ?? saleRes?.data?.sale_date,

      fechaCbte: fiscalDates.fechaCbte,

      totalAmount: sugerencia ? parseMoney(sugerencia.totalAmount) : saleRes?.data?.total_amount,

    })

  }



  const order = billable.repairOrder

  if (billable.linkedSaleId) {

    try {

      const [saleRes, sugerencia] = await Promise.all([

        getSale(billable.linkedSaleId).catch(() => null),

        getFacturarSugerencia(billable.linkedSaleId).catch(() => null),

      ])



      const saleItems = saleRes?.data?.items ?? []

      const fiscalDates = sugerencia ? parseFacturarSugerenciaDefaults(sugerencia) : {}

      const desglose = sugerencia?.ivaDesglose ?? []



      if (saleItems.length > 0 || desglose.length > 0) {

        return buildPreviewFromSaleItems(saleItems, desglose, {

          saleDate: fiscalDates.saleDate ?? saleRes?.data?.sale_date,

          fechaCbte: fiscalDates.fechaCbte,

          totalAmount: sugerencia ? parseMoney(sugerencia.totalAmount) : saleRes?.data?.total_amount,

        })

      }

    } catch {

      /* venta vinculada aún no disponible */

    }

  }



  let items = order?.items

  if (!items?.length) {

    const res = await getRepairOrderItems(billable.id)

    items = res.data ?? []

  }

  return { lines: mapRepairItems(items, order?.labor_amount) }

}

