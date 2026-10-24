import type { Cliente, SaleResponseData } from "@/lib/api"
import { formatClienteUbicacion, getClienteDisplayName } from "@/lib/cliente-display"

/** Campos de cliente que puede devolver GET/POST/PUT /api/sales. */
export type SaleClientFields = Pick<
  SaleResponseData,
  | "client_id"
  | "client_name"
  | "client_code"
  | "client_email"
  | "client_phone"
  | "client_address"
  | "client_city"
  | "client_cuil_cuit"
>

export function saleClientLabel(sale: Pick<SaleResponseData, "client_id" | "client_name">): string {
  if (sale.client_name?.trim()) return getClienteDisplayName({ name: sale.client_name } as Cliente)
  if (sale.client_id != null) return `Cliente #${sale.client_id}`
  return "Consumidor final"
}

export function saleClientUbicacion(
  sale: Pick<SaleResponseData, "client_address" | "client_city"> & { client?: Cliente | null }
): string | null {
  const address = sale.client_address?.trim() || sale.client?.address?.trim() || ""
  const city = sale.client_city?.trim() || sale.client?.city?.trim() || ""
  if (address && city) return `${address} · ${city}`
  return address || city || null
}

export function saleToClienteSnapshot(sale: SaleClientFields): Cliente | null {
  if (!sale.client_id && !sale.client_name?.trim()) return null
  return {
    id: sale.client_id ?? 0,
    code: sale.client_code ?? "",
    client_type: "minorista",
    sales_channel: "sistema_mf",
    name: sale.client_name?.trim() || `Cliente #${sale.client_id}`,
    email: sale.client_email ?? "",
    phone: sale.client_phone ?? "",
    address: sale.client_address ?? undefined,
    city: sale.client_city ?? "",
    country: "AR",
    is_active: 1,
    created_at: "",
    updated_at: "",
    cuil_cuit: sale.client_cuil_cuit ?? undefined,
  }
}

export function clienteUbicacion(cliente?: Cliente | null): string | null {
  return cliente ? formatClienteUbicacion(cliente) : null
}
