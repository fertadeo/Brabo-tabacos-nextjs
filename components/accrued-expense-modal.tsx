"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useConfirmBeforeClose } from "@/lib/use-confirm-before-close"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DollarSign, AlertCircle, Info } from "lucide-react"
import { 
  createAccruedExpense, 
  updateAccruedExpense,
  getAccruedExpense,
  getSuppliers,
  type Supplier, 
  type AccruedExpense,
  type CreateAccruedExpenseRequest
} from "@/lib/api"
import { toast } from "sonner"

interface AccruedExpenseModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  expenseId?: number | null
  mode: 'create' | 'edit' | 'view'
  supplierId?: number | null
}

export function AccruedExpenseModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  expenseId,
  mode,
  supplierId: initialSupplierId
}: AccruedExpenseModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  
  const [formData, setFormData] = useState<CreateAccruedExpenseRequest>({
    supplier_id: initialSupplierId || null,
    expense_type: 'accrual',
    concept: "",
    category: 'otro',
    amount: 0,
    accrual_date: new Date().toISOString().split('T')[0],
    due_date: null,
    notes: ""
  })

  useEffect(() => {
    if (isOpen) {
      loadSuppliers()
      if (expenseId && (mode === 'edit' || mode === 'view')) {
        loadExpense()
      } else if (mode === 'create') {
        resetForm()
      }
    }
  }, [isOpen, expenseId, mode])

  const loadSuppliers = async () => {
    try {
      const response = await getSuppliers({ all: true })
      if (response.success) {
        setSuppliers(response.data.suppliers)
      }
    } catch (error) {
      console.error("Error al cargar proveedores:", error)
    }
  }

  const loadExpense = async () => {
    if (!expenseId) return

    try {
      setIsLoading(true)
      const response = await getAccruedExpense(expenseId)
      if (response.success) {
        const expense = response.data
        setFormData({
          supplier_id: expense.supplier_id || null,
          expense_type: expense.expense_type,
          concept: expense.concept,
          category: expense.category,
          amount: expense.amount,
          accrual_date: expense.accrual_date,
          due_date: expense.due_date || null,
          notes: expense.notes || ""
        })
      }
    } catch (error) {
      console.error("Error al cargar egreso:", error)
      toast.error("Error al cargar el egreso")
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      supplier_id: initialSupplierId || null,
      expense_type: 'accrual',
      concept: "",
      category: 'otro',
      amount: 0,
      accrual_date: new Date().toISOString().split('T')[0],
      due_date: null,
      notes: ""
    })
    setSearchTerm("")
  }

  const handleSubmit = async () => {
    if (!formData.concept.trim()) {
      toast.error("El concepto es requerido")
      return
    }

    if (formData.amount <= 0) {
      toast.error("El monto debe ser mayor a cero")
      return
    }

    if (!formData.accrual_date) {
      toast.error("La fecha de devengamiento es requerida")
      return
    }

    setIsLoading(true)

    try {
      let response
      if (mode === 'create') {
        response = await createAccruedExpense(formData)
      } else if (mode === 'edit' && expenseId) {
        response = await updateAccruedExpense(expenseId, formData)
      } else {
        return
      }
      
      if (response.success) {
        toast.success(mode === 'create' ? "Egreso creado exitosamente" : "Egreso actualizado exitosamente")
        onSuccess()
        handleClose()
      } else {
        toast.error(`Error al ${mode === 'create' ? 'crear' : 'actualizar'} el egreso`)
      }
    } catch (error) {
      console.error(`Error al ${mode === 'create' ? 'crear' : 'actualizar'} egreso:`, error)
      toast.error(`Error al ${mode === 'create' ? 'crear' : 'actualizar'} el egreso`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const isReadOnly = mode === 'view'
  const title = mode === 'create' ? 'Nuevo Egreso Devengado' : mode === 'edit' ? 'Editar Egreso Devengado' : 'Ver Egreso Devengado'

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.code.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const selectedSupplier = suppliers.find(s => s.id === formData.supplier_id)

  const [handleOpenChange, confirmDialog] = useConfirmBeforeClose((open) => {
    if (!open) handleClose()
  })

  return (
    <>
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' && "Registra un egreso devengado (compromiso o devengamiento sin factura)"}
            {mode === 'edit' && "Modifica la información del egreso devengado"}
            {mode === 'view' && "Información del egreso devengado"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información Básica */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Información Básica</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expense_type">Tipo de Egreso *</Label>
                  <Select
                    value={formData.expense_type}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, expense_type: value as 'compromise' | 'accrual' }))}
                    disabled={isReadOnly}
                  >
                    <SelectTrigger id="expense_type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="compromise">Compromiso</SelectItem>
                      <SelectItem value="accrual">Devengamiento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Categoría *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value as any }))}
                    disabled={isReadOnly}
                  >
                    <SelectTrigger id="category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="seguro">Seguro</SelectItem>
                      <SelectItem value="impuesto">Impuesto</SelectItem>
                      <SelectItem value="alquiler">Alquiler</SelectItem>
                      <SelectItem value="servicio">Servicio</SelectItem>
                      <SelectItem value="otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="concept">Concepto *</Label>
                <Input
                  id="concept"
                  placeholder="Ej: Seguro anual de vehículos"
                  value={formData.concept}
                  onChange={(e) => setFormData(prev => ({ ...prev, concept: e.target.value }))}
                  disabled={isReadOnly}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Monto *</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                  disabled={isReadOnly}
                />
              </div>
            </CardContent>
          </Card>

          {/* Proveedor (Opcional) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Proveedor (Opcional)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="search-supplier">Buscar Proveedor</Label>
                <Input
                  id="search-supplier"
                  placeholder="Buscar por nombre o código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  disabled={isReadOnly || !!initialSupplierId}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplier">Proveedor</Label>
                <Select
                  value={formData.supplier_id?.toString() || "none"}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, supplier_id: value === "none" ? null : parseInt(value) }))}
                  disabled={isReadOnly || !!initialSupplierId}
                >
                  <SelectTrigger id="supplier">
                    <SelectValue placeholder="Seleccionar proveedor (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin proveedor</SelectItem>
                    {filteredSuppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id.toString()}>
                        {supplier.code} - {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedSupplier && (
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Proveedor seleccionado:</span>
                    <Badge variant="outline">{selectedSupplier.code} - {selectedSupplier.name}</Badge>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2 text-sm text-blue-600 dark:text-blue-400">
                <Info className="h-4 w-4 mt-0.5" />
                <span>El proveedor es opcional. Puedes registrar egresos sin proveedor específico.</span>
              </div>
            </CardContent>
          </Card>

          {/* Fechas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Fechas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="accrual_date">Fecha de Devengamiento *</Label>
                <Input
                  id="accrual_date"
                  type="date"
                  value={formData.accrual_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, accrual_date: e.target.value }))}
                  disabled={isReadOnly}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="due_date">Fecha de Vencimiento</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value || null }))}
                  disabled={isReadOnly}
                />
              </div>
            </CardContent>
          </Card>

          {/* Notas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Notas</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Notas adicionales..."
                value={formData.notes || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                disabled={isReadOnly}
                rows={4}
              />
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            {isReadOnly ? 'Cerrar' : 'Cancelar'}
          </Button>
          {!isReadOnly && (
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? 'Guardando...' : mode === 'create' ? 'Crear Egreso' : 'Actualizar Egreso'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
    {confirmDialog}
    </>
  )
}

