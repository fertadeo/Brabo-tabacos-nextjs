/**
 * Tipos y datos de asientos contables para Libro Diario y Libro Mayor.
 * Cuando exista backend, reemplazar por llamadas a API.
 */

export interface AsientoLinea {
  cuentaCodigo: string
  debe: number
  haber: number
  descripcion?: string
}

export interface Asiento {
  id: string
  numero: number
  fecha: string // YYYY-MM-DD
  concepto: string
  circuito?: string
  lineas: AsientoLinea[]
}

export function getTotalDebe(asiento: Asiento): number {
  return asiento.lineas.reduce((sum, l) => sum + l.debe, 0)
}

export function getTotalHaber(asiento: Asiento): number {
  return asiento.lineas.reduce((sum, l) => sum + l.haber, 0)
}

/** Asientos de ejemplo ordenados por fecha (más reciente primero para libro diario). */
export const ASIENTOS_MOCK: Asiento[] = [
  {
    id: "1",
    numero: 1,
    fecha: "2026-02-01",
    concepto: "Apertura de ejercicio - Inversión inicial",
    circuito: "default",
    lineas: [
      { cuentaCodigo: "1.1.1.1", debe: 80_000, haber: 0 },
      { cuentaCodigo: "1.1.1.2", debe: 320_000, haber: 0 },
      { cuentaCodigo: "3.1.2", debe: 0, haber: 400_000 },
    ],
  },
  {
    id: "2",
    numero: 2,
    fecha: "2026-02-02",
    concepto: "Venta contado - Factura 0001-00000001",
    circuito: "ventas",
    lineas: [
      { cuentaCodigo: "1.1.1.1", debe: 121_000, haber: 0 },
      { cuentaCodigo: "4.1.1.1", debe: 0, haber: 100_000 },
      { cuentaCodigo: "2.1.3.1", debe: 0, haber: 21_000 },
    ],
  },
  {
    id: "3",
    numero: 3,
    fecha: "2026-02-03",
    concepto: "Compra mercadería - Proveedor XYZ",
    circuito: "compras",
    lineas: [
      { cuentaCodigo: "4.1.2.1", debe: 50_000, haber: 0 },
      { cuentaCodigo: "1.1.3.10", debe: 10_500, haber: 0 },
      { cuentaCodigo: "2.1.1.1", debe: 0, haber: 60_500 },
    ],
  },
  {
    id: "4",
    numero: 4,
    fecha: "2026-02-04",
    concepto: "Pago a proveedor - Transferencia",
    circuito: "default",
    lineas: [
      { cuentaCodigo: "2.1.1.1", debe: 60_500, haber: 0 },
      { cuentaCodigo: "1.1.1.2", debe: 0, haber: 60_500 },
    ],
  },
  {
    id: "5",
    numero: 5,
    fecha: "2026-02-05",
    concepto: "Sueldos y cargas sociales - Enero 2026",
    circuito: "default",
    lineas: [
      { cuentaCodigo: "4.1.3.11", debe: 180_000, haber: 0 },
      { cuentaCodigo: "4.1.3.12", debe: 54_000, haber: 0 },
      { cuentaCodigo: "2.1.4.2", debe: 0, haber: 180_000 },
      { cuentaCodigo: "2.1.4.1", debe: 0, haber: 54_000 },
    ],
  },
  {
    id: "6",
    numero: 6,
    fecha: "2026-02-05",
    concepto: "Venta contado - Factura 0001-00000002",
    circuito: "ventas",
    lineas: [
      { cuentaCodigo: "1.1.1.2", debe: 242_000, haber: 0 },
      { cuentaCodigo: "4.1.1.1", debe: 0, haber: 200_000 },
      { cuentaCodigo: "2.1.3.1", debe: 0, haber: 42_000 },
    ],
  },
]

