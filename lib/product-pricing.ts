import { apiFetch, apiGet, apiPost } from "@/lib/api-fetch"

export interface PricingCategoryRow {
  category_id: number | null
  category_name: string
  product_count: number
  is_active?: boolean
}

export interface PriceSampleRow {
  id: number
  code: string
  name: string
  category_id?: number | null
  category_name?: string
  current_price: number
  new_price: number
}

export interface CategoryAdjustmentPreview {
  percentage: number
  category_ids: number[]
  include_uncategorized: boolean
  products_affected: number
  multiplier: number
  sample: PriceSampleRow[]
}

export interface CategoryAdjustmentResult {
  products_updated: number
  percentage: number
  category_ids: number[]
  woocommerce_sync?: { synced: number; failed: number }
}

export interface DollarQuote {
  currency: string
  country: string
  dollar_type: string
  dollar_label: string
  buy: number
  sell: number
  rate: number
  source: string
  fetched_at: string
}

export interface DollarRateData {
  quote: DollarQuote
  reference_rate: number | null
  current_rate: number
  variation_percent: number
  increment_percent: number
  price_multiplier: number
  products_affected_estimate: number
  is_first_adjustment: boolean
  sample_preview: PriceSampleRow[]
}

export interface DollarAdjustmentResult {
  reference_rate: number | null
  current_rate: number
  variation_percent: number
  increment_percent: number
  products_updated: number
  new_reference_rate: number
  woocommerce_sync?: { synced: number; failed: number }
}

interface ApiEnvelope<T> {
  success: boolean
  message?: string
  error?: string
  data: T
}

async function parsePricingResponse<T>(response: Response): Promise<T> {
  let json: ApiEnvelope<T> & { error?: string }
  try {
    json = await response.json()
  } catch {
    if (response.status === 503) {
      throw new Error("No se pudo obtener el dólar; reintentá más tarde.")
    }
    throw new Error(`Error ${response.status}: ${response.statusText}`)
  }

  if (!response.ok) {
    if (response.status === 503) {
      throw new Error(json.message || json.error || "No se pudo obtener el dólar; reintentá más tarde.")
    }
    throw new Error(json.message || json.error || `Error ${response.status}`)
  }

  if (!json.success) {
    throw new Error(json.message || json.error || "Error en la operación")
  }

  return json.data
}

export async function getPricingCategories(): Promise<PricingCategoryRow[]> {
  const res = await apiGet("products/pricing/categories")
  const data = await parsePricingResponse<{ categories: PricingCategoryRow[] }>(res)
  return data.categories
}

export async function getDollarRate(): Promise<DollarRateData> {
  // Sin headers Cache-Control/Pragma: disparan preflight CORS no permitido por la API.
  const res = await apiGet(`products/pricing/dollar-rate?_=${Date.now()}`, {
    cache: "no-store",
  })
  return parsePricingResponse<DollarRateData>(res)
}

export async function previewCategoryPriceAdjustment(body: {
  category_ids: number[]
  include_uncategorized?: boolean
  percentage: number
  preview_limit?: number
  exclude_product_ids?: number[]
}): Promise<CategoryAdjustmentPreview> {
  const res = await apiPost("products/pricing/category-adjustment/preview", body)
  return parsePricingResponse<CategoryAdjustmentPreview>(res)
}

export async function applyCategoryPriceAdjustment(body: {
  category_ids: number[]
  include_uncategorized?: boolean
  percentage: number
  sync_to_woocommerce?: boolean
  exclude_product_ids?: number[]
}): Promise<CategoryAdjustmentResult> {
  const res = await apiPost("products/pricing/category-adjustment", body)
  return parsePricingResponse<CategoryAdjustmentResult>(res)
}

export async function previewDollarPriceAdjustment(body?: {
  preview_limit?: number
}): Promise<DollarRateData> {
  const res = await apiPost("products/pricing/dollar-adjustment/preview", body ?? {})
  return parsePricingResponse<DollarRateData>(res)
}

export async function applyDollarPriceAdjustment(body?: {
  sync_to_woocommerce?: boolean
}): Promise<DollarAdjustmentResult> {
  const res = await apiPost("products/pricing/dollar-adjustment", body ?? {})
  return parsePricingResponse<DollarAdjustmentResult>(res)
}

/** Mensaje de respuesta apply (incluye woocommerce_sync en data). */
export async function applyDollarPriceAdjustmentWithMessage(body?: {
  sync_to_woocommerce?: boolean
}): Promise<{ data: DollarAdjustmentResult; message: string }> {
  const res = await apiFetch("products/pricing/dollar-adjustment", {
    method: "POST",
    body: JSON.stringify(body ?? {}),
  })
  const json = (await res.json()) as ApiEnvelope<DollarAdjustmentResult> & { message?: string }
  if (!res.ok || !json.success) {
    if (res.status === 503) {
      throw new Error(json.message || json.error || "No se pudo obtener el dólar; reintentá más tarde.")
    }
    throw new Error(json.message || json.error || `Error ${res.status}`)
  }
  return { data: json.data, message: json.message ?? "Ajuste aplicado" }
}

export async function applyCategoryPriceAdjustmentWithMessage(body: {
  category_ids: number[]
  include_uncategorized?: boolean
  percentage: number
  sync_to_woocommerce?: boolean
  exclude_product_ids?: number[]
}): Promise<{ data: CategoryAdjustmentResult; message: string }> {
  const res = await apiFetch("products/pricing/category-adjustment", {
    method: "POST",
    body: JSON.stringify(body),
  })
  const json = (await res.json()) as ApiEnvelope<CategoryAdjustmentResult> & { message?: string }
  if (!res.ok || !json.success) {
    throw new Error(json.message || json.error || `Error ${res.status}`)
  }
  return { data: json.data, message: json.message ?? "Precios actualizados" }
}

export function roundPrice(value: number): number {
  return Math.round(value * 100) / 100
}

export function formatArs(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}
