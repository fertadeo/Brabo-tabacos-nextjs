/**
 * Metadatos de atajos (descripción + acento de color) para ítems del sidebar.
 * Las rutas y permisos siguen viniendo de MENU_GROUPS.
 */

export type AtajoAccent =
  | "blue"
  | "violet"
  | "green"
  | "amber"
  | "orange"
  | "rose"
  | "cyan"
  | "red"
  | "slate"

export const ATAJO_ACCENT_CLASS: Record<
  AtajoAccent,
  { wrap: string; icon: string }
> = {
  blue: {
    wrap: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
    icon: "text-blue-600 dark:text-blue-400",
  },
  violet: {
    wrap: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
    icon: "text-violet-600 dark:text-violet-400",
  },
  green: {
    wrap: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    icon: "text-emerald-600 dark:text-emerald-400",
  },
  amber: {
    wrap: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    icon: "text-amber-600 dark:text-amber-400",
  },
  orange: {
    wrap: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
    icon: "text-orange-600 dark:text-orange-400",
  },
  rose: {
    wrap: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
    icon: "text-rose-600 dark:text-rose-400",
  },
  cyan: {
    wrap: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",
    icon: "text-cyan-600 dark:text-cyan-400",
  },
  red: {
    wrap: "bg-red-500/15 text-red-600 dark:text-red-400",
    icon: "text-red-600 dark:text-red-400",
  },
  slate: {
    wrap: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
    icon: "text-slate-600 dark:text-slate-300",
  },
}

const META: Record<string, { description: string; accent: AtajoAccent }> = {
  dashboard: { description: "Resumen del día y del mes.", accent: "blue" },
  productos: { description: "Catálogo, stock y precios.", accent: "cyan" },
  "actualizacion-precios": {
    description: "Actualización masiva de listas.",
    accent: "amber",
  },
  categorias: { description: "Árbol de categorías del catálogo.", accent: "slate" },
  ventas: { description: "Pedidos y comprobantes.", accent: "green" },
  "punto-venta": { description: "Cobro rápido en mostrador.", accent: "green" },
  preventa: { description: "Pedidos en calle / preventa.", accent: "orange" },
  "pedidos-calle": { description: "Pedidos canal preventa.", accent: "orange" },
  clientes: { description: "Fichas y cuenta corriente.", accent: "violet" },
  pedidos: { description: "Preparación y despacho.", accent: "blue" },
  reparto: { description: "Ruta y hoja de entrega.", accent: "cyan" },
  presupuestos: { description: "Cotizaciones a clientes.", accent: "amber" },
  facturacion: { description: "Comprobantes fiscales.", accent: "blue" },
  reparaciones: { description: "Órdenes de servicio técnico.", accent: "rose" },
  tienda: { description: "Canal tienda online.", accent: "violet" },
  "contabilidad-inicio": { description: "Panel contable.", accent: "slate" },
  "asientos-manuales": { description: "Asientos cargados a mano.", accent: "slate" },
  "asientos-nuevo": { description: "Nuevo asiento contable.", accent: "slate" },
  "libro-diario": { description: "Libro diario.", accent: "slate" },
  "libro-mayor": { description: "Libro mayor.", accent: "slate" },
  "sumas-saldos": { description: "Sumas y saldos.", accent: "slate" },
  "plan-cuentas": { description: "Plan de cuentas.", accent: "slate" },
  "ejercicios-contables": { description: "Ejercicios contables.", accent: "slate" },
  "reportes-contables": { description: "Reportes contables.", accent: "blue" },
  proveedores: { description: "Altas y facturas de proveedor.", accent: "orange" },
  bancos: { description: "Cuentas bancarias.", accent: "cyan" },
  "centro-cuentas": { description: "Usuarios y accesos.", accent: "violet" },
  configuracion: { description: "Roles, permisos y sistema.", accent: "slate" },
  "salud-sistema": { description: "Diagnóstico técnico del ERP.", accent: "red" },
}

/** Orden preferido en “Más usados” si aún no hay historial local. */
export const ATAJOS_DEFAULT_ORDER = [
  "dashboard",
  "clientes",
  "ventas",
  "punto-venta",
  "presupuestos",
  "pedidos",
  "reparto",
  "productos",
  "facturacion",
  "preventa",
  "proveedores",
] as const

export function getAtajoMeta(id: string): { description: string; accent: AtajoAccent } {
  return META[id] || { description: "Abrir módulo.", accent: "slate" }
}

const USAGE_KEY = "erp-atajos-usage-v1"

export function readAtajosUsage(): Record<string, number> {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(USAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, number>
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

export function bumpAtajoUsage(id: string): void {
  if (typeof window === "undefined") return
  try {
    const usage = readAtajosUsage()
    usage[id] = (usage[id] || 0) + 1
    localStorage.setItem(USAGE_KEY, JSON.stringify(usage))
  } catch {
    /* ignore quota */
  }
}
