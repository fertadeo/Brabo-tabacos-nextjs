import type { Role } from "@/app/config/menu"
import type { SaleResponseData } from "@/lib/api"
import { isImportedSale } from "@/lib/sale-import"
import { saleHasNotaCreditoEmitida } from "@/lib/facturacion-nota-credito"

const ROLES_EDITAR_VENTA: Role[] = ["admin", "gerencia", "ventas"]

export function saleHasFiscalLock(
  sale: Pick<SaleResponseData, "arca_status" | "arca_nc_status" | "arca_nc_cae">
): boolean {
  return sale.arca_status === "success" && !saleHasNotaCreditoEmitida(sale)
}

export function canEditSale(
  sale: Pick<SaleResponseData, "arca_status" | "arca_nc_status" | "arca_nc_cae" | "sale_source">,
  hasAnyOfRoles: (roles: Role[]) => boolean
): boolean {
  if (isImportedSale(sale)) return false
  return !saleHasFiscalLock(sale) && hasAnyOfRoles(ROLES_EDITAR_VENTA)
}
