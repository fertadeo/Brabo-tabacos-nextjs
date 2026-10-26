/** Canales comerciales de pedidos (orders.canal_venta). */

export type OrderSalesChannel = "local" | "preventa" | "woocommerce"

export const ORDER_CHANNEL_LABELS: Record<string, string> = {
  local: "Venta en local",
  preventa: "Preventa calle",
  woocommerce: "WooCommerce",
  woocommerce_minorista: "WooCommerce",
  sistema_mf: "Venta en local",
  sistema_principal: "Venta en local",
  manual: "Venta en local",
  mercadolibre: "MercadoLibre",
  otro: "Otro",
}

export function getOrderChannelLabel(channel?: string | null): string {
  if (!channel) return "—"
  return ORDER_CHANNEL_LABELS[channel] || channel
}

export function isPreventaChannel(channel?: string | null): boolean {
  return channel === "preventa"
}
