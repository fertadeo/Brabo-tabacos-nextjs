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
import { FileText, AlertCircle } from "lucide-react"
import { 
  createAccruedLiability, 
  updateAccruedLiability,
  getAccruedLiability,
  type AccruedLiability,
  type CreateAccruedLiabilityRequest
} from "@/lib/api"
import { toast } from "sonner"

interface AccruedLiabilityModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  liabilityId?: number | null
  mode: 'create' | 'edit' | 'view'
}

export function AccruedLiabilityModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  liabilityId,
  mode
}: AccruedLiabilityModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  
  const [formData, setFormData] = useState<CreateAccruedLiabilityRequest>({
    liability_type: 'impuesto',
    description: "",
    amount: 0,
    accrual_date: new Date().toISOString().split('T')[0],
    due_date: new Date().toISOString().split('T')[0],
    treasury_account_id: null,
    notes: ""
  })

  useEffect(() => {
    if (isOpen) {
      if (liabilityId && (mode === 'edit' || mode === 'view')) {
        loadLiability()
      } else if (mode === 'create') {
        resetForm()
      }
    }
  }, [isOpen, liabilityId, mode])

  const loadLiability = async () => {
    if (!liabilityId) return

    try {
      setIsLoading(true)
      const response = await getAccruedLiability(liabilityId)
      if (response.success) {
        const liability = response.data
        setFormData({
          liability_type: liability.liability_type,
          description: liability.description,
          amount: liability.amount,
          accrual_date: liability.accrual_date,
          due_date: liability.due_date,
          treasury_account_id: liability.treasury_account_id || null,
          notes: liability.notes || ""
        })
      }
    } catch (error) {
      console.error("Error al cargar pasivo:", error)
      toast.error("Error al cargar el pasivo")
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    const today = new Date().toISOString().split('T')[0]
    setFormData({
      liability_type: 'impuesto',
      description: "",
      amount: 0,
      accrual_date: today,
      due_date: today,
      treasury_account_id: null,
      notes: ""
    })
  }

  const handleSubmit = async () => {
    if (!formData.description.trim()) {
      toast.error("La descripción es requerida")
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

    if (!formData.due_date) {
      toast.error("La fecha de vencimiento es requerida")
      return
    }

    if (new Date(formData.due_date) < new Date(formData.accrual_date)) {
      toast.error("La fecha de vencimiento no puede ser anterior a la fecha de devengamiento")
      return
    }

    setIsLoading(true)

    try {
      let response
      if (mode === 'create') {
        response = await createAccruedLiability(formData)
      } else if (mode === 'edit' && liabilityId) {
        response = await updateAccruedLiability(liabilityId, formData)
      } else {
        return
      }
      
      if (response.success) {
        toast.success(mode === 'create' ? "Pasivo creado exitosamente" : "Pasivo actualizado exitosamente")
        onSuccess()
        handleClose()
      } else {
        toast.error(`Error al ${mode === 'create' ? 'crear' : 'actualizar'} el pasivo`)
      }
    } catch (error) {
      console.error(`Error al ${mode === 'create' ? 'crear' : 'actualizar'} pasivo:`, error)
      toast.error(`Error al ${mode === 'create' ? 'crear' : 'actualizar'} el pasivo`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const isReadOnly = mode === 'view'
  const title = mode === 'create' ? 'Nuevo Pasivo Devengado' : mode === 'edit' ? 'Editar Pasivo Devengado' : 'Ver Pasivo Devengado'

  const [handleOpenChange, confirmDialog] = useConfirmBeforeClose((open) => {
    if (!open) handleClose()
  })

  return (
    <>
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' && "Registra un pasivo devengado (impuestos, alquileres, seguros, etc.)"}
            {mode === 'edit' && "Modifica la información del pasivo devengado"}
            {mode === 'view' && "Información del pasivo devengado"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información Básica */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Información Básica</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="liability_type">Tipo de Pasivo *</Label>
                <Select
                  value={formData.liability_type}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, liability_type: value as any }))}
                  disabled={isReadOnly}
                >
                  <SelectTrigger id="liability_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="impuesto">Impuesto</SelectItem>
                    <SelectItem value="alquiler">Alquiler</SelectItem>
                    <SelectItem value="seguro">Seguro</SelectItem>
                    <SelectItem value="servicio">Servicio</SelectItem>
                    <SelectItem value="prestamo">Préstamo</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción *</Label>
                <Input
                  id="description"
                  placeholder="Ej: IVA Trimestral - Q1 2024"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
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
                <Label htmlFor="due_date">Fecha de Vencimiento *</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                  disabled={isReadOnly}
                />
                {formData.due_date && formData.accrual_date && 
                 new Date(formData.due_date) < new Date(formData.accrual_date) && (
                  <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                    <AlertCircle className="h-4 w-4" />
                    <span>La fecha de vencimiento no puede ser anterior a la fecha de devengamiento</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Vinculación con Tesorería */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Vinculación con Tesorería</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="treasury_account_id">Cuenta de Tesorería (Opcional)</Label>
                <Input
                  id="treasury_account_id"
                  type="number"
                  placeholder="ID de cuenta de tesorería"
                  value={formData.treasury_account_id || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, treasury_account_id: e.target.value ? parseInt(e.target.value) : null }))}
                  disabled={isReadOnly}
                />
                <p className="text-xs text-muted-foreground">
                  ID de la cuenta de tesorería para vincular pagos posteriores
                </p>
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
              {isLoading ? 'Guardando...' : mode === 'create' ? 'Crear Pasivo' : 'Actualizar Pasivo'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
    {confirmDialog}
    </>
  )
}

