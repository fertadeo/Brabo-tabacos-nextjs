import { getApiUrl } from '@/config/api';
import { mergeFacturarSaleRequestBody } from '@/lib/facturacion-request-preview';
import { getStoredFacturadorApiKey } from '@/lib/facturacion-settings';
import {
  extractFacturacionEmisionFromResponse,
  extractFacturacionErrorFromPayload,
  formatFacturacionErrorForUi,
  isCaeValido,
  resolveFacturacionError,
  resolveFacturacionErrorFromExtracted,
  type FacturacionErrorInfo,
} from '@/lib/facturacion-errors';
import { labelCondicionIvaReceptor } from '@/lib/facturacion-cliente-fiscal';
import {
  formatArcaPadronError,
  normalizeArcaPadronPayload,
  normalizeCuitDigits,
  type ArcaPadronResult,
} from '@/lib/arca-padron';
import type { ClientTaxCondition } from '@/lib/client-tax-condition';
import { afipCondicionFromTaxCondition } from '@/lib/client-tax-condition';

// Función helper para obtener el token de autenticación
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

// Función helper para obtener headers de autenticación
function getAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
}

// Tipos para autenticación
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken?: string; // Solo si NO se usan cookies
  user: {
    id: number;
    username: string;
    role: string;
    firstName: string;
    lastName: string;
  };
}

export interface AuthApiResponse {
  success: boolean;
  message: string;
  data: LoginResponse;
  error?: string;
  timestamp: string;
}

// Tipos para los datos de la API
export interface Cliente {
  id: number;
  code: string;
  client_type: "minorista" | "mayorista" | "personalizado";
  sales_channel: "woocommerce_minorista" | "woocommerce_mayorista" | "mercadolibre" | "sistema_mf" | "manual" | "otro";
  name: string;
  email: string;
  phone: string;
  address?: string;
  city: string;
  country: string;
  is_active: number; // 1 = activo, 0 = inactivo
  created_at: string;
  updated_at: string;
  primary_tax_id?: string;
  secondary_tax_id?: string;
  /** personeria: persona_fisica | persona_juridica | consumidor_final (API nueva) */
  personeria?: "persona_fisica" | "persona_juridica" | "consumidor_final";
  /** CUIL o CUIT 11 dígitos (API nueva) */
  cuil_cuit?: string | null;
  person_type?: "persona_fisica" | "persona_juridica";
  tax_condition?: "inscripto" | "consumidor_final" | "monotributo" | "responsable_inscripto" | "exento";
  /** Código AFIP condición IVA receptor (si el backend lo persiste). */
  condicion_iva_receptor?: number;
}

