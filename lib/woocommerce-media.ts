import { getApiUrl } from "@/config/api"

const API_BASE = typeof window !== "undefined" ? getApiUrl() : ""
const API_KEY = typeof window !== "undefined" ? process.env.NEXT_PUBLIC_API_KEY : ""

export interface WordPressMediaUpload {
  id: number
  source_url: string
}

const MAX_FILES = 10
const MAX_SIZE_MB = 10
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"]

/**
 * Sube una o más imágenes a la galería de WordPress/WooCommerce.
 * Límite: 10 archivos por request, 10 MB por archivo. Formatos: jpeg, png, gif, webp.
 * Auth: header X-API-Key.
 */
const ENV_ERROR_MESSAGE =
  "No se puede subir a WooCommerce: faltan NEXT_PUBLIC_API_URL o NEXT_PUBLIC_API_KEY. " +
  "En producción deben estar en el panel de tu hosting (ej. Vercel) y hay que volver a desplegar para que se incluyan en el build."

export async function uploadImagesToWordPress(
  files: File[]
): Promise<WordPressMediaUpload[]> {
  if (!API_BASE || !API_KEY) {
    console.error("[woocommerce-media] Configuración incompleta al subir imagen:", {
      NEXT_PUBLIC_API_URL: API_BASE ? "definida" : "faltante",
      NEXT_PUBLIC_API_KEY: API_KEY ? "definida" : "faltante",
      hint: "En producción, NEXT_PUBLIC_* se inyectan en el build. Revisá las variables en el panel del hosting y volvé a desplegar.",
    })
    throw new Error(ENV_ERROR_MESSAGE)
  }
  if (!files.length) return []
  if (files.length > MAX_FILES) {
    throw new Error(`Máximo ${MAX_FILES} archivos por solicitud`)
  }

  for (const file of files) {
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      throw new Error(`La imagen ${file.name} supera los ${MAX_SIZE_MB} MB`)
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error(
        `Solo se permiten imágenes (jpeg, png, gif, webp). ${file.name} no es válido.`
      )
    }
  }

  const formData = new FormData()
  files.forEach((file) => formData.append("files", file))

  const uploadUrl = `${API_BASE}woocommerce/media`
  console.log("[woocommerce-media] Subiendo", files.length, "archivo(s) a WooCommerce…")

  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "X-API-Key": API_KEY,
    },
    body: formData,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const errMessage = (err as { message?: string }).message || "Error subiendo imágenes"
    console.error("[woocommerce-media] Error en la subida:", res.status, errMessage, err)
    throw new Error(errMessage)
  }

  const data = (await res.json()) as {
    data?: { uploads?: WordPressMediaUpload[] }
  }
  const uploads = data.data?.uploads ?? []
  console.log("[woocommerce-media] Subida correcta:", uploads.length, "imagen(es)")
  return uploads
}
