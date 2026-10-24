import type { Cliente } from "@/lib/api"
import {
  formatTaxConditionLabel,
  normalizeTaxConditionFromApi,
  type ClientTaxCondition,
} from "@/lib/client-tax-condition"
import { formatClienteNombreDisplay } from "@/lib/format-client-name"
import type { SalesChannel } from "@/lib/utils"

export interface ClienteUI {
  id: string
  dbId: number
  salesChannel: SalesChannel
  nombre: string
  email: string
  telefono: string
  ciudad: string
  tipo: "Minorista" | "Mayorista" | "Personalizado"
  estado: "Activo" | "Inactivo"
  ultimaCompra: string
  totalCompras: number
  direccion?: string
  cuit?: string
  cuitSecundario?: string
  personeria?: "persona_fisica" | "persona_juridica" | "consumidor_final"
  personType?: "Persona Física" | "Persona Jurídica" | "Consumidor final"
  taxCondition?: string
  taxConditionCode?: ClientTaxCondition
  ccEnabled?: boolean
  ccLimit?: number
  ccBalance?: number
  limiteCredito?: number
}

/** Mapea un cliente de la API al formato usado por la UI de clientes. */
export function mapClienteApiToUi(apiCliente: Cliente): ClienteUI {
  const personeria =
    apiCliente.personeria === "persona_fisica" ||
    apiCliente.personeria === "persona_juridica" ||
    apiCliente.personeria === "consumidor_final"
      ? apiCliente.personeria
      : apiCliente.person_type === "persona_fisica"
        ? "persona_fisica"
        : apiCliente.person_type === "persona_juridica"
          ? "persona_juridica"
          : "consumidor_final"
  const personType =
    personeria === "persona_fisica"
      ? "Persona Física"
      : personeria === "persona_juridica"
        ? "Persona Jurídica"
        : "Consumidor final"
  const taxConditionCode = normalizeTaxConditionFromApi(apiCliente.tax_condition)
  const taxCondition = formatTaxConditionLabel(
    apiCliente.tax_condition,
    personType === "Persona Jurídica" ? "Responsable Inscripto" : "Consumidor Final"
  )
  const ccEnabled = Boolean((apiCliente as Cliente & { cc_enabled?: boolean }).cc_enabled)
  const ccLimit = (apiCliente as Cliente & { cc_limit?: number }).cc_limit
  const ccBalance = (apiCliente as Cliente & { cc_balance?: number }).cc_balance

  return {
    id: apiCliente.code,
    dbId: apiCliente.id,
    salesChannel: apiCliente.sales_channel,
    nombre: formatClienteNombreDisplay(apiCliente.name),
    email: apiCliente.email,
    telefono: apiCliente.phone,
    ciudad: apiCliente.city,
    direccion: apiCliente.address,
    tipo:
      apiCliente.client_type === "minorista"
        ? "Minorista"
        : apiCliente.client_type === "mayorista"
          ? "Mayorista"
          : apiCliente.client_type === "personalizado"
            ? "Personalizado"
            : "Minorista",
    estado: apiCliente.is_active === 1 ? "Activo" : "Inactivo",
    ultimaCompra: new Date(apiCliente.updated_at).toLocaleDateString("es-AR"),
    totalCompras: 0,
    cuit: apiCliente.cuil_cuit ?? apiCliente.primary_tax_id ?? undefined,
    cuitSecundario: apiCliente.secondary_tax_id,
    personeria,
    personType,
    taxCondition,
    taxConditionCode,
    ccEnabled,
    ccLimit,
    ccBalance,
    limiteCredito: ccLimit,
  }
}
