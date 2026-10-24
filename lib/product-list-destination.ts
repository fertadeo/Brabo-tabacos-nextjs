/**
 * Coincide con el filtrado de pestañas en app/productos/page.tsx:
 * - Publicados: activo y (stock > 0 o venta por encargo)
 * - Borrador: activo, stock 0 y sin venta por encargo
 * - Eliminados: inactivo
 */
export type ProductListTabKey = "published" | "draft" | "deleted"

export function getProductListDestination(params: {
  is_active: boolean
  stock: number
  allow_backorders?: boolean | null
}): ProductListTabKey {
  const { is_active, stock, allow_backorders } = params
  const back = !!allow_backorders
  if (!is_active) return "deleted"
  if (stock > 0 || back) return "published"
  return "draft"
}

export function destinationTabLabel(key: ProductListTabKey): string {
  switch (key) {
    case "published":
      return "Publicados"
    case "draft":
      return "Borrador"
    case "deleted":
      return "Eliminados"
    default:
      return key
  }
}

/** Clases para resaltar nombres de pestaña en avisos (crear/editar producto). */
export const PRODUCT_TAB_HIGHLIGHT_CLASS: Record<ProductListTabKey, string> = {
  published:
    "rounded px-0.5 font-semibold text-emerald-600 dark:text-emerald-400",
  draft: "rounded px-0.5 font-semibold text-amber-600 dark:text-amber-400",
  deleted: "rounded px-0.5 font-semibold text-red-600 dark:text-red-400",
}

/** Estado manual «Inactivo» en textos de confirmación (alineado con Eliminados). */
export const PRODUCT_INACTIVE_HIGHLIGHT_CLASS =
  "rounded px-0.5 font-semibold text-rose-700 dark:text-rose-400"

export function buildDestinationExplanation(args: {
  destination: ProductListTabKey
  stock: number
  allow_backorders: boolean
  sync_to_woocommerce: boolean
  /** Si se indica, se añade aviso de cambio de pestaña respecto al estado anterior */
  previousDestination?: ProductListTabKey | null
}): string[] {
  const {
    destination,
    stock,
    allow_backorders,
    sync_to_woocommerce,
    previousDestination,
  } = args
  const lines: string[] = []

  if (
    previousDestination != null &&
    previousDestination !== destination
  ) {
    lines.push(
      `Ahora está en «${destinationTabLabel(previousDestination)}»; después de guardar pasará a «${destinationTabLabel(destination)}».`,
    )
  }

  if (destination === "deleted") {
    lines.push(
      "Motivo: el producto queda inactivo en el ERP; los inactivos solo se listan en Eliminados. Puede ser porque elegiste «Inactivo» o porque con stock 0 y sin venta por encargo el guardado deja el producto inactivo.",
    )
  } else if (destination === "draft") {
    lines.push(
      "Motivo: sigue activo en el ERP pero con stock 0 y sin venta por encargo; el módulo lo muestra en Borrador hasta que haya stock o actives pedidos sin stock.",
    )
  } else if (stock > 0) {
    lines.push(
      `Motivo: activo y con stock (${stock} unidades); se muestra en Publicados.`,
    )
  } else if (allow_backorders) {
    lines.push(
      "Motivo: activo, stock 0 y venta por encargo activada; se mantiene en Publicados como disponible por pedido.",
    )
  } else {
    lines.push("Motivo: cumple las reglas para mostrarse en Publicados.")
  }

  if (sync_to_woocommerce) {
    lines.push(
      "Sincronizar con WooCommerce está activado: el servidor enviará los cambios a la tienda (crear o actualizar producto, imágenes, stock, etc., según la API).",
    )
  } else {
    lines.push(
      "No sincronizás con WooCommerce en este guardado: solo se actualiza el ERP.",
    )
  }

  lines.push(
    "En el mismo guardado también se aplican el resto de campos del formulario (precio, descripción, categoría, imágenes, código de barras, peso y medidas, etc.).",
  )

  return lines
}
