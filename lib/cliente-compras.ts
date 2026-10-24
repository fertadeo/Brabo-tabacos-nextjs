import {
  getSales,
  getOrders,
  type Sale,
  type Order,
  type OrderItem,
  type SaleItemResponse,
} from "@/lib/api"

export interface ClienteCompra {
  id: string
  fecha: string
  fechaSort: string
  producto: string
  cantidad: number
  precioUnitario: number
  total: number
  estado: "Entregado" | "En Proceso" | "Cancelado"
  vendedor?: string
  metodoPago: string
  origen: "venta" | "pedido"
  referenciaId: number
}

export interface ClienteFactura {
  id: string
  numero: string
  fecha: string
  monto: number
  estado: string
  origen: "sistema" | "importada"
  vencimiento?: string
  tipo: string
  saleId?: number
}

export interface ClienteComprasStats {
  totalMonto: number
  totalTransacciones: number
  entregadas: number
  enProceso: number
  canceladas: number
  ultimaCompra: string | null
  promedioMonto: number
  topProductos: { nombre: string; cantidad: number }[]
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
  mixto: "Mixto",
}

function formatPaymentMethod(method?: string | null, title?: string | null): string {
  if (title?.trim()) return title.trim()
  if (!method) return "N/A"
  return PAYMENT_METHOD_LABELS[method.toLowerCase()] ?? method
}

function formatDateDisplay(dateStr: string): string {
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString("es-AR")
}

function mapOrderStatus(
  status: string,
  remitoStatus?: string
): ClienteCompra["estado"] {
  const normalized = status.toLowerCase()
  if (normalized === "cancelado" || normalized === "cancelled") return "Cancelado"
  if (
    normalized === "completado" ||
    normalized === "pagado" ||
    remitoStatus === "remito_entregado"
  ) {
    return "Entregado"
  }
  return "En Proceso"
}

function itemProductName(item: SaleItemResponse | OrderItem): string {
  const name =
    ("product_name" in item && item.product_name) ||
    item.description ||
    ("product_code" in item && item.product_code) ||
    "Producto"
  return String(name)
}

function saleToCompras(sale: Sale & { created_by_name?: string }): ClienteCompra[] {
  const fecha = sale.sale_date || sale.created_at
  const metodoPago = formatPaymentMethod(sale.payment_method)
  const vendedor = sale.created_by_name ?? undefined
  const items = sale.items ?? []

  if (items.length === 0) {
    return [
      {
        id: `V-${sale.sale_number || sale.id}`,
        fecha: formatDateDisplay(fecha),
        fechaSort: fecha,
        producto: `Venta ${sale.sale_number || sale.id}`,
        cantidad: 1,
        precioUnitario: Number(sale.total_amount) || 0,
        total: Number(sale.total_amount) || 0,
        estado: "Entregado",
        vendedor,
        metodoPago,
        origen: "venta",
        referenciaId: sale.id,
      },
    ]
  }

  return items.map((item, index) => {
    const qty = Number(item.quantity) || 1
    const unit = Number(item.unit_price) || 0
    const total = Number(item.subtotal ?? item.total_price ?? qty * unit) || 0
    return {
      id: `V-${sale.sale_number || sale.id}-${index + 1}`,
      fecha: formatDateDisplay(fecha),
      fechaSort: fecha,
      producto: itemProductName(item),
      cantidad: qty,
      precioUnitario: unit,
      total,
      estado: "Entregado" as const,
      vendedor,
      metodoPago,
      origen: "venta" as const,
      referenciaId: sale.id,
    }
  })
}

function orderToCompras(order: Order): ClienteCompra[] {
  const fecha = order.order_date || order.created_at
  const estado = mapOrderStatus(order.status, order.remito_status)
  const metodoPago = formatPaymentMethod(
    order.payment_method,
    order.payment_method_title
  )
  const vendedor = order.seller ?? order.responsible ?? undefined
  const orderLabel = order.order_number || `#${order.id}`
  const items = order.items ?? []

  if (items.length === 0) {
    const total = Number(order.total_amount) || 0
    return [
      {
        id: `P-${orderLabel}`,
        fecha: formatDateDisplay(fecha),
        fechaSort: fecha,
        producto: `Pedido ${orderLabel}`,
        cantidad: 1,
        precioUnitario: total,
        total,
        estado,
        vendedor,
        metodoPago,
        origen: "pedido",
        referenciaId: order.id,
      },
    ]
  }

  return items.map((item, index) => {
    const qty = Number(item.quantity) || 1
    const unit = Number(item.unit_price) || 0
    const total = Number(item.subtotal ?? qty * unit) || 0
    return {
      id: `P-${orderLabel}-${index + 1}`,
      fecha: formatDateDisplay(fecha),
      fechaSort: fecha,
      producto: itemProductName(item),
      cantidad: qty,
      precioUnitario: unit,
      total,
      estado,
      vendedor,
      metodoPago,
      origen: "pedido" as const,
      referenciaId: order.id,
    }
  })
}