/** Libro diario: asientos ordenados por fecha descendente (más reciente primero). */
export function getAsientosLibroDiario(): Asiento[] {
  return [...ASIENTOS_MOCK].sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
  )
}

export interface MovimientoMayor {
  fecha: string
  asientoNumero: number
  concepto: string
  debe: number
  haber: number
  saldo: number
}

/**
 * Movimientos del libro mayor para una cuenta.
 * Incluye solo líneas cuya cuenta coincide exactamente con cuentaCodigo.
 * Saldo acumulado: para Activo y Resultados (deudores) saldo = sum(debe) - sum(haber);
 * para Pasivo y Patrimonio (acreedores) mismo cálculo (positivo = saldo acreedor).
 */
export function getMovimientosMayor(
  asientos: Asiento[],
  cuentaCodigo: string
): MovimientoMayor[] {
  const lineas: { fecha: string; asientoNumero: number; concepto: string; debe: number; haber: number }[] = []
  for (const a of asientos) {
    for (const l of a.lineas) {
      if (l.cuentaCodigo !== cuentaCodigo) continue
      if (l.debe === 0 && l.haber === 0) continue
      lineas.push({
        fecha: a.fecha,
        asientoNumero: a.numero,
        concepto: a.concepto,
        debe: l.debe,
        haber: l.haber,
      })
    }
  }
  // Ordenar por fecha y número de asiento
  lineas.sort((x, y) => {
    const d = x.fecha.localeCompare(y.fecha)
    if (d !== 0) return d
    return x.asientoNumero - y.asientoNumero
  })
  let saldo = 0
  return lineas.map((l) => {
    saldo += l.debe - l.haber
    return { ...l, saldo }
  })
}

/** Fila del reporte Sumas y Saldos (balance de comprobación). */
export interface FilaSumasSaldos {
  codigo: string
  cuentaNombre: string
  saldoAnterior: number
  debitos: number
  creditos: number
  saldoFinal: number
  debitosAjustados: number
  creditosAjustados: number
  saldoFinalAjustado: number
}

/**
 * Genera el reporte Sumas y Saldos para el período y circuito dados.
 * Incluye todas las cuentas movibles; saldo anterior en mock es 0.
 */
export function getSumasYSaldos(
  asientos: Asiento[],
  opts: {
    desde?: string
    hasta?: string
    circuito?: string
  },
  cuentas: { codigo: string; nombre: string }[]
): FilaSumasSaldos[] {
  const desde = opts.desde ? new Date(opts.desde).getTime() : 0
  const hasta = opts.hasta ? new Date(opts.hasta).getTime() : Number.MAX_SAFE_INTEGER

  const filtrados = asientos.filter((a) => {
    const t = new Date(a.fecha).getTime()
    if (t < desde || t > hasta) return false
    if (opts.circuito && opts.circuito !== "todos" && a.circuito !== opts.circuito) return false
    return true
  })

  const map = new Map<string, { debitos: number; creditos: number }>()
  for (const a of filtrados) {
    for (const l of a.lineas) {
      const prev = map.get(l.cuentaCodigo) ?? { debitos: 0, creditos: 0 }
      prev.debitos += l.debe
      prev.creditos += l.haber
      map.set(l.cuentaCodigo, prev)
    }
  }

  const filas: FilaSumasSaldos[] = []
  for (const c of cuentas) {
    const mov = map.get(c.codigo) ?? { debitos: 0, creditos: 0 }
    const saldoAnterior = 0
    const saldoFinal = saldoAnterior + mov.debitos - mov.creditos
    filas.push({
      codigo: c.codigo,
      cuentaNombre: c.nombre,
      saldoAnterior,
      debitos: mov.debitos,
      creditos: mov.creditos,
      saldoFinal,
      debitosAjustados: mov.debitos,
      creditosAjustados: mov.creditos,
      saldoFinalAjustado: saldoFinal,
    })
  }

  return filas.sort((a, b) => a.codigo.localeCompare(b.codigo))
}
