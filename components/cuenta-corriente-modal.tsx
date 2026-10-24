"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useConfirmBeforeClose } from "@/lib/use-confirm-before-close"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { 
  CreditCard, 
  Plus, 
  Minus, 
  DollarSign, 
  Calendar, 
  User, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  History,
  Edit,
  Trash2
} from "lucide-react"
import { 
  CuentaCorriente, 
  MovimientoCuentaCorriente, 
  CreateCuentaCorrienteRequest, 
  UpdateCuentaCorrienteRequest,
  CreateMovimientoRequest,
  getCuentaCorrienteByClient,
  createCuentaCorriente,
  updateCuentaCorriente,
  deleteCuentaCorriente,
  getMovimientosCuentaCorriente,
  createMovimientoCuentaCorriente
} from "@/lib/api"

interface CuentaCorrienteModalProps {
  clienteId: number
  clienteNombre: string
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function CuentaCorrienteModal({ 
  clienteId, 
  clienteNombre, 
  isOpen, 
  onClose, 
  onSuccess 
}: CuentaCorrienteModalProps) {
  const [cuenta, setCuenta] = useState<CuentaCorriente | null>(null)
  const [movimientos, setMovimientos] = useState<MovimientoCuentaCorriente[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'info' | 'movimientos' | 'nuevo'>('info')
  
  // Estados para crear/editar cuenta
  const [isCreating, setIsCreating] = useState(false)
  const [formData, setFormData] = useState({
    credit_limit: 0,
    initial_balance: 0
  })
  
  // Estados para nuevo movimiento
  const [nuevoMovimiento, setNuevoMovimiento] = useState({
    type: 'debit' as 'debit' | 'credit',
    amount: 0,
    description: '',
    reference_type: 'adjustment' as 'sale' | 'payment' | 'adjustment' | 'refund'
  })
  const [isCreatingMovimiento, setIsCreatingMovimiento] = useState(false)

  // Cargar datos al abrir el modal
  useEffect(() => {
    if (isOpen && clienteId) {
      loadCuentaCorriente()
    }
  }, [isOpen, clienteId])

  const loadCuentaCorriente = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await getCuentaCorrienteByClient(clienteId)
      if (response.success) {
        setCuenta(response.data)
        loadMovimientos(response.data.id)
      } else {
        // No existe cuenta corriente, mostrar opción para crear
        setCuenta(null)
      }
    } catch (err) {
      console.error('Error al cargar cuenta corriente:', err)
      setError(err instanceof Error ? err.message : 'Error al cargar la cuenta corriente')
    } finally {
      setLoading(false)
    }
  }

  const loadMovimientos = async (accountId: number) => {
    try {
      const response = await getMovimientosCuentaCorriente(accountId, { limit: 50 })
      if (response.success) {
        setMovimientos(response.data.movements)
      }
    } catch (err) {
      console.error('Error al cargar movimientos:', err)
    }
  }

  const handleCreateCuenta = async () => {
    // Validaciones
    if (formData.credit_limit <= 0) {
      setError('El límite de crédito debe ser mayor a 0')
      return
    }
    
    if (formData.initial_balance < 0) {
      setError('El saldo inicial no puede ser negativo')
      return
    }

    setIsCreating(true)
    setError(null)
    
    try {
      const data: CreateCuentaCorrienteRequest = {
        client_id: clienteId,
        credit_limit: formData.credit_limit,
        initial_balance: formData.initial_balance
      }
      
      const response = await createCuentaCorriente(data)
      if (response.success) {
        setCuenta(response.data)
        setActiveTab('info')
        setIsCreating(false)
        if (onSuccess) onSuccess()
      } else {
        setError(response.message || 'Error al crear la cuenta corriente')
      }
    } catch (err) {
      console.error('Error al crear cuenta corriente:', err)
      setError(err instanceof Error ? err.message : 'Error al crear la cuenta corriente')
    } finally {
      setIsCreating(false)
    }
  }

