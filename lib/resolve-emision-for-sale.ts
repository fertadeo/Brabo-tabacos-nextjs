import type { Sale } from "@/lib/api"
import type { FacturacionEmisionData } from "@/lib/facturacion-errors"
import { vencimientoCaeAfipAIso } from "@/lib/facturacion-errors"
import { getCachedFacturacionEmision } from "@/lib/facturacion-emision-cache"
import {
  buildDefaultFacturarFormRequest,
  getStoredFacturacionCuitEmisor,
  getStoredFacturacionPuntoVenta,
} from "@/lib/facturacion-settings"
import type { FacturarSaleRequest } from "@/lib/api"

function normalizeCaeVtoFromSale(vto: string | null | undefined): string | null {
  if (!vto?.trim()) return null
  const raw = vto.trim()
  const digits = raw.replace(/\D/g, "")
  if (digits.length === 8) return vencimientoCaeAfipAIso(digits)
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10)
  return raw
}

/** Combina venta persistida + caché de sesión para armar el comprobante en pantalla/PDF. */
export function resolveEmisionForSaleView(sale: Sale): {
  emision: FacturacionEmisionData
  facturarPayload: FacturarSaleRequest
} | null {
  const cached = getCachedFacturacionEmision(sale.id)
  const cae = sale.arca_cae?.trim() || cached?.emision.cae?.trim()
  if (!cae) return null

  const defaults = buildDefaultFacturarFormRequest()
  const facturarPayload = cached?.facturarPayload ?? defaults

  const emision: FacturacionEmisionData = {
    cae,
    vencimientoCaeIso:
      cached?.emision.vencimientoCaeIso ?? normalizeCaeVtoFromSale(sale.arca_cae_vto),
    facturaId: sale.arca_factura_id ?? cached?.emision.facturaId ?? null,
    numero: cached?.emision.numero ?? null,
    puntoVenta:
      cached?.emision.puntoVenta ??
      facturarPayload.puntoVenta ??
      getStoredFacturacionPuntoVenta() ??
      null,
    tipo: cached?.emision.tipo ?? facturarPayload.tipo ?? defaults.tipo ?? 6,
    qrUrl: cached?.emision.qrUrl ?? null,
    fechaEmision:
      cached?.emision.fechaEmision ??
      (sale.sale_date ? String(sale.sale_date).slice(0, 10) : null),
    cuitEmisor: cached?.emision.cuitEmisor ?? getStoredFacturacionCuitEmisor() ?? null,
    importe: cached?.emision.importe ?? sale.total_amount,
  }

  return { emision, facturarPayload }
}
