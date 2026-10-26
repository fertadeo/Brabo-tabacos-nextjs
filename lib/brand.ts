/**
 * Branding de instancia. En la plantilla GOLD queda genérico;
 * cada fork (mfcomputers, Brabo, etc.) sobreescribe vía env.
 */
export const APP_NAME =
  process.env.NEXT_PUBLIC_APP_NAME?.trim() || "Aurix Retail"

export const COMPANY_NAME =
  process.env.NEXT_PUBLIC_COMPANY_NAME?.trim() || APP_NAME

/** Nombre fiscal / razón social para PDFs y factura. */
export const COMPANY_LEGAL_NAME =
  process.env.NEXT_PUBLIC_COMPANY_LEGAL_NAME?.trim() || COMPANY_NAME

export const COMPANY_TAGLINE =
  process.env.NEXT_PUBLIC_COMPANY_TAGLINE?.trim() ||
  "Cigarrillos, golosinas y medicamentos"

export const COMPANY_EMAIL =
  process.env.NEXT_PUBLIC_COMPANY_EMAIL?.trim() || "soporte@example.com"

export const COMPANY_ADDRESS =
  process.env.NEXT_PUBLIC_COMPANY_ADDRESS?.trim() || ""

export const COMPANY_CITY =
  process.env.NEXT_PUBLIC_COMPANY_CITY?.trim() || ""

export const COMPANY_CUIT =
  process.env.NEXT_PUBLIC_COMPANY_CUIT?.trim() ||
  process.env.NEXT_PUBLIC_FACTURADOR_CUIT_EMISOR?.trim() ||
  ""

/** Domicilio en una línea para comprobantes. */
export const COMPANY_ADDRESS_LINE = [COMPANY_ADDRESS, COMPANY_CITY]
  .filter(Boolean)
  .join(", ")

export const LOGO_MARK_PATH =
  process.env.NEXT_PUBLIC_LOGO_MARK_PATH?.trim() || "/images/brabo-logo.png"

export const LOGO_FULL_PATH =
  process.env.NEXT_PUBLIC_LOGO_FULL_PATH?.trim() || "/images/brabo-logo.png"

export const POWERED_BY_LOGO_PATH =
  process.env.NEXT_PUBLIC_POWERED_BY_LOGO_PATH?.trim() || "/images/aurix-logo.png"

export const WOOCOMMERCE_BASE_URL_DEFAULT =
  process.env.NEXT_PUBLIC_WOOCOMMERCE_URL?.trim() || ""

/** Datos de emisor para PDFs comerciales (presupuesto / ticket). */
export const COMPANY_PDF = {
  name: COMPANY_NAME,
  legalName: COMPANY_LEGAL_NAME,
  tagline: COMPANY_TAGLINE,
  address: COMPANY_ADDRESS,
  city: COMPANY_CITY,
  addressLine: COMPANY_ADDRESS_LINE,
  cuit: COMPANY_CUIT,
  email: COMPANY_EMAIL,
} as const

/**
 * Carga el logo de marca para incrustar en jsPDF (solo cliente).
 * Devuelve null si falla (red, 404, etc.).
 */
export function loadBrandLogoImage(
  src: string = LOGO_MARK_PATH
): Promise<HTMLImageElement | null> {
  if (typeof window === "undefined") return Promise.resolve(null)
  return new Promise((resolve) => {
    const img = new window.Image()
    img.crossOrigin = "anonymous"
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}
