import { Product } from "@/lib/api"

/**
 * Obtiene todas las URLs de imágenes disponibles de un producto,
 * en orden de prioridad.
 */
export function getAllProductImages(product: Product): string[] {
  const images: string[] = []

  // 1. Prioridad: array de imágenes del producto
  if (product.images && product.images.length > 0) {
    return product.images
  }

  // 2. Si hay URL de WooCommerce específica, usarla
  if (product.woocommerce_image_url) {
    images.push(product.woocommerce_image_url)
  }

  // 3. Si hay URL de imagen general, usarla
  if (product.image_url) {
    images.push(product.image_url)
  }

  // 4. Construir URL de WooCommerce basada en el código del producto
  const woocommerceBaseUrl =
    process.env.NEXT_PUBLIC_WOOCOMMERCE_IMAGE_URL ||
    process.env.NEXT_PUBLIC_WOOCOMMERCE_URL ||
    ""

  if (woocommerceBaseUrl && images.length === 0 && product.code) {
    const codeSlug = product.code
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
    images.push(`${woocommerceBaseUrl}/wp-content/uploads/${codeSlug}.jpg`)
  }

  return images
}

/**
 * Obtiene la URL de la imagen principal del producto.
 * Si no hay imágenes, retorna un placeholder.
 */
export function getProductImageUrl(
  product: Product,
  options?: { size?: number }
): string {
  const images = getAllProductImages(product)
  const size = options?.size ?? 400
  return images.length > 0
    ? images[0]
    : `https://via.placeholder.com/${size}x${size}?text=${encodeURIComponent(product.name || "Producto")}`
}