export interface ClientesResponse {
  clients: Cliente[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ClienteStats {
  total_clients: number;
  active_clients: string;
  inactive_clients: string;
  cities_count: number;
  countries_count: number;
  /** Clientes creados en el último mes (opcional, si el backend lo expone) */
  created_last_month?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

// Función para obtener todos los clientes con filtros opcionales
export async function getClientes(
  page: number = 1, 
  limit: number = 10,
  search?: string,
  status?: 'active' | 'inactive',
  city?: string
): Promise<ClientesResponse> {
  const apiUrl = getApiUrl();
  
  // Construir query params
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString()
  });
  
  if (search && search.trim()) {
    params.append('search', search.trim());
  }
  
  if (status) {
    params.append('status', status);
  }
  
  if (city && city.trim()) {
    params.append('city', city.trim());
  }
  
  const fullUrl = `${apiUrl}clients?${params.toString()}`;
  
  console.log('🔍 [API] Iniciando llamada a getClientes()');
  console.log('🌐 [API] URL completa:', fullUrl);
  console.log('⚙️ [API] Configuración:', { apiUrl, fullUrl, filters: { search, status, city } });

  try {
    console.log('📡 [API] Enviando request GET a:', fullUrl);
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    console.log('📥 [API] Respuesta recibida:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [API] Error en respuesta:', {
        status: response.status,
        statusText: response.statusText,
        errorText
      });
      throw new Error(`Error al obtener clientes: ${response.status} ${response.statusText}`);
    }

    const responseData: ApiResponse<ClientesResponse> = await response.json();
    console.log('✅ [API] Datos de clientes recibidos:', {
      type: typeof responseData,
      isObject: typeof responseData === 'object' && responseData !== null,
      keys: typeof responseData === 'object' && responseData !== null ? Object.keys(responseData) : 'N/A',
      fullResponse: responseData,
      clients: responseData.data?.clients,
      pagination: responseData.data?.pagination
    });
    
    // Devolver la respuesta completa con paginación
    return responseData.data || { clients: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
  } catch (error) {
    console.error('💥 [API] Error al obtener clientes:', {
      error: error,
      message: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

/**
 * Obtiene un cliente por ID (GET /clients/:id).
 */
export async function getClienteById(id: number): Promise<Cliente> {
  const apiUrl = getApiUrl()
  const response = await fetch(`${apiUrl}clients/${id}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const errorText = await response.text()
    let message = `Error al obtener cliente: ${response.status}`
    try {
      const parsed = JSON.parse(errorText) as { message?: string }
      if (parsed?.message) message = parsed.message
    } catch {
      if (errorText && errorText.length < 200) message = errorText
    }
    throw new Error(message)
  }

  const json = (await response.json()) as ApiResponse<Cliente> | Cliente
  if (typeof json === "object" && json !== null && "data" in json && json.data) {
    return json.data as Cliente
  }
  return json as Cliente
}

// Función para obtener estadísticas de clientes
export async function getClienteStats(): Promise<ClienteStats> {
  const apiUrl = getApiUrl();
  const fullUrl = `${apiUrl}clients/stats`;
  
  console.log('📊 [API] Iniciando llamada a getClienteStats()');
  console.log('🌐 [API] URL completa:', fullUrl);
  console.log('⚙️ [API] Configuración:', { apiUrl, fullUrl });

  try {
    console.log('📡 [API] Enviando request GET a:', fullUrl);
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    console.log('📥 [API] Respuesta de estadísticas recibida:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [API] Error en respuesta de estadísticas:', {
        status: response.status,
        statusText: response.statusText,
        errorText
      });
      throw new Error(`Error al obtener estadísticas: ${response.status} ${response.statusText}`);
    }

    const responseData: ApiResponse<ClienteStats> = await response.json();
    console.log('✅ [API] Datos de estadísticas recibidos:', {
      type: typeof responseData,
      isObject: typeof responseData === 'object' && responseData !== null,
      keys: typeof responseData === 'object' && responseData !== null ? Object.keys(responseData) : 'N/A',
      fullResponse: responseData,
      data: responseData.data
    });
    
    // Extraer solo los datos del campo 'data'
    return responseData.data;
  } catch (error) {
    console.error('💥 [API] Error al obtener estadísticas:', {
      error: error,
      message: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

// Extrae mensaje de error de respuesta API (400, 422, etc.)
async function getApiErrorMessage(response: Response): Promise<string> {
  const text = await response.text();
  try {
    const json = JSON.parse(text) as { message?: string; error?: string; errors?: Record<string, string> };
    if (typeof json.message === 'string') return json.message;
    if (typeof json.error === 'string') return json.error;
    if (json.errors && typeof json.errors === 'object') {
      const first = Object.values(json.errors)[0];
      if (typeof first === 'string') return first;
    }
  } catch {
    // no JSON
  }
  return text || `Error ${response.status} ${response.statusText}`;
}

// Función para crear un nuevo cliente
export async function createCliente(clienteData: {
  client_type: "minorista" | "mayorista" | "personalizado";
  sales_channel: "woocommerce_minorista" | "woocommerce_mayorista" | "mercadolibre" | "sistema_mf" | "manual" | "otro";
  name: string;
  email: string;
  phone: string;
  address?: string;
  city: string;
  country: string;
  personeria?: "persona_fisica" | "persona_juridica" | "consumidor_final";
  cuil_cuit?: string | null;
  tax_condition?: ClientTaxCondition;
  condicion_iva_receptor?: number;
}): Promise<any> {
  const apiUrl = getApiUrl();
  const fullUrl = `${apiUrl}clients`;
  
  console.log('🆕 [API] Iniciando llamada a createCliente()');
  console.log('🌐 [API] URL completa:', fullUrl);
  console.log('📋 [API] Datos del cliente:', clienteData);

  const body: Record<string, unknown> = { ...clienteData }
  if (clienteData.tax_condition) {
    body.tax_condition = clienteData.tax_condition
    body.condicion_iva_receptor =
      clienteData.condicion_iva_receptor ?? afipCondicionFromTaxCondition(clienteData.tax_condition)
  }
  if (clienteData.personeria != null && clienteData.personeria !== "consumidor_final") {
    body.person_type = clienteData.personeria
  }
  if (clienteData.cuil_cuit != null && clienteData.cuil_cuit !== "") {
    body.primary_tax_id = clienteData.cuil_cuit
  }

  try {
    console.log('📡 [API] Enviando request POST a:', fullUrl);
    
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(body)
    });

    console.log('📥 [API] Respuesta de creación recibida:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      const msg = await getApiErrorMessage(response);
      console.error('❌ [API] Error en respuesta de creación:', { status: response.status, msg });
      throw new Error(msg);
    }

    const data = await response.json();
    console.log('✅ [API] Cliente creado exitosamente:', {
      type: typeof data,
      isObject: typeof data === 'object' && data !== null,
      keys: typeof data === 'object' && data !== null ? Object.keys(data) : 'N/A',
      data: data
    });
    
    return data;
  } catch (error) {
    console.error('💥 [API] Error al crear cliente:', {
      error: error,
      message: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

/** Consulta padrón ARCA (MultiCUIT) para autocompletar alta de cliente. */
export async function getClientArcaPadron(cuit: string): Promise<ArcaPadronResult> {
  return fetchArcaPadron('clients/padron', cuit);
}

/** Consulta padrón ARCA (MultiCUIT) para autocompletar alta de proveedor. */
export async function getSupplierArcaPadron(cuit: string): Promise<ArcaPadronResult> {
  return fetchArcaPadron('purchases/suppliers/padron', cuit);
}

async function fetchArcaPadron(pathPrefix: string, cuit: string): Promise<ArcaPadronResult> {
  const digits = normalizeCuitDigits(cuit);
  if (digits.length !== 11) {
    throw new Error(formatArcaPadronError(400, { code: 'INVALID_CUIT' }));
  }
  const apiUrl = getApiUrl();
  const response = await fetch(`${apiUrl}${pathPrefix}/${digits}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  const text = await response.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }
  if (!response.ok) {
    throw new Error(formatArcaPadronError(response.status, payload));
  }
  return normalizeArcaPadronPayload(payload);
}

// Función para eliminar un cliente (soft/hard delete automático)
export async function deleteCliente(id: number): Promise<any> {
  try {
    const apiUrl = getApiUrl();
    const url = `${apiUrl}clients/${id}`;
    
    console.log('🗑️ [API] Eliminando cliente:', {
      url: url,
      id: id,
      method: 'DELETE'
    });

    const response = await fetch(url, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    console.log('📡 [API] Respuesta de eliminación:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [API] Error en respuesta:', {
        status: response.status,
        statusText: response.statusText,
        errorText: errorText
      });
      let message = errorText || `Error ${response.status}`
      try {
        const parsed = JSON.parse(errorText)
        if (parsed?.message) message = parsed.message
      } catch {
        if (errorText && errorText.length < 200) message = errorText
      }
      throw new Error(message)
    }

    const data = await response.json();
    console.log('✅ [API] Cliente eliminado exitosamente:', {
      type: typeof data,
      isObject: typeof data === 'object' && data !== null,
      keys: typeof data === 'object' && data !== null ? Object.keys(data) : 'N/A',
      data: data
    });
    
    return data;
  } catch (error) {
    console.error('💥 [API] Error al eliminar cliente:', {
      error: error,
      message: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

// Función para actualizar un cliente existente
export async function updateCliente(id: number, clienteData: {
  client_type: "minorista" | "mayorista" | "personalizado";
  sales_channel: "woocommerce_minorista" | "woocommerce_mayorista" | "mercadolibre" | "sistema_mf" | "manual" | "otro";
  name: string;
  email: string;
  phone: string;
  address?: string;
  city: string;
  country: string;
  personeria?: "persona_fisica" | "persona_juridica" | "consumidor_final";
  cuil_cuit?: string | null;
  tax_condition?: ClientTaxCondition;
  condicion_iva_receptor?: number;
}): Promise<Cliente> {
  try {
    const apiUrl = getApiUrl();
    const url = `${apiUrl}clients/${id}`;
    // Enviar nombres nuevos (personeria, cuil_cuit) y legacy (person_type, primary_tax_id) por si el backend solo acepta uno u otro
    const body: Record<string, unknown> = {
      client_type: clienteData.client_type,
      sales_channel: clienteData.sales_channel,
      name: clienteData.name,
      email: clienteData.email,
      phone: clienteData.phone,
      address: clienteData.address ?? null,
      city: clienteData.city,
      country: clienteData.country,
      personeria: clienteData.personeria,
      cuil_cuit: clienteData.cuil_cuit ?? null,
    }
    if (clienteData.personeria === "consumidor_final") {
      body.person_type = null
    } else if (clienteData.personeria != null) {
      body.person_type = clienteData.personeria
    }
    if (clienteData.cuil_cuit != null && clienteData.cuil_cuit !== "") {
      body.primary_tax_id = clienteData.cuil_cuit
    } else {
      body.primary_tax_id = null
    }
    if (clienteData.tax_condition) {
      body.tax_condition = clienteData.tax_condition
      body.condicion_iva_receptor =
        clienteData.condicion_iva_receptor ?? afipCondicionFromTaxCondition(clienteData.tax_condition)
    }

    console.log('🔄 [API] Actualizando cliente:', {
      url: url,
      id: id,
      body: body,
      method: 'PUT'
    });

    const response = await fetch(url, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(body)
    });

    console.log('📡 [API] Respuesta de actualización:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      const msg = await getApiErrorMessage(response);
      console.error('❌ [API] Error en respuesta:', { status: response.status, msg });
      throw new Error(msg);
    }

    const text = await response.text();
    if (!text.trim()) {
      return getClienteById(id);
    }

    let parsed: ApiResponse<Cliente> | Cliente;
    try {
      parsed = JSON.parse(text) as ApiResponse<Cliente> | Cliente;
    } catch {
      return getClienteById(id);
    }

    const data =
      typeof parsed === "object" && parsed !== null && "data" in parsed && parsed.data
        ? parsed.data
        : (parsed as Cliente);

    console.log('✅ [API] Cliente actualizado exitosamente:', data);
    return data;
  } catch (error) {
    console.error('💥 [API] Error al actualizar cliente:', {
      error: error,
      message: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

// Interfaces para estadísticas de productos
export interface ProductStats {
  total_products: number;
  active_products: string;
  total_stock_quantity: number;   // SUM(stock) — total de unidades en stock
  total_stock_value: string;      // SUM(stock * price) — valor total del inventario
  average_price: string;
  low_stock_count: number;
  out_of_stock_count: number;
}

export interface ProductStatsResponse {
  success: boolean;
  message: string;
  data: ProductStats;
  timestamp: string;
}

/** Precios por lista (Brabo: venta_local, mayorista, revendedor). */
export interface ProductPricesBySlug {
  venta_local?: number
  mayorista?: number
  revendedor?: number
  [slug: string]: number | undefined
}

export interface PriceList {
  id: number
  name: string
  slug: string
  is_default: boolean
  sort_order: number
  is_active: boolean
}

// Interfaces para productos
export interface Product {
  id: number
  code: string
  name: string
  description?: string
  category_id?: number
  category_name?: string
  price: number
  /** Precios por lista; price suele coincidir con venta_local. */
  prices?: ProductPricesBySlug
  stock: number
  min_stock: number
  max_stock: number
  is_active: boolean
  created_at: string
  updated_at: string
  image_url?: string  // URL de imagen desde la API
  woocommerce_image_url?: string  // URL específica de WooCommerce
  woocommerce_id?: number  // ID del producto en WooCommerce (si existe)
  woocommerce_slug?: string | null  // Slug del producto en WooCommerce (para URL amigable)
  images?: string[]  // Array de URLs de imágenes del producto
  woocommerce_image_ids?: number[]  // IDs de medios en WordPress para sincronizar con WooCommerce
  barcode?: string  // Código de barras del producto (para lectoras)
  qr_code?: string  // URL del código QR para consulta pública
  deleted_at?: string | null  // Soft delete: si existe, el producto está en papelera
  // WooCommerce: reservas, dimensiones y peso (productos por encargo / envíos)
  weight?: number | null  // Peso en kg (envíos)
  length?: number | null  // Longitud en cm
  width?: number | null   // Ancho en cm
  height?: number | null  // Alto en cm
  allow_backorders?: boolean  // true = venta por encargo (reservas con stock 0)
  /** Alícuota IVA de venta: 21, 10.5 o 0. Default API: 21. */
  iva_rate?: number | null
}

export interface CreateProductData {
  code: string
  name: string
  description?: string | null
  category_id?: number | null
  price: number
  prices?: ProductPricesBySlug
  stock?: number
  min_stock?: number
  max_stock?: number
  is_active?: boolean
  images?: string[] | null
  woocommerce_image_ids?: number[] | null  // IDs de medios en WordPress (mismo orden que images)
  barcode?: string | null  // Código de barras del producto
  qr_code?: string | null  // URL del código QR para consulta pública
  sync_to_woocommerce?: boolean  // Sincronizar con WooCommerce al crear
  weight?: number | null   // Peso en kg (≥ 0)
  length?: number | null   // Longitud en cm (≥ 0)
  width?: number | null    // Ancho en cm (≥ 0)
  height?: number | null   // Alto en cm (≥ 0)
  allow_backorders?: boolean  // true = venta por encargo (stock 0 permitido)
  /** Alícuota IVA: 21, 10.5 o 0. Default: 21. */
  iva_rate?: number
}

export interface UpdateProductData {
  code?: string
  name?: string
  description?: string | null
  category_id?: number | null
  price?: number
  prices?: ProductPricesBySlug
  stock?: number
  min_stock?: number
  max_stock?: number
  is_active?: boolean
  images?: string[] | null
  woocommerce_image_ids?: number[] | null  // IDs de medios en WordPress (mismo orden que images)
  barcode?: string | null
  qr_code?: string | null
  sync_to_woocommerce?: boolean  // Sincronizar con WooCommerce al actualizar
  weight?: number | null
  length?: number | null
  width?: number | null
  height?: number | null
  allow_backorders?: boolean
  /** Alícuota IVA: 21, 10.5 o 0. */
  iva_rate?: number
}

export interface UpdateStockData {
  stock: number
  operation?: 'set' | 'add' | 'subtract'
}

export interface ProductsResponse {
  success: boolean
  message: string
  data: Product[] | {
    products: Product[]
    pagination?: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }
  error?: string
  timestamp: string
}

export interface ProductsPaginatedResponse {
  success: boolean
  message: string
  data: {
    products: Product[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }
  error?: string
  timestamp: string
}

export interface ProductResponse {
  success: boolean
  message: string
  data: Product
  error?: string
  timestamp: string
}

// --- Ventas en local (Punto de venta) - POST /api/sales con x-api-key ---
export type SalePaymentMethod = 'efectivo' | 'tarjeta' | 'transferencia' | 'mixto'

export type SaleCurrency = 'ARS' | 'USD'

/** Línea de catálogo (descuenta stock en backend). */
export interface CreateSaleCatalogItem {
  product_id: number
  quantity: number
  unit_price: number
  /** Alícuota IVA: 21, 10.5 o 0 (exento). Default backend: 21. */
  iva_rate?: number
}

/** Línea libre: no crea producto en catálogo; requiere soporte en POST /api/sales. */
export interface CreateSaleCustomItem {
  description: string
  quantity: number
  unit_price: number
  /** Alícuota IVA: 21, 10.5 o 0 (exento). Default backend: 21. */
  iva_rate?: number
}

export type CreateSaleItem = CreateSaleCatalogItem | CreateSaleCustomItem

export function isCreateSaleCatalogItem(item: CreateSaleItem): item is CreateSaleCatalogItem {
  return "product_id" in item && item.product_id != null
}

export interface CreateSalePaymentDetails {
  efectivo?: number
  tarjeta?: number
  transferencia?: number
}

export interface CreateSaleRequest {
  items: CreateSaleItem[]
  payment_method: SalePaymentMethod
  client_id?: number
  payment_details?: CreateSalePaymentDetails
  notes?: string
  sync_to_woocommerce?: boolean
  /** Moneda de cobro (default ARS). */
  currency?: SaleCurrency
  /** Cotización USD/ARS obligatoria si currency = USD. */
  exchange_rate?: number
  /** true = permitir vender productos inactivos (el backend rechaza por defecto) */
  allow_inactive?: boolean
}

export interface SaleItemResponse {
  /** Null o ausente en ítems manuales (sin producto de catálogo). */
  product_id?: number | null
  /** Texto de línea libre; el backend puede devolverlo como product_name o description. */
  product_name?: string | null
  description?: string | null
  quantity: number
  unit_price: number
  /** Alícuota IVA de la línea: 21, 10.5 o 0. */
  iva_rate?: number | null
  subtotal?: number
  /** Backend puede devolver total_price en lugar de subtotal */
  total_price?: number
}

/** Campos ARCA de factura original y nota de crédito (GET /api/sales) */
export interface SaleArcaFields {
  arca_status?: 'pending' | 'success' | 'error' | null
  arca_factura_id?: string | null
  arca_cae?: string | null
  arca_cae_vto?: string | null
  arca_tipo?: number | null
  arca_punto_venta?: number | null
  arca_numero?: number | null
  arca_fecha_emision?: string | null
  arca_cuit_emisor?: string | null
  /** Payload enviado al facturador al emitir (incluye docTipo/docNro del receptor). */
  arca_request_json?: Record<string, unknown> | null
  /** Denormalizado en GET /sales desde arca_request_json */
  arca_receptor_doc_tipo?: number | null
  arca_receptor_doc_nro?: string | null
  arca_last_attempt_at?: string | null
  arca_error_code?: string | null
  arca_error_message?: string | null
  arca_nc_status?: 'pending' | 'success' | 'error' | null
  arca_nc_cae?: string | null
  arca_nc_cae_vto?: string | null
  arca_nc_factura_id?: string | null
  arca_nc_tipo?: number | null
  arca_nc_punto_venta?: number | null
  arca_nc_numero?: number | null
  arca_nc_motivo?: string | null
  arca_nc_observaciones?: string | null
  arca_nc_error_code?: string | null
  arca_nc_error_message?: string | null
  arca_nc_last_attempt_at?: string | null
  facturacion_archived?: boolean | number | null
  facturacion_archived_at?: string | null
  facturacion_archived_by?: number | null
  condicion_venta_codigo?: string | null
  condicion_venta_texto?: string | null
  fecha_vencimiento_pago?: string | null
  /** Historial de facturas y notas de crédito (Factura 1 → NC → Factura 2). */
  arca_historial?: SaleComprobanteHistorial[]
}

export type SaleComprobanteKind = 'factura' | 'nota_credito'

export interface SaleComprobanteItemSnapshot {
  product_id: number | null
  product_name?: string | null
  product_code?: string | null
  description?: string | null
  quantity: number
  unit_price: number
  total_price: number
  iva_rate?: number
}

export interface SaleComprobanteHistorial {
  id: number | null
  sequence: number
  kind: SaleComprobanteKind
  status: 'pending' | 'success' | 'error'
  factura_id?: string | null
  cae: string | null
  cae_vto?: string | null
  tipo?: number | null
  punto_venta?: number | null
  numero?: number | null
  cuit_emisor?: string | null
  fecha_emision?: string | null
  qr_url?: string | null
  motivo?: string | null
  observaciones?: string | null
  related_comprobante_id?: number | null
  request_json?: Record<string, unknown> | null
  response_json?: Record<string, unknown> | null
  items_json?: SaleComprobanteItemSnapshot[] | null
  emitted_at?: string | null
  vigente: boolean
}

export interface SaleResponseData extends SaleArcaFields {
  id: number
  sale_number: string
  client_id: number | null
  client_name?: string | null
  client_code?: string | null
  client_email?: string | null
  client_phone?: string | null
  client_address?: string | null
  client_city?: string | null
  client_cuil_cuit?: string | null
  total_amount: number
  currency?: SaleCurrency
  exchange_rate?: number | null
  payment_method: SalePaymentMethod
  payment_details?: CreateSalePaymentDetails
  notes?: string | null
  sale_date: string
  sale_source?: 'pos' | 'imported' | 'pos_external'
  sync_status?: string
  items: SaleItemResponse[]
  created_at: string
  updated_at: string
}

/** Cuerpo parcial para PUT /api/sales/:id (edición de venta no facturada). */
export interface UpdateSaleRequest {
  client_id?: number | null
  items?: CreateSaleItem[]
  payment_method?: SalePaymentMethod
  payment_details?: CreateSalePaymentDetails
  notes?: string | null
  allow_inactive?: boolean
  sync_to_woocommerce?: boolean
  currency?: SaleCurrency
  exchange_rate?: number
}

export interface CreateSaleResponse {
  success: boolean
  message: string
  data: SaleResponseData
  timestamp: string
}

/** API Key para punto de venta (localStorage 'posApiKey' o 'apiKey', o NEXT_PUBLIC_POS_API_KEY). Requerida para POST /api/sales. */
export function getPosApiKey(): string | null {
  if (typeof window === 'undefined') return null
  const fromStorage = localStorage.getItem('posApiKey') || localStorage.getItem('apiKey')
  if (fromStorage) return fromStorage
  const fromEnv = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_POS_API_KEY
  return fromEnv ? (process.env.NEXT_PUBLIC_POS_API_KEY ?? null) : null
}

/**
 * Crea una venta en local físico (POST /api/sales).
 * Autenticación: JWT (Authorization: Bearer) o API Key (x-api-key). Al menos uno requerido.
 * El backend descuenta stock en el ERP y, si aplica, sincroniza con WooCommerce.
 */
export async function createSale(body: CreateSaleRequest): Promise<SaleResponseData> {
  const apiUrl = getApiUrl()
  const fullUrl = `${apiUrl}sales`
  const token = getAccessToken()
  const apiKey = getPosApiKey()

  if (!token && !apiKey) {
    throw new Error(
      'Autenticación requerida: iniciá sesión o configurá la API Key para punto de venta en Configuración.'
    )
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  if (apiKey) {
    headers['x-api-key'] = apiKey
  }

  const response = await fetch(fullUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(
        'No autorizado. Verificá que estés logueado (JWT) o que el header x-api-key sea correcto.'
      )
    }
    if (response.status === 404) {
      throw new Error(
        'No se encontró POST /api/sales. Revisá que la URL base del frontend apunte al mismo host/puerto de la API.'
      )
    }
    const msg = data?.message || data?.error || `Error ${response.status}`
    throw new Error(msg)
  }

  if (!data?.success || !data?.data) {
    throw new Error(data?.message || 'Error al crear la venta')
  }

  return data.data
}

/**
 * Actualiza una venta POS existente (PUT /api/sales/:id).
 * Solo permitido si arca_status !== 'success'. Requiere JWT o x-api-key.
 */
export async function updateSale(id: number, body: UpdateSaleRequest): Promise<SaleResponseData> {
  const apiUrl = getApiUrl()
  const token = getAccessToken()
  const apiKey = getPosApiKey()

  if (!token && !apiKey) {
    throw new Error(
      'Autenticación requerida: iniciá sesión o configurá la API Key para punto de venta en Configuración.'
    )
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  if (apiKey) {
    headers['x-api-key'] = apiKey
  }

  const response = await fetch(`${apiUrl}sales/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const msg = data?.message || data?.error || `Error ${response.status}`
    const err = new Error(msg) as Error & { status?: number }
    err.status = response.status
    if (response.status === 401) logout()
    throw err
  }

  if (!data?.success || !data?.data) {
    throw new Error(data?.message || 'Error al actualizar la venta')
  }

  return data.data
}

// --- Listado y estadísticas de ventas POS (GET /api/sales, GET /api/sales/stats) ---
/** Error con código HTTP (401/403) para redirigir a login o /403 */
export type ApiErrorWithStatus = Error & { status?: number }

/** Venta POS en listado (campos que devuelve GET /api/sales) */
export interface Sale extends SaleArcaFields {
  id: number
  sale_number: string
  client_id: number | null
  client_name?: string | null
  client_code?: string | null
  client_email?: string | null
  client_phone?: string | null
  client_address?: string | null
  client_city?: string | null
  client_cuil_cuit?: string | null
  total_amount: number
  currency?: SaleCurrency
  exchange_rate?: number | null
  payment_method: SalePaymentMethod
  sale_date: string
  sync_status?: 'pending' | 'synced' | 'error'
  sale_source?: 'pos' | 'imported' | 'pos_external'
  source_file_path?: string | null
  items?: SaleItemResponse[]
  created_at: string
  updated_at: string
}

/** Respuesta de GET /api/sales: listado en data.sales; paginación en data.total, data.page, data.limit */
export interface SalesListResponse {
  success: boolean
  message: string
  data: {
    sales: Sale[]
    total?: number
    page?: number
    limit?: number
  }
  timestamp: string
}

export interface SalesStats {
  total_sales?: number
  total_amount?: number
  average_amount?: number
  sales_today?: number
  sales_month?: number
  by_payment_method?: Record<string, number>
  pending_sync?: number
}

/** Estadísticas unificadas del dashboard (GET /api/dashboard/stats). Requiere rol gerencia o finanzas. */
export interface DashboardStats {
  dailySales: number
  dailySalesFromOrders?: number
  dailySalesFromPos?: number
  /** Monto total del mes (POS + pedidos) si el backend lo expone */
  monthlySales?: number
  monthly_sales?: number
  monthlySalesFromPos?: number
  monthly_sales_from_pos?: number
  monthlySalesFromOrders?: number
  monthly_sales_from_orders?: number
  activeOrders?: number
  activeClients?: number
  criticalProducts?: number
  stockMinority?: number
  stockMajority?: number
  customOrders?: number
}

export async function getSales(params?: {
  page?: number
  limit?: number
  client_id?: number
  payment_method?: SalePaymentMethod
  sync_status?: 'pending' | 'synced' | 'error'
  date_from?: string
  date_to?: string
  include_items?: boolean
  include_facturacion_archived?: boolean
}): Promise<SalesListResponse> {
  const apiUrl = getApiUrl()
  const queryParams = new URLSearchParams()
  if (params?.page != null && params.page > 0) queryParams.append('page', params.page.toString())
  if (params?.limit != null && params.limit > 0) queryParams.append('limit', params.limit.toString())
  if (params?.client_id != null && params.client_id > 0) queryParams.append('client_id', params.client_id.toString())
  if (params?.payment_method) queryParams.append('payment_method', params.payment_method)
  if (params?.sync_status) queryParams.append('sync_status', params.sync_status)
  if (params?.date_from) queryParams.append('date_from', params.date_from)
  if (params?.date_to) queryParams.append('date_to', params.date_to)
  if (params?.include_items) queryParams.append('include_items', 'true')
  if (params?.include_facturacion_archived) {
    queryParams.append('include_facturacion_archived', 'true')
  }

  const url = `${apiUrl}sales${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
  const headers: HeadersInit = { ...getAuthHeaders() }
  if (typeof window !== 'undefined') {
    const apiKey = localStorage.getItem('posApiKey') || localStorage.getItem('apiKey')
    if (apiKey) (headers as Record<string, string>)['x-api-key'] = apiKey
  }

  const response = await fetch(url, { method: 'GET', headers })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const msg = data?.message || data?.error || `Error ${response.status}`
    const err = new Error(msg) as Error & { status?: number }
    err.status = response.status
    if (response.status === 401) {
      logout()
    }
    throw err
  }
  // Algunos entornos (proxy, gateway) en producción devuelven { sales, total } en la raíz; normalizar a data.sales
  if (data && typeof data === 'object' && (data.data == null || data.data === undefined) && Array.isArray(data.sales)) {
    return { ...data, data: { sales: data.sales, total: data.total, page: data.page, limit: data.limit } }
  }
  return data
}

export async function setFacturacionArchivedForSales(
  saleIds: number[],
  archived: boolean
): Promise<{
  success: boolean
  message: string
  data?: { updated: number; saleIds: number[]; rejected?: Array<{ id: number; reason: string }> }
}> {
  const apiUrl = getApiUrl()
  const headers: HeadersInit = { ...getAuthHeaders(), 'Content-Type': 'application/json' }
  const response = await fetch(`${apiUrl}sales/facturacion-archive`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ saleIds, archived }),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const msg = data?.message || data?.error || `Error ${response.status}`
    const err = new Error(msg) as Error & { status?: number }
    err.status = response.status
    if (response.status === 401) logout()
    throw err
  }
  return data
}

export async function getSale(id: number): Promise<{ success: boolean; message: string; data: SaleResponseData; timestamp: string }> {
  const apiUrl = getApiUrl()
  const headers: HeadersInit = { ...getAuthHeaders() }
  if (typeof window !== 'undefined') {
    const apiKey = localStorage.getItem('posApiKey') || localStorage.getItem('apiKey')
    if (apiKey) (headers as Record<string, string>)['x-api-key'] = apiKey
  }

  const response = await fetch(`${apiUrl}sales/${id}`, { method: 'GET', headers })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const msg = data?.message || data?.error || `Error ${response.status}`
    const err = new Error(msg) as Error & { status?: number }
    err.status = response.status
    if (response.status === 401) logout()
    throw err
  }
  return data
}

export interface FacturarSugerenciaIvaLine {
  itemId?: number
  productId?: number | null
  descripcion: string
  ivaRate: number
  ivaRateLabel?: string
  lineTotal: number
  neto: number
  iva: number
  quantity?: number
  unitPrice?: number
}

export interface FacturarSugerenciaDefaults {
  /** Fecha comercial de la venta (YYYY-MM-DD, Argentina). */
  saleDate?: string
  sale_date?: string
  /** Fecha que el backend enviará al facturador (fechaCbte). */
  fechaCbte?: string
  fecha_cbte?: string
  /** Alias devuelto por GET /facturar/sugerencia (fecha de proceso ARCA = hoy Argentina). */
  fechaComprobanteEsperada?: string
}

export interface FacturarSugerenciaPadronCondicion {
  checked: boolean
  coincide: boolean
  condicionEnviada: number
  condicionSugerida?: number | null
  condicionSugeridaLabel?: string | null
  unavailable?: boolean
  message?: string | null
  advertencias?: string[]
}

export interface FacturarSugerenciaData {
  totalAmount: number
  emisorRegimen?: "responsable_inscripto" | "monotributo" | "exento"
  condicionIvaReceptor?: number
  sugerencia?: { tipo: number; label: string; motivo?: string }
  ivaDesglose?: FacturarSugerenciaIvaLine[]
  ivaResumen?: Array<{ id: number; base: number; cuota: number }>
  alicuotasPermitidas?: Array<{ rate: number; label: string; afipId: number }>
  defaults?: FacturarSugerenciaDefaults
  padronCondicionIva?: FacturarSugerenciaPadronCondicion | null
}

/** Fechas comercial y de comprobante desde GET /facturar/sugerencia. */
export function parseFacturarSugerenciaDefaults(
  data: FacturarSugerenciaData
): { saleDate?: string; fechaCbte?: string } {
  const d = data.defaults
  if (!d) return {}
  return {
    saleDate: d.saleDate ?? d.sale_date,
    fechaCbte: d.fechaCbte ?? d.fecha_cbte ?? d.fechaComprobanteEsperada,
  }
}

export interface FacturarSugerenciaResponse {
  success: boolean
  message: string
  data: FacturarSugerenciaData
  error?: string
  timestamp?: string
}

/** Preview fiscal listo para el modal de emisión (GET /api/sales/:id/facturar/sugerencia). */
export async function getFacturarSugerencia(saleId: number): Promise<FacturarSugerenciaData> {
  const apiUrl = getApiUrl()
  const headers: HeadersInit = { ...getAuthHeaders() }
  if (typeof window !== "undefined") {
    const apiKey = localStorage.getItem("posApiKey") || localStorage.getItem("apiKey")
    if (apiKey) (headers as Record<string, string>)["x-api-key"] = apiKey
  }

  const response = await fetch(`${apiUrl}sales/${saleId}/facturar/sugerencia`, { method: "GET", headers })
  const data = (await response.json().catch(() => ({}))) as FacturarSugerenciaResponse
  if (!response.ok) {
    const msg = data?.message || data?.error || `Error ${response.status}`
    const err = new Error(msg) as Error & { status?: number }
    err.status = response.status
    if (response.status === 401) logout()
    throw err
  }
  return data.data
}

export interface FacturarSaleRequest {
  cuitEmisor?: string
  puntoVenta?: number
  docTipo?: number
  docNro?: number
  tipo?: number
  condicionIvaReceptor?: number
  concepto?: 1 | 2 | 3
  fechaServicioDesde?: string
  fechaServicioHasta?: string
  /** Código catálogo ERP (CONTADO, CC_30, OTRO, …). */
  condicionVentaCodigo?: string
  /** Etiqueta resuelta enviada al facturador como condicionVenta. */
  condicionVenta?: string
  /** Texto libre si condicionVentaCodigo = OTRO. */
  condicionVentaTexto?: string
  fechaVencimientoPago?: string
  receptorRazonSocial?: string
  receptorDomicilio?: string
  force?: boolean
  skipPadronCondicionCheck?: boolean
  /** El usuario ajustó tipo/condición en configuración fiscal manual; el POST es la fuente de verdad. */
  fiscalManualConfig?: boolean
}

export interface FacturarSaleResponseData {
  sale?: {
    id: number
    arca_status?: 'pending' | 'success' | 'error'
    arca_factura_id?: string | null
    arca_cae?: string | null
    arca_cae_vto?: string | null
    arca_last_attempt_at?: string | null
    arca_error_code?: string | null
    arca_error_message?: string | null
  }
  arca?: {
    facturaId?: string
    cae?: string
    vencimientoCae?: string
    cae_vto?: string
    idempotencyKey?: string
    response?: unknown
  }
  status?: number
  code?: string
  retryAfter?: number | string | null
}

export interface FacturarSaleResponse {
  success: boolean
  message: string
  data?: FacturarSaleResponseData
  error?: string
  timestamp?: string
}

export type FacturarSaleError = Error & {
  status?: number
  code?: string
  retryAfter?: number | string | null
  requestId?: string
  data?: FacturarSaleResponseData
  /** Cuerpo JSON parseado completo cuando la API devuelve error */
  responsePayload?: FacturarSaleResponse | Record<string, unknown>
  /** Texto crudo de la respuesta (útil si no es JSON) */
  rawResponseText?: string
  facturacionError?: FacturacionErrorInfo
}

export async function facturarSale(id: number, body: FacturarSaleRequest): Promise<FacturarSaleResponse> {
  const apiUrl = getApiUrl()
  const headers: HeadersInit = { ...getAuthHeaders() }

  if (typeof window !== 'undefined') {
    const apiKey = localStorage.getItem('posApiKey') || localStorage.getItem('apiKey')
    if (apiKey) (headers as Record<string, string>)['x-api-key'] = apiKey
    const facturadorKey = getStoredFacturadorApiKey()
    if (facturadorKey) {
      ;(headers as Record<string, string>)['x-facturador-api-key'] = facturadorKey
    }
  }

  const bodyMerged = mergeFacturarSaleRequestBody(body)

  const url = `${apiUrl}sales/${id}/facturar`
  const bodySerialized = JSON.stringify(bodyMerged)

  console.log('[FACTURAR] POST — URL:', url)
  console.log('[FACTURAR] POST — saleId:', id)
  console.log('[FACTURAR] POST — body (JSON):', bodySerialized)
  console.log('[FACTURAR] POST — body (objeto):', bodyMerged)

  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      body: bodySerialized,
    })
  } catch (networkErr) {
    console.error('[FACTURAR] Error de red al llamar facturar:', networkErr)
    throw networkErr
  }

  const rawText = await response.text()
  let data = {} as FacturarSaleResponse
  try {
    if (rawText) data = JSON.parse(rawText) as FacturarSaleResponse
  } catch (parseErr) {
    console.error('[FACTURAR] Respuesta no es JSON válido:', {
      status: response.status,
      statusText: response.statusText,
      rawPreview: rawText.slice(0, 2000),
      parseErr,
    })
  }

  if (!response.ok || data.success === false) {
    const extracted = extractFacturacionErrorFromPayload(data, response.status)
    const extractedWithPayload = {
      ...extracted,
      docTipo: extracted.docTipo ?? bodyMerged.docTipo,
      docNro: extracted.docNro ?? bodyMerged.docNro,
      condicionIvaReceptor: extracted.condicionIvaReceptor ?? bodyMerged.condicionIvaReceptor,
      tipoComprobante: extracted.tipoComprobante ?? bodyMerged.tipo,
    }
    const resolved = resolveFacturacionErrorFromExtracted(
      extractedWithPayload,
      response.ok ? (data?.data?.status as number | undefined) ?? 400 : response.status
    )
    if (!resolved.receptorContext) {
      const condicion = bodyMerged.condicionIvaReceptor
      resolved.receptorContext = {
        docTipo: bodyMerged.docTipo,
        docNro: bodyMerged.docNro,
        condicionIvaReceptor: condicion,
        condicionLabel: condicion != null ? labelCondicionIvaReceptor(condicion) : undefined,
        tipoComprobante: bodyMerged.tipo,
      }
    }
    const msg = formatFacturacionErrorForUi(resolved, extracted.requestId)
    const err = new Error(msg) as FacturarSaleError
    err.status = response.ok ? (data?.data?.status as number | undefined) ?? 400 : response.status
    err.code = resolved.code
    err.retryAfter = data?.data?.retryAfter
    err.requestId = extracted.requestId
    err.data = data?.data
    err.responsePayload = data
    err.rawResponseText = rawText.length > 4000 ? `${rawText.slice(0, 4000)}…` : rawText
    err.facturacionError = resolved

    console.error('[FACTURAR] Error HTTP:', {
      status: err.status,
      statusText: response.statusText,
      url,
      saleId: id,
      code: resolved.code,
      message: msg,
      requestId: extracted.requestId,
      diagnosis: resolved.diagnosis,
      receptorContext: resolved.receptorContext,
      remoteDetail: resolved.remoteDetail,
      issues: resolved.issues,
      bodyEnviado: bodyMerged,
      bodyEnviadoJson: bodySerialized,
      respuestaParseada: data,
      respuestaCrudaPreview: rawText.slice(0, 2000),
    })

    if (response.status === 401) logout()
    throw err
  }

  const emision = extractFacturacionEmisionFromResponse(data)
  if (!isCaeValido(emision?.cae ?? data?.data?.arca?.cae ?? data?.data?.sale?.arca_cae)) {
    const resolved = resolveFacturacionError({ code: 'EMPTY_CAE', rawMessage: data?.message })
    const err = new Error(formatFacturacionErrorForUi(resolved)) as FacturarSaleError
    err.status = response.status
    err.code = 'EMPTY_CAE'
    err.responsePayload = data
    err.facturacionError = resolved
    console.error('[FACTURAR] Respuesta sin CAE válido:', { saleId: id, data })
    throw err
  }

  console.log('[FACTURAR] OK:', {
    status: response.status,
    message: data?.message,
    data: data?.data,
    emision,
    timestamp: data?.timestamp,
  })

  return data
}

export type NotaCreditoMotivo = 'error_emision' | 'devolucion' | 'descuento' | 'otro'

export interface EmitirNotaCreditoRequest {
  confirmar: boolean
  motivo?: NotaCreditoMotivo
  observaciones?: string
  importe?: number | null
  puntoVenta?: number
  cuitEmisor?: number
}

export interface NotaCreditoEmisionData {
  cae?: string
  vencimientoCae?: string
  vencimientoCaeIso?: string
  tipo?: number
  puntoVenta?: number
  numero?: number
  facturaId?: string
  cbtesAsoc?: Array<{ tipo: number; ptoVta: number; nro: number }>
  idempotencyKey?: string
  response?: unknown
}

export interface EmitirNotaCreditoResponseData {
  sale?: Sale
  notaCredito?: NotaCreditoEmisionData
  code?: string
  status?: number
  retryAfter?: number | string | null
  requestId?: string | null
}

export interface EmitirNotaCreditoResponse {
  success: boolean
  message: string
  data?: EmitirNotaCreditoResponseData
  error?: string
  timestamp?: string
}

export type EmitirNotaCreditoError = Error & {
  status?: number
  code?: string
  requestId?: string
  data?: EmitirNotaCreditoResponseData
  responsePayload?: EmitirNotaCreditoResponse | Record<string, unknown>
  facturacionError?: import('@/lib/facturacion-errors').FacturacionErrorInfo
}

/**
 * Emite nota de crédito ARCA para una venta ya facturada (POST /api/sales/:id/nota-credito).
 */
export async function emitirNotaCreditoSale(
  id: number,
  body: EmitirNotaCreditoRequest
): Promise<EmitirNotaCreditoResponse> {
  const apiUrl = getApiUrl()
  const headers: HeadersInit = { ...getAuthHeaders(), 'Content-Type': 'application/json' }

  if (typeof window !== 'undefined') {
    const apiKey = localStorage.getItem('posApiKey') || localStorage.getItem('apiKey')
    if (apiKey) (headers as Record<string, string>)['x-api-key'] = apiKey
    const facturadorKey = getStoredFacturadorApiKey()
    if (facturadorKey) {
      ;(headers as Record<string, string>)['x-facturador-api-key'] = facturadorKey
    }
  }

  const url = `${apiUrl}sales/${id}/nota-credito`
  const bodySerialized = JSON.stringify(body)

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: bodySerialized,
  })

  const rawText = await response.text()
  let data = {} as EmitirNotaCreditoResponse
  try {
    if (rawText) data = JSON.parse(rawText) as EmitirNotaCreditoResponse
  } catch {
    /* respuesta no JSON */
  }

  if (!response.ok || data.success === false) {
    const extracted = extractFacturacionErrorFromPayload(data, response.status)
    const resolved = resolveFacturacionErrorFromExtracted(
      extracted,
      response.ok ? (data?.data?.status as number | undefined) ?? 400 : response.status
    )
    const msg = formatFacturacionErrorForUi(resolved, extracted.requestId)
    const err = new Error(msg) as EmitirNotaCreditoError
    err.status = response.ok ? (data?.data?.status as number | undefined) ?? 400 : response.status
    err.code = resolved.code
    err.requestId = extracted.requestId
    err.data = data?.data
    err.responsePayload = data
    err.facturacionError = resolved

    console.error('[NOTA CREDITO] Error:', {
      status: err.status,
      saleId: id,
      code: resolved.code,
      diagnosis: resolved.diagnosis,
      remoteDetail: resolved.remoteDetail,
      respuesta: data,
    })

    if (response.status === 401) logout()
    throw err
  }

  const ncCae = data?.data?.notaCredito?.cae ?? data?.data?.sale?.arca_nc_cae
  if (!ncCae?.trim()) {
    throw new Error(data?.message || 'La nota de crédito no devolvió CAE válido.')
  }

  return data
}

export async function getSalesStats(): Promise<{ success: boolean; message: string; data: SalesStats; timestamp: string }> {
  const apiUrl = getApiUrl()
  const headers: HeadersInit = { ...getAuthHeaders() }
  if (typeof window !== 'undefined') {
    const apiKey = localStorage.getItem('posApiKey') || localStorage.getItem('apiKey')
    if (apiKey) (headers as Record<string, string>)['x-api-key'] = apiKey
  }

  const response = await fetch(`${apiUrl}sales/stats`, { method: 'GET', headers })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const msg = data?.message || data?.error || `Error ${response.status}`
    const err = new Error(msg) as Error & { status?: number }
    err.status = response.status
    if (response.status === 401) logout()
    throw err
  }
  return data
}

export async function getDashboardStats(): Promise<{ success: boolean; message: string; data: DashboardStats; timestamp: string }> {
  const apiUrl = getApiUrl()
  const response = await fetch(`${apiUrl}dashboard/stats`, {
    method: 'GET',
    headers: getAuthHeaders(),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data?.message || data?.error || `Error ${response.status}`)
  }
  return data
}

/** Destacado: línea con mayor precio unitario vendido en el período (ver docs/dashboard-insights-backend.md) */
export interface DashboardTopProductByUnitPrice {
  product_id?: number | null
  product_name: string
  unit_price: number
  source: 'pos' | 'woocommerce'
  reference_type?: string
  reference_id?: number
  reference_label?: string
}

export interface DashboardTopRepairOrder {
  id: number
  repair_number: string
  client_id?: number
  client_name: string
  total_amount: number
  status?: string
  reception_date?: string
}

export interface DashboardTopClient {
  client_id: number | null
  client_name: string
  total_amount: number
  from_pos: number
  from_orders: number
  from_repairs: number
}

export interface DashboardInsightAlert {
  id: string
  severity: 'info' | 'warning' | 'danger'
  title: string
  count: number
  href?: string
  description?: string
}

export interface DashboardRepairPipeline {
  by_status: Record<string, number>
  open_count: number
  month_average_ticket: number
  amount_in_workshop: number
}

export interface DashboardInsightsPayload {
  period: { date_from: string; date_to: string }
  highlights: {
    top_product_by_unit_price: DashboardTopProductByUnitPrice | null
    top_repair_order: DashboardTopRepairOrder | null
    top_client: DashboardTopClient | null
  }
  alerts: DashboardInsightAlert[]
  repair_pipeline: DashboardRepairPipeline
}

export async function getDashboardInsights(params?: {
  date_from?: string
  date_to?: string
}): Promise<{
  success: boolean
  message: string
  data: DashboardInsightsPayload
  timestamp: string
}> {
  const apiUrl = getApiUrl()
  const q = new URLSearchParams()
  if (params?.date_from) q.set('date_from', params.date_from)
  if (params?.date_to) q.set('date_to', params.date_to)
  const url = `${apiUrl}dashboard/insights${q.toString() ? `?${q.toString()}` : ''}`
  const response = await fetch(url, { method: 'GET', headers: getAuthHeaders() })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const err = new Error((data?.message || data?.error || `Error ${response.status}`) as string) as Error & {
      status?: number
    }
    err.status = response.status
    throw err
  }
  return data
}

// Función para crear un nuevo producto
export async function createProduct(productData: CreateProductData): Promise<any> {
  try {
    const apiUrl = getApiUrl()
    const fullUrl = `${apiUrl}products`
    
    console.log('🆕 [API] Iniciando llamada a createProduct()')
    console.log('🌐 [API] URL completa:', fullUrl)
    console.log('📋 [API] Datos del producto:', productData)

    // Crear FormData para enviar archivos
    const formData = new FormData()
    
    // Agregar datos del formulario
    formData.append('code', productData.code)
    formData.append('name', productData.name)
    if (productData.description) {
      formData.append('description', productData.description)
    }
    if (productData.category_id) {
      formData.append('category_id', productData.category_id.toString())
    }
    formData.append('price', productData.price.toString())
    if (productData.iva_rate !== undefined && productData.iva_rate !== null) {
      formData.append('iva_rate', productData.iva_rate.toString())
    }
    formData.append('stock', (productData.stock ?? 0).toString())
    formData.append('min_stock', (productData.min_stock ?? 0).toString())
    formData.append('max_stock', (productData.max_stock ?? 0).toString())
    formData.append('is_active', (productData.is_active ?? true).toString())

    // Agregar código de barras si existe
    if (productData.barcode) {
      formData.append('barcode', productData.barcode)
    }

    // Agregar código QR si existe
    if (productData.qr_code) {
      formData.append('qr_code', productData.qr_code)
    }

    // Agregar imágenes si existen
    if (productData.images && productData.images.length > 0) {
      productData.images.forEach((image, index) => {
        formData.append(`images[]`, image)
      })
    }

    console.log('📡 [API] Enviando request POST a:', fullUrl)
    
    const response = await fetch(fullUrl, {
      method: 'POST',
      body: formData
    })

    console.log('📥 [API] Respuesta de creación recibida:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ [API] Error en respuesta de creación:', {
        status: response.status,
        statusText: response.statusText,
        errorText
      })
      throw new Error(`Error al crear producto: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log('✅ [API] Producto creado exitosamente:', {
      type: typeof data,
      isObject: typeof data === 'object' && data !== null,
      keys: typeof data === 'object' && data !== null ? Object.keys(data) : 'N/A',
      data: data
    })
    
    return data
  } catch (error) {
    console.error('💥 [API] Error al crear producto:', {
      error: error,
      message: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    })
    throw error
  }
}

// Función para obtener categorías de productos
export async function getCategories(): Promise<Category[]> {
  try {
    const apiUrl = getApiUrl()
    const fullUrl = `${apiUrl}categories`
    
    console.log('📂 [API] Iniciando llamada a getCategories()')
    console.log('🌐 [API] URL completa:', fullUrl)

    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: getCategoryHeaders(),
    })

    console.log('📥 [API] Respuesta de categorías recibida:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ [API] Error en respuesta de categorías:', {
        status: response.status,
        statusText: response.statusText,
        errorText
      })
      throw new Error(`Error al obtener categorías: ${response.status} ${response.statusText}`)
    }

    const responseData: ApiResponse<{ categories: Category[] }> = await response.json()
    console.log('✅ [API] Categorías recibidas:', {
      type: typeof responseData,
      isObject: typeof responseData === 'object' && responseData !== null,
      keys: typeof responseData === 'object' && responseData !== null ? Object.keys(responseData) : 'N/A',
      data: responseData.data
    })
    
    return responseData.data?.categories || []
  } catch (error) {
    console.error('💥 [API] Error al obtener categorías:', {
      error: error,
      message: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    })
    throw error
  }
}

/** GET /api/price-lists — listas de precio activas (JWT). */
export async function getPriceLists(): Promise<PriceList[]> {
  const apiUrl = getApiUrl()
  const token = getAccessToken()
  const response = await fetch(`${apiUrl}price-lists`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  })
  const responseData: ApiResponse<PriceList[]> = await response.json()
  if (!response.ok) {
    throw new Error(responseData.message || `Error al obtener listas de precio: ${response.status}`)
  }
  return Array.isArray(responseData.data) ? responseData.data : []
}

export type PosDiscountThresholdType = "quantity" | "amount"
export type PosDiscountType = "percent" | "fixed"

export interface PosQuantityDiscount {
  id: number
  name: string
  threshold_type: PosDiscountThresholdType
  min_quantity: number
  min_amount: number
  discount_type: PosDiscountType
  discount_percent: number
  discount_amount: number
  price_list_slug: string | null
  is_active: boolean
  sort_order: number
  created_at?: string
  updated_at?: string
}

export interface CreatePosQuantityDiscountData {
  name: string
  threshold_type?: PosDiscountThresholdType
  min_quantity?: number
  min_amount?: number
  discount_type?: PosDiscountType
  discount_percent?: number
  discount_amount?: number
  price_list_slug?: string | null
  is_active?: boolean
  sort_order?: number
}

export type UpdatePosQuantityDiscountData = Partial<CreatePosQuantityDiscountData>

/** GET /api/pos-quantity-discounts */
export async function getPosQuantityDiscounts(activeOnly = false): Promise<PosQuantityDiscount[]> {
  const apiUrl = getApiUrl()
  const token = getAccessToken()
  const q = activeOnly ? "?active=1" : ""
  const response = await fetch(`${apiUrl}pos-quantity-discounts${q}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  })
  const responseData: ApiResponse<PosQuantityDiscount[]> = await response.json()
  if (!response.ok) {
    throw new Error(responseData.message || `Error al obtener descuentos: ${response.status}`)
  }
  const list = Array.isArray(responseData.data) ? responseData.data : []
  return list.map((r) => ({
    ...r,
    threshold_type: r.threshold_type === "amount" ? "amount" : "quantity",
    min_amount: Number(r.min_amount) || 0,
    discount_type: r.discount_type === "fixed" ? "fixed" : "percent",
    discount_amount: Number(r.discount_amount) || 0,
  })) as PosQuantityDiscount[]
}

export async function createPosQuantityDiscount(
  data: CreatePosQuantityDiscountData
): Promise<PosQuantityDiscount> {
  const apiUrl = getApiUrl()
  const token = getAccessToken()
  const response = await fetch(`${apiUrl}pos-quantity-discounts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  })
  const responseData: ApiResponse<PosQuantityDiscount> = await response.json()
  if (!response.ok) {
    throw new Error(responseData.error || responseData.message || "Error al crear descuento")
  }
  return responseData.data
}

export async function updatePosQuantityDiscount(
  id: number,
  data: UpdatePosQuantityDiscountData
): Promise<PosQuantityDiscount> {
  const apiUrl = getApiUrl()
  const token = getAccessToken()
  const response = await fetch(`${apiUrl}pos-quantity-discounts/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  })
  const responseData: ApiResponse<PosQuantityDiscount> = await response.json()
  if (!response.ok) {
    throw new Error(responseData.error || responseData.message || "Error al actualizar descuento")
  }
  return responseData.data
}

export async function deletePosQuantityDiscount(id: number): Promise<void> {
  const apiUrl = getApiUrl()
  const token = getAccessToken()
  const response = await fetch(`${apiUrl}pos-quantity-discounts/${id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  })
  const responseData = await response.json()
  if (!response.ok) {
    throw new Error(responseData.error || responseData.message || "Error al eliminar descuento")
  }
}

export interface Category {
  id: number
  name: string
  description?: string
  parent_id?: number | null
  is_active?: boolean
  woocommerce_id?: number | null
  woocommerce_slug?: string | null
  created_at: string
  updated_at: string
}

/** Headers JWT para categorías (CRUD del ERP; ya no requiere X-API-Key). */
function getCategoryHeaders(): HeadersInit {
  return getAuthHeaders()
}

// Interfaz para crear categoría
export interface CreateCategoryData {
  name: string
  description?: string
  parent_id?: number | null
  woocommerce_id?: number | null
  woocommerce_slug?: string | null
}

// Interfaz para actualizar categoría
export interface UpdateCategoryData {
  name?: string
  description?: string
  parent_id?: number | null
  is_active?: boolean
  woocommerce_id?: number | null
  woocommerce_slug?: string | null
}

// Función para crear una categoría
export async function createCategory(categoryData: CreateCategoryData): Promise<Category> {
  try {
    const apiUrl = getApiUrl()
    const fullUrl = `${apiUrl}categories`
    
    console.log('📂 [API] Creando categoría:', categoryData)
    console.log('🌐 [API] URL completa:', fullUrl)

    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: getCategoryHeaders(),
      body: JSON.stringify(categoryData)
    })

    console.log('📥 [API] Respuesta de creación recibida:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ [API] Error al crear categoría:', {
        status: response.status,
        statusText: response.statusText,
        errorText
      })
      
      let errorMessage = `Error al crear categoría: ${response.status} ${response.statusText}`
      try {
        const errorData = JSON.parse(errorText)
        errorMessage = errorData.error || errorData.message || errorMessage
      } catch {
        // Si no se puede parsear, usar el mensaje por defecto
      }
      
      throw new Error(errorMessage)
    }

    const responseData: ApiResponse<{ category: Category }> = await response.json()
    console.log('✅ [API] Categoría creada exitosamente:', responseData.data?.category)
    
    return responseData.data?.category!
  } catch (error) {
    console.error('💥 [API] Error al crear categoría:', {
      error: error,
      message: error instanceof Error ? error.message : 'Error desconocido'
    })
    throw error
  }
}

// Función para actualizar una categoría
export async function updateCategory(id: number, categoryData: UpdateCategoryData): Promise<Category> {
  try {
    const apiUrl = getApiUrl()
    const fullUrl = `${apiUrl}categories/${id}`
    
    console.log('📂 [API] Actualizando categoría:', { id, data: categoryData })
    console.log('🌐 [API] URL completa:', fullUrl)

    const response = await fetch(fullUrl, {
      method: 'PUT',
      headers: getCategoryHeaders(),
      body: JSON.stringify(categoryData)
    })

    console.log('📥 [API] Respuesta de actualización recibida:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ [API] Error al actualizar categoría:', {
        status: response.status,
        statusText: response.statusText,
        errorText
      })
      
      let errorMessage = `Error al actualizar categoría: ${response.status} ${response.statusText}`
      try {
        const errorData = JSON.parse(errorText)
        errorMessage = errorData.message || errorMessage
      } catch {
        // Si no se puede parsear, usar el mensaje por defecto
      }
      
      throw new Error(errorMessage)
    }

    const responseData: ApiResponse<{ category: Category }> = await response.json()
    console.log('✅ [API] Categoría actualizada exitosamente:', responseData.data?.category)
    
    return responseData.data?.category!
  } catch (error) {
    console.error('💥 [API] Error al actualizar categoría:', {
      error: error,
      message: error instanceof Error ? error.message : 'Error desconocido'
    })
    throw error
  }
}

// Función para eliminar una categoría (soft delete)
export async function deleteCategory(id: number): Promise<void> {
  try {
    const apiUrl = getApiUrl()
    const fullUrl = `${apiUrl}categories/${id}`
    
    console.log('📂 [API] Eliminando categoría:', id)
    console.log('🌐 [API] URL completa:', fullUrl)

    const response = await fetch(fullUrl, {
      method: 'DELETE',
      headers: getCategoryHeaders()
    })

    console.log('📥 [API] Respuesta de eliminación recibida:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ [API] Error al eliminar categoría:', {
        status: response.status,
        statusText: response.statusText,
        errorText
      })
      
      let errorMessage = `Error al eliminar categoría: ${response.status} ${response.statusText}`
      try {
        const errorData = JSON.parse(errorText)
        errorMessage = errorData.message || errorMessage
      } catch {
        // Si no se puede parsear, usar el mensaje por defecto
      }
      
      throw new Error(errorMessage)
    }

    const responseData: ApiResponse<{ id: number; name: string; woocommerce_id: number | null }> = await response.json()
    console.log('✅ [API] Categoría eliminada exitosamente:', responseData.data)
  } catch (error) {
    console.error('💥 [API] Error al eliminar categoría:', {
      error: error,
      message: error instanceof Error ? error.message : 'Error desconocido'
    })
    throw error
  }
}

// Función para obtener estadísticas de productos
export async function getProductStats(): Promise<ProductStats | null> {
  try {
    const apiUrl = getApiUrl();
    console.log('📊 [PRODUCT_STATS] Iniciando llamada a la API:', {
      url: `${apiUrl}products/stats`,
      timestamp: new Date().toISOString()
    });

    const token = getAccessToken()
    
    const response = await fetch(`${apiUrl}products/stats`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });

    console.log('📊 [PRODUCT_STATS] Respuesta recibida:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      url: response.url
    });

    if (!response.ok) {
      console.error('❌ [PRODUCT_STATS] Error en respuesta:', {
        status: response.status,
        statusText: response.statusText,
        url: response.url
      })
      
      if (response.status === 401) {
        throw new Error('Token de autorización inválido')
      }
      if (response.status === 403) {
        throw new Error('No tienes permisos para ver estadísticas de productos')
      }
      
      throw new Error(`Error al obtener estadísticas: ${response.status} ${response.statusText}`)
    }

    const responseData: ProductStatsResponse = await response.json();
    
    console.log('📊 [PRODUCT_STATS] Datos parseados:', {
      success: responseData.success,
      message: responseData.message,
      data: responseData.data,
      timestamp: responseData.timestamp
    });

    if (responseData.success && responseData.data) {
      console.log('📊 [PRODUCT_STATS] Estadísticas extraídas:', {
        totalProducts: responseData.data.total_products,
        activeProducts: responseData.data.active_products,
        totalStockQuantity: responseData.data.total_stock_quantity,
        totalStockValue: responseData.data.total_stock_value,
        averagePrice: responseData.data.average_price,
        lowStockCount: responseData.data.low_stock_count,
        outOfStockCount: responseData.data.out_of_stock_count
      });
      
      return responseData.data;
    } else {
      console.warn('📊 [PRODUCT_STATS] Respuesta no exitosa:', responseData);
      return null;
    }
  } catch (error) {
    console.error('📊 [PRODUCT_STATS] Error en la llamada:', {
      error: error,
      message: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

// Interfaces para proveedores
export interface Proveedor {
  id: number;
  code: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  city: string;
  country: string;
  contact_person?: string;
  tax_id?: string;
  is_active: number; // 1 = activo, 0 = inactivo
  created_at: string;
  updated_at: string;
}

export interface ProveedoresResponse {
  suppliers: Proveedor[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ProveedorStats {
  total_suppliers: number;
  active_suppliers: string;
  inactive_suppliers: string;
  cities_count: number;
  countries_count: number;
}

// Función para obtener todos los proveedores
export async function getProveedores(page: number = 1, limit: number = 10): Promise<ProveedoresResponse> {
  const apiUrl = getApiUrl();
  const fullUrl = `${apiUrl}suppliers?page=${page}&limit=${limit}`;
  
  console.log('🔍 [API] Iniciando llamada a getProveedores()');
  console.log('🌐 [API] URL completa:', fullUrl);

  try {
    console.log('📡 [API] Enviando request GET a:', fullUrl);
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('📥 [API] Respuesta recibida:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [API] Error en respuesta:', {
        status: response.status,
        statusText: response.statusText,
        errorText
      });
      throw new Error(`Error al obtener proveedores: ${response.status} ${response.statusText}`);
    }

    const responseData: ApiResponse<ProveedoresResponse> = await response.json();
    console.log('✅ [API] Datos de proveedores recibidos:', {
      type: typeof responseData,
      isObject: typeof responseData === 'object' && responseData !== null,
      keys: typeof responseData === 'object' && responseData !== null ? Object.keys(responseData) : 'N/A',
      fullResponse: responseData,
      suppliers: responseData.data?.suppliers,
      pagination: responseData.data?.pagination
    });
    
    // Devolver la respuesta completa con paginación
    return responseData.data || { suppliers: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
  } catch (error) {
    console.error('💥 [API] Error al obtener proveedores:', {
      error: error,
      message: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

// Función para obtener estadísticas de proveedores
export async function getProveedorStats(): Promise<ProveedorStats> {
  const apiUrl = getApiUrl();
  const fullUrl = `${apiUrl}suppliers/stats`;
  
  console.log('📊 [API] Iniciando llamada a getProveedorStats()');
  console.log('🌐 [API] URL completa:', fullUrl);

  try {
    console.log('📡 [API] Enviando request GET a:', fullUrl);
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('📥 [API] Respuesta de estadísticas recibida:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [API] Error en respuesta de estadísticas:', {
        status: response.status,
        statusText: response.statusText,
        errorText
      });
      throw new Error(`Error al obtener estadísticas: ${response.status} ${response.statusText}`);
    }

    const responseData: ApiResponse<ProveedorStats> = await response.json();
    console.log('✅ [API] Datos de estadísticas recibidos:', {
      type: typeof responseData,
      isObject: typeof responseData === 'object' && responseData !== null,
      keys: typeof responseData === 'object' && responseData !== null ? Object.keys(responseData) : 'N/A',
      fullResponse: responseData,
      data: responseData.data
    });
    
    // Extraer solo los datos del campo 'data'
    return responseData.data;
  } catch (error) {
    console.error('💥 [API] Error al obtener estadísticas:', {
      error: error,
      message: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

// Función para crear un nuevo proveedor
export async function createProveedor(proveedorData: {
  name: string;
  email: string;
  phone: string;
  address?: string;
  city: string;
  country: string;
  contact_person?: string;
  tax_id?: string;
}): Promise<any> {
  const apiUrl = getApiUrl();
  const fullUrl = `${apiUrl}suppliers`;
  
  console.log('🆕 [API] Iniciando llamada a createProveedor()');
  console.log('🌐 [API] URL completa:', fullUrl);
  console.log('📋 [API] Datos del proveedor:', proveedorData);

  try {
    console.log('📡 [API] Enviando request POST a:', fullUrl);
    
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(proveedorData)
    });

    console.log('📥 [API] Respuesta de creación recibida:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [API] Error en respuesta de creación:', {
        status: response.status,
        statusText: response.statusText,
        errorText
      });
      throw new Error(`Error al crear proveedor: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ [API] Proveedor creado exitosamente:', {
      type: typeof data,
      isObject: typeof data === 'object' && data !== null,
      keys: typeof data === 'object' && data !== null ? Object.keys(data) : 'N/A',
      data: data
    });
    
    return data;
  } catch (error) {
    console.error('💥 [API] Error al crear proveedor:', {
      error: error,
      message: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

// Función para actualizar un proveedor existente
export async function updateProveedor(id: number, proveedorData: {
  name: string;
  email: string;
  phone: string;
  address?: string;
  city: string;
  country: string;
  contact_person?: string;
  tax_id?: string;
}): Promise<any> {
  try {
    const apiUrl = getApiUrl();
    const url = `${apiUrl}suppliers/${id}`;
    
    console.log('🔄 [API] Actualizando proveedor:', {
      url: url,
      id: id,
      proveedorData: proveedorData,
      method: 'PUT'
    });

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(proveedorData)
    });

    console.log('📡 [API] Respuesta de actualización:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [API] Error en respuesta:', {
        status: response.status,
        statusText: response.statusText,
        errorText: errorText
      });
      throw new Error(`Error al actualizar proveedor: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ [API] Proveedor actualizado exitosamente:', {
      type: typeof data,
      isObject: typeof data === 'object' && data !== null,
      keys: typeof data === 'object' && data !== null ? Object.keys(data) : 'N/A',
      data: data
    });
    
    return data;
  } catch (error) {
    console.error('💥 [API] Error al actualizar proveedor:', {
      error: error,
      message: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

// Función para realizar login
export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  const apiUrl = getApiUrl();
  const fullUrl = `${apiUrl}auth/login`;
  
  console.log('🔐 [AUTH] Iniciando proceso de login');
  console.log('🌐 [AUTH] URL completa:', fullUrl);
  console.log('👤 [AUTH] Credenciales:', { username: credentials.username });

  try {
    console.log('📡 [AUTH] Enviando request POST a:', fullUrl);
    
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials)
    });

    console.log('📥 [AUTH] Respuesta recibida:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    });

    const text = await response.text();
    let responseData: { success?: boolean; message?: string; data?: { accessToken?: string; refreshToken?: string; user?: LoginResponse['user'] } };
    try {
      responseData = text ? JSON.parse(text) : {};
    } catch (parseError) {
      console.error('❌ [AUTH] Respuesta no es JSON válido:', text?.slice(0, 300));
      throw new Error(
        response.ok
          ? 'Error inesperado del servidor. Intente de nuevo.'
          : `Error de conexión (${response.status}). Verifique que el servidor esté disponible e intente de nuevo.`
      );
    }

    if (!response.ok) {
      console.error('❌ [AUTH] Error en respuesta:', {
        status: response.status,
        statusText: response.statusText,
        responseData
      });
      
      if (response.status === 401) {
        throw new Error(responseData.message || 'Credenciales inválidas');
      }
      if (response.status === 404 || response.status >= 500) {
        throw new Error(responseData.message || `Error del servidor (${response.status}). Intente de nuevo más tarde.`);
      }
      throw new Error(responseData.message || `Error de autenticación: ${response.status} ${response.statusText}`);
    }

    const data = responseData.data ?? responseData as unknown as LoginResponse;
    const accessToken = data.accessToken ?? (responseData as { accessToken?: string }).accessToken;
    const refreshToken = data.refreshToken ?? (responseData as { refreshToken?: string }).refreshToken;
    const user = data.user ?? (responseData as { user?: LoginResponse['user'] }).user;

    if (!accessToken || !user) {
      throw new Error('La respuesta del servidor no contiene los datos esperados. Intente de nuevo.');
    }

    console.log('✅ [AUTH] Login exitoso:', {
      success: responseData.success,
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      user
    });
    
    // Almacenar tokens en localStorage
    localStorage.setItem('accessToken', accessToken);
    console.log('💾 [AUTH] Access token almacenado en localStorage');
    
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
      console.log('💾 [AUTH] Refresh token almacenado en localStorage');
    }

    // Almacenar información del usuario
    localStorage.setItem('user', JSON.stringify(user));
    console.log('💾 [AUTH] Información del usuario almacenada');
    
    return { accessToken, refreshToken, user };
  } catch (error) {
    console.error('💥 [AUTH] Error en el login:', {
      error: error,
      message: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

// Función para obtener el token de acceso almacenado
export function getAccessToken(): string | null {
  return localStorage.getItem('accessToken');
}

// Función para obtener la información del usuario almacenada
export function getStoredUser(): LoginResponse['user'] | null {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      return JSON.parse(userStr);
    } catch (error) {
      console.error('Error al parsear usuario almacenado:', error);
      return null;
    }
  }
  return null;
}

// Función para verificar si el usuario está autenticado
export function isAuthenticated(): boolean {
  const token = getAccessToken();
  return !!token;
}

// Función optimizada para desarrollo que verifica autenticación sin llamadas al servidor
export function isAuthenticatedInDevelopment(): boolean {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (!isDevelopment) {
    return isAuthenticated();
  }
  
  const token = getAccessToken();
  const user = getStoredUser();
  
  // En desarrollo, si tenemos token y usuario en localStorage, consideramos autenticado
  return !!(token && user);
}

// Función para cerrar sesión
export function logout(): void {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  console.log('🚪 [AUTH] Sesión cerrada, tokens eliminados');
}

// Función para hidratar la sesión (obtener datos del usuario actual)
export async function getMe(): Promise<LoginResponse['user'] | null> {
  const token = getAccessToken();
  
  if (!token) {
    console.log('🔍 [AUTH] No hay token disponible para hidratación');
    return null;
  }

  const apiUrl = getApiUrl();
  const fullUrl = `${apiUrl}auth/me`;
  
  console.log('🔄 [AUTH] Hidratando sesión...');
  console.log('🌐 [AUTH] URL completa:', fullUrl);

  try {
    console.log('📡 [AUTH] Enviando request GET a:', fullUrl);
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('📥 [AUTH] Respuesta de hidratación recibida:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      if (response.status === 401) {
        console.log('❌ [AUTH] Token inválido o expirado, limpiando sesión');
        logout();
        return null; // Retornar null en lugar de lanzar error
      }
      throw new Error(`Error al hidratar sesión: ${response.status} ${response.statusText}`);
    }

    const text = await response.text();
    let responseData: { success?: boolean; message?: string; data?: { user?: LoginResponse['user'] } };
    try {
      responseData = text ? JSON.parse(text) : {};
    } catch (parseError) {
      console.error('❌ [AUTH] Respuesta de /auth/me no es JSON válido:', text?.slice(0, 300));
      logout();
      return null;
    }
    console.log('✅ [AUTH] Respuesta completa del servidor:', responseData);
    
    // Verificar que la respuesta sea exitosa
    if (!responseData.success) {
      throw new Error(responseData.message || 'Error al obtener datos del usuario');
    }
    
    // El endpoint /auth/me devuelve { success: true, data: { user: {...} } }
    const userData = responseData.data?.user;
    if (!userData) {
      throw new Error('No se encontraron datos del usuario en la respuesta');
    }
    
    console.log('✅ [AUTH] Sesión hidratada exitosamente:', {
      user: userData
    });
    
    // Actualizar la información del usuario en localStorage
    localStorage.setItem('user', JSON.stringify(userData));
    console.log('💾 [AUTH] Información del usuario actualizada');
    
    return userData;
  } catch (error) {
    console.error('💥 [AUTH] Error al hidratar sesión:', {
      error: error,
      message: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

// ===== FUNCIONES PARA PRODUCTOS =====

/**
 * Obtiene la lista de productos
 * Roles permitidos: gerencia, ventas, logistica, finanzas
 * @param page - Número de página (opcional, por defecto 1)
 * @param limit - Cantidad de productos por página (opcional, por defecto todos)
 * @returns Productos con información de paginación si se especifican parámetros
 */
/**
 * @param activeOnly - Si false, la API devuelve activos e inactivos (GET ?active_only=false). Si true u omitido, solo activos.
 */
export async function getProducts(page?: number, limit?: number, activeOnly?: boolean): Promise<Product[] | { products: Product[], pagination: { page: number, limit: number, total: number, totalPages: number } }> {
  try {
    const apiUrl = getApiUrl()
    let fullUrl = `${apiUrl}products`
    
    const params = new URLSearchParams()
    if (page !== undefined) params.append('page', page.toString())
    if (limit !== undefined) params.append('limit', limit.toString())
    // active_only=false para listar todos (activos + inactivos/borrados) en admin
    if (activeOnly === false) params.append('active_only', 'false')
    if (params.toString()) {
      fullUrl += `?${params.toString()}`
    }
    
    const token = getAccessToken()
    
    console.log('📦 [PRODUCTS] Obteniendo lista de productos:', fullUrl)
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })

    const responseData: ProductsResponse | ProductsPaginatedResponse = await response.json()
    
    if (!response.ok) {
      console.error('❌ [PRODUCTS] Error al obtener productos:', {
        status: response.status,
        responseData
      })
      
      if (response.status === 401) {
        throw new Error(responseData.message || 'Token de autorización inválido')
      }
      if (response.status === 403) {
        throw new Error(responseData.message || 'No tienes permisos para ver productos')
      }
      
      throw new Error(responseData.message || `Error al obtener productos: ${response.status}`)
    }

    console.log('✅ [PRODUCTS] Respuesta completa recibida:', responseData)
    
    // Si se solicita paginación, devolver estructura con paginación
    if (page !== undefined || limit !== undefined) {
      // Intentar obtener estructura paginada
      if (responseData.data && typeof responseData.data === 'object' && 'products' in responseData.data && 'pagination' in responseData.data) {
        return {
          products: (responseData.data as any).products || [],
          pagination: (responseData.data as any).pagination || { page: 1, limit: limit || 50, total: 0, totalPages: 0 }
        }
      }
      // Si la respuesta no tiene estructura paginada pero tiene array, crear estructura
      let products: Product[] = []
      if (Array.isArray(responseData.data)) {
        products = responseData.data
      } else if (responseData.data && typeof responseData.data === 'object' && 'products' in responseData.data) {
        products = (responseData.data as any).products || []
      }
      
      return {
        products,
        pagination: {
          page: page || 1,
          limit: limit || 50,
          total: products.length,
          totalPages: Math.ceil(products.length / (limit || 50))
        }
      }
    }
    
    // Sin paginación, devolver solo array de productos (comportamiento anterior)
    let products: Product[] = []
    
    if (Array.isArray(responseData.data)) {
      // Si data es directamente un array
      products = responseData.data
    } else if (responseData.data && typeof responseData.data === 'object' && 'products' in responseData.data && Array.isArray((responseData.data as any).products)) {
      // Si data tiene una propiedad products que es un array
      products = (responseData.data as any).products
    } else if (responseData.data && typeof responseData.data === 'object' && 'data' in responseData.data && Array.isArray((responseData.data as any).data)) {
      // Si data tiene una propiedad data que es un array (estructura anidada)
      products = (responseData.data as any).data
    } else {
      console.warn('⚠️ [PRODUCTS] Estructura de respuesta inesperada:', responseData.data)
      products = []
    }
    
    console.log('✅ [PRODUCTS] Productos extraídos:', products)
    return products
  } catch (error) {
    console.error('💥 [PRODUCTS] Error al obtener productos:', error)
    throw error
  }
}

/**
 * Obtiene un producto por ID
 * Roles permitidos: gerencia, ventas, logistica, finanzas
 */
export async function getProductById(id: number): Promise<Product> {
  try {
    const apiUrl = getApiUrl()
    const fullUrl = `${apiUrl}products/${id}`
    const token = getAccessToken()
    
    console.log('📦 [PRODUCTS] Obteniendo producto por ID:', fullUrl)
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })

    const responseData: ProductResponse = await response.json()
    
    if (!response.ok) {
      console.error('❌ [PRODUCTS] Error al obtener producto:', {
        status: response.status,
        responseData
      })
      
      if (response.status === 401) {
        throw new Error(responseData.message || 'Token de autorización inválido')
      }
      if (response.status === 403) {
        throw new Error(responseData.message || 'No tienes permisos para ver este producto')
      }
      if (response.status === 404) {
        throw new Error(responseData.message || 'Producto no encontrado')
      }
      
      throw new Error(responseData.message || `Error al obtener producto: ${response.status}`)
    }

    console.log('✅ [PRODUCTS] Producto obtenido exitosamente:', responseData.data)
    return responseData.data
  } catch (error) {
    console.error('💥 [PRODUCTS] Error al obtener producto:', error)
    throw error
  }
}

/** Ítem flexible para POST /api/products/import (solo name es obligatorio en servidor). */
export interface ProductImportItemPayload {
  name?: string | null
  code?: string | null
  category?: string | null
  category_id?: number | null
  price?: number | null
  prices?: ProductPricesBySlug | null
  iva_rate?: number | null
  stock?: number | null
  min_stock?: number | null
  max_stock?: number | null
  description?: string | null
  is_active?: boolean | null
  allow_backorders?: boolean | null
}

export interface ProductImportOptions {
  dry_run?: boolean
  create_missing_categories?: boolean
  on_duplicate_code?: 'skip' | 'update'
  code_prefix?: string
  activate_without_price?: boolean
  default_iva_rate?: number
}

export interface ProductImportRowResult {
  index: number
  status: 'created' | 'updated' | 'skipped' | 'error' | 'would_create' | 'would_update' | 'would_skip'
  code?: string
  name?: string
  product_id?: number
  category_id?: number | null
  prices?: ProductPricesBySlug
  warnings: string[]
  error?: string
}

export interface ProductImportResult {
  dry_run: boolean
  total: number
  created: number
  updated: number
  skipped: number
  errors: number
  rows: ProductImportRowResult[]
}

/**
 * Importación masiva tolerante a datos faltantes.
 * POST /api/products/import — roles admin / gerencia
 */
export async function importProductsBulk(
  items: ProductImportItemPayload[],
  options: ProductImportOptions = {}
): Promise<ProductImportResult> {
  const apiUrl = getApiUrl()
  const token = getAccessToken()
  const response = await fetch(`${apiUrl}products/import`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      items,
      dry_run: options.dry_run === true,
      create_missing_categories: options.create_missing_categories !== false,
      on_duplicate_code: options.on_duplicate_code === 'update' ? 'update' : 'skip',
      code_prefix: options.code_prefix || 'IMP',
      activate_without_price: options.activate_without_price === true,
      default_iva_rate: options.default_iva_rate ?? 21,
    }),
  })

  const responseData = await response.json()
  if (!response.ok) {
    throw new Error(
      responseData?.error ||
        responseData?.message ||
        `Error en importación: ${response.status}`
    )
  }
  return responseData.data as ProductImportResult
}

/**
 * Crea un nuevo producto
 * Roles permitidos: solo gerencia
 */
export async function createProductNew(productData: CreateProductData): Promise<Product> {
  try {
    const apiUrl = getApiUrl()
    const fullUrl = `${apiUrl}products`
    const token = getAccessToken()
    
    console.log('📦 [PRODUCTS] Creando nuevo producto:', fullUrl, productData)
    
    const body: Record<string, unknown> = { ...productData }
    if (productData.sync_to_woocommerce === true) {
      body.sync_to_woocommerce = true
    }

    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(body)
    })

    const responseData: ProductResponse = await response.json()
    
    if (!response.ok) {
      console.error('❌ [PRODUCTS] Error al crear producto:', {
        status: response.status,
        responseData
      })
      
      if (response.status === 400) {
        throw new Error(responseData.error || responseData.message || 'Error de validación en los datos del producto')
      }
      if (response.status === 401) {
        throw new Error(responseData.message || 'No autorizado - Token de autenticación inválido o faltante')
      }
      if (response.status === 403) {
        throw new Error(responseData.message || 'Sin permisos - Se requiere rol de gerencia para crear productos')
      }
      if (response.status === 409) {
        throw new Error(responseData.message || 'El código de producto ya existe')
      }
      
      throw new Error(responseData.message || `Error al crear producto: ${response.status}`)
    }

    console.log('✅ [PRODUCTS] Producto creado exitosamente:', responseData.data)
    return responseData.data
  } catch (error) {
    console.error('💥 [PRODUCTS] Error al crear producto:', error)
    throw error
  }
}

/**
 * Actualiza un producto existente
 * Roles permitidos: solo gerencia
 */
export async function updateProduct(id: number, productData: UpdateProductData): Promise<Product> {
  try {
    const apiUrl = getApiUrl()
    const fullUrl = `${apiUrl}products/${id}`
    const token = getAccessToken()
    
    const body: Record<string, unknown> = { ...productData }
    if (productData.sync_to_woocommerce === true) {
      body.sync_to_woocommerce = true
    }

    console.log('📦 [PRODUCTS] Actualizando producto:', fullUrl, body)
    
    const response = await fetch(fullUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(body)
    })

    const responseData: ProductResponse = await response.json()
    
    if (!response.ok) {
      console.error('❌ [PRODUCTS] Error al actualizar producto:', {
        status: response.status,
        responseData
      })
      
      if (response.status === 400) {
        throw new Error(responseData.error || responseData.message || 'Error de validación en los datos del producto')
      }
      if (response.status === 401) {
        throw new Error(responseData.message || 'Token de autorización inválido')
      }
      if (response.status === 403) {
        throw new Error(responseData.message || 'No tienes permisos para actualizar productos')
      }
      if (response.status === 404) {
        throw new Error(responseData.message || 'Producto no encontrado')
      }
      
      throw new Error(responseData.message || `Error al actualizar producto: ${response.status}`)
    }

    console.log('✅ [PRODUCTS] Producto actualizado exitosamente:', responseData.data)
    return responseData.data
  } catch (error) {
    console.error('💥 [PRODUCTS] Error al actualizar producto:', error)
    throw error
  }
}

/**
 * Obtiene un producto por código (público, sin autenticación)
 * Usado para consulta pública desde códigos QR
 */
export async function getProductByCode(code: string): Promise<Product | null> {
  try {
    const apiUrl = getApiUrl()
    const fullUrl = `${apiUrl}products/code/${encodeURIComponent(code)}`
    
    console.log('📦 [PRODUCTS] Obteniendo producto por código (público):', fullUrl)
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error(`Error al obtener producto: ${response.status}`)
    }

    const responseData: ProductResponse = await response.json()
    return responseData.data || null
  } catch (error) {
    console.error('💥 [PRODUCTS] Error al obtener producto por código:', error)
    return null
  }
}

/**
 * Elimina un producto (soft delete en ERP).
 * Backend: pone is_active = false y, si tiene woocommerce_id, envía el producto a la papelera
 * de WooCommerce. No hace falta llamar a ningún endpoint de sync después de borrar.
 */
export async function deleteProduct(id: number): Promise<void> {
  try {
    const apiUrl = getApiUrl()
    const fullUrl = `${apiUrl}products/${id}`
    const token = getAccessToken()
    
    console.log('📦 [PRODUCTS] Eliminando producto:', fullUrl)
    
    const response = await fetch(fullUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })

    const responseData = await response.json()
    
    if (!response.ok) {
      console.error('❌ [PRODUCTS] Error al eliminar producto:', {
        status: response.status,
        responseData
      })
      
      if (response.status === 401) {
        throw new Error(responseData.message || 'Token de autorización inválido')
      }
      if (response.status === 403) {
        throw new Error(responseData.message || 'No tienes permisos para eliminar productos')
      }
      if (response.status === 404) {
        throw new Error(responseData.message || 'Producto no encontrado')
      }
      
      throw new Error(responseData.message || `Error al eliminar producto: ${response.status}`)
    }

    console.log('✅ [PRODUCTS] Producto eliminado exitosamente (soft delete)')
  } catch (error) {
    console.error('💥 [PRODUCTS] Error al eliminar producto:', error)
    throw error
  }
}

/**
 * Sincroniza un producto del ERP con WooCommerce.
 * Si el producto no tiene woocommerce_id, lo crea en WC. Si ya tiene, lo actualiza.
 * Roles permitidos: gerencia (según documentación backend).
 */
export interface SyncToWooCommerceResponse {
  success: boolean
  data: {
    woocommerce_id: number
    created: boolean
  }
}

export async function syncProductToWooCommerce(id: number): Promise<SyncToWooCommerceResponse['data']> {
  try {
    const apiUrl = getApiUrl()
    const fullUrl = `${apiUrl}products/${id}/sync-to-woocommerce`
    const token = getAccessToken()

    console.log('📦 [PRODUCTS] Sincronizando producto con WooCommerce:', fullUrl)

    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })

    const responseData = await response.json()

    if (!response.ok) {
      console.error('❌ [PRODUCTS] Error al sincronizar con WooCommerce:', {
        status: response.status,
        responseData
      })
      if (response.status === 401) {
        throw new Error(responseData.message || 'Token de autorización inválido')
      }
      if (response.status === 403) {
        throw new Error(responseData.message || 'No tienes permisos para sincronizar con WooCommerce')
      }
      if (response.status === 404) {
        throw new Error(responseData.message || 'Producto no encontrado')
      }
      throw new Error(responseData.message || `Error al sincronizar: ${response.status}`)
    }

    const data = responseData.data ?? responseData
    console.log('✅ [PRODUCTS] Sincronización WooCommerce exitosa:', data)
    return {
      woocommerce_id: data.woocommerce_id ?? id,
      created: Boolean(data.created)
    }
  } catch (error) {
    console.error('💥 [PRODUCTS] Error al sincronizar con WooCommerce:', error)
    throw error
  }
}

/**
 * Fila opcional: producto en WooCommerce sin equivalente en el ERP (huérfano para vinculación).
 * Ver documentación en `docs/BACKEND_WOOCOMMERCE_INTEGRATION.md`.
 */
export interface WooCommerceUnmatchedErpItem {
  sku?: string | null
  woocommerce_id?: number | null
  name?: string | null
  /** true si en WC no hay SKU (vacío/null); el ERP no puede cruzar por SKU hasta importar o generar código. */
  sku_missing_in_wc?: boolean
}

export interface LinkWooCommerceIdsSummary {
  linked: number
  already_linked: number
  not_found_in_erp: number
  total_processed: number
  errors: string[]
  /**
   * Subconjunto opcional: de `not_found_in_erp`, cuántos son productos WC **sin SKU** (no emparejables por SKU).
   */
  not_found_in_erp_without_wc_sku?: number
  /**
   * Detalle por fila (opcional). El backend debe incluirlo en POST .../products/link-woocommerce-ids
   * para listar los casos contados en `not_found_in_erp`.
   */
  not_found_in_erp_details?: WooCommerceUnmatchedErpItem[]
}

interface LinkWooCommerceIdsApiResponse {
  success: boolean
  message: string
  data?: LinkWooCommerceIdsSummary
  error?: string
  timestamp?: string
}

export async function linkWooCommerceIds(): Promise<LinkWooCommerceIdsSummary> {
  try {
    const apiUrl = getApiUrl()
    const fullUrl = `${apiUrl}products/link-woocommerce-ids`
    const token = getAccessToken()

    if (!token) {
      console.error('❌ [PRODUCTS] linkWooCommerceIds sin token disponible')
      throw new Error('Sesión no válida. Iniciá sesión nuevamente para vincular productos.')
    }

    console.log('🔗 [PRODUCTS] Iniciando vinculación masiva con WooCommerce')

    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })

    const responseData: LinkWooCommerceIdsApiResponse = await response.json()

    if (!response.ok) {
      console.error('❌ [PRODUCTS] Error HTTP al vincular con WooCommerce:', {
        status: response.status,
        responseData
      })

      if (response.status === 401) {
        throw new Error(responseData.message || 'Token de autorización inválido')
      }

      if (response.status === 403) {
        throw new Error(responseData.message || 'No tenés permisos para vincular productos con WooCommerce')
      }

      throw new Error(responseData.message || responseData.error || `Error al vincular productos: ${response.status}`)
    }

    if (!responseData.success || !responseData.data) {
      console.error('❌ [PRODUCTS] Respuesta inesperada al vincular con WooCommerce:', responseData)
      throw new Error(responseData.message || 'No se pudo completar la vinculación con WooCommerce')
    }

    console.log('✅ [PRODUCTS] Vinculación con WooCommerce completada:', responseData.data)
    const raw = responseData.data as LinkWooCommerceIdsSummary & Record<string, unknown>
    const detailsCandidate = raw.not_found_in_erp_details ?? raw.orphans_not_in_erp
    const not_found_in_erp_details = Array.isArray(detailsCandidate)
      ? (detailsCandidate as WooCommerceUnmatchedErpItem[])
      : undefined
    return {
      ...raw,
      not_found_in_erp_details,
    }
  } catch (error) {
    console.error('💥 [PRODUCTS] Error al vincular productos con WooCommerce:', error)
    throw error instanceof Error ? error : new Error('Error desconocido al vincular productos con WooCommerce')
  }
}

/** Respuesta de POST /api/integration/products/import-woocommerce-orphans (vía proxy Next o API directa). */
export interface WooCommerceOrphansImportData {
  created: number
  skipped: number
  imported_with_generated_code: number
  errors: number
  scanned_wc_products: number
  dry_run: boolean
  category_id?: number
  error_details: { code?: string; message?: string }[]
  created_codes: string[]
  /** Opcional: huérfanos detectados en WC que no tenían SKU en la tienda. */
  scanned_without_wc_sku?: number
  /** Opcional: filas creadas en ERP cuyo origen WC no tenía SKU (código generado en ERP). */
  created_without_wc_sku?: number
}

export interface WooCommerceOrphansImportResponse {
  success: boolean
  message: string
  data: WooCommerceOrphansImportData
  timestamp?: string
}

/**
 * Importa productos huérfanos desde WooCommerce (proxy `/api/integration/...` con JWT; la API key va en el servidor).
 */
export async function importWooCommerceOrphans(params: {
  dryRun: boolean
  categoryId?: number
}): Promise<WooCommerceOrphansImportResponse> {
  const token = getAccessToken()
  if (!token) {
    throw new Error('Sesión no válida. Iniciá sesión nuevamente.')
  }

  const body: Record<string, unknown> = { dry_run: params.dryRun }
  if (params.categoryId !== undefined) {
    body.category_id = params.categoryId
  }

  const res = await fetch('/api/integration/products/import-woocommerce-orphans', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })

  const json = (await res.json()) as WooCommerceOrphansImportResponse & {
    error?: string
    message?: string
  }

  if (!res.ok) {
    throw new Error(
      json.message || json.error || `Error al importar huérfanos (${res.status})`
    )
  }

  if (!json.success || !json.data) {
    throw new Error(json.message || 'Respuesta inválida del servidor')
  }

  const data = json.data as WooCommerceOrphansImportData & Record<string, unknown>
  return {
    ...json,
    data: {
      ...data,
      scanned_without_wc_sku:
        typeof data.scanned_without_wc_sku === 'number'
          ? data.scanned_without_wc_sku
          : typeof data.orphans_without_sku === 'number'
            ? data.orphans_without_sku
            : undefined,
      created_without_wc_sku:
        typeof data.created_without_wc_sku === 'number'
          ? data.created_without_wc_sku
          : typeof data.imported_without_wc_sku === 'number'
            ? data.imported_without_wc_sku
            : undefined,
    },
  } as WooCommerceOrphansImportResponse
}

/** Cuerpo por fila para crear borradores en el ERP desde productos WC sin match (vía BFF). */
export interface WooCommerceDraftImportItem {
  woocommerce_id?: number | null
  sku?: string | null
  name?: string | null
  sku_missing_in_wc?: boolean
}

export interface WooCommerceProductsDraftImportData {
  created: number
  skipped: number
  errors: string[]
}

interface WooCommerceProductsDraftImportResponse {
  success: boolean
  message: string
  data?: WooCommerceProductsDraftImportData
  error?: string
  timestamp?: string
}

/**
 * Crea en el ERP productos en borrador para los ítems WC seleccionados (proxy
 * `/api/integration/products/import-woocommerce-products-draft` con JWT).
 */
export async function importWooCommerceProductsAsDraft(
  items: WooCommerceDraftImportItem[],
  options?: { categoryId?: number }
): Promise<WooCommerceProductsDraftImportData> {
  const token = getAccessToken()
  if (!token) {
    throw new Error('Sesión no válida. Iniciá sesión nuevamente.')
  }
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Seleccioná al menos un producto para importar.')
  }

  const body: Record<string, unknown> = { items }
  if (
    options?.categoryId !== undefined &&
    typeof options.categoryId === 'number' &&
    !Number.isNaN(options.categoryId)
  ) {
    body.category_id = options.categoryId
  }

  const res = await fetch('/api/integration/products/import-woocommerce-products-draft', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })

  const json = (await res.json()) as WooCommerceProductsDraftImportResponse

  if (!res.ok) {
    throw new Error(json.message || json.error || `Error al importar borradores (${res.status})`)
  }

  if (!json.success || !json.data) {
    throw new Error(json.message || 'Respuesta inválida del servidor')
  }

  return json.data
}

/**
 * Actualiza el stock de un producto
 * Roles permitidos: gerencia, logistica
 */
export async function updateProductStock(id: number, stockData: UpdateStockData): Promise<Product> {
  try {
    const apiUrl = getApiUrl()
    const fullUrl = `${apiUrl}products/${id}/stock`
    const token = getAccessToken()
    
    console.log('📦 [PRODUCTS] Actualizando stock:', fullUrl, stockData)
    
    const response = await fetch(fullUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(stockData)
    })

    const responseData: ProductResponse = await response.json()
    
    if (!response.ok) {
      console.error('❌ [PRODUCTS] Error al actualizar stock:', {
        status: response.status,
        responseData
      })
      
      if (response.status === 400) {
        throw new Error(responseData.error || responseData.message || 'Error de validación en los datos del stock')
      }
      if (response.status === 401) {
        throw new Error(responseData.message || 'Token de autorización inválido')
      }
      if (response.status === 403) {
        throw new Error(responseData.message || 'No tienes permisos para actualizar stock')
      }
      if (response.status === 404) {
        throw new Error(responseData.message || 'Producto no encontrado')
      }
      
      throw new Error(responseData.message || `Error al actualizar stock: ${response.status}`)
    }

    console.log('✅ [PRODUCTS] Stock actualizado exitosamente:', responseData.data)
    return responseData.data
  } catch (error) {
    console.error('💥 [PRODUCTS] Error al actualizar stock:', error)
    throw error
  }
}

/**
 * Elimina permanentemente un producto (borrado físico en ERP).
 * Backend: si tiene woocommerce_id, lo borra en WooCommerce (force = true) y luego en la base del ERP.
 */
export async function deleteProductPermanent(id: number): Promise<void> {
  try {
    const apiUrl = getApiUrl()
    const fullUrl = `${apiUrl}products/${id}/permanent`
    const token = getAccessToken()
    
    console.log('📦 [PRODUCTS] Eliminando producto permanentemente:', fullUrl)
    
    const response = await fetch(fullUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })

    const responseData = await response.json()
    
    if (!response.ok) {
      console.error('❌ [PRODUCTS] Error al eliminar producto permanentemente:', {
        status: response.status,
        responseData
      })
      
      if (response.status === 401) {
        throw new Error(responseData.message || 'Token de autorización inválido')
      }
      if (response.status === 403) {
        throw new Error(responseData.message || 'No tienes permisos para eliminar productos permanentemente')
      }
      if (response.status === 404) {
        throw new Error(responseData.message || 'Producto no encontrado')
      }
      
      throw new Error(responseData.message || `Error al eliminar producto permanentemente: ${response.status}`)
    }

    console.log('✅ [PRODUCTS] Producto eliminado permanentemente')
  } catch (error) {
    console.error('💥 [PRODUCTS] Error al eliminar producto permanentemente:', error)
    throw error
  }
}

// ===== FUNCIONES PARA BÚSQUEDA POR CÓDIGO DE BARRAS =====

/**
 * Tipos para búsqueda por código de barras
 */
export interface BarcodeLookupData {
  title: string
  description?: string
  brand?: string
  images?: string[]
  source: string
  source_site?: string
  suggested_price?: number
  category_suggestion?: string
  exists_as_product: boolean
  product_id?: number
  product_code?: string
  current_stock?: number
  preview_message?: string
  available_actions: {
    accept: boolean
    modify: boolean
    ignore: boolean
    add_stock?: boolean
  }
  provider_response_time?: number
  cached_at?: string
}

export interface BarcodeLookupResponse {
  success: boolean
  message: string
  data?: BarcodeLookupData
  error?: string
  timestamp: string
}

export interface AcceptBarcodeRequest {
  category_id?: number
  price?: number
  stock?: number
  code?: string
}

export interface CreateProductFromBarcodeRequest {
  code: string
  name: string
  description?: string
  price: number
  stock?: number
  category_id?: number
  barcode?: string
  images?: string[]
}

export interface SearchProductByBarcodeOptions {
  /** Priorizar/restringir resultados a un sitio (ej. "mercadolibre", "fravega", "garbarino"). */
  prefer_site?: string
}

/**
 * Busca datos de producto por código de barras
 * Roles permitidos: gerencia, ventas, logistica, finanzas
 * @param options.prefer_site - Si se indica, la API restringe la búsqueda a ese sitio (ej. prefer_site=mercadolibre).
 */
export async function searchProductByBarcode(
  barcode: string,
  options?: SearchProductByBarcodeOptions
): Promise<BarcodeLookupData> {
  try {
    const apiUrl = getApiUrl()
    const params = new URLSearchParams()
    if (options?.prefer_site) params.set("prefer_site", options.prefer_site)
    const query = params.toString()
    const fullUrl = `${apiUrl}products/barcode/${encodeURIComponent(barcode)}${query ? `?${query}` : ""}`
    const token = getAccessToken()

    console.log("🔍 [BARCODE] Buscando producto por código de barras:", fullUrl)
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })

    const responseData: BarcodeLookupResponse = await response.json()
    
    if (!response.ok) {
      console.error('❌ [BARCODE] Error al buscar producto:', {
        status: response.status,
        responseData
      })
      
      if (response.status === 400) {
        throw new Error(responseData.message || 'Formato de código de barras inválido')
      }
      if (response.status === 401) {
        throw new Error(responseData.message || 'Token de autorización inválido')
      }
      if (response.status === 403) {
        throw new Error(responseData.message || 'No tienes permisos para buscar productos por código de barras')
      }
      if (response.status === 404) {
        throw new Error(responseData.message || 'No se encontraron datos para este código de barras')
      }
      if (response.status === 429) {
        throw new Error(responseData.message || 'Has realizado muchas consultas. Espera unos minutos.')
      }
      
      throw new Error(responseData.message || `Error al buscar producto: ${response.status}`)
    }

    if (!responseData.data) {
      throw new Error('La respuesta no contiene datos del producto')
    }

    console.log('✅ [BARCODE] Datos encontrados:', responseData.data)
    return responseData.data
  } catch (error) {
    console.error('💥 [BARCODE] Error al buscar producto por código de barras:', error)
    throw error
  }
}

/**
 * Acepta los datos encontrados y crea el producto
 * Roles permitidos: gerencia
 */
export async function acceptBarcodeProduct(
  barcode: string,
  additionalData?: AcceptBarcodeRequest
): Promise<Product> {
  try {
    const apiUrl = getApiUrl()
    const fullUrl = `${apiUrl}products/barcode/${encodeURIComponent(barcode)}/accept`
    const token = getAccessToken()
    
    console.log('✅ [BARCODE] Aceptando datos y creando producto:', fullUrl, additionalData)
    
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(additionalData || {})
    })

    const responseData: ProductResponse = await response.json()
    
    if (!response.ok) {
      console.error('❌ [BARCODE] Error al aceptar datos:', {
        status: response.status,
        responseData
      })
      
      if (response.status === 400) {
        throw new Error(responseData.message || 'Datos inválidos o código interno ya existe')
      }
      if (response.status === 401) {
        throw new Error(responseData.message || 'Token de autorización inválido')
      }
      if (response.status === 403) {
        throw new Error(responseData.message || 'No tienes permisos para crear productos')
      }
      if (response.status === 404) {
        throw new Error(responseData.message || 'No se encontraron datos para este código de barras')
      }
      
      throw new Error(responseData.message || `Error al crear producto: ${response.status}`)
    }

    console.log('✅ [BARCODE] Producto creado exitosamente:', responseData.data)
    return responseData.data
  } catch (error) {
    console.error('💥 [BARCODE] Error al aceptar datos y crear producto:', error)
    throw error
  }
}

/**
 * Crea producto con datos modificados por el usuario
 * Roles permitidos: gerencia
 */
export async function createProductFromBarcode(
  barcode: string,
  productData: CreateProductFromBarcodeRequest
): Promise<Product> {
  try {
    const apiUrl = getApiUrl()
    const fullUrl = `${apiUrl}products/barcode/${encodeURIComponent(barcode)}/create`
    const token = getAccessToken()
    
    console.log('✏️ [BARCODE] Creando producto con datos modificados:', fullUrl, productData)
    
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        ...productData,
        barcode: barcode // Asegurar que coincida con el parámetro de la URL
      })
    })

    const responseData: ProductResponse = await response.json()
    
    if (!response.ok) {
      console.error('❌ [BARCODE] Error al crear producto con modificaciones:', {
        status: response.status,
        responseData
      })
      
      if (response.status === 400) {
        throw new Error(responseData.message || 'Datos inválidos o código interno ya existe')
      }
      if (response.status === 401) {
        throw new Error(responseData.message || 'Token de autorización inválido')
      }
      if (response.status === 403) {
        throw new Error(responseData.message || 'No tienes permisos para crear productos')
      }
      if (response.status === 404) {
        throw new Error(responseData.message || 'No se encontraron datos para este código de barras')
      }
      
      throw new Error(responseData.message || `Error al crear producto: ${response.status}`)
    }

    console.log('✅ [BARCODE] Producto creado con modificaciones exitosamente:', responseData.data)
    return responseData.data
  } catch (error) {
    console.error('💥 [BARCODE] Error al crear producto con modificaciones:', error)
    throw error
  }
}

/**
 * Ignora los datos encontrados (marca como descartados)
 * Roles permitidos: gerencia, ventas, logistica, finanzas
 */
export async function ignoreBarcodeProduct(barcode: string, reason?: string): Promise<void> {
  try {
    const apiUrl = getApiUrl()
    const fullUrl = `${apiUrl}products/barcode/${encodeURIComponent(barcode)}/ignore`
    const token = getAccessToken()
    
    console.log('🚫 [BARCODE] Ignorando datos encontrados:', fullUrl, reason)
    
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(reason ? { reason } : {})
    })

    const responseData: ApiResponse<{ success: boolean }> = await response.json()
    
    if (!response.ok) {
      console.error('❌ [BARCODE] Error al ignorar datos:', {
        status: response.status,
        responseData
      })
      
      if (response.status === 401) {
        throw new Error(responseData.message || 'Token de autorización inválido')
      }
      if (response.status === 403) {
        throw new Error(responseData.message || 'No tienes permisos para realizar esta acción')
      }
      if (response.status === 404) {
        throw new Error(responseData.message || 'No se encontraron datos para este código de barras')
      }
      
      throw new Error(responseData.message || `Error al ignorar datos: ${response.status}`)
    }

    console.log('✅ [BARCODE] Datos ignorados exitosamente')
  } catch (error) {
    console.error('💥 [BARCODE] Error al ignorar datos:', error)
    throw error
  }
}

/**
 * Valida el formato de un código de barras
 */
export function validateBarcode(barcode: string): boolean {
  if (!barcode || typeof barcode !== 'string') {
    return false
  }
  
  // Remover espacios y guiones
  const cleaned = barcode.replace(/[\s-]/g, '')
  
  // Validar que sea numérico
  if (!/^\d+$/.test(cleaned)) {
    return false
  }
  
  // Validar longitud (EAN-8, UPC-A, EAN-13, GTIN-14)
  const length = cleaned.length
  return length === 8 || length === 12 || length === 13 || length === 14
}

// ===== FUNCIONES PARA MÓDULO DE CAJA =====

/**
 * Interfaces para el módulo de caja
 */
export interface DayCashSummary {
  date: string;
  incomes: number;
  expenses: number;
  balance: number;
}

export interface PeriodCashSummary {
  from: string;
  to: string;
  incomes: number;
  expenses: number;
  balance: number;
}

export interface MonthlyCashSummary {
  period: { year: number; month: number };
  current: { incomes: number; expenses: number; balance: number };
  previous: { incomes: number; expenses: number; balance: number };
  delta: { incomes: number; expenses: number; balance: number };
}

export interface CashMovement {
  id: number;
  type: "Ingreso" | "Egreso";
  concept: string;
  amount: number;
  date: string;
  method: string;
}

export interface CashApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

/**
 * Obtiene el resumen del día
 * Roles permitidos: gerencia, manager, finanzas, admin
 */
export async function getDayCashSummary(date?: string): Promise<DayCashSummary> {
  try {
    const apiUrl = getApiUrl()
    const params = new URLSearchParams()
    
    if (date) {
      params.append('date', date)
    }
    
    const fullUrl = `${apiUrl}cash/day${params.toString() ? `?${params.toString()}` : ''}`
    const token = getAccessToken()
    
    console.log('💰 [CASH] Obteniendo resumen del día:', fullUrl)
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })

    const responseData: CashApiResponse<DayCashSummary> = await response.json()
    
    if (!response.ok) {
      console.error('❌ [CASH] Error al obtener resumen del día:', {
        status: response.status,
        responseData
      })
      
      if (response.status === 401) {
        throw new Error(responseData.message || 'Token de autorización inválido')
      }
      if (response.status === 403) {
        throw new Error(responseData.message || 'No tienes permisos para ver el resumen de caja')
      }
      
      throw new Error(responseData.message || `Error al obtener resumen del día: ${response.status}`)
    }

    console.log('✅ [CASH] Resumen del día obtenido exitosamente:', responseData.data)
    return responseData.data
  } catch (error) {
    console.error('💥 [CASH] Error al obtener resumen del día:', error)
    throw error
  }
}

/**
 * Obtiene el resumen por período
 * Roles permitidos: gerencia, manager, finanzas, admin
 */
export async function getPeriodCashSummary(from: string, to: string): Promise<PeriodCashSummary> {
  try {
    const apiUrl = getApiUrl()
    const params = new URLSearchParams({ from, to })
    const fullUrl = `${apiUrl}cash/period?${params.toString()}`
    const token = getAccessToken()
    
    console.log('💰 [CASH] Obteniendo resumen por período:', fullUrl)
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })

    const responseData: CashApiResponse<PeriodCashSummary> = await response.json()
    
    if (!response.ok) {
      console.error('❌ [CASH] Error al obtener resumen por período:', {
        status: response.status,
        responseData
      })
      
      if (response.status === 401) {
        throw new Error(responseData.message || 'Token de autorización inválido')
      }
      if (response.status === 403) {
        throw new Error(responseData.message || 'No tienes permisos para ver el resumen de caja')
      }
      if (response.status === 400) {
        throw new Error(responseData.message || 'Parámetros de fecha inválidos')
      }
      
      throw new Error(responseData.message || `Error al obtener resumen por período: ${response.status}`)
    }

    console.log('✅ [CASH] Resumen por período obtenido exitosamente:', responseData.data)
    return responseData.data
  } catch (error) {
    console.error('💥 [CASH] Error al obtener resumen por período:', error)
    throw error
  }
}

/**
 * Obtiene el resumen mensual con comparación
 * Roles permitidos: gerencia, manager, finanzas, admin
 */
export async function getMonthlyCashSummary(year?: number, month?: number): Promise<MonthlyCashSummary> {
  try {
    const apiUrl = getApiUrl()
    const params = new URLSearchParams()
    
    if (year) {
      params.append('year', year.toString())
    }
    if (month) {
      params.append('month', month.toString())
    }
    
    const fullUrl = `${apiUrl}cash/monthly${params.toString() ? `?${params.toString()}` : ''}`
    const token = getAccessToken()
    
    console.log('💰 [CASH] Obteniendo resumen mensual:', fullUrl)
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })

    const responseData: CashApiResponse<MonthlyCashSummary> = await response.json()
    
    if (!response.ok) {
      console.error('❌ [CASH] Error al obtener resumen mensual:', {
        status: response.status,
        responseData
      })
      
      if (response.status === 401) {
        throw new Error(responseData.message || 'Token de autorización inválido')
      }
      if (response.status === 403) {
        throw new Error(responseData.message || 'No tienes permisos para ver el resumen de caja')
      }
      
      throw new Error(responseData.message || `Error al obtener resumen mensual: ${response.status}`)
    }

    console.log('✅ [CASH] Resumen mensual obtenido exitosamente:', responseData.data)
    return responseData.data
  } catch (error) {
    console.error('💥 [CASH] Error al obtener resumen mensual:', error)
    throw error
  }
}

/**
 * Obtiene los movimientos recientes
 * Roles permitidos: gerencia, manager, finanzas, admin
 */
export async function getCashMovements(limit?: number, from?: string, to?: string): Promise<CashMovement[]> {
  try {
    const apiUrl = getApiUrl()
    const params = new URLSearchParams()
    
    if (limit) {
      params.append('limit', limit.toString())
    }
    if (from) {
      params.append('from', from)
    }
    if (to) {
      params.append('to', to)
    }
    
    const fullUrl = `${apiUrl}cash/movements${params.toString() ? `?${params.toString()}` : ''}`
    const token = getAccessToken()
    
    console.log('💰 [CASH] Obteniendo movimientos recientes:', fullUrl)
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })

    const responseData: CashApiResponse<CashMovement[]> = await response.json()
    
    if (!response.ok) {
      console.error('❌ [CASH] Error al obtener movimientos:', {
        status: response.status,
        responseData
      })
      
      if (response.status === 401) {
        throw new Error(responseData.message || 'Token de autorización inválido')
      }
      if (response.status === 403) {
        throw new Error(responseData.message || 'No tienes permisos para ver los movimientos de caja')
      }
      
      throw new Error(responseData.message || `Error al obtener movimientos: ${response.status}`)
    }

    console.log('✅ [CASH] Movimientos obtenidos exitosamente:', responseData.data)
    return responseData.data || []
  } catch (error) {
    console.error('💥 [CASH] Error al obtener movimientos:', error)
    throw error
  }
}

// ==================== CUENTAS CORRIENTES API ====================

// Tipos para cuentas corrientes
export interface CuentaCorriente {
  id: number;
  client_id: number;
  client_name: string;
  client_code: string;
  balance: number;
  credit_limit: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MovimientoCuentaCorriente {
  id: number;
  account_id: number;
  type: 'debit' | 'credit';
  amount: number;
  description: string;
  reference_type?: 'sale' | 'payment' | 'adjustment' | 'refund';
  reference_id?: number;
  created_by: number;
  created_by_name: string;
  created_at: string;
}

export interface CreateCuentaCorrienteRequest {
  client_id: number;
  credit_limit: number;
  initial_balance?: number;
}

export interface UpdateCuentaCorrienteRequest {
  credit_limit?: number;
  is_active?: boolean;
}

export interface CreateMovimientoRequest {
  account_id: number;
  type: 'debit' | 'credit';
  amount: number;
  description: string;
  reference_type?: 'sale' | 'payment' | 'adjustment' | 'refund';
  reference_id?: number;
}

export interface CuentaCorrienteStats {
  total_accounts: number;
  active_accounts: number;
  inactive_accounts: number;
  total_balance: number;
  total_credit_limit: number;
  accounts_with_balance: number;
  accounts_over_limit: number;
}

export interface CuentaCorrienteResponse {
  success: boolean;
  message: string;
  data: CuentaCorriente;
  timestamp: string;
}

export interface CuentasCorrientesResponse {
  success: boolean;
  message: string;
  data: {
    accounts: CuentaCorriente[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  timestamp: string;
}

export interface MovimientosResponse {
  success: boolean;
  message: string;
  data: {
    movements: MovimientoCuentaCorriente[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  timestamp: string;
}

// ==================== COMPRAS API ====================

// Tipos para compras
export interface Purchase {
  id: number;
  purchase_number: string;
  supplier_id: number;
  supplier_name: string;
  status: 'pending' | 'received' | 'cancelled';
  total_amount: number;
  purchase_date: string;
  received_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Campos de compromiso/deuda
  debt_type?: 'compromiso' | 'deuda_directa';
  commitment_amount?: number;
  debt_amount?: number;
  allows_partial_delivery?: boolean;
  confirmed_at?: string;
  has_source_pdf?: boolean;
  source_delivery_note_number?: string | null;
}

export interface PurchaseItem {
  id: number;
  purchase_id: number;
  product_id: number;
  product_name: string;
  product_code: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export interface Supplier {
  id: number;
  code: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string; // default: "Argentina"
  is_active: boolean;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
  // Campos adicionales (después de la migración)
  supplier_type?: 'productivo' | 'no_productivo' | 'otro_pasivo';
  legal_name?: string | null;
  trade_name?: string | null;
  purchase_frequency?: 'diario' | 'semanal' | 'quincenal' | 'mensual' | 'bimestral' | 'trimestral' | 'semestral' | 'anual' | 'ocasional';
  id_type?: 'CUIT' | 'CUIL' | 'CDI' | 'PASAPORTE' | 'OTRO';
  tax_id?: string | null;
  gross_income?: string | null;
  vat_condition?: string | null;
  account_description?: string | null;
  product_service?: string | null;
  integral_summary_account?: string | null;
  cost?: number | null;
  has_account?: boolean;
  payment_terms?: number | null;
}

export interface CreatePurchaseRequest {
  supplier_id: number;
  status: 'pending' | 'received' | 'cancelled';
  total_amount: number;
  purchase_date?: string;
  received_date?: string;
  notes?: string;
}

export interface CreatePurchaseItemRequest {
  product_id: number;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface CreateSupplierRequest {
  code: string;
  name: string;
  supplier_type?: 'productivo' | 'no_productivo' | 'otro_pasivo';
  legal_name?: string;
  trade_name?: string;
  purchase_frequency?: 'diario' | 'semanal' | 'quincenal' | 'mensual' | 'bimestral' | 'trimestral' | 'semestral' | 'anual' | 'ocasional';
  id_type?: 'CUIT' | 'CUIL' | 'CDI' | 'PASAPORTE' | 'OTRO';
  tax_id?: string;
  gross_income?: string;
  vat_condition?: string;
  account_description?: string;
  product_service?: string;
  integral_summary_account?: string;
  cost?: number;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  has_account?: boolean;
  payment_terms?: number;
}

export interface PurchaseStats {
  total_purchases: number;
  pending_purchases: number;
  received_purchases: number;
  cancelled_purchases: number;
  total_amount: number;
  average_amount: number;
}

export interface SupplierStats {
  total_suppliers: number;
  active_suppliers: number;
  inactive_suppliers: number;
}

// ==================== TIPOS PARA PEDIDOS/ÓRDENES ====================

export interface Order {
  id: number;
  order_number?: string;
  woocommerce_order_id?: number;
  canal_venta?: 'woocommerce' | 'local';
  json?: any; // JSON completo con todos los datos originales
  client_id: number;
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  client_code?: string;
  order_date: string;
  delivery_date?: string;
  notes?: string;
  status: 'pendiente_preparacion' | 'listo_despacho' | 'pagado' | 'aprobado' | 'en_proceso' | 'completado' | 'cancelado' | 'pendiente' | 'atrasado' | 'cancelled';
  total_amount: number | string;
  items_count?: number;
  priority?: 'Normal' | 'Alta' | 'Crítica';
  currency?: string;
  quote?: number;
  price_list?: string;
  seller?: string;
  responsible?: string;
  invoice?: boolean;
  delivery_address?: string;
  delivery_city?: string;
  delivery_contact?: string;
  delivery_phone?: string;
  transport_company?: string;
  transport_cost?: string;
  payment_method?: string;
  payment_method_title?: string;
  observations?: string;
  shipping_company?: string;
  packages_count?: number;
  final_discount?: number;
  sales_channel?: "woocommerce_minorista" | "mercadolibre" | "sistema_mf" | "sistema_principal" | "manual" | "otro";
  remito_status?: 'sin_remito' | 'remito_generado' | 'remito_despachado' | 'remito_entregado';
  stock_reserved?: boolean;
  has_remito?: boolean;
  is_active?: boolean;
  items?: OrderItem[];
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id?: number;
  product_name?: string;
  product_code?: string;
  description: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  vat?: number;
  /** Alícuota IVA de la línea: 21, 10.5 o 0. */
  iva_rate?: number | null;
  recovery?: number;
  created_at: string;
}

export interface OrderStats {
  total_orders: number;
  pending_orders: number;
  completed_orders: number;
  delayed_orders: number;
  total_amount: number;
  average_amount: number;
}

export interface CreateOrderRequest {
  client_id: number;
  order_date?: string;
  delivery_date?: string;
  status?:
    | 'pendiente_preparacion'
    | 'listo_despacho'
    | 'pagado'
    | 'aprobado'
    | 'pendiente'
    | 'en_proceso'
    | 'completado'
    | 'cancelado';
  currency?: string;
  quote?: number;
  price_list?: string;
  seller?: string;
  responsible?: string;
  invoice?: boolean;
  delivery_address?: string;
  /** Se envía al API como `notes` */
  observations?: string;
  notes?: string;
  /** Se envía al API como `transport_company` */
  shipping_company?: string;
  transport_company?: string;
  packages_count?: number;
  final_discount?: number;
  items: CreateOrderItemRequest[];
}

export interface CreateOrderItemRequest {
  product_id: number;
  description?: string;
  quantity: number;
  unit_price: number;
  /** Alícuota IVA: 21, 10.5 o 0. Default backend: 21. */
  iva_rate?: number;
  /** @deprecated Usar iva_rate */
  vat?: number;
  recovery?: number;
}

// ==================== TIPOS PARA FACTURAS DE PROVEEDORES ====================

export interface SupplierInvoice {
  id: number;
  invoice_number: string;
  supplier_id: number;
  supplier_name?: string;
  supplier_type?: 'productivo' | 'no_productivo' | 'otro_pasivo';
  purchase_id?: number | null;
  purchase_number?: string;
  invoice_date: string;
  due_date?: string | null;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  status: 'draft' | 'received' | 'partial_paid' | 'paid' | 'cancelled';
  payment_status: 'pending' | 'partial' | 'paid' | 'overdue';
  paid_amount?: number;
  remaining_amount?: number;
  delivery_note_id?: number | null;
  notes?: string;
  file_url?: string;
  items?: SupplierInvoiceItem[];
  created_at: string;
  updated_at: string;
}

export interface SupplierInvoiceItem {
  id: number;
  invoice_id: number;
  material_code?: string | null;
  product_id?: number | null;
  product_name?: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  unit_cost?: number;
  affects_production_cost: boolean;
  purchase_item_id?: number | null;
  created_at: string;
}

export interface CreateSupplierInvoiceRequest {
  invoice_number: string;
  supplier_id: number;
  purchase_id?: number | null;
  invoice_date: string;
  due_date?: string | null;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  notes?: string;
  items: CreateSupplierInvoiceItemRequest[];
}

export interface CreateSupplierInvoiceItemRequest {
  material_code?: string | null;
  product_id?: number | null;
  description: string;
  quantity: number;
  unit_price: number;
  unit_cost?: number;
  affects_production_cost?: boolean;
  purchase_item_id?: number | null;
}

// ==================== TIPOS PARA EGRESOS DEVENGADOS ====================

export interface AccruedExpense {
  id: number;
  expense_number: string;
  supplier_id?: number | null;
  supplier_name?: string;
  expense_type: 'compromise' | 'accrual';
  concept: string;
  category: 'seguro' | 'impuesto' | 'alquiler' | 'servicio' | 'otro';
  amount: number;
  accrual_date: string;
  due_date?: string | null;
  payment_date?: string | null;
  status: 'pending' | 'paid' | 'cancelled';
  has_invoice: boolean;
  invoice_id?: number | null;
  invoice_number?: string;
  notes?: string;
  created_by?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateAccruedExpenseRequest {
  supplier_id?: number | null;
  expense_type: 'compromise' | 'accrual';
  concept: string;
  category: 'seguro' | 'impuesto' | 'alquiler' | 'servicio' | 'otro';
  amount: number;
  accrual_date: string;
  due_date?: string | null;
  notes?: string;
}

// ==================== TIPOS PARA PASIVOS DEVENGADOS ====================

export interface AccruedLiability {
  id: number;
  liability_number: string;
  liability_type: 'impuesto' | 'alquiler' | 'seguro' | 'servicio' | 'prestamo' | 'otro';
  description: string;
  amount: number;
  accrual_date: string;
  due_date: string;
  payment_date?: string | null;
  status: 'pending' | 'partial_paid' | 'paid' | 'overdue' | 'cancelled';
  paid_amount: number;
  remaining_amount: number;
  treasury_account_id?: number | null;
  payment_id?: number | null;
  notes?: string;
  created_by?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateAccruedLiabilityRequest {
  liability_type: 'impuesto' | 'alquiler' | 'seguro' | 'servicio' | 'prestamo' | 'otro';
  description: string;
  amount: number;
  accrual_date: string;
  due_date: string;
  treasury_account_id?: number | null;
  notes?: string;
}

// Función para obtener todas las compras
export async function getPurchases(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'pending' | 'received' | 'cancelled';
  supplier_id?: number;
  date_from?: string;
  date_to?: string;
  all?: boolean;
}): Promise<{
  success: boolean;
  message: string;
  data: {
    purchases: Purchase[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  timestamp: string;
}> {
  try {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.supplier_id) queryParams.append('supplier_id', params.supplier_id.toString());
    if (params?.date_from) queryParams.append('date_from', params.date_from);
    if (params?.date_to) queryParams.append('date_to', params.date_to);
    if (params?.all) queryParams.append('all', 'true');

    const url = `${getApiUrl()}/purchases${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [PURCHASES] Error al obtener compras:', error);
    throw error;
  }
}

// Función para obtener una compra específica
export async function getPurchase(id: number): Promise<{
  success: boolean;
  message: string;
  data: Purchase;
  timestamp: string;
}> {
  try {
    const response = await fetch(`${getApiUrl()}/purchases/${id}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [PURCHASES] Error al obtener compra:', error);
    throw error;
  }
}

// Función para crear una nueva compra
export async function createPurchase(data: CreatePurchaseRequest): Promise<{
  success: boolean;
  message: string;
  data: Purchase;
  timestamp: string;
}> {
  try {
    const response = await fetch(`${getApiUrl()}/purchases`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [PURCHASES] Error al crear compra:', error);
    throw error;
  }
}

// Función para actualizar una compra
export async function updatePurchase(id: number, data: Partial<CreatePurchaseRequest>): Promise<{
  success: boolean;
  message: string;
  data: Purchase;
  timestamp: string;
}> {
  try {
    const response = await fetch(`${getApiUrl()}/purchases/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [PURCHASES] Error al actualizar compra:', error);
    throw error;
  }
}

// Función para eliminar una compra
export async function deletePurchase(id: number): Promise<{
  success: boolean;
  message: string;
  timestamp: string;
}> {
  try {
    const response = await fetch(`${getApiUrl()}/purchases/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [PURCHASES] Error al eliminar compra:', error);
    throw error;
  }
}

// Función para obtener items de una compra
export async function getPurchaseItems(purchaseId: number): Promise<{
  success: boolean;
  message: string;
  data: PurchaseItem[];
  timestamp: string;
}> {
  try {
    const response = await fetch(`${getApiUrl()}/purchases/${purchaseId}/items`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [PURCHASES] Error al obtener items de compra:', error);
    throw error;
  }
}

// Función para agregar un item a una compra
export async function addPurchaseItem(purchaseId: number, data: CreatePurchaseItemRequest): Promise<{
  success: boolean;
  message: string;
  data: PurchaseItem;
  timestamp: string;
}> {
  try {
    const response = await fetch(`${getApiUrl()}/purchases/${purchaseId}/items`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [PURCHASES] Error al agregar item a compra:', error);
    throw error;
  }
}

// Función para actualizar un item de compra
export async function updatePurchaseItem(purchaseId: number, itemId: number, data: Partial<CreatePurchaseItemRequest>): Promise<{
  success: boolean;
  message: string;
  data: PurchaseItem;
  timestamp: string;
}> {
  try {
    const response = await fetch(`${getApiUrl()}/purchases/${purchaseId}/items/${itemId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [PURCHASES] Error al actualizar item de compra:', error);
    throw error;
  }
}

// Función para eliminar un item de compra
export async function deletePurchaseItem(purchaseId: number, itemId: number): Promise<{
  success: boolean;
  message: string;
  timestamp: string;
}> {
  try {
    const response = await fetch(`${getApiUrl()}/purchases/${purchaseId}/items/${itemId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [PURCHASES] Error al eliminar item de compra:', error);
    throw error;
  }
}

// ==================== FUNCIONES PARA PEDIDOS/ÓRDENES ====================

// Función para obtener todas las órdenes/pedidos
export async function getOrders(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'pendiente_preparacion' | 'listo_despacho' | 'pagado' | 'aprobado' | 'en_proceso' | 'completado' | 'cancelado';
  client_id?: number;
  canal_venta?: 'woocommerce' | 'local';
  remito_status?: 'sin_remito' | 'remito_generado' | 'remito_despachado' | 'remito_entregado';
  date_from?: string; // ISO 8601 format
  date_to?: string; // ISO 8601 format
  delivery_date?: string;
  delivery_date_from?: string;
  delivery_date_to?: string;
  stock_reserved?: boolean;
  has_remito?: boolean;
}): Promise<{
  success: boolean;
  message: string;
  data: {
    orders: Order[];
    total?: number;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  timestamp: string;
}> {
  try {
    const queryParams = new URLSearchParams();
    
    // Validar y agregar parámetros solo si tienen valores válidos
    if (params?.page && params.page > 0) {
      queryParams.append('page', params.page.toString());
    }
    if (params?.limit && params.limit > 0) {
      // Limitar el máximo según la documentación
      const limit = Math.min(params.limit, 100);
      queryParams.append('limit', limit.toString());
    }
    if (params?.search && params.search.trim()) {
      queryParams.append('search', params.search.trim());
    }
    if (params?.status && params.status.trim()) {
      queryParams.append('status', params.status);
    }
    if (params?.client_id && params.client_id > 0) {
      queryParams.append('client_id', params.client_id.toString());
    }
    if (params?.canal_venta) {
      queryParams.append('canal_venta', params.canal_venta);
    }
    if (params?.remito_status) {
      queryParams.append('remito_status', params.remito_status);
    }
    if (params?.date_from && params.date_from.trim()) {
      queryParams.append('date_from', params.date_from);
    }
    if (params?.date_to && params.date_to.trim()) {
      queryParams.append('date_to', params.date_to);
    }
    if (params?.delivery_date && params.delivery_date.trim()) {
      queryParams.append('delivery_date', params.delivery_date.trim());
    }
    if (params?.delivery_date_from && params.delivery_date_from.trim()) {
      queryParams.append('delivery_date_from', params.delivery_date_from.trim());
    }
    if (params?.delivery_date_to && params.delivery_date_to.trim()) {
      queryParams.append('delivery_date_to', params.delivery_date_to.trim());
    }
    if (params?.stock_reserved !== undefined) {
      queryParams.append('stock_reserved', params.stock_reserved.toString());
    }
    if (params?.has_remito !== undefined) {
      queryParams.append('has_remito', params.has_remito.toString());
    }

    const url = `${getApiUrl()}orders${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const token = getAuthToken();
    
    if (!token) {
      console.error('❌ [ORDERS] No hay token de autenticación disponible');
      throw new Error('No hay token de autenticación. Por favor, inicia sesión nuevamente.');
    }

    const headers = getAuthHeaders();
    
    console.log('📡 [ORDERS] Obteniendo pedidos:', {
      url,
      params: params,
      queryString: queryParams.toString(),
      hasToken: !!token,
      tokenLength: token.length,
      hasApiKey: typeof window !== 'undefined' ? !!localStorage.getItem('apiKey') : false
    });
    
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      // Intentar obtener el mensaje de error del backend
      let errorMessage = `Error ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.message) {
          errorMessage = errorData.message;
        }
        if (errorData.error) {
          errorMessage = errorData.error;
        }
        console.error('❌ [ORDERS] Error del backend:', {
          status: response.status,
          message: errorMessage,
          errorData
        });
      } catch {
        // Si no se puede parsear el JSON, usar el mensaje por defecto
        console.error('❌ [ORDERS] Error sin JSON:', {
          status: response.status,
          statusText: response.statusText
        });
      }
      throw new Error(errorMessage);
    }

    const responseData = await response.json();
    
    // Validar que la respuesta tenga la estructura esperada
    if (!responseData.success) {
      console.error('❌ [ORDERS] Respuesta no exitosa:', responseData);
      throw new Error(responseData.message || responseData.error || 'Error al obtener pedidos');
    }
    
    return responseData;
  } catch (error) {
    console.error('💥 [ORDERS] Error al obtener pedidos:', error);
    throw error;
  }
}

// Función para obtener pedidos desde WooCommerce
export async function getWooCommerceOrders(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}): Promise<{
  success: boolean;
  message: string;
  data: {
    orders: Order[];
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  timestamp: string;
}> {
  try {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);

    const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8088/api/'}integration/webhook/woocommerce/order${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [WOOCOMMERCE ORDERS] Error al obtener pedidos de WooCommerce:', error);
    throw error;
  }
}

// Función para obtener una orden específica
export async function getOrder(id: number): Promise<{
  success: boolean;
  message: string;
  data: Order;
  timestamp: string;
}> {
  try {
    const response = await fetch(`${getApiUrl()}orders/${id}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [ORDERS] Error al obtener pedido:', error);
    throw error;
  }
}

// Función para obtener estadísticas de pedidos
export async function getOrderStats(): Promise<{
  success: boolean;
  message: string;
  data: OrderStats;
  timestamp: string;
}> {
  try {
    const response = await fetch(`${getApiUrl()}orders/stats`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [ORDERS] Error al obtener estadísticas de pedidos:', error);
    throw error;
  }
}

// Función para crear una nueva orden
export async function createOrder(data: CreateOrderRequest): Promise<{
  success: boolean;
  message: string;
  data: Order;
  timestamp: string;
}> {
  try {
    const payload = {
      client_id: data.client_id,
      status: data.status || 'pendiente_preparacion',
      canal_venta: 'local',
      delivery_date: data.delivery_date || undefined,
      delivery_address: data.delivery_address || undefined,
      notes: data.notes || data.observations || undefined,
      transport_company: data.transport_company || data.shipping_company || undefined,
      discount_total: data.final_discount != null ? Number(data.final_discount) : undefined,
      items: data.items.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        iva_rate: item.iva_rate,
        notes: item.description || undefined,
      })),
      // Metadatos UI (quedan en json del pedido vía controller)
      price_list: data.price_list,
      order_date: data.order_date,
    };

    const response = await fetch(`${getApiUrl()}orders`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    const result = await response.json().catch(() => null);
    if (!response.ok || result?.success === false) {
      const details = Array.isArray(result?.errors)
        ? result.errors.map((e: { msg?: string }) => e.msg).filter(Boolean).join('; ')
        : null;
      throw new Error(
        details || result?.message || `Error ${response.status}: ${response.statusText}`
      );
    }

    return result;
  } catch (error) {
    console.error('💥 [ORDERS] Error al crear pedido:', error);
    throw error;
  }
}

// Función para actualizar una orden
export async function updateOrder(id: number, data: Partial<CreateOrderRequest>): Promise<{
  success: boolean;
  message: string;
  data: Order;
  timestamp: string;
}> {
  try {
    const response = await fetch(`${getApiUrl()}orders/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [ORDERS] Error al actualizar pedido:', error);
    throw error;
  }
}

// Función para eliminar una orden
export async function deleteOrder(id: number): Promise<{
  success: boolean;
  message: string;
  timestamp: string;
}> {
  try {
    const response = await fetch(`${getApiUrl()}orders/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [ORDERS] Error al eliminar pedido:', error);
    throw error;
  }
}

// Función para obtener todos los proveedores
export interface SupplierResponse {
  success: boolean;
  message: string;
  data: {
    suppliers: Supplier[];
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    total?: number;
    message?: string; // "All suppliers retrieved (no pagination applied)"
  };
  timestamp: string;
}

export async function getSuppliers(params?: {
  page?: number;
  limit?: number;
  search?: string;
  city?: string;
  supplier_type?: 'productivo' | 'no_productivo' | 'otro_pasivo';
  is_active?: boolean;
  all?: boolean;
}): Promise<SupplierResponse> {
  try {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.city) queryParams.append('city', params.city);
    if (params?.supplier_type) queryParams.append('supplier_type', params.supplier_type);
    if (params?.is_active !== undefined) queryParams.append('is_active', params.is_active.toString());
    if (params?.all) queryParams.append('all', 'true');

    const url = `${getApiUrl()}purchases/suppliers${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const headers = getAuthHeaders();
    const token = getAuthToken();
    
    console.log('📋 [SUPPLIERS] Obteniendo proveedores:', {
      url,
      hasToken: !!token,
      queryParams: queryParams.toString() || 'none',
      method: 'GET'
    });
    
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    console.log('📥 [SUPPLIERS] Respuesta de proveedores:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [SUPPLIERS] Error al obtener proveedores:', {
        status: response.status,
        statusText: response.statusText,
        errorText
      });
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const data: SupplierResponse = await response.json();
    console.log('✅ [SUPPLIERS] Proveedores obtenidos:', {
      count: data.data?.suppliers?.length || 0,
      total: data.data?.pagination?.total || data.data?.total || 0,
      hasPagination: !!data.data?.pagination,
      message: data.message
    });
    
    return data;
  } catch (error) {
    console.error('💥 [SUPPLIERS] Error al obtener proveedores:', error);
    throw error;
  }
}

// Función para obtener un proveedor específico
export async function getSupplier(id: number): Promise<{
  success: boolean;
  message: string;
  data: Supplier;
  timestamp: string;
}> {
  try {
    const response = await fetch(`${getApiUrl()}purchases/suppliers/${id}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [SUPPLIERS] Error al obtener proveedor:', error);
    throw error;
  }
}

// Función para crear un nuevo proveedor
export async function createSupplier(data: CreateSupplierRequest): Promise<{
  success: boolean;
  message: string;
  data: Supplier;
  timestamp: string;
}> {
  try {
    const url = `${getApiUrl()}purchases/suppliers`;
    const headers = getAuthHeaders();
    const token = getAuthToken();
    
    // Convert headers to a record for easier inspection
    const headersRecord: Record<string, string> = headers instanceof Headers 
      ? Object.fromEntries(headers.entries())
      : Array.isArray(headers)
      ? Object.fromEntries(headers as [string, string][])
      : (headers as Record<string, string>);
    
    console.log('🆕 [SUPPLIERS] Creando proveedor:', {
      url,
      hasToken: !!token,
      tokenLength: token?.length || 0,
      tokenPreview: token ? `${token.substring(0, 20)}...` : 'no token',
      headers: Object.keys(headersRecord),
      authorizationHeader: headersRecord['Authorization'] ? 'present' : 'missing',
      dataKeys: Object.keys(data),
      dataPayload: JSON.stringify(data, null, 2)
    });

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    console.log('📥 [SUPPLIERS] Respuesta de creación:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }
      
      console.error('❌ [SUPPLIERS] Error en respuesta:', {
        status: response.status,
        statusText: response.statusText,
        errorData
      });

      // Manejar error 401 (token expirado o inválido)
      if (response.status === 401) {
        // Limpiar tokens expirados
        if (typeof window !== 'undefined') {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          console.log('🔐 [SUPPLIERS] Tokens eliminados por expiración');
          
          // Redirigir al login si no estamos ya ahí
          if (!window.location.pathname.startsWith('/login')) {
            window.location.href = '/login?expired=true';
          }
        }
        throw new Error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
      }

      throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [SUPPLIERS] Error al crear proveedor:', error);
    throw error;
  }
}

// Función para actualizar un proveedor
export async function updateSupplier(id: number, data: Partial<CreateSupplierRequest>): Promise<{
  success: boolean;
  message: string;
  data: Supplier;
  timestamp: string;
}> {
  try {
    const response = await fetch(`${getApiUrl()}purchases/suppliers/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [SUPPLIERS] Error al actualizar proveedor:', error);
    throw error;
  }
}

// Función para eliminar un proveedor
export async function deleteSupplier(id: number): Promise<{
  success: boolean;
  message: string;
  timestamp: string;
}> {
  try {
    const response = await fetch(`${getApiUrl()}purchases/suppliers/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [SUPPLIERS] Error al eliminar proveedor:', error);
    throw error;
  }
}

// ==================== DOCUMENTOS DE PROVEEDOR (PDF) ====================

export interface ParsedPurchaseDocumentItem {
  line_number: number;
  quantity: number;
  description: string;
  supplier_product_code?: string;
  material_code: string;
  barcode?: string;
  serial_numbers?: string[];
}

export interface MatchedPurchaseDocumentItem extends ParsedPurchaseDocumentItem {
  product_id?: number;
  product_name?: string;
  product_code?: string;
  current_stock?: number;
  purchase_item_id?: number;
  expected_quantity?: number;
  pending_quantity?: number;
  expected_unit_cost?: number;
  cost_variance?: number;
  match_status: 'matched' | 'partial' | 'unmatched';
  match_method?: 'barcode' | 'material_code' | 'product_code' | 'description';
  warnings: string[];
}

export interface ParsePurchaseDocumentResult {
  file_token: string;
  original_filename: string;
  parsed: {
    provider: string;
    document_type: string;
    delivery_note_number?: string;
    delivery_date?: string;
    supplier_name?: string;
    supplier_tax_id?: string;
    source_invoice_number?: string;
    insured_value?: number;
    customer_order_reference?: string;
    transport_company?: string;
    items: ParsedPurchaseDocumentItem[];
  };
  items: MatchedPurchaseDocumentItem[];
  suggested_supplier_id?: number;
  suggested_supplier_name?: string;
  supplier_candidates?: Array<{ id: number; name: string }>;
  suggested_purchase_id?: number;
  suggested_purchase_number?: string;
  duplicate_delivery_note?: boolean;
  warnings: string[];
}

function getAuthHeadersForUpload(): HeadersInit {
  const token = getAuthToken();
  const headers: HeadersInit = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export async function parsePurchaseSupplierDocument(file: File): Promise<{
  success: boolean;
  message: string;
  data: ParsePurchaseDocumentResult;
  timestamp: string;
}> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${getApiUrl()}/purchases/documents/parse`, {
    method: 'POST',
    headers: getAuthHeadersForUpload(),
    body: formData,
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || payload.message || `Error ${response.status}`);
  }
  return payload;
}

export async function rematchPurchaseSupplierDocument(
  fileToken: string,
  supplierId: number
): Promise<{
  success: boolean;
  message: string;
  data: { items: MatchedPurchaseDocumentItem[] };
  timestamp: string;
}> {
  const response = await fetch(`${getApiUrl()}/purchases/documents/rematch`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ file_token: fileToken, supplier_id: supplierId }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || payload.message || `Error ${response.status}`);
  }
  return payload;
}

export async function confirmPurchaseSupplierDocument(data: {
  file_token: string;
  supplier_id: number;
  purchase_id?: number;
  create_purchase_if_missing?: boolean;
  delivery_note_number: string;
  delivery_date: string;
  source_invoice_number?: string;
  insured_value?: number;
  notes?: string;
  apply_stock: boolean;
  items: Array<{
    material_code: string;
    barcode?: string;
    description: string;
    quantity: number;
    product_id?: number;
    purchase_item_id?: number;
    unit_cost?: number;
    update_stock?: boolean;
    update_cost?: boolean;
  }>;
}): Promise<{
  success: boolean;
  message: string;
  data: {
    delivery_note_id: number;
    delivery_note_number: string;
    purchase_id: number;
    purchase_number: string;
    stock_updates: Array<{
      product_id: number;
      product_name: string;
      quantity_added: number;
      new_stock: number;
    }>;
    cost_updates: Array<{
      product_id: number;
      purchase_item_id?: number;
      unit_cost: number;
    }>;
    warnings: string[];
  };
  timestamp: string;
}> {
  const response = await fetch(`${getApiUrl()}/purchases/documents/confirm`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || payload.message || `Error ${response.status}`);
  }
  return payload;
}

/** URL del PDF del proveedor vinculado a una orden de compra. */
export function getPurchaseSourcePdfUrl(purchaseId: number): string {
  return `${getApiUrl()}/purchases/${purchaseId}/source-pdf`;
}

export async function fetchPurchaseSourcePdfBlob(purchaseId: number): Promise<Blob> {
  const response = await fetch(getPurchaseSourcePdfUrl(purchaseId), {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || payload.message || `Error ${response.status}`);
  }
  return response.blob();
}

export async function openPurchaseSourcePdf(purchaseId: number): Promise<void> {
  const blob = await fetchPurchaseSourcePdfBlob(purchaseId);
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener,noreferrer');
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function downloadPurchaseSourcePdf(purchaseId: number, filename?: string): Promise<void> {
  const blob = await fetchPurchaseSourcePdfBlob(purchaseId);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename ?? `documento-compra-${purchaseId}.pdf`;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// ==================== IMPORTACIÓN FACTURAS ARCA (PDF) ====================

export interface ParsedSalesInvoiceItem {
  line_number: number;
  quantity: number;
  description: string;
  product_code?: string;
  unit_price_net?: number;
  unit_price?: number;
  bonif_percent?: number;
  bonif_amount?: number;
  subtotal_net?: number;
  subtotal_gross?: number;
  subtotal?: number;
  iva_rate?: number;
}

export interface MatchedSalesInvoiceItem extends ParsedSalesInvoiceItem {
  product_id?: number;
  product_name?: string;
  product_code?: string;
  match_status: 'matched' | 'partial' | 'unmatched';
  match_method?: 'product_code' | 'description';
  warnings: string[];
}

export interface LinkableSaleSummary {
  id: number
  sale_number: string
  sale_date: string
  total_amount: number
  client_id?: number | null
  client_name?: string | null
  arca_status?: string | null
}

export interface ParseSalesInvoiceResult {
  file_token: string;
  original_filename: string;
  parsed: {
    provider: string;
    document_type: string;
    comprobante_tipo?: number;
    comprobante_letra?: string;
    punto_venta?: number;
    numero?: number;
    fecha_emision?: string;
    cae?: string;
    cae_vto?: string;
    cuit_emisor?: string;
    cuit_receptor?: string;
    receptor_razon_social?: string;
    receptor_condicion_iva?: string;
    total_amount?: number;
    qr_url?: string;
    items: ParsedSalesInvoiceItem[];
  };
  items: MatchedSalesInvoiceItem[];
  suggested_client_id?: number;
  suggested_client_name?: string;
  linkable_sales?: LinkableSaleSummary[];
  suggested_link_sale_id?: number;
  duplicate_invoice?: boolean;
  existing_sale_id?: number;
  warnings: string[];
}

export async function parseSalesInvoiceDocument(
  file: File,
  options?: { clientId?: number; linkSaleId?: number }
): Promise<{
  success: boolean;
  message: string;
  data: ParseSalesInvoiceResult;
  timestamp: string;
}> {
  const formData = new FormData();
  formData.append('file', file);
  if (options?.clientId) formData.append('client_id', String(options.clientId));
  if (options?.linkSaleId) formData.append('link_sale_id', String(options.linkSaleId));

  const response = await fetch(`${getApiUrl()}/sales/documents/parse`, {
    method: 'POST',
    headers: getAuthHeadersForUpload(),
    body: formData,
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || payload.message || `Error ${response.status}`);
  }
  return payload;
}

export async function rematchSalesInvoiceDocument(
  fileToken: string,
  options?: { clientId?: number; linkSaleId?: number }
): Promise<{
  success: boolean;
  message: string;
  data: {
    items: MatchedSalesInvoiceItem[]
    linkable_sales: LinkableSaleSummary[]
    suggested_link_sale_id?: number
  };
  timestamp: string;
}> {
  const response = await fetch(`${getApiUrl()}/sales/documents/rematch`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      file_token: fileToken,
      ...(options?.clientId ? { client_id: options.clientId } : {}),
      ...(options?.linkSaleId ? { link_sale_id: options.linkSaleId } : {}),
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || payload.message || `Error ${response.status}`);
  }
  return payload;
}

/** Descarga el PDF externo vinculado a una venta (factura importada o pos_external). */
export function getSaleSourcePdfUrl(saleId: number): string {
  return `${getApiUrl()}/sales/${saleId}/source-pdf`;
}

export async function fetchSaleSourcePdfBlob(saleId: number): Promise<Blob> {
  const response = await fetch(getSaleSourcePdfUrl(saleId), {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || payload.message || `Error ${response.status}`);
  }
  return response.blob();
}

export async function openSaleSourcePdf(saleId: number): Promise<void> {
  const blob = await fetchSaleSourcePdfBlob(saleId);
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener,noreferrer');
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function downloadSaleSourcePdf(saleId: number, filename?: string): Promise<void> {
  const blob = await fetchSaleSourcePdfBlob(saleId);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename ?? `factura-venta-${saleId}.pdf`;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export async function confirmSalesInvoiceDocument(data: {
  file_token: string;
  client_id: number;
  punto_venta: number;
  numero: number;
  comprobante_tipo: number;
  fecha_emision: string;
  cae: string;
  cae_vto?: string;
  cuit_emisor?: string;
  qr_url?: string;
  total_amount: number;
  payment_method?: 'efectivo' | 'tarjeta' | 'transferencia' | 'mixto';
  notes?: string;
  link_sale_id?: number;
  items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    product_id?: number;
    product_code?: string;
    iva_rate?: number;
  }>;
}): Promise<{
  success: boolean;
  message: string;
  data: {
    sale_id: number;
    sale_number: string;
    client_id: number;
    client_name: string;
    comprobante_label: string;
    linked_to_pos_sale?: boolean;
    warnings: string[];
  };
  timestamp: string;
}> {
  const response = await fetch(`${getApiUrl()}/sales/documents/confirm`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || payload.message || `Error ${response.status}`);
  }
  return payload;
}

export async function updateLinkedSalesInvoiceDocument(data: {
  sale_id: number;
  file_token?: string;
  punto_venta: number;
  numero: number;
  comprobante_tipo: number;
  fecha_emision: string;
  cae: string;
  cae_vto?: string;
  cuit_emisor?: string;
  qr_url?: string;
  total_amount: number;
  notes?: string;
}): Promise<{
  success: boolean;
  message: string;
  data: {
    sale_id: number;
    sale_number: string;
    client_id: number;
    client_name: string;
    comprobante_label: string;
    linked_to_pos_sale?: boolean;
    warnings: string[];
  };
  timestamp: string;
}> {
  const response = await fetch(`${getApiUrl()}/sales/documents/update-link`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || payload.message || `Error ${response.status}`);
  }
  return payload;
}

export async function unlinkSaleExternalInvoice(saleId: number): Promise<{
  success: boolean;
  message: string;
  data: { sale_id: number; sale_number: string };
  timestamp: string;
}> {
  const response = await fetch(`${getApiUrl()}/sales/${saleId}/external-invoice-link`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || payload.message || `Error ${response.status}`);
  }
  return payload;
}

// Función para obtener estadísticas de compras
export async function getPurchaseStats(): Promise<{
  success: boolean;
  message: string;
  data: PurchaseStats;
  timestamp: string;
}> {
  try {
    const response = await fetch(`${getApiUrl()}/purchases/stats`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [PURCHASES] Error al obtener estadísticas:', error);
    throw error;
  }
}

// Función para obtener estadísticas de proveedores
export async function getSupplierStats(): Promise<{
  success: boolean;
  message: string;
  data: SupplierStats;
  timestamp: string;
}> {
  try {
    const response = await fetch(`${getApiUrl()}purchases/suppliers/stats`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [SUPPLIERS] Error al obtener estadísticas:', error);
    throw error;
  }
}

// ==================== FUNCIONES PARA FACTURAS DE PROVEEDORES ====================

export async function getSupplierInvoices(params?: {
  page?: number;
  limit?: number;
  search?: string;
  supplier_id?: number;
  purchase_id?: number;
  status?: 'draft' | 'received' | 'partial_paid' | 'paid' | 'cancelled';
  payment_status?: 'pending' | 'partial' | 'paid' | 'overdue';
  date_from?: string;
  date_to?: string;
}): Promise<{
  success: boolean;
  message: string;
  data: {
    invoices: SupplierInvoice[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  timestamp: string;
}> {
  try {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.supplier_id) queryParams.append('supplier_id', params.supplier_id.toString());
    if (params?.purchase_id) queryParams.append('purchase_id', params.purchase_id.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.payment_status) queryParams.append('payment_status', params.payment_status);
    if (params?.date_from) queryParams.append('date_from', params.date_from);
    if (params?.date_to) queryParams.append('date_to', params.date_to);

    const url = `${getApiUrl()}/suppliers/invoices${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [INVOICES] Error al obtener facturas:', error);
    throw error;
  }
}

export async function getSupplierInvoice(id: number): Promise<{
  success: boolean;
  message: string;
  data: SupplierInvoice;
  timestamp: string;
}> {
  try {
    const response = await fetch(`${getApiUrl()}/suppliers/invoices/${id}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [INVOICES] Error al obtener factura:', error);
    throw error;
  }
}

export async function createSupplierInvoice(data: CreateSupplierInvoiceRequest): Promise<{
  success: boolean;
  message: string;
  data: SupplierInvoice;
  timestamp: string;
}> {
  try {
    const response = await fetch(`${getApiUrl()}/suppliers/invoices`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [INVOICES] Error al crear factura:', error);
    throw error;
  }
}

export async function updateSupplierInvoice(id: number, data: Partial<CreateSupplierInvoiceRequest>): Promise<{
  success: boolean;
  message: string;
  data: SupplierInvoice;
  timestamp: string;
}> {
  try {
    const response = await fetch(`${getApiUrl()}/suppliers/invoices/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [INVOICES] Error al actualizar factura:', error);
    throw error;
  }
}

// ==================== FUNCIONES PARA EGRESOS DEVENGADOS ====================

export async function getAccruedExpenses(params?: {
  page?: number;
  limit?: number;
  supplier_id?: number;
  expense_type?: 'compromise' | 'accrual';
  category?: 'seguro' | 'impuesto' | 'alquiler' | 'servicio' | 'otro';
  status?: 'pending' | 'paid' | 'cancelled';
  has_invoice?: boolean;
  date_from?: string;
  date_to?: string;
}): Promise<{
  success: boolean;
  message: string;
  data: {
    expenses: AccruedExpense[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  timestamp: string;
}> {
  try {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.supplier_id) queryParams.append('supplier_id', params.supplier_id.toString());
    if (params?.expense_type) queryParams.append('expense_type', params.expense_type);
    if (params?.category) queryParams.append('category', params.category);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.has_invoice !== undefined) queryParams.append('has_invoice', params.has_invoice.toString());
    if (params?.date_from) queryParams.append('date_from', params.date_from);
    if (params?.date_to) queryParams.append('date_to', params.date_to);

    const url = `${getApiUrl()}/suppliers/accrued-expenses${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [ACCRUED_EXPENSES] Error al obtener egresos:', error);
    throw error;
  }
}

export async function getAccruedExpense(id: number): Promise<{
  success: boolean;
  message: string;
  data: AccruedExpense;
  timestamp: string;
}> {
  try {
    const response = await fetch(`${getApiUrl()}/suppliers/accrued-expenses/${id}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [ACCRUED_EXPENSES] Error al obtener egreso:', error);
    throw error;
  }
}

export async function createAccruedExpense(data: CreateAccruedExpenseRequest): Promise<{
  success: boolean;
  message: string;
  data: AccruedExpense;
  timestamp: string;
}> {
  try {
    const response = await fetch(`${getApiUrl()}/suppliers/accrued-expenses`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [ACCRUED_EXPENSES] Error al crear egreso:', error);
    throw error;
  }
}

export async function updateAccruedExpense(id: number, data: Partial<CreateAccruedExpenseRequest>): Promise<{
  success: boolean;
  message: string;
  data: AccruedExpense;
  timestamp: string;
}> {
  try {
    const response = await fetch(`${getApiUrl()}/suppliers/accrued-expenses/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [ACCRUED_EXPENSES] Error al actualizar egreso:', error);
    throw error;
  }
}

// ==================== FUNCIONES PARA PASIVOS DEVENGADOS ====================

export async function getAccruedLiabilities(params?: {
  page?: number;
  limit?: number;
  liability_type?: 'impuesto' | 'alquiler' | 'seguro' | 'servicio' | 'prestamo' | 'otro';
  status?: 'pending' | 'partial_paid' | 'paid' | 'overdue' | 'cancelled';
  overdue?: boolean;
  date_from?: string;
  date_to?: string;
}): Promise<{
  success: boolean;
  message: string;
  data: {
    liabilities: AccruedLiability[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  timestamp: string;
}> {
  try {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.liability_type) queryParams.append('liability_type', params.liability_type);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.overdue) queryParams.append('overdue', 'true');
    if (params?.date_from) queryParams.append('date_from', params.date_from);
    if (params?.date_to) queryParams.append('date_to', params.date_to);

    const url = `${getApiUrl()}/suppliers/accrued-liabilities${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [ACCRUED_LIABILITIES] Error al obtener pasivos:', error);
    throw error;
  }
}

export async function getAccruedLiability(id: number): Promise<{
  success: boolean;
  message: string;
  data: AccruedLiability;
  timestamp: string;
}> {
  try {
    const response = await fetch(`${getApiUrl()}/suppliers/accrued-liabilities/${id}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [ACCRUED_LIABILITIES] Error al obtener pasivo:', error);
    throw error;
  }
}

export async function createAccruedLiability(data: CreateAccruedLiabilityRequest): Promise<{
  success: boolean;
  message: string;
  data: AccruedLiability;
  timestamp: string;
}> {
  try {
    const response = await fetch(`${getApiUrl()}/suppliers/accrued-liabilities`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [ACCRUED_LIABILITIES] Error al crear pasivo:', error);
    throw error;
  }
}

export async function updateAccruedLiability(id: number, data: Partial<CreateAccruedLiabilityRequest>): Promise<{
  success: boolean;
  message: string;
  data: AccruedLiability;
  timestamp: string;
}> {
  try {
    const response = await fetch(`${getApiUrl()}/suppliers/accrued-liabilities/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [ACCRUED_LIABILITIES] Error al actualizar pasivo:', error);
    throw error;
  }
}

// ==================== FUNCIONES PARA CUENTAS CORRIENTES ====================

/**
 * Obtiene todas las cuentas corrientes
 * Roles permitidos: gerencia, finanzas, admin
 */
export async function getCuentasCorrientes(params?: {
  page?: number;
  limit?: number;
  search?: string;
  client_id?: number;
  is_active?: boolean;
  balance_min?: number;
  balance_max?: number;
}): Promise<CuentasCorrientesResponse> {
  try {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.client_id) queryParams.append('client_id', params.client_id.toString());
    if (params?.is_active !== undefined) queryParams.append('is_active', params.is_active.toString());
    if (params?.balance_min) queryParams.append('balance_min', params.balance_min.toString());
    if (params?.balance_max) queryParams.append('balance_max', params.balance_max.toString());

    const url = `${getApiUrl()}accounts${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [ACCOUNTS] Error al obtener cuentas corrientes:', error);
    throw error;
  }
}

/**
 * Obtiene una cuenta corriente específica
 * Roles permitidos: gerencia, finanzas, admin
 */
export async function getCuentaCorriente(id: number): Promise<CuentaCorrienteResponse> {
  try {
    const response = await fetch(`${getApiUrl()}accounts/${id}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [ACCOUNTS] Error al obtener cuenta corriente:', error);
    throw error;
  }
}

/**
 * Crea una nueva cuenta corriente
 * Roles permitidos: gerencia, finanzas, admin
 */
export async function createCuentaCorriente(data: CreateCuentaCorrienteRequest): Promise<CuentaCorrienteResponse> {
  try {
    const response = await fetch(`${getApiUrl()}accounts`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [ACCOUNTS] Error al crear cuenta corriente:', error);
    throw error;
  }
}

/**
 * Actualiza una cuenta corriente
 * Roles permitidos: gerencia, finanzas, admin
 */
export async function updateCuentaCorriente(id: number, data: UpdateCuentaCorrienteRequest): Promise<CuentaCorrienteResponse> {
  try {
    const response = await fetch(`${getApiUrl()}accounts/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [ACCOUNTS] Error al actualizar cuenta corriente:', error);
    throw error;
  }
}

/**
 * Elimina una cuenta corriente
 * Roles permitidos: gerencia, admin
 */
export async function deleteCuentaCorriente(id: number): Promise<{
  success: boolean;
  message: string;
  timestamp: string;
}> {
  try {
    const response = await fetch(`${getApiUrl()}accounts/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [ACCOUNTS] Error al eliminar cuenta corriente:', error);
    throw error;
  }
}

/**
 * Obtiene los movimientos de una cuenta corriente
 * Roles permitidos: gerencia, finanzas, admin
 */
export async function getMovimientosCuentaCorriente(accountId: number, params?: {
  page?: number;
  limit?: number;
  type?: 'debit' | 'credit';
  date_from?: string;
  date_to?: string;
}): Promise<MovimientosResponse> {
  try {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.type) queryParams.append('type', params.type);
    if (params?.date_from) queryParams.append('date_from', params.date_from);
    if (params?.date_to) queryParams.append('date_to', params.date_to);

    const url = `${getApiUrl()}accounts/${accountId}/movements${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [ACCOUNTS] Error al obtener movimientos:', error);
    throw error;
  }
}

/**
 * Crea un nuevo movimiento en una cuenta corriente
 * Roles permitidos: gerencia, finanzas, admin
 */
export async function createMovimientoCuentaCorriente(data: CreateMovimientoRequest): Promise<{
  success: boolean;
  message: string;
  data: MovimientoCuentaCorriente;
  timestamp: string;
}> {
  try {
    const response = await fetch(`${getApiUrl()}accounts/${data.account_id}/movements`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [ACCOUNTS] Error al crear movimiento:', error);
    throw error;
  }
}

/**
 * Obtiene estadísticas de cuentas corrientes
 * Roles permitidos: gerencia, finanzas, admin
 */
export async function getCuentaCorrienteStats(): Promise<{
  success: boolean;
  message: string;
  data: CuentaCorrienteStats;
  timestamp: string;
}> {
  try {
    const response = await fetch(`${getApiUrl()}accounts/stats`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [ACCOUNTS] Error al obtener estadísticas:', error);
    throw error;
  }
}

/**
 * Obtiene la cuenta corriente de un cliente específico
 * Roles permitidos: gerencia, finanzas, admin
 */
export async function getCuentaCorrienteByClient(clientId: number): Promise<CuentaCorrienteResponse> {
  try {
    const response = await fetch(`${getApiUrl()}accounts/client/${clientId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [ACCOUNTS] Error al obtener cuenta corriente del cliente:', error);
    throw error;
  }
}

// ============================================================================
// ROLES Y PERMISOS API
// ============================================================================

// Tipos para Roles y Permisos
export interface Permission {
  id: number
  name: string
  code: string
  module: string
  description: string
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface RolePermissions {
  [key: string]: Permission[]
}

export interface UserPermissionsData {
  user: {
    id: number
    username: string
    role: string
    firstName?: string
    lastName?: string
    email?: string
  }
  permissions: Permission[]
  rolePermissions: Permission[]
  directPermissions: (Permission & {
    expires_at?: string | null
    granted_by?: number
  })[]
}

export interface User {
  id: number
  username: string
  firstName?: string
  lastName?: string
  email?: string
  role: string
  is_active?: boolean
}

/** Normaliza la respuesta de la API (isActive) al shape del front (is_active). */
function normalizeUser(raw: any): User {
  return {
    id: Number(raw.id),
    username: String(raw.username ?? ""),
    firstName: raw.firstName ?? raw.first_name ?? undefined,
    lastName: raw.lastName ?? raw.last_name ?? undefined,
    email: raw.email ?? undefined,
    role: String(raw.role ?? ""),
    is_active: raw.is_active !== undefined
      ? Boolean(raw.is_active)
      : raw.isActive !== false,
  }
}

// ============================================================================
// PERMISOS API
// ============================================================================

/**
 * Obtener todos los permisos del sistema
 * Permisos requeridos: admin, gerencia
 */
export async function getPermissions(params?: {
  module?: string
  is_active?: boolean
}): Promise<Permission[]> {
  try {
    const apiUrl = getApiUrl()
    let fullUrl = `${apiUrl}roles/permissions`
    
    const queryParams = new URLSearchParams()
    if (params?.module) queryParams.append('module', params.module)
    if (params?.is_active !== undefined) queryParams.append('is_active', params.is_active.toString())
    
    if (queryParams.toString()) {
      fullUrl += `?${queryParams.toString()}`
    }
    
    console.log('🔐 [ROLES] Obteniendo permisos:', fullUrl)
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: getAuthHeaders(),
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`)
    }
    
    const responseData: ApiResponse<Permission[]> = await response.json()
    return responseData.data || []
  } catch (error) {
    console.error('💥 [ROLES] Error al obtener permisos:', error)
    throw error
  }
}

/**
 * Obtener lista de módulos únicos
 * Permisos requeridos: admin, gerencia
 */
export async function getPermissionModules(): Promise<string[]> {
  try {
    const apiUrl = getApiUrl()
    const fullUrl = `${apiUrl}roles/permissions/modules`
    
    console.log('🔐 [ROLES] Obteniendo módulos:', fullUrl)
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: getAuthHeaders(),
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`)
    }
    
    const responseData: ApiResponse<string[]> = await response.json()
    return responseData.data || []
  } catch (error) {
    console.error('💥 [ROLES] Error al obtener módulos:', error)
    throw error
  }
}

/**
 * Obtener un permiso por ID
 * Permisos requeridos: admin, gerencia
 */
export async function getPermissionById(id: number): Promise<Permission> {
  try {
    const apiUrl = getApiUrl()
    const fullUrl = `${apiUrl}roles/permissions/${id}`
    
    console.log('🔐 [ROLES] Obteniendo permiso:', fullUrl)
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: getAuthHeaders(),
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`)
    }
    
    const responseData: ApiResponse<Permission> = await response.json()
    return responseData.data
  } catch (error) {
    console.error('💥 [ROLES] Error al obtener permiso:', error)
    throw error
  }
}

/**
 * Crear un nuevo permiso
 * Permisos requeridos: admin
 */
export async function createPermission(permissionData: {
  name: string
  code: string
  module: string
  description?: string
  is_active?: boolean
}): Promise<Permission> {
  try {
    const apiUrl = getApiUrl()
    const fullUrl = `${apiUrl}roles/permissions`
    
    console.log('🔐 [ROLES] Creando permiso:', fullUrl, permissionData)
    
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(permissionData),
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`)
    }
    
    const responseData: ApiResponse<Permission> = await response.json()
    return responseData.data
  } catch (error) {
    console.error('💥 [ROLES] Error al crear permiso:', error)
    throw error
  }
}

/**
 * Actualizar un permiso existente
 * Permisos requeridos: admin
 */
export async function updatePermission(
  id: number,
  permissionData: {
    name?: string
    code?: string
    module?: string
    description?: string
    is_active?: boolean
  }
): Promise<Permission> {
  try {
    const apiUrl = getApiUrl()
    const fullUrl = `${apiUrl}roles/permissions/${id}`
    
    console.log('🔐 [ROLES] Actualizando permiso:', fullUrl, permissionData)
    
    const response = await fetch(fullUrl, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(permissionData),
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`)
    }
    
    const responseData: ApiResponse<Permission> = await response.json()
    return responseData.data
  } catch (error) {
    console.error('💥 [ROLES] Error al actualizar permiso:', error)
    throw error
  }
}

/**
 * Eliminar un permiso
 * Permisos requeridos: admin
 */
export async function deletePermission(id: number): Promise<void> {
  try {
    const apiUrl = getApiUrl()
    const fullUrl = `${apiUrl}roles/permissions/${id}`
    
    console.log('🔐 [ROLES] Eliminando permiso:', fullUrl)
    
    const response = await fetch(fullUrl, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`)
    }
  } catch (error) {
    console.error('💥 [ROLES] Error al eliminar permiso:', error)
    throw error
  }
}

// ============================================================================
// ROLES API
// ============================================================================

/**
 * Obtener resumen de permisos por rol
 * Permisos requeridos: admin, gerencia
 */
export async function getRolesSummary(): Promise<RolePermissions> {
  try {
    const apiUrl = getApiUrl()
    const fullUrl = `${apiUrl}roles/summary`
    
    console.log('🔐 [ROLES] Obteniendo resumen de roles:', fullUrl)
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: getAuthHeaders(),
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`)
    }
    
    const responseData: ApiResponse<RolePermissions> = await response.json()
    return responseData.data || {}
  } catch (error) {
    console.error('💥 [ROLES] Error al obtener resumen de roles:', error)
    throw error
  }
}

/**
 * Obtener permisos de un rol específico
 * Permisos requeridos: admin, gerencia
 */
export async function getRolePermissions(role: string): Promise<Permission[]> {
  try {
    const apiUrl = getApiUrl()
    const fullUrl = `${apiUrl}roles/${role}/permissions`
    
    console.log('🔐 [ROLES] Obteniendo permisos del rol:', fullUrl)
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: getAuthHeaders(),
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`)
    }
    
    const responseData: ApiResponse<Permission[]> = await response.json()
    return responseData.data || []
  } catch (error) {
    console.error('💥 [ROLES] Error al obtener permisos del rol:', error)
    throw error
  }
}

/**
 * Asignar un permiso a un rol
 * Permisos requeridos: admin
 */
export async function assignPermissionToRole(role: string, permissionId: number): Promise<void> {
  try {
    const apiUrl = getApiUrl()
    const fullUrl = `${apiUrl}roles/${role}/permissions`
    
    console.log('🔐 [ROLES] Asignando permiso a rol:', fullUrl, { permission_id: permissionId })
    
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ permission_id: permissionId }),
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`)
    }
  } catch (error) {
    console.error('💥 [ROLES] Error al asignar permiso a rol:', error)
    throw error
  }
}

/**
 * Remover un permiso de un rol
 * Permisos requeridos: admin
 */
export async function removePermissionFromRole(role: string, permissionId: number): Promise<void> {
  try {
    const apiUrl = getApiUrl()
    const fullUrl = `${apiUrl}roles/${role}/permissions/${permissionId}`
    
    console.log('🔐 [ROLES] Removiendo permiso de rol:', fullUrl)
    
    const response = await fetch(fullUrl, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`)
    }
  } catch (error) {
    console.error('💥 [ROLES] Error al remover permiso de rol:', error)
    throw error
  }
}

// ============================================================================
// USUARIOS Y PERMISOS API
// ============================================================================

/**
 * Obtener todos los usuarios
 * Permisos requeridos: admin, gerencia
 */
export async function getUsers(): Promise<User[]> {
  try {
    const apiUrl = getApiUrl()
    const fullUrl = `${apiUrl}users`
    
    console.log('👥 [USERS] Obteniendo usuarios:', fullUrl)
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: getAuthHeaders(),
      cache: 'no-store',
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`)
    }
    
    const responseData: ApiResponse<User[] | { users: User[] }> = await response.json()
    const raw = responseData.data
    const list = Array.isArray(raw) ? raw : (raw as any)?.users
    return Array.isArray(list) ? list.map(normalizeUser) : []
  } catch (error) {
    console.error('💥 [USERS] Error al obtener usuarios:', error)
    throw error
  }
}

/**
 * Obtener todos los permisos de un usuario (rol + directos)
 * Permisos requeridos: admin, gerencia
 */
export async function getUserPermissions(userId: number): Promise<UserPermissionsData> {
  try {
    const apiUrl = getApiUrl()
    const fullUrl = `${apiUrl}roles/users/${userId}/permissions`
    
    console.log('👥 [USERS] Obteniendo permisos del usuario:', fullUrl)
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: getAuthHeaders(),
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`)
    }
    
    const responseData: ApiResponse<UserPermissionsData> = await response.json()
    return responseData.data
  } catch (error) {
    console.error('💥 [USERS] Error al obtener permisos del usuario:', error)
    throw error
  }
}

/**
 * Asignar un permiso a un usuario o rol
 * Permisos requeridos: admin
 */
export async function assignPermission(data: {
  permission_id: number
  role?: string
  user_id?: number
  expires_at?: string | null
}): Promise<void> {
  try {
    const apiUrl = getApiUrl()
    const fullUrl = `${apiUrl}roles/assign`
    
    console.log('🔐 [ROLES] Asignando permiso:', fullUrl, data)
    
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`)
    }
  } catch (error) {
    console.error('💥 [ROLES] Error al asignar permiso:', error)
    throw error
  }
}

/**
 * Remover un permiso directo de un usuario
 * Permisos requeridos: admin
 */
export async function removePermissionFromUser(userId: number, permissionId: number): Promise<void> {
  try {
    const apiUrl = getApiUrl()
    const fullUrl = `${apiUrl}roles/users/${userId}/permissions/${permissionId}`
    
    console.log('👥 [USERS] Removiendo permiso del usuario:', fullUrl)
    
    const response = await fetch(fullUrl, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`)
    }
  } catch (error) {
    console.error('💥 [USERS] Error al remover permiso del usuario:', error)
    throw error
  }
}

/**
 * Crear un nuevo usuario
 * Permisos requeridos: admin
 */
export async function createUser(userData: {
  username: string
  password: string
  firstName?: string
  lastName?: string
  email?: string
  role: string
  is_active?: boolean
}): Promise<User> {
  try {
    const apiUrl = getApiUrl()
    const fullUrl = `${apiUrl}users`
    
    console.log('👥 [USERS] Creando usuario:', fullUrl, { ...userData, password: '***' })
    
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        username: userData.username,
        password: userData.password,
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        role: userData.role,
        isActive: userData.is_active !== false,
      }),
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || errorData.message || `Error ${response.status}: ${response.statusText}`)
    }
    
    const responseData: ApiResponse<User> = await response.json()
    if (!responseData.data) {
      throw new Error(responseData.message || 'Usuario creado pero sin datos en la respuesta')
    }
    return normalizeUser(responseData.data)
  } catch (error) {
    console.error('💥 [USERS] Error al crear usuario:', error)
    throw error
  }
}

