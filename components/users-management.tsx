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
  Edit, 
  Trash2,
  Loader2,
  AlertCircle,
  User,
  Mail,
  Shield,
  CheckCircle2,
  XCircle,
  Info,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff
} from "lucide-react"
import { 
  getUsers, 
  createUser, 
  updateUser, 
  deleteUser,
  getRolePermissions,
  type User as UserData,
  type Permission
} from "@/lib/api"
import { ROLE_LABELS, type Role } from "@/app/config/menu"
import { cn } from "@/lib/utils"

type UserFormField = "username" | "password" | "firstName" | "lastName" | "email" | "role"
type FormErrors = Partial<Record<UserFormField, string>>

export function UsersManagement() {
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modalError, setModalError] = useState<string | null>(null)
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [searchTerm, setSearchTerm] = useState("")
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null)
  const [selectedRolePermissions, setSelectedRolePermissions] = useState<Permission[]>([])
  const [loadingRolePermissions, setLoadingRolePermissions] = useState(false)
  const [showRolePermissions, setShowRolePermissions] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    firstName: "",
    lastName: "",
    email: "",
    role: "" as Role | "",
    is_active: true
  })

  const roles: Role[] = ['admin', 'gerencia', 'ventas', 'logistica', 'finanzas', 'manager', 'employee', 'viewer']

  const [handleCreateModalOpenChange, confirmCreateDialog] = useConfirmBeforeClose((open) => {
    setIsCreateModalOpen(open)
    // Evitar que el autofill del navegador deje "admin" en el buscador al cerrar el modal
    if (!open) setSearchTerm("")
  })
  const [handleEditModalOpenChange, confirmEditDialog] = useConfirmBeforeClose((open) => {
    setIsEditModalOpen(open)
    if (!open) setSearchTerm("")
  })

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    setError(null)
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

  const clearFieldError = (field: UserFormField) => {
    setFormErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  const updateFormField = <K extends keyof typeof formData>(field: K, value: (typeof formData)[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (field in { username: 1, password: 1, firstName: 1, lastName: 1, email: 1, role: 1 }) {
      clearFieldError(field as UserFormField)
    }
    setModalError(null)
  }

  const validateCreateForm = (): FormErrors => {
    const errors: FormErrors = {}
    if (!formData.username.trim()) errors.username = "El username es requerido"
    if (!formData.password) errors.password = "La contraseña es requerida"
    else if (formData.password.length < 6) errors.password = "Mínimo 6 caracteres"
    if (!formData.firstName.trim()) errors.firstName = "El nombre es requerido"
    if (!formData.lastName.trim()) errors.lastName = "El apellido es requerido"
    if (!formData.email.trim()) errors.email = "El email es requerido"
    else if (!formData.email.includes("@")) errors.email = "Ingresá un email válido"
    if (!formData.role) errors.role = "Seleccioná un rol"
    return errors
  }

  const handleCreateUser = async () => {
    const errors = validateCreateForm()
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      setModalError("Completá los campos marcados para continuar")
      return
    }

    setLoading(true)
    setModalError(null)
    setFormErrors({})
    try {
      const created = await createUser({
        username: formData.username.trim(),
        password: formData.password,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        role: formData.role,
        is_active: formData.is_active
      })

      // Actualizar tabla de inmediato (sin esperar el reload)
      setUsers((prev) => {
        const withoutDup = prev.filter((u) => u.id !== created.id)
        return [created, ...withoutDup]
      })
      setSearchTerm("")
      setIsCreateModalOpen(false)
      resetForm()
      // Sincronizar con el servidor en segundo plano
      void loadUsers()
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Error al crear usuario')
      console.error('Error creando usuario:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateUser = async () => {
    const errors: FormErrors = {}
    if (!formData.role) errors.role = "Seleccioná un rol"
    if (formData.password && formData.password.length < 6) {
      errors.password = "Mínimo 6 caracteres"
    }
    if (formData.email.trim() && !formData.email.includes("@")) {
      errors.email = "Ingresá un email válido"
    }
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      setModalError("Revisá los campos marcados")
      return
    }
    if (!selectedUser) return

    setLoading(true)
    setModalError(null)
    setFormErrors({})
    try {
      const updated = await updateUser(selectedUser.id, {
        username: formData.username,
        firstName: formData.firstName || undefined,
        lastName: formData.lastName || undefined,
        email: formData.email || undefined,
        role: formData.role,
        is_active: formData.is_active,
        ...(formData.password && { password: formData.password })
      })

      setUsers((prev) => prev.map((u) => (u.id === selectedUser.id ? updated : u)))
      setIsEditModalOpen(false)
      resetForm()
      setSelectedUser(null)
      void loadUsers()
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Error al actualizar usuario')
      console.error('Error actualizando usuario:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return

    setLoading(true)
    setError(null)
    try {
      await deleteUser(userId)
      await loadUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar usuario')
      console.error('Error eliminando usuario:', err)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      username: "",
      password: "",
      firstName: "",
      lastName: "",
      email: "",
      role: "",
      is_active: true
    })
    setSelectedRolePermissions([])
    setShowRolePermissions(false)
    setShowPassword(false)
    setFormErrors({})
    setModalError(null)
  }

  // Cargar permisos del rol cuando se selecciona
  const loadRolePermissions = async (role: Role) => {
    if (!role) {
      setSelectedRolePermissions([])
      return
    }

    setLoadingRolePermissions(true)
    try {
      const permissions = await getRolePermissions(role)
      setSelectedRolePermissions(permissions)
    } catch (err) {
      console.error('Error cargando permisos del rol:', err)
      setSelectedRolePermissions([])
    } finally {
      setLoadingRolePermissions(false)
    }
  }

  // Agrupar permisos por módulo
  const permissionsByModule = selectedRolePermissions.reduce((acc, permission) => {
    if (!acc[permission.module]) {
      acc[permission.module] = []
    }
    acc[permission.module].push(permission)
    return acc
  }, {} as Record<string, Permission[]>)

  const openEditModal = async (user: UserData) => {
    setSearchTerm("")
    setSelectedUser(user)
    const userRole = user.role as Role
    setFormData({
      username: user.username,
      password: "",
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      email: user.email || "",
      role: userRole,
      is_active: user.is_active !== false
    })
    // Cargar permisos del rol actual del usuario
    if (userRole) {
      await loadRolePermissions(userRole)
      setShowRolePermissions(true)
    }
    setIsEditModalOpen(true)
  }

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-4">
      {/* Header con búsqueda y botón crear */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex-1 relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar usuarios..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
            name="users-table-filter"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            data-1p-ignore
            data-lpignore="true"
          />
        </div>
        <Button onClick={() => {
          resetForm()
          setSearchTerm("")
          setIsCreateModalOpen(true)
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Usuario
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabla de usuarios */}
      <Card>
        <CardContent className="p-0">
          {loading && users.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Nombre Completo</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No se encontraron usuarios</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map(user => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell>
                        {user.firstName || user.lastName
                          ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                          : '-'}
                      </TableCell>
                      <TableCell>{user.email || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          <Shield className="h-3 w-3 mr-1" />
                          {ROLE_LABELS[user.role as Role]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.is_active !== false ? (
                          <Badge variant="default" className="bg-green-600">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Activo
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <XCircle className="h-3 w-3 mr-1" />
                            Inactivo
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(user)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal crear usuario */}
      <Dialog open={isCreateModalOpen} onOpenChange={handleCreateModalOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Usuario</DialogTitle>
            <DialogDescription>
              Completa los datos para crear un nuevo usuario en el sistema.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {modalError && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  name="new-user-username"
                  value={formData.username}
                  onChange={(e) => updateFormField("username", e.target.value)}
                  placeholder="usuario123"
                  autoComplete="off"
                  aria-invalid={!!formErrors.username}
                  className={cn(formErrors.username && "border-destructive focus-visible:ring-destructive")}
                />
                {formErrors.username && (
                  <p className="text-xs text-destructive">{formErrors.username}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="new-user-password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => updateFormField("password", e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    aria-invalid={!!formErrors.password}
                    className={cn(
                      "pr-10",
                      formErrors.password && "border-destructive focus-visible:ring-destructive"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {formErrors.password && (
                  <p className="text-xs text-destructive">{formErrors.password}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Nombre *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => updateFormField("firstName", e.target.value)}
                  placeholder="Juan"
                  aria-invalid={!!formErrors.firstName}
                  className={cn(formErrors.firstName && "border-destructive focus-visible:ring-destructive")}
                />
                {formErrors.firstName && (
                  <p className="text-xs text-destructive">{formErrors.firstName}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Apellido *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => updateFormField("lastName", e.target.value)}
                  placeholder="Pérez"
                  aria-invalid={!!formErrors.lastName}
                  className={cn(formErrors.lastName && "border-destructive focus-visible:ring-destructive")}
                />
                {formErrors.lastName && (
                  <p className="text-xs text-destructive">{formErrors.lastName}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => updateFormField("email", e.target.value)}
                placeholder="usuario@empresa.com"
                aria-invalid={!!formErrors.email}
                className={cn(formErrors.email && "border-destructive focus-visible:ring-destructive")}
              />
              {formErrors.email && (
                <p className="text-xs text-destructive">{formErrors.email}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Rol *</Label>
              <Select 
                value={formData.role} 
                onValueChange={async (value) => {
                  const selectedRole = value as Role
                  updateFormField("role", selectedRole)
                  await loadRolePermissions(selectedRole)
                  setShowRolePermissions(true)
                }}
              >
                <SelectTrigger
                  aria-invalid={!!formErrors.role}
                  className={cn(formErrors.role && "border-destructive focus:ring-destructive")}
                >
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
              {formErrors.role && (
                <p className="text-xs text-destructive">{formErrors.role}</p>
              )}
              {formData.role && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  El usuario heredará automáticamente todos los permisos del rol {ROLE_LABELS[formData.role]}
                </p>
              )}
            </div>

            {/* Vista previa de permisos del rol */}
            {formData.role && selectedRolePermissions.length > 0 && (
              <Card className="border-primary/20 bg-muted/30">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary" />
                      <CardTitle className="text-sm">
                        Permisos del Rol {ROLE_LABELS[formData.role]}
                      </CardTitle>
                      <Badge variant="secondary" className="ml-2">
                        {selectedRolePermissions.length}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowRolePermissions(!showRolePermissions)}
                      className="h-6 px-2"
                    >
                      {showRolePermissions ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <CardDescription className="text-xs">
                    Estos permisos se asignarán automáticamente al usuario
                  </CardDescription>
                </CardHeader>
                {showRolePermissions && (
                  <CardContent className="pt-0">
                    {loadingRolePermissions ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-60 overflow-y-auto">
                        {Object.keys(permissionsByModule).map(module => (
                          <div key={module} className="space-y-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="text-xs">
                                {module}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                ({permissionsByModule[module].length} permisos)
                              </span>
                            </div>
                            <div className="space-y-1 ml-2">
                              {permissionsByModule[module].slice(0, 5).map(permission => (
                                <div key={permission.id} className="text-xs text-muted-foreground flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                                  <span>{permission.name}</span>
                                  <code className="text-[10px] bg-muted px-1 py-0.5 rounded">
                                    {permission.code}
                                  </code>
                                </div>
                              ))}
                              {permissionsByModule[module].length > 5 && (
                                <p className="text-xs text-muted-foreground italic ml-3.5">
                                  +{permissionsByModule[module].length - 5} permisos más...
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setSearchTerm("")
              setIsCreateModalOpen(false)
            }}>
              Cancelar
            </Button>
            <Button onClick={handleCreateUser} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Usuario
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal editar usuario */}
      <Dialog open={isEditModalOpen} onOpenChange={handleEditModalOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>
              Modifica los datos del usuario {selectedUser?.username}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {modalError && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-username">Username</Label>
                <Input
                  id="edit-username"
                  name="edit-user-username"
                  value={formData.username}
                  onChange={(e) => updateFormField("username", e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-password">Nueva Contraseña (opcional)</Label>
                <div className="relative">
                  <Input
                    id="edit-password"
                    name="edit-user-password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => updateFormField("password", e.target.value)}
                    placeholder="Dejar vacío para no cambiar"
                    autoComplete="new-password"
                    aria-invalid={!!formErrors.password}
                    className={cn(
                      "pr-10",
                      formErrors.password && "border-destructive focus-visible:ring-destructive"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {formErrors.password && (
                  <p className="text-xs text-destructive">{formErrors.password}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-firstName">Nombre</Label>
                <Input
                  id="edit-firstName"
                  value={formData.firstName}
                  onChange={(e) => updateFormField("firstName", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-lastName">Apellido</Label>
                <Input
                  id="edit-lastName"
                  value={formData.lastName}
                  onChange={(e) => updateFormField("lastName", e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => updateFormField("email", e.target.value)}
                aria-invalid={!!formErrors.email}
                className={cn(formErrors.email && "border-destructive focus-visible:ring-destructive")}
              />
              {formErrors.email && (
                <p className="text-xs text-destructive">{formErrors.email}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">Rol *</Label>
              <Select 
                value={formData.role} 
                onValueChange={async (value) => {
                  const selectedRole = value as Role
                  updateFormField("role", selectedRole)
                  await loadRolePermissions(selectedRole)
                  setShowRolePermissions(true)
                }}
              >
                <SelectTrigger
                  aria-invalid={!!formErrors.role}
                  className={cn(formErrors.role && "border-destructive focus:ring-destructive")}
                >
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
              {formErrors.role && (
                <p className="text-xs text-destructive">{formErrors.role}</p>
              )}
              {formData.role && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  Al cambiar el rol, el usuario heredará automáticamente todos los permisos del nuevo rol
                </p>
              )}
            </div>

            {/* Vista previa de permisos del rol en edición */}
            {formData.role && selectedRolePermissions.length > 0 && (
              <Card className="border-primary/20 bg-muted/30">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary" />
                      <CardTitle className="text-sm">
                        Permisos del Rol {ROLE_LABELS[formData.role]}
                      </CardTitle>
                      <Badge variant="secondary" className="ml-2">
                        {selectedRolePermissions.length}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowRolePermissions(!showRolePermissions)}
                      className="h-6 px-2"
                    >
                      {showRolePermissions ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <CardDescription className="text-xs">
                    {selectedUser && selectedUser.role === formData.role
                      ? "Estos son los permisos actuales del usuario"
                      : "Estos permisos se asignarán al usuario al guardar los cambios"}
                  </CardDescription>
                </CardHeader>
                {showRolePermissions && (
                  <CardContent className="pt-0">
                    {loadingRolePermissions ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-60 overflow-y-auto">
                        {Object.keys(permissionsByModule).map(module => (
                          <div key={module} className="space-y-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="text-xs">
                                {module}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                ({permissionsByModule[module].length} permisos)
                              </span>
                            </div>
                            <div className="space-y-1 ml-2">
                              {permissionsByModule[module].slice(0, 5).map(permission => (
                                <div key={permission.id} className="text-xs text-muted-foreground flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                                  <span>{permission.name}</span>
                                  <code className="text-[10px] bg-muted px-1 py-0.5 rounded">
                                    {permission.code}
                                  </code>
                                </div>
                              ))}
                              {permissionsByModule[module].length > 5 && (
                                <p className="text-xs text-muted-foreground italic ml-3.5">
                                  +{permissionsByModule[module].length - 5} permisos más...
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setSearchTerm("")
              setIsEditModalOpen(false)
              setSelectedUser(null)
              resetForm()
            }}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateUser} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Actualizando...
                </>
              ) : (
                <>
                  <Edit className="h-4 w-4 mr-2" />
                  Actualizar Usuario
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {confirmCreateDialog}
      {confirmEditDialog}
    </div>
  )
}