/** Carga ventas POS y pedidos del cliente y los unifica como líneas de compra. */
export async function fetchClienteCompras(clientId: number): Promise<ClienteCompra[]> {
  const [salesResult, ordersResult] = await Promise.allSettled([
    getSales({ client_id: clientId, limit: 100, include_items: true }),
    getOrders({ client_id: clientId, limit: 100 }),
  ])

  const compras: ClienteCompra[] = []

  if (salesResult.status === "fulfilled") {
    const sales = salesResult.value.data?.sales ?? []
    for (const sale of sales) {
      compras.push(...saleToCompras(sale))
    }
  } else {
    console.error("[CLIENTE-COMPRAS] Error al cargar ventas:", salesResult.reason)
  }

  if (ordersResult.status === "fulfilled") {
    const orders = ordersResult.value.data?.orders ?? []
    for (const order of orders) {
      compras.push(...orderToCompras(order))
    }
  } else {
    console.error("[CLIENTE-COMPRAS] Error al cargar pedidos:", ordersResult.reason)
  }

  return compras.sort(
    (a, b) => new Date(b.fechaSort).getTime() - new Date(a.fechaSort).getTime()
  )
}

function mapArcaTipo(tipo?: number | null): string {
  if (tipo === 1) return "Factura A"
  if (tipo === 6) return "Factura B"
  if (tipo === 11) return "Factura C"
  return "Factura"
}

/** Facturas emitidas vía ARCA asociadas a ventas del cliente. */
export async function fetchClienteFacturas(clientId: number): Promise<ClienteFactura[]> {
  try {
    const result = await getSales({ client_id: clientId, limit: 100 })
    const sales = result.data?.sales ?? []
    return sales
      .filter((s) => s.arca_status === "success" || Boolean(s.arca_cae))
      .map((s) => ({
        id: `FAC-${s.id}`,
        numero:
          s.arca_punto_venta != null && s.arca_numero != null
            ? `${String(s.arca_punto_venta).padStart(4, "0")}-${String(s.arca_numero).padStart(8, "0")}`
            : s.sale_number || `#${s.id}`,
        fecha: formatDateDisplay(s.arca_fecha_emision || s.sale_date || s.created_at),
        monto: Number(s.total_amount) || 0,
        estado: s.arca_cae ? "Emitida" : "Pendiente",
        origen:
          s.sale_source === "imported"
            ? ("importada" as const)
            : s.sale_source === "pos_external"
              ? ("vinculada" as const)
              : ("sistema" as const),
        vencimiento: s.arca_cae_vto ? formatDateDisplay(s.arca_cae_vto) : undefined,
        tipo: mapArcaTipo(s.arca_tipo),
        saleId: s.id,
      }))
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
  } catch (err) {
    console.error("[CLIENTE-COMPRAS] Error al cargar facturas:", err)
    return []
  }
}

export function computeClienteComprasStats(compras: ClienteCompra[]): ClienteComprasStats {
  const totalMonto = compras.reduce((sum, c) => sum + c.total, 0)
  const referencias = new Set(compras.map((c) => `${c.origen}-${c.referenciaId}`))
  const entregadas = compras.filter((c) => c.estado === "Entregado").length
  const enProceso = compras.filter((c) => c.estado === "En Proceso").length
  const canceladas = compras.filter((c) => c.estado === "Cancelado").length

  const productMap = new Map<string, number>()
  for (const c of compras) {
    if (c.estado === "Cancelado") continue
    productMap.set(c.producto, (productMap.get(c.producto) ?? 0) + c.cantidad)
  }
  const topProductos = [...productMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([nombre, cantidad]) => ({ nombre, cantidad }))

  return {
    totalMonto,
    totalTransacciones: referencias.size,
    entregadas,
    enProceso,
    canceladas,
    ultimaCompra: compras.length > 0 ? compras[0].fecha : null,
    promedioMonto: referencias.size > 0 ? totalMonto / referencias.size : 0,
    topProductos,
  }
}
