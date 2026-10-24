import { MENU_GROUPS } from "@/app/config/menu"
import type { Role } from "@/app/config/menu"

/**
 * Mapeo de rutas a roles permitidos basado en la configuración del menú
 * Se genera automáticamente desde MENU_GROUPS para mantener sincronización
 */
export const ROUTE_ROLES: Record<string, Role[]> = {}

// Generar el mapeo de rutas desde la configuración del menú
MENU_GROUPS.forEach(group => {
  group.items.forEach(item => {
    if (item.requiredRoles) {
      ROUTE_ROLES[item.href] = item.requiredRoles
    }
  })
})

/**
 * Obtiene los roles permitidos para una ruta específica
 * @param route Ruta a verificar (ej: '/productos', '/stock')
 * @returns Array de roles permitidos o undefined si no hay restricciones
 */
export function getRouteAllowedRoles(route: string): Role[] | undefined {
  return ROUTE_ROLES[route]
}

/**
 * Verifica si un rol tiene acceso a una ruta específica
 * @param userRole Rol del usuario
 * @param route Ruta a verificar
 * @returns true si el usuario puede acceder a la ruta
 */
export function hasRouteAccess(userRole: Role, route: string): boolean {
  const allowedRoles = getRouteAllowedRoles(route)
  
  // Si no hay roles definidos para la ruta, permitir acceso
  if (!allowedRoles || allowedRoles.length === 0) {
    return true
  }
  
  // Verificar si el rol del usuario está en la lista de roles permitidos
  return allowedRoles.includes(userRole)
}

/**
 * Obtiene todas las rutas protegidas y sus roles
 * @returns Record con rutas como keys y roles permitidos como values
 */
export function getAllProtectedRoutes(): Record<string, Role[]> {
  return { ...ROUTE_ROLES }
}

/**
 * Componente helper para proteger rutas basado en la configuración del menú
 * @param route Ruta a verificar
 * @returns Array de roles permitidos
 */
export function protectRoute(route: string): Role[] {
  const roles = getRouteAllowedRoles(route)
  return roles || []
}

// Log para verificar que se generó correctamente el mapeo
console.log('🛡️ [ROUTE_PROTECTION] Rutas protegidas generadas:', ROUTE_ROLES)