/**
 * Actualizar un usuario existente
 * Permisos requeridos: admin
 */
export async function updateUser(
  id: number,
  userData: {
    username?: string
    password?: string
    firstName?: string
    lastName?: string
    email?: string
    role?: string
    is_active?: boolean
  }
): Promise<User> {
  try {
    const apiUrl = getApiUrl()
    const fullUrl = `${apiUrl}users/${id}`
    
    console.log('👥 [USERS] Actualizando usuario:', fullUrl, { ...userData, password: userData.password ? '***' : undefined })
    
    const body: any = {}
    if (userData.username) body.username = userData.username
    if (userData.password) body.password = userData.password
    if (userData.firstName !== undefined) body.first_name = userData.firstName
    if (userData.lastName !== undefined) body.last_name = userData.lastName
    if (userData.email !== undefined) body.email = userData.email
    if (userData.role) body.role = userData.role
    if (userData.is_active !== undefined) body.is_active = userData.is_active
    
    const response = await fetch(fullUrl, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`)
    }
    
    const responseData: ApiResponse<User> = await response.json()
    if (!responseData.data) {
      throw new Error(responseData.message || 'Usuario actualizado pero sin datos en la respuesta')
    }
    return normalizeUser(responseData.data)
  } catch (error) {
    console.error('💥 [USERS] Error al actualizar usuario:', error)
    throw error
  }
}

/**
 * Eliminar un usuario
 * Permisos requeridos: admin
 */
export async function deleteUser(id: number): Promise<void> {
  try {
    const apiUrl = getApiUrl()
    const fullUrl = `${apiUrl}users/${id}`
    
    console.log('👥 [USERS] Eliminando usuario:', fullUrl)
    
    const response = await fetch(fullUrl, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`)
    }
  } catch (error) {
    console.error('💥 [USERS] Error al eliminar usuario:', error)
    throw error
  }
}

