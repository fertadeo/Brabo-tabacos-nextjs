import type { Order } from "@/lib/api"
import { COMPANY_ADDRESS_LINE, COMPANY_CITY } from "@/lib/brand"

/** Depósito / punto de partida del reparto propio. */
export function getDeliveryDepotAddress(): string {
  const env = process.env.NEXT_PUBLIC_DELIVERY_DEPOT_ADDRESS?.trim()
  if (env) return env
  if (COMPANY_ADDRESS_LINE) return COMPANY_ADDRESS_LINE
  if (COMPANY_CITY) return COMPANY_CITY
  return "Argentina"
}

export function getGoogleMapsApiKey(): string {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || ""
}

export function orderDeliveryAddress(order: Order): string {
  const parts = [order.delivery_address, order.delivery_city]
    .map((p) => (p || "").trim())
    .filter(Boolean)
  return parts.join(", ")
}

export function orderContactPhone(order: Order): string {
  return (
    order.delivery_phone?.trim() ||
    order.client_phone?.trim() ||
    ""
  )
}

export function orderHasUsableAddress(order: Order): boolean {
  return orderDeliveryAddress(order).length >= 5
}

export type RouteStop = {
  order: Order
  address: string
  label: string
}

export function buildRouteStops(orders: Order[]): RouteStop[] {
  return orders.map((order) => ({
    order,
    address: orderDeliveryAddress(order),
    label:
      order.client_name ||
      order.delivery_contact ||
      order.order_number ||
      `#${order.id}`,
  }))
}

/**
 * URL de Google Maps Directions (abre app/navegador, no requiere API key de Maps JS).
 * Máx. ~9 waypoints intermedios en la URL pública.
 */
export function buildGoogleMapsDirectionsUrl(
  stops: RouteStop[],
  origin = getDeliveryDepotAddress()
): string | null {
  const withAddress = stops.filter((s) => s.address.length >= 5)
  if (withAddress.length === 0) return null

  const destination = withAddress[withAddress.length - 1].address
  const waypoints = withAddress.slice(0, -1).map((s) => s.address)

  const params = new URLSearchParams({
    api: "1",
    origin,
    destination,
    travelmode: "driving",
  })
  if (waypoints.length > 0) {
    params.set("waypoints", waypoints.join("|"))
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`
}

export function tomorrowISODate(base = new Date()): string {
  const d = new Date(base)
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

export function todayISODate(base = new Date()): string {
  return base.toISOString().slice(0, 10)
}

export function formatMoneyAR(n: number): string {
  return n.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function orderTotalNumber(order: Order): number {
  const raw = order.total_amount
  if (typeof raw === "number") return raw
  return parseFloat(String(raw || "0")) || 0
}
