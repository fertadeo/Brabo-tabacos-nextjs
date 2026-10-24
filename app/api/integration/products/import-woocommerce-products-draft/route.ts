import { NextResponse } from 'next/server'

/**
 * Proxy BFF para POST …/import-woocommerce-products-draft.
 * Misma política que import-woocommerce-orphans: JWT + rol gerencia/admin, API key al backend.
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
    process.env.X_API_KEY_INTEGRATION ||
    undefined
  )
}

type MePayload = {
  success?: boolean
  data?: { user?: { role?: string } }
  user?: { role?: string }
}

async function assertGerenciaOrAdmin(authHeader: string | null): Promise<
  | { ok: true }
  | { ok: false; status: number; body: { success: false; message: string } }
> {
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      ok: false,
      status: 401,
      body: { success: false, message: 'Se requiere autenticación (Bearer token)' },
    }
  }

  const meUrl = `${getBackendBaseUrl()}auth/me`
  let res: Response
  try {
    res = await fetch(meUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
    })
  } catch (e) {
    console.error('[import-woocommerce-products-draft] auth/me fetch error:', e)
    return {
      ok: false,
      status: 502,
      body: { success: false, message: 'No se pudo verificar la sesión con el servidor' },
    }
  }

  const data = (await res.json().catch(() => ({}))) as MePayload
  if (!res.ok) {
    return {
      ok: false,
      status: 401,
      body: {
        success: false,
        message: (data as { message?: string }).message || 'Sesión inválida o expirada',
      },
    }
  }

  const role = data.data?.user?.role ?? data.user?.role
  if (role !== 'gerencia' && role !== 'admin' && role !== 'superadmin') {
    return {
      ok: false,
      status: 403,
      body: {
        success: false,
        message: 'Solo gerencia o administración pueden importar productos desde WooCommerce',
      },
    }
  }

  return { ok: true }
}

type DraftItem = {
  woocommerce_id?: number | null
  sku?: string | null
  name?: string | null
  sku_missing_in_wc?: boolean
}

export async function POST(request: Request) {
  const auth = await assertGerenciaOrAdmin(request.headers.get('Authorization'))
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status })
  }

  const apiKey = getApiKey()
  if (!apiKey) {
    console.error('[import-woocommerce-products-draft] Falta API_KEY / X_API_KEY en el servidor')
    return NextResponse.json(
      {
        success: false,
        message:
          'El servidor no tiene configurada la API key para integraciones. Definí API_KEY o X_API_KEY en el entorno.',
      },
      { status: 503 }
    )
  }

  let body: { items?: DraftItem[]; category_id?: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, message: 'Cuerpo JSON inválido' }, { status: 400 })
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json(
      { success: false, message: 'Se requiere items: array no vacío' },
      { status: 400 }
    )
  }

  const payload: Record<string, unknown> = { items: body.items }
  if (body.category_id !== undefined && body.category_id !== null) {
    if (typeof body.category_id !== 'number' || Number.isNaN(body.category_id)) {
      return NextResponse.json(
        { success: false, message: 'category_id debe ser un número' },
        { status: 400 }
      )
    }
    payload.category_id = body.category_id
  }

  const backendUrl = `${getBackendBaseUrl()}integration/products/import-woocommerce-products-draft`

  try {
    const res = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify(payload),
    })

    const data = await res.json().catch(() => ({ success: false, message: 'Respuesta no JSON del backend' }))
    return NextResponse.json(data, { status: res.status })
  } catch (e) {
    console.error('[import-woocommerce-products-draft] Error al llamar al backend:', e)
    return NextResponse.json(
      { success: false, message: 'Error al conectar con la API de integración' },
      { status: 502 }
    )
  }
}
