/**
 * Mejora la calidad de las imágenes obtenidas por búsqueda de código de barras:
 * - Intenta reemplazar URLs de miniaturas por versiones de mayor resolución cuando el patrón lo permite.
 * - Si no hay imágenes o queremos asegurar al menos una buena, consulta Open Food Facts (productos alimenticios, EAN).
 */

const OFF_API_BASE = "https://world.openfoodfacts.org/api/v2/product"

/**
 * Comprueba si el código tiene formato típico de EAN (8, 12, 13, 14 dígitos) para consultar OFF.
 */
function isEanLike(barcode: string): boolean {
  const digits = barcode.replace(/\D/g, "")
  const len = digits.length
  return len === 8 || len === 12 || len === 13 || len === 14
}

/**
 * Intenta obtener una imagen en mejor calidad desde Open Food Facts.
 * Devuelve la URL de imagen principal o frontal si existe.
 */
async function fetchOpenFoodFactsImage(barcode: string): Promise<string | null> {
  const digits = barcode.replace(/\D/g, "")
  if (!digits.length) return null

  try {
    const res = await fetch(`${OFF_API_BASE}/${digits}.json`, {
      headers: { Accept: "application/json" },
    })
    if (!res.ok) return null
    const json = await res.json()
    const product = json?.product
    if (!product) return null
    // Prioridad: imagen frontal grande, luego imagen general
    const raw =
      product.image_front_url ||
      product.image_url ||
      product.image_small_url ||
      null
    if (!raw || typeof raw !== "string") return null
    const url = raw.startsWith("//") ? `https:${raw}` : raw
    if (url.startsWith("http://") || url.startsWith("https://")) return url
    return null
  } catch {
    return null
  }
}

/**
 * Intenta convertir URLs conocidas de miniaturas a versión de mayor tamaño.
 * Soporta patrones comunes (openfoodfacts, upcitemdb, etc.).
 */
function tryUpgradeToLargerUrl(url: string): string {
  try {
    const u = new URL(url)
    const href = u.href

    // Open Food Facts: .../front_fr.123.100.jpg -> .../front_fr.400.jpg (o  full)
    if (href.includes("openfoodfacts.org/images/products")) {
      return href
        .replace(/\.(\d+)\.(\d+)\.(jpg|jpeg|png|webp)$/i, ".400.$3")
        .replace(/\/\d+\.(jpg|jpeg|png|webp)$/i, "/400.$1")
    }

    // Patrones genéricos: small -> large, thumb -> full
    let next = href
      .replace(/-small\./gi, ".")
      .replace(/-small\b/gi, "-large")
      .replace(/\/small\//gi, "/large/")
      .replace(/\/thumb\//gi, "/full/")
      .replace(/thumbnail/gi, "large")
      .replace(/_thumb\./gi, ".")
      .replace(/_small\./gi, ".")
    if (next !== href) return next

    return href
  } catch {
    return url
  }
}

/**
 * Filtra URLs que no sean válidas (http/https).
 */
function validImageUrls(urls: string[]): string[] {
  return urls.filter(
    (u) =>
      typeof u === "string" &&
      u.trim().length > 0 &&
      (u.startsWith("http://") || u.startsWith("https://"))
  )
}

/**
 * Dado un código de barras y la lista de imágenes devueltas por la API,
 * devuelve una lista mejorada intentando:
 * 1) Incluir solo URLs válidas y priorizar versiones de mayor tamaño cuando se pueda.
 * 2) Si aplica (EAN), intentar obtener al menos una imagen de buena calidad desde Open Food Facts.
 */
export async function improveBarcodeImages(
  barcode: string,
  images: string[]
): Promise<string[]> {
  const valid = validImageUrls(images)
  const upgraded = valid.map(tryUpgradeToLargerUrl)
  const deduped = Array.from(new Set(upgraded))

  if (isEanLike(barcode)) {
    const offUrl = await fetchOpenFoodFactsImage(barcode)
    if (offUrl && !deduped.includes(offUrl)) {
      return [offUrl, ...deduped].slice(0, 5)
    }
  }

  return deduped.slice(0, 5)
}
