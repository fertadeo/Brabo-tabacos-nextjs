import { lookup } from "dns/promises"
import { NextRequest, NextResponse } from "next/server"
import { isBlockedIp, isPublicHttpImageUrl } from "@/lib/public-image-url"

const MAX_BYTES = 4 * 1024 * 1024

async function hostResolvesToPublicAddress(hostname: string): Promise<boolean> {
  if (isBlockedIp(hostname)) return false
  try {
    const records = await lookup(hostname, { all: true })
    return records.length > 0 && records.every((record) => !isBlockedIp(record.address))
  } catch {
    return false
  }
}

async function fetchPublicImage(url: string, hops = 0): Promise<Response> {
  const response = await fetch(url, {
    redirect: "manual",
    headers: {
      Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      "User-Agent": "Mozilla/5.0 (compatible; AurixRetailERP/1.0)",
      Referer: new URL(url).origin + "/",
    },
    signal: AbortSignal.timeout(12000),
  })

  if (response.status >= 300 && response.status < 400 && hops < 3) {
    const location = response.headers.get("location")
    if (!location) return response
    const nextUrl = new URL(location, url)
    if (!isPublicHttpImageUrl(nextUrl.toString()) || !(await hostResolvesToPublicAddress(nextUrl.hostname))) {
      return new Response(null, { status: 403 })
    }
    return fetchPublicImage(nextUrl.toString(), hops + 1)
  }

  return response
}

export async function GET(request: NextRequest) {
  const site = request.headers.get("sec-fetch-site")
  if (site && site !== "same-origin" && site !== "same-site") {
    return new NextResponse("No permitido", { status: 403 })
  }

  const raw = request.nextUrl.searchParams.get("url")?.trim()
  const target = raw ? isPublicHttpImageUrl(raw) : null
  if (!target || !(await hostResolvesToPublicAddress(target.hostname))) {
    return new NextResponse("URL de imagen no permitida", { status: 400 })
  }

  let upstream: Response
  try {
    upstream = await fetchPublicImage(target.toString())
  } catch {
    return new NextResponse("No se pudo obtener la imagen", { status: 502 })
  }

  if (!upstream.ok) return new NextResponse("No se pudo obtener la imagen", { status: 502 })
  const type = (upstream.headers.get("content-type") || "").split(";")[0].trim().toLowerCase()
  if (!type.startsWith("image/")) return new NextResponse("No es una imagen", { status: 415 })

  const bytes = await upstream.arrayBuffer()
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_BYTES) {
    return new NextResponse("Imagen demasiado grande", { status: 413 })
  }

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": type,
      "Cache-Control": "private, max-age=3600",
    },
  })
}