// ============================================================================
// PRESUPUESTOS COMERCIALES — /api/budgets (JWT; catálogo + cliente, sin stock)
// Distinto de POST /api/repair-orders/:id/send-budget (flujo de reparación).
// ============================================================================

export type CommercialBudgetStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'expired'

export const COMMERCIAL_BUDGET_STATUS_LABELS: Record<CommercialBudgetStatus, string> = {
  draft: 'Borrador',
  sent: 'Enviado',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  expired: 'Vencido',
}

/** Línea en GET /api/budgets/:id */
export interface CommercialBudgetLine {
  id: number
  budget_id: number
  /** Null en ítems escritos (sin producto de catálogo). */
  product_id: number | null
  product_name: string
  product_code: string
  /** Texto libre cuando product_id es null. */
  description?: string | null
  quantity: number
  unit_price: number
  currency?: SaleCurrency
  total_price: number
  created_at: string
}

/** Cabecera en listado GET /api/budgets (sin ítems) */
export interface CommercialBudgetSummary {
  id: number
  budget_number: string
  client_id: number
  status: CommercialBudgetStatus
  total_amount: number
  exchange_rate?: number | null
  valid_until: string | null
  notes: string | null
  created_at: string
  updated_at: string
  client_name?: string | null
  client_code?: string | null
  client_email?: string | null
  client_phone?: string | null
  client_address?: string | null
  client_city?: string | null
  client_cuil_cuit?: string | null
  item_count?: number
}

