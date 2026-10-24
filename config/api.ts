// Configuración de la API
// En producción: definir NEXT_PUBLIC_API_URL en el entorno de build (Vercel, etc.) para que el cliente llame a la API correcta.
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8086/api/',
} as const;

// Función para obtener la URL base de la API
export function getApiUrl(): string {
  let url = API_CONFIG.BASE_URL;
  // Asegurar que la URL siempre termine con '/' para evitar problemas de concatenación
  if (!url.endsWith('/')) {
    url = url + '/';
  }
  console.log('🔧 [CONFIG] Obteniendo URL de la API:', {
    envVar: process.env.NEXT_PUBLIC_API_URL,
    finalUrl: url,
    hasEnvVar: !!process.env.NEXT_PUBLIC_API_URL
  });
  return url;
}

/** Une la base de la API con un path relativo sin generar dobles slashes */
export function buildApiUrl(path: string): string {
  const base = getApiUrl();
  const cleanPath = path.replace(/^\/+/, '');
  return `${base}${cleanPath}`;
}
