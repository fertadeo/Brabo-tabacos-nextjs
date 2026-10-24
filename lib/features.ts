/**
 * Feature flags por instancia.
 * Retail simple (p. ej. Brabo Tabacos): reparaciones off.
 * Taller/PC (mfcomputers prod): reparaciones on.
 */
function envFlag(name: string, defaultValue: boolean): boolean {
  const raw = process.env[name]
  if (raw === undefined || raw === "") return defaultValue
  const v = raw.trim().toLowerCase()
  if (["1", "true", "yes", "on"].includes(v)) return true
  if (["0", "false", "no", "off"].includes(v)) return false
  return defaultValue
}

/** Órdenes de reparación / taller. Default OFF en GOLD. */
export const FEATURE_REPARACIONES = envFlag(
  "NEXT_PUBLIC_FEATURE_REPARACIONES",
  false
)

/** Integración WooCommerce. Default OFF en GOLD. */
export const FEATURE_WOOCOMMERCE = envFlag(
  "NEXT_PUBLIC_FEATURE_WOOCOMMERCE",
  false
)

/** Módulo tienda online (ruta /tienda). Default OFF. */
export const FEATURE_TIENDA = envFlag("NEXT_PUBLIC_FEATURE_TIENDA", false)