export type CommercialBudgetDetail = CommercialBudgetSummary & {
  items: CommercialBudgetLine[]
}

export interface CommercialBudgetsListPayload {
  budgets: CommercialBudgetSummary[]
  total: number
  page: number
  limit: number
}

export interface CommercialBudgetStatsPayload {
  total: number
  draft: number
  sent: number
  approved: number
  rejected: number
  expired: number
  total_amount_draft: number
  total_amount_sent: number
}

/** Línea de catálogo en POST/PATCH /api/budgets */
export interface CommercialBudgetCatalogItemInput {
  product_id: number
  quantity: number
  unit_price: number
  currency?: SaleCurrency
}

/** Línea libre: descripción escrita, sin producto en catálogo. */
export interface CommercialBudgetCustomItemInput {
  description: string
  quantity: number
  unit_price: number
  currency?: SaleCurrency
}

export type CommercialBudgetItemInput = CommercialBudgetCatalogItemInput | CommercialBudgetCustomItemInput

export function isCommercialBudgetCatalogItem(
  item: CommercialBudgetItemInput
): item is CommercialBudgetCatalogItemInput {
  return "product_id" in item && item.product_id != null
}

export function isCommercialBudgetCustomLine(line: CommercialBudgetLine): boolean {
  return line.product_id == null
}

