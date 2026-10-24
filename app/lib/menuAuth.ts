import type { MenuItem, MenuGroup, Role } from "../config/menu"

/** Rol de desarrollador con acceso total al ERP + módulo de salud */
export function isSuperAdmin(userRole?: Role): boolean {
  return userRole === "superadmin"
}

/** Verifica acceso a un conjunto de roles requeridos */
export function roleCanAccess(userRole: Role, requiredRoles?: Role[]): boolean {
  if (isSuperAdmin(userRole)) return true
  if (!requiredRoles || requiredRoles.length === 0) return true
  return requiredRoles.includes(userRole)
}

/**
 * Filtra los items de un menú según el rol del usuario
 * @param items Array de items del menú
 * @param userRole Rol del usuario actual
 * @returns Array de items filtrados que el usuario puede ver
 */
export function filterMenuItemsByRole(items: MenuItem[], userRole?: Role): MenuItem[] {
  if (!userRole) return []
  if (isSuperAdmin(userRole)) return items
  
  return items
    .filter(item => roleCanAccess(userRole, item.requiredRoles))
    .map(item => {
      // Si el item tiene children, filtrar también los children
      if (item.children && item.children.length > 0) {
        return {
          ...item,
          children: filterMenuItemsByRole(item.children, userRole)
        }
      }
      return item
    })
}

/**
 * Filtra los grupos del menú según el rol del usuario
 * @param groups Array de grupos del menú
 * @param userRole Rol del usuario actual
 * @returns Array de grupos filtrados que el usuario puede ver
 */
export function filterMenuGroupsByRole(groups: MenuGroup[], userRole?: Role): MenuGroup[] {
  if (!userRole) return []
  if (isSuperAdmin(userRole)) return groups
  
  return groups
    .filter(group => {
      const hasGroupAccess = roleCanAccess(userRole, group.requiredRoles)
      const hasAnyItemAccess = group.items.some(item => roleCanAccess(userRole, item.requiredRoles))
      return hasGroupAccess && hasAnyItemAccess
    })
    .map(group => ({
      ...group,
      items: filterMenuItemsByRole(group.items, userRole)
    }))
    .filter(group => group.items.length > 0) // Solo mostrar grupos que tengan items visibles
}

/**
 * Verifica si un usuario con un rol específico puede acceder a una ruta
 * @param route Ruta a verificar
 * @param userRole Rol del usuario
 * @param groups Grupos del menú para buscar la ruta
 * @returns true si el usuario puede acceder a la ruta
 */
export function canAccessRoute(route: string, userRole?: Role, groups: MenuGroup[] = []): boolean {
  if (!userRole) return false
  if (isSuperAdmin(userRole)) return true
  
  for (const group of groups) {
    for (const item of group.items) {
      if (item.href === route) {
        return roleCanAccess(userRole, item.requiredRoles)
      }
    }
  }
  
  return true
}

/**
 * Obtiene todos los roles que pueden acceder a una ruta específica
 * @param route Ruta a verificar
 * @param groups Grupos del menú para buscar la ruta
 * @returns Array de roles que pueden acceder a la ruta
 */
export function getRolesForRoute(route: string, groups: MenuGroup[] = []): Role[] {
  const roles: Role[] = []
  
  for (const group of groups) {
    for (const item of group.items) {
      if (item.href === route && item.requiredRoles) {
        roles.push(...item.requiredRoles)
      }
    }
  }
  
  return [...new Set(roles)] // Eliminar duplicados
}

/**
 * Verifica si un usuario tiene un rol específico
 * @param userRole Rol del usuario
 * @param requiredRole Rol requerido
 * @returns true si el usuario tiene el rol requerido
 */
export function hasRole(userRole?: Role, requiredRole?: Role): boolean {
  if (!userRole || !requiredRole) return false
  return userRole === requiredRole
}

/**
 * Verifica si un usuario tiene alguno de los roles especificados
 * @param userRole Rol del usuario
 * @param requiredRoles Array de roles requeridos
 * @returns true si el usuario tiene alguno de los roles requeridos
 */
export function hasAnyRole(userRole?: Role, requiredRoles?: Role[]): boolean {
  if (!userRole || !requiredRoles || requiredRoles.length === 0) return false
  if (isSuperAdmin(userRole)) return true
  return requiredRoles.includes(userRole)
}

/**
 * Obtiene el nivel de acceso de un rol (para ordenamiento)
 * @param role Rol a evaluar
 * @returns Número que representa el nivel de acceso (mayor = más privilegios)
 */
export function getRoleAccessLevel(role: Role): number {
  const accessLevels: Record<Role, number> = {
    superadmin: 110,
    admin: 100,
    gerencia: 90,
    manager: 80,
    finanzas: 70,
    ventas: 60,
    logistica: 50,
    employee: 30,
    viewer: 10
  }
  
  return accessLevels[role] || 0
}

/**
 * Verifica si un rol tiene más privilegios que otro
 * @param userRole Rol del usuario
 * @param requiredRole Rol requerido
 * @returns true si el rol del usuario tiene igual o más privilegios que el requerido
 */
export function hasRoleOrHigher(userRole?: Role, requiredRole?: Role): boolean {
  if (!userRole || !requiredRole) return false
  if (isSuperAdmin(userRole)) return true
  
  const userLevel = getRoleAccessLevel(userRole)
  const requiredLevel = getRoleAccessLevel(requiredRole)
  
  return userLevel >= requiredLevel
}
