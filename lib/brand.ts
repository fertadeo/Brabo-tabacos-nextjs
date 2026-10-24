/**
 * Branding de instancia. En la plantilla GOLD queda genérico;
 * cada fork (mfcomputers, Brabo, etc.) sobreescribe vía env.
 */
export const APP_NAME =
  process.env.NEXT_PUBLIC_APP_NAME?.trim() || "Aurix Retail"

export const COMPANY_NAME =
  process.env.NEXT_PUBLIC_COMPANY_NAME?.trim() || APP_NAME

export const COMPANY_TAGLINE =
  process.env.NEXT_PUBLIC_COMPANY_TAGLINE?.trim() ||
  "Sistema de gestión y punto de venta"

export const COMPANY_EMAIL =
  process.env.NEXT_PUBLIC_COMPANY_EMAIL?.trim() || "soporte@example.com"

export const LOGO_MARK_PATH =
  process.env.NEXT_PUBLIC_LOGO_MARK_PATH?.trim() || "/images/placeholder-logo.png"

export const LOGO_FULL_PATH =
  process.env.NEXT_PUBLIC_LOGO_FULL_PATH?.trim() || "/images/placeholder-logo.png"

export const POWERED_BY_LOGO_PATH =
  process.env.NEXT_PUBLIC_POWERED_BY_LOGO_PATH?.trim() || "/images/aurix-logo.png"

export const WOOCOMMERCE_BASE_URL_DEFAULT =
  process.env.NEXT_PUBLIC_WOOCOMMERCE_URL?.trim() || ""