export interface CreateCommercialBudgetBody {
  client_id: number
  items: CommercialBudgetItemInput[]
  valid_until?: string | null
  notes?: string | null
  exchange_rate?: number | null
  allow_inactive?: boolean
}

export interface UpdateCommercialBudgetBody {
  client_id?: number
  valid_until?: string | null
  notes?: string | null
  items?: CommercialBudgetItemInput[]
  exchange_rate?: number | null
  allow_inactive?: boolean
}

export interface ConvertCommercialBudgetToSaleBody {
  payment_method: SalePaymentMethod
  payment_details?: CreateSalePaymentDetails
  notes?: string
  sync_to_woocommerce?: boolean
  allow_inactive?: boolean
  client_id?: number
}

export interface ConvertCommercialBudgetToSaleResult {
  budget: CommercialBudgetSummary
  sale: SaleResponseData
}

export type BudgetValidationIssue = { type?: string; path?: string; msg?: string }

export type ApiBudgetError = Error & { status?: number; validationErrors?: BudgetValidationIssue[] }

function throwBudgetApiError(res: Response, data: Record<string, unknown>): never {
  const msg = (data?.message || data?.error || `Error ${res.status}`) as string
  const err = new Error(msg) as ApiBudgetError
  err.status = res.status
  const inner = data?.data
  if (Array.isArray(inner) && inner.length > 0 && typeof inner[0] === 'object') {
    err.validationErrors = inner as BudgetValidationIssue[]
  }
  throw err
}