  const handleUpdateCuenta = async () => {
    if (!cuenta) return
    
    setLoading(true)
    setError(null)
    
    try {
      const data: UpdateCuentaCorrienteRequest = {
        credit_limit: formData.credit_limit,
        is_active: true
      }
      
      const response = await updateCuentaCorriente(cuenta.id, data)
      if (response.success) {
        setCuenta(response.data)
        if (onSuccess) onSuccess()
      }
    } catch (err) {
      console.error('Error al actualizar cuenta corriente:', err)
      setError(err instanceof Error ? err.message : 'Error al actualizar la cuenta corriente')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteCuenta = async () => {
    if (!cuenta) return
    
    if (!confirm('¿Está seguro que desea eliminar esta cuenta corriente?')) return
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await deleteCuentaCorriente(cuenta.id)
      if (response.success) {
        onClose()
        if (onSuccess) onSuccess()
      }
    } catch (err) {
      console.error('Error al eliminar cuenta corriente:', err)
      setError(err instanceof Error ? err.message : 'Error al eliminar la cuenta corriente')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateMovimiento = async () => {
    if (!cuenta) return
    
    // Validaciones
    if (nuevoMovimiento.amount <= 0) {
      setError('El monto debe ser mayor a 0')
      return
    }
    
    if (!nuevoMovimiento.description.trim()) {
      setError('La descripción es obligatoria')
      return
    }
    
    // Validar límite de crédito para débitos
    if (nuevoMovimiento.type === 'debit' && cuenta.balance - nuevoMovimiento.amount < -cuenta.credit_limit) {
      setError('El movimiento excedería el límite de crédito disponible')
      return
    }
    
    setIsCreatingMovimiento(true)
    setError(null)
    
    try {
      const data: CreateMovimientoRequest = {
        account_id: cuenta.id,
        type: nuevoMovimiento.type,
        amount: nuevoMovimiento.amount,
        description: nuevoMovimiento.description,
        reference_type: nuevoMovimiento.reference_type
      }
      
      const response = await createMovimientoCuentaCorriente(data)
      if (response.success) {
        // Recargar movimientos y cuenta
        await loadMovimientos(cuenta.id)
        await loadCuentaCorriente()
        setNuevoMovimiento({
          type: 'debit',
          amount: 0,
          description: '',
          reference_type: 'adjustment'
        })
        setActiveTab('movimientos')
        if (onSuccess) onSuccess()
      } else {
        setError(response.message || 'Error al crear el movimiento')
      }
    } catch (err) {
      console.error('Error al crear movimiento:', err)
      setError(err instanceof Error ? err.message : 'Error al crear el movimiento')
    } finally {
      setIsCreatingMovimiento(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR')
  }

  const getBalanceColor = (balance: number) => {
    if (balance > 0) return "text-green-600"
    if (balance < 0) return "text-red-600"
    return "text-gray-600"
  }

  const getMovimientoIcon = (type: 'debit' | 'credit') => {
    return type === 'debit' ? (
      <TrendingDown className="h-4 w-4 text-red-500" />
    ) : (
      <TrendingUp className="h-4 w-4 text-green-500" />
    )
  }

  const [handleOpenChange, confirmDialog] = useConfirmBeforeClose((open) => {
    if (!open) onClose()
  })

  return (
    <>
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[95vw] max-w-6xl h-[95vh] max-h-[95vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b bg-muted/30">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="h-5 w-5" />
            Cuenta Corriente - {clienteNombre}
          </DialogTitle>
        </DialogHeader>

        {/* Tabs de navegación */}
        <div className="flex gap-1 border-b bg-background px-6 py-2 overflow-x-auto">
          <Button
            variant={activeTab === 'info' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('info')}
            className="flex-shrink-0"
          >
            <CreditCard className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Información</span>
            <span className="sm:hidden">Info</span>
          </Button>
          {cuenta && (
            <>
              <Button
                variant={activeTab === 'movimientos' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('movimientos')}
                className="flex-shrink-0"
              >
                <History className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Movimientos</span>
                <span className="sm:hidden">Mov.</span>
              </Button>
              <Button
                variant={activeTab === 'nuevo' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('nuevo')}
                className="flex-shrink-0"
              >
                <Plus className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Nuevo Movimiento</span>
                <span className="sm:hidden">Nuevo</span>
              </Button>
            </>
          )}
        </div>

        {/* Contenido de las pestañas */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              <span className="ml-2">Cargando...</span>
            </div>
          )}

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-red-700">{error}</span>
            </div>
          )}

          {!loading && !error && (
            <>
              {activeTab === 'info' && (
                <div className="space-y-6">
                  {!cuenta ? (
                    // No existe cuenta corriente - mostrar formulario para crear
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Plus className="h-5 w-5" />
                          Crear Cuenta Corriente
                        </CardTitle>
                        <CardDescription>
                          Este cliente no tiene una cuenta corriente. Complete los datos para crear una nueva.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="credit_limit">Límite de Crédito</Label>
                            <Input
                              id="credit_limit"
                              type="number"
                              value={formData.credit_limit}
                              onChange={(e) => setFormData(prev => ({ ...prev, credit_limit: Number(e.target.value) }))}
                              placeholder="0"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="initial_balance">Saldo Inicial (opcional)</Label>
                            <Input
                              id="initial_balance"
                              type="number"
                              value={formData.initial_balance}
                              onChange={(e) => setFormData(prev => ({ ...prev, initial_balance: Number(e.target.value) }))}
                              placeholder="0"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={handleCreateCuenta} disabled={isCreating}>
                            {isCreating ? 'Creando...' : 'Crear Cuenta Corriente'}
                          </Button>
                          <Button variant="outline" onClick={onClose}>
                            Cancelar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    // Existe cuenta corriente - mostrar información
                    <>
                      {/* Información de la cuenta */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5" />
                            Información de la Cuenta
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-gray-600">Cliente</Label>
                              <p className="text-lg font-semibold">{cuenta.client_name}</p>
                              <p className="text-sm text-gray-500">ID: {cuenta.client_code}</p>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-gray-600">Saldo Actual</Label>
                              <p className={`text-2xl font-bold ${getBalanceColor(cuenta.balance)}`}>
                                {formatCurrency(cuenta.balance)}
                              </p>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-gray-600">Límite de Crédito</Label>
                              <p className="text-lg font-semibold">{formatCurrency(cuenta.credit_limit)}</p>
                            </div>
                          </div>
                          
                          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-gray-600">Estado</Label>
                              <div className="flex items-center gap-2">
                                {cuenta.is_active ? (
                                  <Badge variant="default" className="flex items-center gap-1">
                                    <CheckCircle className="h-3 w-3" />
                                    Activa
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="flex items-center gap-1">
                                    <XCircle className="h-3 w-3" />
                                    Inactiva
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-gray-600">Fecha de Creación</Label>
                              <p className="text-sm">{formatDate(cuenta.created_at)}</p>
                            </div>
                          </div>

                          {/* Acciones */}
                          <div className="mt-6 flex gap-2">
                            <Button onClick={() => setActiveTab('nuevo')}>
                              <Plus className="h-4 w-4 mr-2" />
                              Nuevo Movimiento
                            </Button>
                            <Button variant="outline" onClick={() => setActiveTab('movimientos')}>
                              <History className="h-4 w-4 mr-2" />
                              Ver Movimientos
                            </Button>
                            <Button variant="destructive" onClick={handleDeleteCuenta}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Eliminar Cuenta
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </>
                  )}
                </div>
              )}

              {activeTab === 'movimientos' && cuenta && (
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <History className="h-5 w-5" />
                        Historial de Movimientos
                      </CardTitle>
                      <CardDescription>
                        Registro de todos los movimientos de la cuenta corriente
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Fecha</TableHead>
                              <TableHead>Tipo</TableHead>
                              <TableHead>Descripción</TableHead>
                              <TableHead>Monto</TableHead>
                              <TableHead>Usuario</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {movimientos.map((movimiento) => (
                              <TableRow key={movimiento.id}>
                                <TableCell className="text-sm">
                                  {formatDate(movimiento.created_at)}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    {getMovimientoIcon(movimiento.type)}
                                    <Badge variant={movimiento.type === 'credit' ? 'default' : 'secondary'}>
                                      {movimiento.type === 'credit' ? 'Crédito' : 'Débito'}
                                    </Badge>
                                  </div>
                                </TableCell>
                                <TableCell className="text-sm">{movimiento.description}</TableCell>
                                <TableCell className={`font-medium ${movimiento.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                                  {movimiento.type === 'credit' ? '+' : '-'}{formatCurrency(movimiento.amount)}
                                </TableCell>
                                <TableCell className="text-sm">{movimiento.created_by_name}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === 'nuevo' && cuenta && (
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Plus className="h-5 w-5" />
                        Nuevo Movimiento
                      </CardTitle>
                      <CardDescription>
                        Registre un nuevo movimiento en la cuenta corriente
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="movement_type">Tipo de Movimiento</Label>
                          <Select 
                            value={nuevoMovimiento.type} 
                            onValueChange={(value: 'debit' | 'credit') => setNuevoMovimiento(prev => ({ ...prev, type: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="debit">Débito (Cobro)</SelectItem>
                              <SelectItem value="credit">Crédito (Pago)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="movement_amount">Monto</Label>
                          <Input
                            id="movement_amount"
                            type="number"
                            value={nuevoMovimiento.amount}
                            onChange={(e) => setNuevoMovimiento(prev => ({ ...prev, amount: Number(e.target.value) }))}
                            placeholder="0"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="movement_description">Descripción</Label>
                        <Textarea
                          id="movement_description"
                          value={nuevoMovimiento.description}
                          onChange={(e) => setNuevoMovimiento(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Descripción del movimiento..."
                          rows={3}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="reference_type">Tipo de Referencia</Label>
                        <Select 
                          value={nuevoMovimiento.reference_type} 
                          onValueChange={(value: 'sale' | 'payment' | 'adjustment' | 'refund') => setNuevoMovimiento(prev => ({ ...prev, reference_type: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sale">Venta</SelectItem>
                            <SelectItem value="payment">Pago</SelectItem>
                            <SelectItem value="adjustment">Ajuste</SelectItem>
                            <SelectItem value="refund">Reembolso</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button onClick={handleCreateMovimiento} disabled={isCreatingMovimiento}>
                          {isCreatingMovimiento ? 'Creando...' : 'Crear Movimiento'}
                        </Button>
                        <Button variant="outline" onClick={() => setActiveTab('info')}>
                          Cancelar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </>
          )}
        </div>

        {/* Botones de acción */}
        <div className="flex justify-end gap-2 p-4 border-t bg-muted/30">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    {confirmDialog}
    </>
  )
}
