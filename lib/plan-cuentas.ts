/**
 * Plan de cuentas genérico tipo Argentina (compatible con ARCA/ex AFIP).
 * Estructura: Activo, Pasivo, Patrimonio Neto, Resultados.
 * Incluye créditos/deudas fiscales, IVA, retenciones y percepciones.
 */

export type Rama = "Activo" | "Pasivo" | "Patrimonio Neto" | "Resultados"

export interface CuentaPlan {
  codigo: string
  nombre: string
  rama: Rama
  /** Si es cuenta de movimiento (se pueden cargar asientos); false = solo agrupadora */
  movible?: boolean
  /** Nivel de anidación (1 = rubro principal) */
  nivel: number
}

/**
 * Plan de cuentas genérico - estructura completa del PDF de referencia.
 * Ordenado por código para vista jerárquica.
 */
export const PLAN_CUENTAS_DATA: CuentaPlan[] = [
  // ========== 1 ACTIVO ==========
  { codigo: "1", nombre: "Activo", rama: "Activo", movible: false, nivel: 1 },
  { codigo: "1.1", nombre: "Activo Corriente", rama: "Activo", movible: false, nivel: 2 },
  // Disponibilidades
  { codigo: "1.1.1.1", nombre: "Caja", rama: "Activo", movible: true, nivel: 4 },
  { codigo: "1.1.1.1.1", nombre: "Fondos Fijos", rama: "Activo", movible: true, nivel: 5 },
  { codigo: "1.1.1.2", nombre: "Banco", rama: "Activo", movible: true, nivel: 4 },
  { codigo: "1.1.1.3", nombre: "Valores a Depositar", rama: "Activo", movible: true, nivel: 4 },
  { codigo: "1.1.1.4", nombre: "Cheques Diferidos", rama: "Activo", movible: true, nivel: 4 },
  // Créditos por ventas
  { codigo: "1.1.2", nombre: "Créditos por Ventas", rama: "Activo", movible: false, nivel: 3 },
  // Créditos fiscales
  { codigo: "1.1.3", nombre: "Créditos Fiscales", rama: "Activo", movible: false, nivel: 3 },
  { codigo: "1.1.3.1", nombre: "Percepciones IIBB", rama: "Activo", movible: true, nivel: 4 },
  { codigo: "1.1.3.2", nombre: "Percepción de Ganancias Sufrida", rama: "Activo", movible: true, nivel: 4 },
  { codigo: "1.1.3.3", nombre: "Impuestos Internos Sufrida", rama: "Activo", movible: true, nivel: 4 },
  { codigo: "1.1.3.4", nombre: "Percepción Ingresos Brutos Sufrida", rama: "Activo", movible: true, nivel: 4 },
  { codigo: "1.1.3.5", nombre: "Retención Cargas Sociales Sufrida", rama: "Activo", movible: true, nivel: 4 },
  { codigo: "1.1.3.6", nombre: "Retención Ingresos Brutos Sufrida", rama: "Activo", movible: true, nivel: 4 },
  { codigo: "1.1.3.7", nombre: "Retención Ganancias Sufrida", rama: "Activo", movible: true, nivel: 4 },
  { codigo: "1.1.3.8", nombre: "Percepción de IVA Sufrida", rama: "Activo", movible: true, nivel: 4 },
  { codigo: "1.1.3.9", nombre: "Retención de IVA Sufrida", rama: "Activo", movible: true, nivel: 4 },
  { codigo: "1.1.3.10", nombre: "IVA Crédito Fiscal", rama: "Activo", movible: true, nivel: 4 },
  { codigo: "1.1.3.11", nombre: "Anticipo Imp. a las Ganancias", rama: "Activo", movible: true, nivel: 4 },
  { codigo: "1.1.3.12", nombre: "Saldo a Favor Técnico IVA", rama: "Activo", movible: true, nivel: 4 },
  { codigo: "1.1.3.13", nombre: "Otras Percepciones Sufridas", rama: "Activo", movible: true, nivel: 4 },
  { codigo: "1.1.3.14", nombre: "Otras Retenciones Sufridas", rama: "Activo", movible: true, nivel: 4 },
  { codigo: "1.1.4", nombre: "Otros Créditos", rama: "Activo", movible: true, nivel: 3 },
  { codigo: "1.1.5", nombre: "Bienes de Cambio", rama: "Activo", movible: true, nivel: 3 },
  { codigo: "1.1.6", nombre: "Inversiones CP", rama: "Activo", movible: true, nivel: 3 },
  { codigo: "1.2", nombre: "Activo No Corriente", rama: "Activo", movible: false, nivel: 2 },
  { codigo: "1.2.1", nombre: "Bienes de Uso", rama: "Activo", movible: true, nivel: 3 },
  { codigo: "1.2.2", nombre: "Activos Intangibles", rama: "Activo", movible: true, nivel: 3 },

  // ========== 2 PASIVO ==========
  { codigo: "2", nombre: "Pasivo", rama: "Pasivo", movible: false, nivel: 1 },
  { codigo: "2.1", nombre: "Pasivo Corriente", rama: "Pasivo", movible: false, nivel: 2 },
  { codigo: "2.1.1", nombre: "Deudas Comerciales", rama: "Pasivo", movible: false, nivel: 3 },
  { codigo: "2.1.1.1", nombre: "Proveedores", rama: "Pasivo", movible: true, nivel: 4 },
  { codigo: "2.1.1.2", nombre: "Compras", rama: "Pasivo", movible: true, nivel: 4 },
  { codigo: "2.1.2", nombre: "Deudas Bancarias", rama: "Pasivo", movible: true, nivel: 3 },
  { codigo: "2.1.3", nombre: "Deudas Fiscales", rama: "Pasivo", movible: false, nivel: 3 },
  { codigo: "2.1.3.1", nombre: "IVA Débito Fiscal", rama: "Pasivo", movible: true, nivel: 4 },
  { codigo: "2.1.3.2", nombre: "Percepción de Ganancias Efectuada", rama: "Pasivo", movible: true, nivel: 4 },
  { codigo: "2.1.3.3", nombre: "Impuestos Internos Efectuada", rama: "Pasivo", movible: true, nivel: 4 },
  { codigo: "2.1.3.4", nombre: "Percepción Ingresos Brutos Efectuada", rama: "Pasivo", movible: true, nivel: 4 },
  { codigo: "2.1.3.5", nombre: "Percepción de IVA Efectuada", rama: "Pasivo", movible: true, nivel: 4 },
  { codigo: "2.1.3.6", nombre: "Retención de IVA Efectuada", rama: "Pasivo", movible: true, nivel: 4 },
  { codigo: "2.1.3.7", nombre: "Retención Cargas Sociales Efectuada", rama: "Pasivo", movible: true, nivel: 4 },
  { codigo: "2.1.3.8", nombre: "Retención Ingresos Brutos Efectuada", rama: "Pasivo", movible: true, nivel: 4 },
  { codigo: "2.1.3.9", nombre: "Retención Ganancias Efectuada", rama: "Pasivo", movible: true, nivel: 4 },
  { codigo: "2.1.3.10", nombre: "IVA a pagar", rama: "Pasivo", movible: true, nivel: 4 },
  { codigo: "2.1.3.11", nombre: "Otras Retenciones Efectuadas", rama: "Pasivo", movible: true, nivel: 4 },
  { codigo: "2.1.3.12", nombre: "Otras Percepciones Efectuadas", rama: "Pasivo", movible: true, nivel: 4 },
  { codigo: "2.1.4", nombre: "Deudas Sociales", rama: "Pasivo", movible: false, nivel: 3 },
  { codigo: "2.1.4.1", nombre: "Cargas Sociales a pagar", rama: "Pasivo", movible: true, nivel: 4 },
  { codigo: "2.1.4.2", nombre: "Sueldos y Jornales a Pagar", rama: "Pasivo", movible: true, nivel: 4 },
  { codigo: "2.1.5", nombre: "Otras Deudas", rama: "Pasivo", movible: false, nivel: 3 },
  { codigo: "2.1.5.1", nombre: "Aportes Socios", rama: "Pasivo", movible: true, nivel: 4 },
  { codigo: "2.1.5.2", nombre: "Dividendos a Pagar", rama: "Pasivo", movible: true, nivel: 4 },
  { codigo: "2.1.5.3", nombre: "Sueldos a Pagar", rama: "Pasivo", movible: true, nivel: 4 },
  { codigo: "2.2", nombre: "Pasivo No Corriente", rama: "Pasivo", movible: false, nivel: 2 },
  { codigo: "2.2.1", nombre: "Deudas a Largo Plazo", rama: "Pasivo", movible: true, nivel: 3 },

  // ========== 3 PATRIMONIO NETO ==========
  { codigo: "3", nombre: "Patrimonio Neto", rama: "Patrimonio Neto", movible: false, nivel: 1 },
  { codigo: "3.1", nombre: "Capital", rama: "Patrimonio Neto", movible: false, nivel: 2 },
  { codigo: "3.1.1", nombre: "Ajuste de Capital", rama: "Patrimonio Neto", movible: true, nivel: 3 },
  { codigo: "3.1.2", nombre: "Capital Social", rama: "Patrimonio Neto", movible: true, nivel: 3 },
  { codigo: "3.2", nombre: "Resultados Acumulados", rama: "Patrimonio Neto", movible: false, nivel: 2 },
  { codigo: "3.2.1", nombre: "Resultado del Ejercicio", rama: "Patrimonio Neto", movible: true, nivel: 3 },
  { codigo: "3.3", nombre: "Reservas", rama: "Patrimonio Neto", movible: false, nivel: 2 },
  { codigo: "3.3.1", nombre: "Reserva Legal", rama: "Patrimonio Neto", movible: true, nivel: 3 },

  // ========== 4 RESULTADOS ==========
  { codigo: "4", nombre: "Resultados", rama: "Resultados", movible: false, nivel: 1 },
  { codigo: "4.1", nombre: "Resultados Operativos", rama: "Resultados", movible: false, nivel: 2 },
  { codigo: "4.1.1", nombre: "Ingreso por Venta", rama: "Resultados", movible: false, nivel: 3 },
  { codigo: "4.1.1.1", nombre: "Venta de Bienes", rama: "Resultados", movible: true, nivel: 4 },
  { codigo: "4.1.1.2", nombre: "Venta de Servicios", rama: "Resultados", movible: true, nivel: 4 },
  { codigo: "4.1.2", nombre: "Costo por Venta", rama: "Resultados", movible: false, nivel: 3 },
  { codigo: "4.1.2.1", nombre: "Costo de Mercadería Vendida", rama: "Resultados", movible: true, nivel: 4 },
  { codigo: "4.1.3", nombre: "Gastos Operativos", rama: "Resultados", movible: false, nivel: 3 },
  { codigo: "4.1.3.1", nombre: "Honorarios Profesionales", rama: "Resultados", movible: true, nivel: 4 },
  { codigo: "4.1.3.2", nombre: "Compra de Servicios", rama: "Resultados", movible: true, nivel: 4 },
  { codigo: "4.1.3.3", nombre: "Compra de Bienes", rama: "Resultados", movible: true, nivel: 4 },
  { codigo: "4.1.3.4", nombre: "Impuestos Internos", rama: "Resultados", movible: true, nivel: 4 },
  { codigo: "4.1.3.5", nombre: "Fletes Contratados", rama: "Resultados", movible: true, nivel: 4 },
  { codigo: "4.1.3.6", nombre: "Insumos de Oficina", rama: "Resultados", movible: true, nivel: 4 },
  { codigo: "4.1.3.7", nombre: "Gastos Varios", rama: "Resultados", movible: true, nivel: 4 },
  { codigo: "4.1.3.8", nombre: "Telefonía Celular", rama: "Resultados", movible: true, nivel: 4 },
  { codigo: "4.1.3.9", nombre: "Correo Internacional", rama: "Resultados", movible: true, nivel: 4 },
  { codigo: "4.1.3.10", nombre: "Gastos administrativos", rama: "Resultados", movible: true, nivel: 4 },
  { codigo: "4.1.3.11", nombre: "Sueldos y Jornales", rama: "Resultados", movible: true, nivel: 4 },
  { codigo: "4.1.3.12", nombre: "Cargas Sociales", rama: "Resultados", movible: true, nivel: 4 },
  { codigo: "4.2", nombre: "Resultados No Operativos", rama: "Resultados", movible: false, nivel: 2 },
  { codigo: "4.2.1", nombre: "Otros Ingresos", rama: "Resultados", movible: false, nivel: 3 },
  { codigo: "4.2.1.1", nombre: "Diferencia de Cambio (+)", rama: "Resultados", movible: true, nivel: 4 },
  { codigo: "4.2.1.2", nombre: "Ajuste por Redondeo Decimal", rama: "Resultados", movible: true, nivel: 4 },
  { codigo: "4.2.2", nombre: "Otros Egresos", rama: "Resultados", movible: false, nivel: 3 },
  { codigo: "4.2.2.1", nombre: "Diferencia de Cambio (-)", rama: "Resultados", movible: true, nivel: 4 },
  { codigo: "4.2.2.2", nombre: "Diferencia de Inventario", rama: "Resultados", movible: true, nivel: 4 },
  { codigo: "4.2.2.3", nombre: "Cheques Rechazados", rama: "Resultados", movible: true, nivel: 4 },
  { codigo: "4.2.2.4", nombre: "Impuesto a las Ganancias", rama: "Resultados", movible: true, nivel: 4 },
  { codigo: "4.3", nombre: "Resultados Financieros", rama: "Resultados", movible: false, nivel: 2 },
  { codigo: "4.3.1", nombre: "RECPAM", rama: "Resultados", movible: true, nivel: 3 },
  { codigo: "4.3.2", nombre: "Resultados por Tenencia", rama: "Resultados", movible: true, nivel: 3 },
  { codigo: "4.4", nombre: "Impuesto a las Ganancias", rama: "Resultados", movible: false, nivel: 2 },
  { codigo: "4.4.1", nombre: "Impuesto a las Ganancias", rama: "Resultados", movible: true, nivel: 3 },
]

export const RAMAS: Rama[] = ["Activo", "Pasivo", "Patrimonio Neto", "Resultados"]

export function getPlanCuentasByRama(rama: Rama): CuentaPlan[] {
  return PLAN_CUENTAS_DATA.filter((c) => c.rama === rama)
}

export function getCuentasMovibles(): CuentaPlan[] {
  return PLAN_CUENTAS_DATA.filter((c) => c.movible === true)
}

export function getCuentaByCodigo(codigo: string): CuentaPlan | undefined {
  return PLAN_CUENTAS_DATA.find((c) => c.codigo === codigo)
}