async function parseBudgetJson(res: Response): Promise<Record<string, unknown>> {
  return (await res.json().catch(() => ({}))) as Record<string, unknown>
}

export async function getCommercialBudgets(params?: {
  client_id?: number
  status?: CommercialBudgetStatus
  date_from?: string
  date_to?: string
  page?: number
  limit?: number
}): Promise<ApiResponse<CommercialBudgetsListPayload>> {
  const apiUrl = getApiUrl()
  const q = new URLSearchParams()
  if (params?.client_id != null && params.client_id > 0) q.set('client_id', String(params.client_id))
  if (params?.status) q.set('status', params.status)
  if (params?.date_from) q.set('date_from', params.date_from)
  if (params?.date_to) q.set('date_to', params.date_to)
  if (params?.page != null && params.page > 0) q.set('page', String(params.page))
  if (params?.limit != null && params.limit > 0) q.set('limit', String(Math.min(params.limit, 100)))
  const url = `${apiUrl}budgets${q.toString() ? `?${q.toString()}` : ''}`
  const res = await fetch(url, { method: 'GET', headers: getAuthHeaders() })
  const data = await parseBudgetJson(res)
  if (!res.ok) {
    if (res.status === 401) logout()
    throwBudgetApiError(res, data)
  }
  return data as unknown as ApiResponse<CommercialBudgetsListPayload>
}

