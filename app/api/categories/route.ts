import { NextResponse } from 'next/server'

/**
 * Proxy para GET /api/categories.
 * Usa la API Key desde .env en el servidor (nunca se expone al cliente).
 * Variables soportadas: API_KEY, X_API_KEY, X_API_KEY_CATEGORIES
 */
function getBackendBaseUrl(): string {
  let url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8086/api/'
  if (!url.endsWith('/')) url += '/'
  return url
}

function getApiKey(): string | undefined {
  return (
    process.env.API_KEY ||
    process.env.X_API_KEY ||
    process.env.X_API_KEY_CATEGORIES ||
    undefined
  )
}

export async function GET(request: Request) {
  const apiKey = getApiKey()
  const backendUrl = getBackendBaseUrl() + 'categories'

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }

  if (apiKey) {
    headers['X-API-Key'] = apiKey
  } else {
    const auth = request.headers.get('Authorization')
    if (auth) headers['Authorization'] = auth
  }

  try {
    const res = await fetch(backendUrl, { headers })
    const data = await res.json().catch(() => ({ success: false, message: 'Invalid JSON' }))

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status })
    }
    return NextResponse.json(data)
  } catch (e) {
    console.error('[API categories] Error de proxy:', e)
    return NextResponse.json(
      { success: false, message: 'Error al conectar con el backend de categorías' },
      { status: 502 }
    )
  }
}
