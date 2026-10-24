"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useConfirmBeforeClose } from "@/lib/use-confirm-before-close"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Search, 
  Plus, 
  Trash2,
  Loader2,
  AlertCircle,
  Shield,
  User,
  Calendar,
  Key,
  XCircle,
  CheckCircle2,
  Clock
} from "lucide-react"
import { 
  getUsers,
  getPermissions,
  getPermissionModules,
  getUserPermissions,
  getRolePermissions,
  assignPermission,
  removePermissionFromUser,
  type Permission,
  type User as UserData,
  type UserPermissionsData
} from "@/lib/api"
import { ROLE_LABELS, type Role } from "@/app/config/menu"

export function ExceptionPermissions() {
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [users, setUsers] = useState<UserData[]>([])
  const [allPermissions, setAllPermissions] = useState<Permission[]>([])
  const [userPermissions, setUserPermissions] = useState<UserPermissionsData | null>(null)
  const [availablePermissions, setAvailablePermissions] = useState<Permission[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedModule, setSelectedModule] = useState<string>("all")
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [selectedPermission, setSelectedPermission] = useState<Permission | null>(null)
  const [isTemporary, setIsTemporary] = useState(false)
  const [daysValid, setDaysValid] = useState(30)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modules, setModules] = useState<string[]>([])

  const [handleAssignModalOpenChange, confirmAssignDialog] = useConfirmBeforeClose(setIsAssignModalOpen)

  // Cargar usuarios y permisos
  useEffect(() => {
    loadUsers()
    loadAllPermissions()
  }, [])

  // Cargar permisos del usuario cuando se selecciona
  useEffect(() => {
    if (selectedUserId) {
      loadUserPermissions(selectedUserId)
    }
  }, [selectedUserId])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const usersList = await getUsers()
      setUsers(usersList)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar usuarios')
      console.error('Error cargando usuarios:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadAllPermissions = async () => {
    try {
      const permissions = await getPermissions({ is_active: true })
      setAllPermissions(permissions)
      
      try {
        const modulesList = await getPermissionModules()
        setModules(modulesList)
      } catch {
        // Fallback: obtener módulos de los permisos
        const uniqueModules = [...new Set(permissions.map(p => p.module))]
        setModules(uniqueModules.sort())
      }
    } catch (err) {
      console.error('Error cargando permisos:', err)
    }
  }

  const loadUserPermissions = async (userId: number) => {
    setLoading(true)
    setError(null)
    try {
      // Obtener permisos del usuario (rol + directos)
      const permissionsData = await getUserPermissions(userId)
      setUserPermissions(permissionsData)

      // Obtener permisos del rol del usuario
      const rolePermissions = await getRolePermissions(permissionsData.user.role)

      // Filtrar: mostrar solo permisos que NO tiene por su rol
      const rolePermIds = new Set(rolePermissions.map(p => p.id))
      const exceptions = allPermissions.filter(p => !rolePermIds.has(p.id))
      setAvailablePermissions(exceptions)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar permisos del usuario')
      console.error('Error cargando permisos del usuario:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAssignPermission = async () => {
    if (!selectedUserId || !selectedPermission) return

    setLoading(true)
    setError(null)
    try {
      const expiresAt = isTemporary
        ? (() => {
            const date = new Date()
            date.setDate(date.getDate() + daysValid)
            return date.toISOString()
          })()
        : null

      await assignPermission({
        permission_id: selectedPermission.id,
        user_id: selectedUserId,
        expires_at: expiresAt
      })

      setIsAssignModalOpen(false)
      setSelectedPermission(null)
      setIsTemporary(false)
      setDaysValid(30)
      await loadUserPermissions(selectedUserId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al asignar permiso')
      console.error('Error asignando permiso:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRemovePermission = async (permissionId: number) => {
    if (!selectedUserId) return
    if (!confirm('¿Estás seguro de remover este permiso excepcional?')) return

    setLoading(true)
    setError(null)
    try {
      await removePermissionFromUser(selectedUserId, permissionId)
      await loadUserPermissions(selectedUserId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al remover permiso')
      console.error('Error removiendo permiso:', err)
    } finally {
      setLoading(false)
    }
  }

  const openAssignModal = (permission: Permission) => {
    setSelectedPermission(permission)
    setIsAssignModalOpen(true)
  }

  // Filtrar permisos disponibles
  const filteredAvailablePermissions = availablePermissions.filter(permission => {
    const matchesSearch = permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         permission.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         permission.module.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesModule = selectedModule === "all" || permission.module === selectedModule
    return matchesSearch && matchesModule
  })

  // Agrupar permisos disponibles por módulo
  const availableByModule = filteredAvailablePermissions.reduce((acc, permission) => {
    if (!acc[permission.module]) {
      acc[permission.module] = []
    }
    acc[permission.module].push(permission)
    return acc
  }, {} as Record<string, Permission[]>)

  const selectedUser = users.find(u => u.id === selectedUserId)

  return (
    <div className="space-y-4">
      {/* Selector de Usuario */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex-1">
          <label className="text-sm font-medium mb-2 block">Seleccionar Usuario</label>
          <Select 
            value={selectedUserId?.toString() || ""} 
            onValueChange={(value) => setSelectedUserId(value ? parseInt(value) : null)}
          >
            <SelectTrigger className="w-full md:w-[300px]">
              <SelectValue placeholder="Selecciona un usuario" />
            </SelectTrigger>
            <SelectContent>
              {users.map(user => (
                <SelectItem key={user.id} value={user.id.toString()}>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>{user.username}</span>
                    {user.firstName || user.lastName && (
                      <span className="text-muted-foreground text-xs">
                        ({user.firstName || ''} {user.lastName || ''})
                      </span>
                    )}
                    <Badge variant="outline" className="ml-2">
                      {ROLE_LABELS[user.role as Role]}
                    </Badge>
                  </div>
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

      {selectedUserId && userPermissions && (
        <>
          {/* Información del usuario */}
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Permisos de {userPermissions.user.username}
              </CardTitle>
              <CardDescription>
                Rol base: <Badge variant="outline">{ROLE_LABELS[userPermissions.user.role as Role]}</Badge>
                <span className="mx-2">•</span>
                Permisos del rol: {userPermissions.rolePermissions.length}
                <span className="mx-2">•</span>
                Permisos excepcionales: {userPermissions.directPermissions.length}
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Permisos Excepcionales Asignados */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Permisos Excepcionales Asignados
              </CardTitle>
              <CardDescription>
                Permisos asignados directamente a este usuario más allá de su rol base
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading && !userPermissions.directPermissions ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : userPermissions.directPermissions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Este usuario no tiene permisos excepcionales asignados</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Permiso</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Módulo</TableHead>
                      <TableHead>Expiración</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userPermissions.directPermissions.map((perm) => (
                      <TableRow key={perm.id}>
                        <TableCell className="font-medium">{perm.name}</TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {perm.code}
                          </code>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{perm.module}</Badge>
                        </TableCell>
                        <TableCell>
                          {perm.expires_at ? (
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-orange-500" />
                              <span className="text-sm">
                                {new Date(perm.expires_at).toLocaleDateString('es-AR')}
                              </span>
                              {new Date(perm.expires_at) < new Date() && (
                                <Badge variant="secondary" className="ml-2">
                                  Expirado
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                              <span className="text-sm text-muted-foreground">Permanente</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemovePermission(perm.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Permisos Disponibles para Asignar */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Permisos Disponibles para Asignar
              </CardTitle>
              <CardDescription>
                Permisos que no están incluidos en el rol base del usuario
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filtros */}
              <div className="flex flex-col gap-4 mb-4 md:flex-row">
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

              {/* Lista de permisos por módulo */}
              {Object.keys(availableByModule).length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <XCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay permisos disponibles para asignar</p>
                  <p className="text-xs mt-2">
                    Todos los permisos ya están incluidos en el rol {ROLE_LABELS[userPermissions.user.role as Role]}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.keys(availableByModule).map(module => (
                    <div key={module} className="border rounded-lg p-4">
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        {module}
                        <Badge variant="secondary" className="ml-2">
                          {availableByModule[module].length}
                        </Badge>
                      </h4>
                      <div className="space-y-2">
                        {availableByModule[module].map(permission => (
                          <div
                            key={permission.id}
                            className="flex items-start justify-between gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">{permission.name}</span>
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
                            <Button
                              size="sm"
                              onClick={() => openAssignModal(permission)}
                              disabled={loading}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Asignar
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!selectedUserId && (
        <div className="text-center py-12 text-muted-foreground">
          <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Selecciona un usuario para ver y gestionar sus permisos excepcionales</p>
        </div>
      )}

      {/* Modal para asignar permiso */}
      <>
      <Dialog open={isAssignModalOpen} onOpenChange={handleAssignModalOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar Permiso Excepcional</DialogTitle>
            <DialogDescription>
              Asignar el permiso <strong>{selectedPermission?.name}</strong> a <strong>{selectedUser?.username}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="font-semibold">Permiso:</Label>
                  <span>{selectedPermission?.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="font-semibold">Código:</Label>
                  <code className="text-xs bg-background px-2 py-1 rounded">
                    {selectedPermission?.code}
                  </code>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="font-semibold">Módulo:</Label>
                  <Badge variant="outline">{selectedPermission?.module}</Badge>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="temporary">Permiso Temporal</Label>
                  <p className="text-xs text-muted-foreground">
                    El permiso expirará después del período especificado
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="temporary"
                    checked={isTemporary}
                    onChange={(e) => setIsTemporary(e.target.checked)}
                    className="h-4 w-4"
                  />
                </div>
              </div>

              {isTemporary && (
                <div className="space-y-2">
                  <Label htmlFor="days">Días de validez</Label>
                  <Input
                    id="days"
                    type="number"
                    min="1"
                    value={daysValid}
                    onChange={(e) => setDaysValid(parseInt(e.target.value) || 30)}
                    placeholder="30"
                  />
                  <p className="text-xs text-muted-foreground">
                    El permiso expirará el {(() => {
                      const date = new Date()
                      date.setDate(date.getDate() + daysValid)
                      return date.toLocaleDateString('es-AR')
                    })()}
                  </p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsAssignModalOpen(false)
              setSelectedPermission(null)
              setIsTemporary(false)
              setDaysValid(30)
            }}>
              Cancelar
            </Button>
            <Button onClick={handleAssignPermission} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Asignando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Asignar Permiso
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {confirmAssignDialog}
      </>
    </div>
  )
}

