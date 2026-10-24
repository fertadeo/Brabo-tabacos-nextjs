"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  Search, 
  Shield, 
  CheckCircle2, 
  XCircle,
  Loader2,
  AlertCircle
} from "lucide-react"
import { 
  getPermissions, 
  getRolesSummary, 
  getRolePermissions,
  assignPermissionToRole,
  removePermissionFromRole,
  getPermissionModules,
  type Permission,
  type RolePermissions
} from "@/lib/api"
import { ROLE_LABELS, type Role } from "@/app/config/menu"

export function RolesManagement() {
  const [selectedRole, setSelectedRole] = useState<Role | "">("")
  const [allPermissions, setAllPermissions] = useState<Permission[]>([])
  const [rolePermissions, setRolePermissions] = useState<RolePermissions>({})
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedModule, setSelectedModule] = useState<string>("all")
  const [loading, setLoading] = useState(false)
  const [togglingPermissionId, setTogglingPermissionId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [modules, setModules] = useState<string[]>([])

  const roles: Role[] = ['admin', 'gerencia', 'ventas', 'logistica', 'finanzas', 'manager', 'employee', 'viewer']

  // Cargar permisos y permisos por rol
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      // Cargar todos los permisos
      const permissions = await getPermissions({ is_active: true })
      setAllPermissions(permissions)

      // Obtener módulos únicos
      try {
        const modulesList = await getPermissionModules()
        setModules(modulesList)
      } catch {
        // Fallback: obtener módulos de los permisos
        const uniqueModules = [...new Set(permissions.map(p => p.module))]
        setModules(uniqueModules.sort())
      }

      // Cargar permisos por rol
      const summary = await getRolesSummary()
      setRolePermissions(summary)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos')
      console.error('Error cargando datos:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleTogglePermission = async (permissionId: number, hasPermission: boolean) => {
    if (!selectedRole) return

    setTogglingPermissionId(permissionId)
    setError(null)
    try {
      if (hasPermission) {
        // Remover permiso
        await removePermissionFromRole(selectedRole, permissionId)
      } else {
        // Asignar permiso
        await assignPermissionToRole(selectedRole, permissionId)
      }

      // Recargar datos
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar permiso')
      console.error('Error actualizando permiso:', err)
    } finally {
      setTogglingPermissionId(null)
    }
  }

  // Filtrar permisos según búsqueda y módulo
  const filteredPermissions = allPermissions.filter(permission => {
    const matchesSearch = permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         permission.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         permission.module.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesModule = selectedModule === "all" || permission.module === selectedModule
    return matchesSearch && matchesModule
  })

  // Obtener permisos del rol seleccionado
  const currentRolePermissions = selectedRole ? (rolePermissions[selectedRole] || []) : []
  const currentRolePermissionIds = new Set(currentRolePermissions.map(p => p.id))

  // Agrupar permisos por módulo
  const permissionsByModule = filteredPermissions.reduce((acc, permission) => {
    if (!acc[permission.module]) {
      acc[permission.module] = []
    }
    acc[permission.module].push(permission)
    return acc
  }, {} as Record<string, Permission[]>)

  return (
    <div className="space-y-4">
      {/* Selector de Rol */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex-1">
          <label className="text-sm font-medium mb-2 block">Seleccionar Rol</label>
          <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as Role)}>
            <SelectTrigger className="w-full md:w-[300px]">
              <SelectValue placeholder="Selecciona un rol" />
            </SelectTrigger>
            <SelectContent>
              {roles.map(role => (
                <SelectItem key={role} value={role}>
                  {ROLE_LABELS[role]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      {selectedRole && (
        <>
          {/* Nota para admin */}
          {selectedRole === 'admin' && (
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 p-4 rounded-lg">
              <p className="text-sm text-blue-900 dark:text-blue-200">
                <strong>Nota:</strong> El rol de administrador tiene automáticamente todos los permisos del sistema.
                No es necesario asignarlos manualmente.
              </p>
            </div>
          )}

          {/* Filtros */}
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar permisos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={selectedModule} onValueChange={setSelectedModule}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Todos los módulos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los módulos</SelectItem>
                {modules.map(module => (
                  <SelectItem key={module} value={module}>
                    {module}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Estadísticas */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Permisos Totales</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{allPermissions.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Permisos Asignados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {currentRolePermissions.length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Permisos Disponibles</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-muted-foreground">
                  {allPermissions.length - currentRolePermissions.length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Lista de Permisos */}
          {loading && !rolePermissions[selectedRole] ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              {Object.keys(permissionsByModule).map(module => (
                <Card key={module}>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      {module}
                    </CardTitle>
                    <CardDescription>
                      {permissionsByModule[module].length} permisos
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {permissionsByModule[module].map(permission => {
                        const hasPermission = currentRolePermissionIds.has(permission.id)
                        const isToggling = togglingPermissionId === permission.id
                        const isDisabled = loading || selectedRole === 'admin' || isToggling
                        return (
                          <div
                            key={permission.id}
                            onClick={() => {
                              if (!isDisabled) {
                                handleTogglePermission(permission.id, hasPermission)
                              }
                            }}
                            className={`flex items-start gap-3 p-3 rounded-lg border transition-all duration-200 ${
                              isDisabled 
                                ? 'opacity-50 cursor-not-allowed' 
                                : 'cursor-pointer hover:bg-teal-500/10 hover:border-teal-500/30 active:bg-teal-500/15'
                            } ${hasPermission ? 'bg-teal-500/5 border-teal-500/20' : ''} ${isToggling ? 'animate-pulse' : ''}`}
                          >
                            <div className="relative flex items-center justify-center">
                              <Checkbox
                                checked={hasPermission}
                                onCheckedChange={(checked) => {
                                  if (!isDisabled) {
                                    handleTogglePermission(permission.id, hasPermission)
                                  }
                                }}
                                disabled={isDisabled}
                                onClick={(e) => e.stopPropagation()}
                                className={isToggling ? 'opacity-50' : ''}
                              />
                              {isToggling && (
                                <Loader2 className="absolute h-4 w-4 animate-spin text-teal-500" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">{permission.name}</span>
                                {hasPermission && (
                                  <Badge variant="default" className="text-xs bg-teal-500/20 text-teal-300 border-teal-500/30">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Asignado
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                                  {permission.code}
                                </code>
                              </div>
                              {permission.description && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {permission.description}
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {filteredPermissions.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <XCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No se encontraron permisos</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {!selectedRole && (
        <div className="text-center py-12 text-muted-foreground">
          <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Selecciona un rol para ver y gestionar sus permisos</p>
        </div>
      )}
    </div>
  )
}