export async function getCommercialBudgetStats(): Promise<ApiResponse<CommercialBudgetStatsPayload>> {
  const apiUrl = getApiUrl()
  const res = await fetch(`${apiUrl}budgets/stats`, { method: 'GET', headers: getAuthHeaders() })
  const data = await parseBudgetJson(res)
  if (!res.ok) {
    if (res.status === 401) logout()
    throwBudgetApiError(res, data)
  }
  return data as unknown as ApiResponse<CommercialBudgetStatsPayload>
}

export async function getCommercialBudgetById(
  id: number | string
): Promise<ApiResponse<CommercialBudgetDetail>> {
  const apiUrl = getApiUrl()
  const res = await fetch(`${apiUrl}budgets/${id}`, { method: 'GET', headers: getAuthHeaders() })
  const data = await parseBudgetJson(res)
  if (!res.ok) {
    if (res.status === 401) logout()
    throwBudgetApiError(res, data)
  }
  return data as unknown as ApiResponse<CommercialBudgetDetail>
}

export async function createCommercialBudget(body: CreateCommercialBudgetBody): Promise<CommercialBudgetDetail> {
  const apiUrl = getApiUrl()
  const res = await fetch(`${apiUrl}budgets`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  })
  const data = await parseBudgetJson(res)
  if (!res.ok) {
    if (res.status === 401) logout()
    throwBudgetApiError(res, data)
  }
  const payload = data as unknown as ApiResponse<CommercialBudgetDetail>
  if (!payload?.success || !payload.data) {
    throw new Error((payload?.message as string) || 'Error al crear presupuesto')
  }
  return payload.data
}

export async function updateCommercialBudget(
  id: number | string,
  body: UpdateCommercialBudgetBody
): Promise<CommercialBudgetDetail> {
  const apiUrl = getApiUrl()
  const res = await fetch(`${apiUrl}budgets/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  })
  const data = await parseBudgetJson(res)
  if (!res.ok) {
    if (res.status === 401) logout()
    throwBudgetApiError(res, data)
  }
  const payload = data as unknown as ApiResponse<CommercialBudgetDetail>
  if (!payload?.success || !payload.data) {
    throw new Error((payload?.message as string) || 'Error al actualizar presupuesto')
  }
  return payload.data
}

export async function deleteCommercialBudget(id: number | string): Promise<void> {
  const apiUrl = getApiUrl()
  const res = await fetch(`${apiUrl}budgets/${id}`, { method: 'DELETE', headers: getAuthHeaders() })
  const data = await parseBudgetJson(res)
  if (!res.ok) {
    if (res.status === 401) logout()
    throwBudgetApiError(res, data)
  }
}

export async function postCommercialBudgetSend(id: number | string): Promise<CommercialBudgetDetail> {
  const apiUrl = getApiUrl()
  const res = await fetch(`${apiUrl}budgets/${id}/send`, { method: 'POST', headers: getAuthHeaders() })
  const data = await parseBudgetJson(res)
  if (!res.ok) {
    if (res.status === 401) logout()
    throwBudgetApiError(res, data)
  }
  const payload = data as unknown as ApiResponse<CommercialBudgetDetail>
  if (!payload?.success || !payload.data) {
    throw new Error((payload?.message as string) || 'Error al enviar presupuesto')
  }
  return payload.data
}

export async function postCommercialBudgetApprove(id: number | string): Promise<CommercialBudgetDetail> {
  const apiUrl = getApiUrl()
  const res = await fetch(`${apiUrl}budgets/${id}/approve`, { method: 'POST', headers: getAuthHeaders() })
  const data = await parseBudgetJson(res)
  if (!res.ok) {
    if (res.status === 401) logout()
    throwBudgetApiError(res, data)
  }
  const payload = data as unknown as ApiResponse<CommercialBudgetDetail>
  if (!payload?.success || !payload.data) {
    throw new Error((payload?.message as string) || 'Error al aprobar presupuesto')
  }
  return payload.data
}

export async function postCommercialBudgetReject(id: number | string): Promise<CommercialBudgetDetail> {
  const apiUrl = getApiUrl()
  const res = await fetch(`${apiUrl}budgets/${id}/reject`, { method: 'POST', headers: getAuthHeaders() })
  const data = await parseBudgetJson(res)
  if (!res.ok) {
    if (res.status === 401) logout()
    throwBudgetApiError(res, data)
  }
  const payload = data as unknown as ApiResponse<CommercialBudgetDetail>
  if (!payload?.success || !payload.data) {
    throw new Error((payload?.message as string) || 'Error al rechazar presupuesto')
  }
  return payload.data
}

export async function postCommercialBudgetExpire(id: number | string): Promise<CommercialBudgetDetail> {
  const apiUrl = getApiUrl()
  const res = await fetch(`${apiUrl}budgets/${id}/expire`, { method: 'POST', headers: getAuthHeaders() })
  const data = await parseBudgetJson(res)
  if (!res.ok) {
    if (res.status === 401) logout()
    throwBudgetApiError(res, data)
  }
  const payload = data as unknown as ApiResponse<CommercialBudgetDetail>
  if (!payload?.success || !payload.data) {
    throw new Error((payload?.message as string) || 'Error al marcar vencido')
  }
  return payload.data
}

/**
 * Deja el presupuesto en `approved` (sin mostrar estados al usuario) para poder convertir a venta.
 */
export async function ensureCommercialBudgetApproved(
  id: number | string
): Promise<CommercialBudgetDetail> {
  const res = await getCommercialBudgetById(id)
  let budget = res.data
  if (budget.status === 'approved') return budget
  if (budget.status === 'rejected' || budget.status === 'expired') {
    throw new Error('Este presupuesto está cerrado y no puede convertirse a venta')
  }
  if (budget.status === 'draft') {
    budget = await postCommercialBudgetSend(id)
  }
  if (budget.status === 'sent') {
    budget = await postCommercialBudgetApprove(id)
  }
  return budget
}

export async function postCommercialBudgetConvertToSale(
  id: number | string,
  body: ConvertCommercialBudgetToSaleBody
): Promise<ConvertCommercialBudgetToSaleResult> {
  const apiUrl = getApiUrl()
  const res = await fetch(`${apiUrl}budgets/${id}/convert-to-sale`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  })
  const data = await parseBudgetJson(res)
  if (!res.ok) {
    if (res.status === 401) logout()
    throwBudgetApiError(res, data)
  }
  const payload = data as unknown as ApiResponse<ConvertCommercialBudgetToSaleResult>
  if (!payload?.success || !payload.data) {
    throw new Error((payload?.message as string) || 'Error al convertir a venta')
  }
  return payload.data
}

// ========== Repair Orders (Órdenes de reparación) ==========

export type RepairOrderStatus =
  | 'consulta_recibida'
  | 'presupuestado'
  | 'aceptado'
  | 'en_proceso_reparacion'
  | 'listo_entrega'
  | 'entregado'
  | 'cancelado'

export const REPAIR_ORDER_STATUS_LABELS: Record<RepairOrderStatus, string> = {
  consulta_recibida: 'Consulta recibida',
  presupuestado: 'Presupuestado',
  aceptado: 'Aceptado',
  en_proceso_reparacion: 'En proceso de reparación',
  listo_entrega: 'Listo entrega',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
}

export interface RepairOrderItem {
  id: number
  repair_order_id: number
  /** Null en ítems manuales (sin producto de catálogo). */
  product_id: number | null
  /** Texto libre cuando product_id es null. */
  product_name?: string | null
  description?: string | null
  quantity: number
  unit_price: string
  total_price: string
  stock_deducted: number
  /** Alícuota IVA si el backend la persiste en reparaciones. */
  iva_rate?: number | null
  created_at: string
  product?: { id: number; name: string; code?: string; stock?: number }
}

/** Línea de catálogo en POST /api/repair-orders/:id/items */
export interface RepairOrderCatalogItemInput {
  product_id: number
  quantity: number
  unit_price: number
}

/** Línea manual: repuesto/servicio puntual sin alta en Productos ni movimiento de stock. */
export interface RepairOrderCustomItemInput {
  description: string
  quantity: number
  unit_price: number
}

export type AddRepairOrderItemBody = RepairOrderCatalogItemInput | RepairOrderCustomItemInput

export function isRepairOrderCatalogItemInput(
  body: AddRepairOrderItemBody
): body is RepairOrderCatalogItemInput {
  return "product_id" in body && body.product_id != null
}

export interface RepairOrder {
  id: number
  repair_number: string
  client_id: number
  equipment_description: string
  /** Lo que indica el cliente al ingresar el equipo (distinto del diagnóstico técnico). */
  customer_declared_fault?: string | null
  diagnosis: string | null
  work_description: string | null
  reception_date: string
  delivery_date_estimated: string | null
  delivery_date_actual: string | null
  labor_amount: string
  total_amount: string
  amount_paid: string
  status: RepairOrderStatus
  budget_sent_at: string | null
  accepted_at: string | null
  days_to_claim: number | null
  notes: string | null
  created_by: number | null
  created_at: string
  updated_at: string
  client?: { id: number; name: string; email?: string; phone?: string; address?: string; city?: string; code?: string }
  client_name?: string | null
  client_code?: string | null
  client_email?: string | null
  client_phone?: string | null
  client_address?: string | null
  client_city?: string | null
  client_cuil_cuit?: string | null
  items?: RepairOrderItem[]
  balance?: string
  /** Venta POS vinculada para facturación ARCA (si el backend la creó al aceptar/entregar). */
  sale_id?: number | null
  linked_sale_facturacion_archived?: boolean | number | null
  arca_status?: 'pending' | 'success' | 'error' | null
  arca_factura_id?: string | null
  arca_cae?: string | null
  arca_cae_vto?: string | null
  arca_last_attempt_at?: string | null
  arca_error_code?: string | null
  arca_error_message?: string | null
}

export interface ConvertRepairOrderToSaleBody {
  payment_method?: SalePaymentMethod
  notes?: string
}

export interface ConvertRepairOrderToSaleResult {
  sale: SaleResponseData
  repair_order?: RepairOrder
}

export interface RepairOrderPayment {
  id: number
  amount: string
  method: string
  payment_date: string
  related_type: string
  related_id: number
  created_at?: string
}

export interface RepairOrdersListParams {
  status?: RepairOrderStatus
  client_id?: number
  date_from?: string
  date_to?: string
  page?: number
  limit?: number
}

export interface RepairOrdersListResponse {
  repair_orders: RepairOrder[]
  total: number
  page: number
  limit: number
}

export interface RepairOrderStats {
  total?: number
  by_status?: Record<string, number>
  total_amount?: number
  [key: string]: unknown
}

export interface ApiResponseRepair<T = unknown> {
  success: boolean
  message: string
  data: T
  error?: string
  timestamp: string
}

/**
 * Headers para **todas** las rutas `repair-orders` (listado, detalle, POST payments, etc.).
 * Debe ser idéntico en cada `fetch` para que el backend aplique la misma auth:
 * - `Authorization: Bearer <JWT>` si hay token (misma lógica que el listado).
 * - Si no hay JWT, `x-api-key` (integraciones / POS).
 * No mezclar Bearer + x-api-key: una api-key inválida puede hacer que el servidor ignore el JWT.
 */
export function getRepairOrderHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (typeof window === 'undefined') {
    return headers
  }

  const token =
    (localStorage.getItem('accessToken') || localStorage.getItem('token') || '').trim()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
    return headers
  }

  const apiKey = (localStorage.getItem('posApiKey') || localStorage.getItem('apiKey') || '').trim()
  if (apiKey) {
    headers['x-api-key'] = apiKey
  }

  return headers
}

export async function getRepairOrders(
  params?: RepairOrdersListParams
): Promise<ApiResponseRepair<RepairOrdersListResponse>> {
  const apiUrl = getApiUrl()
  const q = new URLSearchParams()
  if (params?.status) q.set('status', params.status)
  if (params?.client_id != null) q.set('client_id', String(params.client_id))
  if (params?.date_from) q.set('date_from', params.date_from)
  if (params?.date_to) q.set('date_to', params.date_to)
  if (params?.page != null && params.page > 0) q.set('page', String(params.page))
  if (params?.limit != null && params.limit > 0) q.set('limit', String(params.limit))
  const url = `${apiUrl}repair-orders${q.toString() ? `?${q.toString()}` : ''}`
  const res = await fetch(url, { method: 'GET', headers: getRepairOrderHeaders() })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error((data?.message || data?.error || `Error ${res.status}`) as string) as Error & { status?: number }
    err.status = res.status
    throw err
  }
  return data
}

export async function getRepairOrderStats(): Promise<ApiResponseRepair<RepairOrderStats>> {
  const apiUrl = getApiUrl()
  const res = await fetch(`${apiUrl}repair-orders/stats`, { method: 'GET', headers: getRepairOrderHeaders() })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error((data?.message || data?.error || `Error ${res.status}`) as string) as Error & { status?: number }
    err.status = res.status
    throw err
  }
  return data
}

export async function getRepairOrder(id: number | string): Promise<ApiResponseRepair<RepairOrder>> {
  const apiUrl = getApiUrl()
  const res = await fetch(`${apiUrl}repair-orders/${id}`, { method: 'GET', headers: getRepairOrderHeaders() })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error((data?.message || data?.error || `Error ${res.status}`) as string) as Error & { status?: number }
    err.status = res.status
    throw err
  }
  return data
}

export interface CreateRepairOrderBody {
  client_id: number
  equipment_description: string
  /** Falla o síntoma que declara el cliente en recepción (no es el diagnóstico del técnico). */
  customer_declared_fault?: string
  diagnosis?: string
  work_description?: string
  reception_date: string
  delivery_date_estimated?: string
  labor_amount?: number
  notes?: string
}

export async function createRepairOrder(
  body: CreateRepairOrderBody
): Promise<ApiResponseRepair<RepairOrder>> {
  const apiUrl = getApiUrl()
  const res = await fetch(`${apiUrl}repair-orders`, {
    method: 'POST',
    headers: getRepairOrderHeaders(),
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error((data?.message || data?.error || `Error ${res.status}`) as string) as Error & { status?: number }
    err.status = res.status
    throw err
  }
  return data
}

export interface UpdateRepairOrderBody extends Partial<CreateRepairOrderBody> {}

export async function updateRepairOrder(
  id: number | string,
  body: UpdateRepairOrderBody
): Promise<ApiResponseRepair<RepairOrder>> {
  const apiUrl = getApiUrl()
  const res = await fetch(`${apiUrl}repair-orders/${id}`, {
    method: 'PUT',
    headers: getRepairOrderHeaders(),
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error((data?.message || data?.error || `Error ${res.status}`) as string) as Error & { status?: number }
    err.status = res.status
    throw err
  }
  return data
}

export async function getRepairOrderItems(id: number | string): Promise<ApiResponseRepair<RepairOrderItem[]>> {
  const apiUrl = getApiUrl()
  const res = await fetch(`${apiUrl}repair-orders/${id}/items`, { method: 'GET', headers: getRepairOrderHeaders() })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error((data?.message || data?.error || `Error ${res.status}`) as string) as Error & { status?: number }
    err.status = res.status
    throw err
  }
  return data
}

export async function addRepairOrderItem(
  orderId: number | string,
  body: AddRepairOrderItemBody
): Promise<ApiResponseRepair<RepairOrderItem>> {
  const apiUrl = getApiUrl()
  const res = await fetch(`${apiUrl}repair-orders/${orderId}/items`, {
    method: 'POST',
    headers: getRepairOrderHeaders(),
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error((data?.message || data?.error || `Error ${res.status}`) as string) as Error & { status?: number }
    err.status = res.status
    throw err
  }
  return data
}

export async function updateRepairOrderItem(
  orderId: number | string,
  itemId: number,
  body: { quantity?: number; unit_price?: number }
): Promise<ApiResponseRepair<RepairOrderItem>> {
  const apiUrl = getApiUrl()
  const res = await fetch(`${apiUrl}repair-orders/${orderId}/items/${itemId}`, {
    method: 'PUT',
    headers: getRepairOrderHeaders(),
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error((data?.message || data?.error || `Error ${res.status}`) as string) as Error & { status?: number }
    err.status = res.status
    throw err
  }
  return data
}

export async function deleteRepairOrderItem(
  orderId: number | string,
  itemId: number
): Promise<ApiResponseRepair<unknown>> {
  const apiUrl = getApiUrl()
  const res = await fetch(`${apiUrl}repair-orders/${orderId}/items/${itemId}`, {
    method: 'DELETE',
    headers: getRepairOrderHeaders(),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error((data?.message || data?.error || `Error ${res.status}`) as string) as Error & { status?: number }
    err.status = res.status
    throw err
  }
  return data
}

export async function sendRepairOrderBudget(id: number | string): Promise<ApiResponseRepair<RepairOrder>> {
  const apiUrl = getApiUrl()
  const res = await fetch(`${apiUrl}repair-orders/${id}/send-budget`, {
    method: 'POST',
    headers: getRepairOrderHeaders(),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error((data?.message || data?.error || `Error ${res.status}`) as string) as Error & { status?: number }
    err.status = res.status
    throw err
  }
  return data
}

export async function acceptRepairOrder(
  id: number | string,
  body?: { days_to_claim?: number }
): Promise<ApiResponseRepair<RepairOrder>> {
  const apiUrl = getApiUrl()
  const res = await fetch(`${apiUrl}repair-orders/${id}/accept`, {
    method: 'POST',
    headers: getRepairOrderHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error((data?.message || data?.error || `Error ${res.status}`) as string) as Error & { status?: number }
    err.status = res.status
    throw err
  }
  return data
}

export async function cancelRepairOrder(id: number | string): Promise<ApiResponseRepair<RepairOrder>> {
  const apiUrl = getApiUrl()
  const res = await fetch(`${apiUrl}repair-orders/${id}/cancel`, {
    method: 'POST',
    headers: getRepairOrderHeaders(),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error((data?.message || data?.error || `Error ${res.status}`) as string) as Error & { status?: number }
    err.status = res.status
    throw err
  }
  return data
}

export async function updateRepairOrderStatus(
  id: number | string,
  status: 'en_proceso_reparacion' | 'listo_entrega' | 'entregado'
): Promise<ApiResponseRepair<RepairOrder>> {
  const apiUrl = getApiUrl()
  const res = await fetch(`${apiUrl}repair-orders/${id}/status`, {
    method: 'PUT',
    headers: getRepairOrderHeaders(),
    body: JSON.stringify({ status }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error((data?.message || data?.error || `Error ${res.status}`) as string) as Error & { status?: number }
    err.status = res.status
    throw err
  }
  return data
}

export interface RepairOrderAcceptanceDocument {
  repair_number: string
  client_name: string
  client_code?: string | null
  client_email?: string | null
  client_phone?: string | null
  client_address?: string | null
  client_city?: string | null
  client_cuil_cuit?: string | null
  equipment_description: string
  customer_declared_fault?: string | null
  work_description: string | null
  reception_date: string
  delivery_date_estimated: string | null
  total_amount: string
  days_to_claim: number | null
  disclaimer_text?: string
  items?: { product_name: string; quantity: number; unit_price: string; total_price: string }[]
}

export async function getRepairOrderAcceptanceDocument(
  id: number | string
): Promise<ApiResponseRepair<RepairOrderAcceptanceDocument>> {
  const apiUrl = getApiUrl()
  const res = await fetch(`${apiUrl}repair-orders/${id}/acceptance-document`, {
    method: 'GET',
    headers: getRepairOrderHeaders(),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error((data?.message || data?.error || `Error ${res.status}`) as string) as Error & { status?: number }
    err.status = res.status
    throw err
  }
  return data
}

/** Normaliza la carga útil de GET /repair-orders/:id/payments (array directo o { payments: [] }). */
export function parseRepairOrderPaymentsPayload(data: unknown): RepairOrderPayment[] {
  if (Array.isArray(data)) return data as RepairOrderPayment[]
  if (data && typeof data === 'object' && Array.isArray((data as { payments?: unknown }).payments)) {
    return (data as { payments: RepairOrderPayment[] }).payments
  }
  return []
}

export async function getRepairOrderPayments(id: number | string): Promise<ApiResponseRepair<RepairOrderPayment[]>> {
  const apiUrl = getApiUrl()
  const res = await fetch(`${apiUrl}repair-orders/${id}/payments`, { method: 'GET', headers: getRepairOrderHeaders() })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error((data?.message || data?.error || `Error ${res.status}`) as string) as Error & { status?: number }
    err.status = res.status
    throw err
  }
  return data
}

export interface CreateRepairOrderPaymentBody {
  amount: number
  method: 'efectivo' | 'tarjeta' | 'transferencia'
  payment_date: string
}

export async function createRepairOrderPayment(
  id: number | string,
  body: CreateRepairOrderPaymentBody
): Promise<ApiResponseRepair<RepairOrderPayment>> {
  const apiUrl = getApiUrl()
  // Mismos headers que getRepairOrders / GET …/payments (sin opciones extra que difieran del listado)
  const res = await fetch(`${apiUrl}repair-orders/${id}/payments`, {
    method: 'POST',
    headers: getRepairOrderHeaders(),
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error((data?.message || data?.error || `Error ${res.status}`) as string) as Error & { status?: number }
    err.status = res.status
    throw err
  }
  return data
}

/**
 * Crea o devuelve la venta POS vinculada a una orden de reparación facturable.
 * Backend: `POST /api/repair-orders/:id/convert-to-sale`
 */
export async function convertRepairOrderToSale(
  id: number | string,
  body?: ConvertRepairOrderToSaleBody
): Promise<ConvertRepairOrderToSaleResult> {
  const apiUrl = getApiUrl()
  const res = await fetch(`${apiUrl}repair-orders/${id}/convert-to-sale`, {
    method: 'POST',
    headers: getRepairOrderHeaders(),
    body: JSON.stringify(body ?? { payment_method: 'efectivo' }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error((data?.message || data?.error || `Error ${res.status}`) as string) as Error & {
      status?: number
    }
    err.status = res.status
    throw err
  }
  const payload = data?.data ?? data
  const sale = payload?.sale ?? payload
  if (!sale?.id) {
    throw new Error((data?.message as string) || 'Error al convertir la orden de reparación a venta')
  }
  return { sale, repair_order: payload?.repair_order }
}

/** Resuelve el ID de venta necesario para `POST /api/sales/:id/facturar`. */
export async function resolveSaleIdForRepairOrderFacturacion(
  repairOrderId: number,
  existingSaleId?: number | null
): Promise<number> {
  if (existingSaleId != null && existingSaleId > 0) return existingSaleId
  const { sale } = await convertRepairOrderToSale(repairOrderId)
  return sale.id
}