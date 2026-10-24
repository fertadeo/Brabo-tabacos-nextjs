"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useConfirmBeforeClose } from "@/lib/use-confirm-before-close"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Building2, Mail, Phone, MapPin, User, FileText, DollarSign, ShoppingBag, Receipt } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  createSupplier, 
  updateSupplier, 
  getSupplier,
  type Supplier, 
  type CreateSupplierRequest 
} from "@/lib/api"
import { toast } from "sonner"
import {
  buildArcaPadronBusinessSummary,
  formatCuitDisplay,
  getArcaPadronDisplayName,
  type ArcaPadronResult,
} from "@/lib/arca-padron"
import { ArcaPadronCuitField } from "@/components/arca-padron-cuit-field"

interface SupplierModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  supplierId?: number | null
  mode: 'create' | 'edit' | 'view'
  initialData?: Partial<CreateSupplierRequest>
  onCreated?: (supplier: Supplier) => void
}

export function SupplierModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  supplierId, 
  mode,
  initialData,
  onCreated,
}: SupplierModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [padronLocked, setPadronLocked] = useState(false)
  const padronSnapshotRef = useRef<{
    tax_id: string
    name: string
    legal_name: string
    trade_name: string
    id_type: CreateSupplierRequest["id_type"]
    vat_condition: string
  } | null>(null)

  const capturePadronSnapshot = (data: {
    tax_id?: string | null
    name?: string
    legal_name?: string | null
    trade_name?: string | null
    id_type?: CreateSupplierRequest["id_type"]
    vat_condition?: string | null
  }) => {
    padronSnapshotRef.current = {
      tax_id: data.tax_id || "",
      name: data.name || "",
      legal_name: data.legal_name || "",
      trade_name: data.trade_name || "",
      id_type: data.id_type,
      vat_condition: data.vat_condition || "",
    }
  }

  const [formData, setFormData] = useState<CreateSupplierRequest>({
    code: "",
    name: "",
    supplier_type: undefined,
    legal_name: "",
    trade_name: "",
    purchase_frequency: undefined,
    id_type: undefined,
    tax_id: "",
    gross_income: "",
    vat_condition: "",
    account_description: "",
    product_service: "",
    integral_summary_account: "",
    cost: undefined,
    contact_name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    country: "",
    has_account: true,
    payment_terms: 30
  })

  // Cargar datos del proveedor si está en modo edición o visualización
  useEffect(() => {
    if (isOpen && supplierId && (mode === 'edit' || mode === 'view')) {
      loadSupplier()
    } else if (isOpen && mode === 'create') {
      resetForm(initialData)
    }
  }, [isOpen, supplierId, mode])

  useEffect(() => {
    if (!isOpen) setPadronLocked(false)
  }, [isOpen])

  const applyPadron = useCallback((data: ArcaPadronResult) => {
    const name = getArcaPadronDisplayName(data)
    const summary = buildArcaPadronBusinessSummary(data)
    setFormData((prev) => ({
      ...prev,
      name: name || prev.name,
      legal_name: data.razonSocial || data.name || prev.legal_name,
      trade_name: name || prev.trade_name,
      id_type: "CUIT",
      tax_id: data.cuit ? formatCuitDisplay(data.cuit) : prev.tax_id,
      vat_condition:
        summary.condicionFiscal?.label ||
        data.condicionIvaSugeridaLabel ||
        prev.vat_condition,
    }))
  }, [])

  const resetPadron = useCallback(() => {
    setPadronLocked(false)
    const snap = padronSnapshotRef.current
    setFormData((prev) => ({
      ...prev,
      tax_id: snap?.tax_id ?? "",
      name: snap?.name ?? "",
      legal_name: snap?.legal_name ?? "",
      trade_name: snap?.trade_name ?? "",
      id_type: snap?.id_type,
      vat_condition: snap?.vat_condition ?? "",
    }))
  }, [])

  const loadSupplier = async () => {
    if (!supplierId) return

    try {
      setIsLoading(true)
      const response = await getSupplier(supplierId)
      if (response.success) {
        const supplier = response.data
        const loaded = {
          code: supplier.code,
          name: supplier.name,
          supplier_type: supplier.supplier_type,
          legal_name: supplier.legal_name || "",
          trade_name: supplier.trade_name || "",
          purchase_frequency: supplier.purchase_frequency,
          id_type: supplier.id_type,
          tax_id: supplier.tax_id || "",
          gross_income: supplier.gross_income || "",
          vat_condition: supplier.vat_condition || "",
          account_description: supplier.account_description || "",
          product_service: supplier.product_service || "",
          integral_summary_account: supplier.integral_summary_account || "",
          cost: supplier.cost ?? undefined as number | undefined,
          contact_name: supplier.contact_name || "",
          email: supplier.email || "",
          phone: supplier.phone || "",
          address: supplier.address || "",
          city: supplier.city || "",
          country: supplier.country || "",
          has_account: supplier.has_account ?? true,
          payment_terms: supplier.payment_terms ?? 30
        }
        setFormData(loaded)
        capturePadronSnapshot(loaded)
        setPadronLocked(false)
      }
    } catch (error) {
      console.error("Error al cargar proveedor:", error)
      toast.error("Error al cargar el proveedor")
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = (seed?: Partial<CreateSupplierRequest>) => {
    const empty = {
      code: seed?.code ?? "",
      name: seed?.name ?? "",
      supplier_type: seed?.supplier_type,
      legal_name: seed?.legal_name ?? "",
      trade_name: seed?.trade_name ?? "",
      purchase_frequency: seed?.purchase_frequency,
      id_type: seed?.id_type,
      tax_id: seed?.tax_id ?? "",
      gross_income: seed?.gross_income ?? "",
      vat_condition: seed?.vat_condition ?? "",
      account_description: seed?.account_description ?? "",
      product_service: seed?.product_service ?? "",
      integral_summary_account: seed?.integral_summary_account ?? "",
      cost: seed?.cost,
      contact_name: seed?.contact_name ?? "",
      email: seed?.email ?? "",
      phone: seed?.phone ?? "",
      address: seed?.address ?? "",
      city: seed?.city ?? "",
      country: seed?.country ?? "",
      has_account: seed?.has_account ?? true,
      payment_terms: seed?.payment_terms ?? 30
    }
    setFormData(empty)
    capturePadronSnapshot(empty)
    setPadronLocked(false)
  }

  const handleInputChange = (field: keyof CreateSupplierRequest, value: string | number | boolean | undefined) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async () => {
    // Validaciones básicas - solo campos realmente requeridos
    if (!formData.code.trim()) {
      toast.error("El código es requerido")
      return
    }

    if (!formData.name.trim()) {
      toast.error("El nombre comercial es requerido")
      return
    }

    // Validar email si se proporciona (solo formato, no requerido)
    if (formData.email && formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error("El email no es válido")
      return
    }

    // Validar supplier_type si se proporciona
    if (formData.supplier_type && !['productivo', 'no_productivo', 'otro_pasivo'].includes(formData.supplier_type)) {
      toast.error("El tipo de proveedor no es válido")
      return
    }

    // Validar payment_terms si se proporciona
    if (formData.payment_terms !== undefined && (formData.payment_terms < 0 || formData.payment_terms > 365)) {
      toast.error("Los términos de pago deben estar entre 0 y 365 días")
      return
    }

    setIsLoading(true)

    try {
      // Limpiar campos opcionales vacíos antes de enviar
      // Solo incluir campos que tienen valores (no undefined, null, o strings vacíos)
      const cleanedData: any = {
        code: formData.code.trim(),
        name: formData.name.trim(),
      }

      // Agregar campos opcionales solo si tienen valores
      if (formData.supplier_type) cleanedData.supplier_type = formData.supplier_type
      if (formData.legal_name?.trim()) cleanedData.legal_name = formData.legal_name.trim()
      if (formData.trade_name?.trim()) cleanedData.trade_name = formData.trade_name.trim()
      if (formData.purchase_frequency) cleanedData.purchase_frequency = formData.purchase_frequency
      if (formData.id_type) cleanedData.id_type = formData.id_type
      if (formData.tax_id?.trim()) cleanedData.tax_id = formData.tax_id.trim()
      if (formData.gross_income?.trim()) cleanedData.gross_income = formData.gross_income.trim()
      if (formData.vat_condition?.trim()) cleanedData.vat_condition = formData.vat_condition.trim()
      if (formData.account_description?.trim()) cleanedData.account_description = formData.account_description.trim()
      if (formData.product_service?.trim()) cleanedData.product_service = formData.product_service.trim()
      if (formData.integral_summary_account?.trim()) cleanedData.integral_summary_account = formData.integral_summary_account.trim()
      if (formData.cost !== undefined && formData.cost !== null) cleanedData.cost = Number(formData.cost)
      if (formData.contact_name?.trim()) cleanedData.contact_name = formData.contact_name.trim()
      if (formData.email?.trim()) cleanedData.email = formData.email.trim()
      if (formData.phone?.trim()) cleanedData.phone = formData.phone.trim()
      if (formData.address?.trim()) cleanedData.address = formData.address.trim()
      if (formData.city?.trim()) cleanedData.city = formData.city.trim()
      if (formData.country?.trim()) cleanedData.country = formData.country.trim()
      if (formData.has_account !== undefined) cleanedData.has_account = formData.has_account
      if (formData.payment_terms !== undefined && formData.payment_terms !== null) cleanedData.payment_terms = Number(formData.payment_terms)

      console.log('📤 [SUPPLIER_MODAL] Datos a enviar:', cleanedData)

      if (mode === 'create') {
        const response = await createSupplier(cleanedData)
        if (response.success) {
          toast.success("Proveedor creado exitosamente")
          onCreated?.(response.data)
          onSuccess()
          handleClose()
        } else {
          toast.error("Error al crear el proveedor")
        }
      } else if (mode === 'edit' && supplierId) {
        const response = await updateSupplier(supplierId, cleanedData)
        if (response.success) {
          toast.success("Proveedor actualizado exitosamente")
          onSuccess()
          handleClose()
        } else {
          toast.error("Error al actualizar el proveedor")
        }
      }
    } catch (error) {
      console.error("Error al guardar proveedor:", error)
      toast.error("Error al guardar el proveedor")
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const isReadOnly = mode === 'view'
  const title = mode === 'create' ? 'Nuevo Proveedor' : mode === 'edit' ? 'Editar Proveedor' : 'Ver Proveedor'

  const [handleOpenChange, confirmDialog] = useConfirmBeforeClose((open) => {
    if (!open) handleClose()
  })

  return (
    <>
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' && "Agrega un nuevo proveedor al sistema"}
            {mode === 'edit' && "Modifica la información del proveedor"}
            {mode === 'view' && "Información del proveedor"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información Principal - Según columnas de la tabla */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Información Principal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="legal_name">Razón Social Proveedor</Label>
                  <Input
                    id="legal_name"
                    placeholder="Razón Social S.A."
                    value={formData.legal_name || ""}
                    onChange={(e) => handleInputChange('legal_name', e.target.value)}
                    disabled={isReadOnly || padronLocked}
                    readOnly={padronLocked}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="trade_name">Nombre de Fantasía</Label>
                  <Input
                    id="trade_name"
                    placeholder="Nombre de Fantasía"
                    value={formData.trade_name || ""}
                    onChange={(e) => handleInputChange('trade_name', e.target.value)}
                    disabled={isReadOnly || padronLocked}
                    readOnly={padronLocked}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="purchase_frequency">Frecuencia de Compra</Label>
                  <Select
                    value={formData.purchase_frequency || ""}
                    onValueChange={(value) => handleInputChange('purchase_frequency', value as any)}
                    disabled={isReadOnly}
                  >
                    <SelectTrigger id="purchase_frequency">
                      <SelectValue placeholder="Seleccionar frecuencia" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="diario">Diario</SelectItem>
                      <SelectItem value="semanal">Semanal</SelectItem>
                      <SelectItem value="quincenal">Quincenal</SelectItem>
                      <SelectItem value="mensual">Mensual</SelectItem>
                      <SelectItem value="bimestral">Bimestral</SelectItem>
                      <SelectItem value="trimestral">Trimestral</SelectItem>
                      <SelectItem value="semestral">Semestral</SelectItem>
                      <SelectItem value="anual">Anual</SelectItem>
                      <SelectItem value="ocasional">Ocasional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="id_type">Tipo de Identificación</Label>
                  <Select
                    value={formData.id_type || ""}
                    onValueChange={(value) => handleInputChange('id_type', value as any)}
                    disabled={isReadOnly || padronLocked}
                  >
                    <SelectTrigger id="id_type">
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CUIT">CUIT</SelectItem>
                      <SelectItem value="CUIL">CUIL</SelectItem>
                      <SelectItem value="CDI">CDI</SelectItem>
                      <SelectItem value="PASAPORTE">Pasaporte</SelectItem>
                      <SelectItem value="OTRO">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <ArcaPadronCuitField
                    entityType="supplier"
                    cuitValue={formData.tax_id || ""}
                    onCuitChange={(v) => handleInputChange("tax_id", formatCuitDisplay(v))}
                    onApplyPadron={applyPadron}
                    onPadronLockChange={setPadronLocked}
                    onPadronReset={resetPadron}
                    disabled={isReadOnly || isLoading}
                    inputId="tax_id"
                    label="CUIT"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gross_income">Ingresos Brutos</Label>
                  <Input
                    id="gross_income"
                    placeholder="123456789"
                    value={formData.gross_income || ""}
                    onChange={(e) => handleInputChange('gross_income', e.target.value)}
                    disabled={isReadOnly}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vat_condition">Condición IVA</Label>
                  <Input
                    id="vat_condition"
                    placeholder="Responsable Inscripto"
                    value={formData.vat_condition || ""}
                    onChange={(e) => handleInputChange('vat_condition', e.target.value)}
                    disabled={isReadOnly || padronLocked}
                    readOnly={padronLocked}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cost">Costo</Label>
                  <Input
                    id="cost"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.cost || ""}
                    onChange={(e) => handleInputChange('cost', e.target.value ? parseFloat(e.target.value) : undefined)}
                    disabled={isReadOnly}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="account_description">Descripción de Cuenta</Label>
                <Textarea
                  id="account_description"
                  placeholder="Descripción de la cuenta contable"
                  value={formData.account_description || ""}
                  onChange={(e) => handleInputChange('account_description', e.target.value)}
                  disabled={isReadOnly}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="product_service">Producto/Servicio</Label>
                  <Input
                    id="product_service"
                    placeholder="Descripción de productos o servicios"
                    value={formData.product_service || ""}
                    onChange={(e) => handleInputChange('product_service', e.target.value)}
                    disabled={isReadOnly}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="integral_summary_account">Cuenta de Resumen Integral</Label>
                  <Input
                    id="integral_summary_account"
                    placeholder="2.1.1.01"
                    value={formData.integral_summary_account || ""}
                    onChange={(e) => handleInputChange('integral_summary_account', e.target.value)}
                    disabled={isReadOnly}
                  />
                  <p className="text-xs text-muted-foreground">Código de cuenta contable</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Información Adicional */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Información Adicional</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Código *</Label>
                  <Input
                    id="code"
                    placeholder="PROV001"
                    value={formData.code}
                    onChange={(e) => handleInputChange('code', e.target.value)}
                    disabled={isReadOnly}
                    maxLength={20}
                    required
                  />
                  <p className="text-xs text-muted-foreground">Máximo 20 caracteres</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Nombre Comercial *</Label>
                  <Input
                    id="name"
                    placeholder="Nombre de la empresa"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    disabled={isReadOnly || padronLocked}
                    readOnly={padronLocked}
                    maxLength={100}
                    required
                  />
                  <p className="text-xs text-muted-foreground">Máximo 100 caracteres</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="supplier_type">Tipo de Proveedor</Label>
                  <Select
                    value={formData.supplier_type || ""}
                    onValueChange={(value) => handleInputChange('supplier_type', value as 'productivo' | 'no_productivo' | 'otro_pasivo')}
                    disabled={isReadOnly}
                  >
                    <SelectTrigger id="supplier_type">
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="productivo">Productivo</SelectItem>
                      <SelectItem value="no_productivo">No Productivo</SelectItem>
                      <SelectItem value="otro_pasivo">Otro Pasivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment_terms">Términos de Pago (días)</Label>
                  <Input
                    id="payment_terms"
                    type="number"
                    min="0"
                    max="365"
                    placeholder="30"
                    value={formData.payment_terms || ""}
                    onChange={(e) => handleInputChange('payment_terms', e.target.value ? parseInt(e.target.value) : undefined)}
                    disabled={isReadOnly}
                  />
                </div>

                <div className="space-y-2 flex items-end">
                  <div className="flex items-center space-x-2 w-full">
                    <Checkbox
                      id="has_account"
                      checked={formData.has_account ?? true}
                      onCheckedChange={(checked) => handleInputChange('has_account', checked as boolean)}
                      disabled={isReadOnly}
                    />
                    <Label htmlFor="has_account" className="cursor-pointer">
                      Tiene cuenta corriente
                    </Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>


          {/* Información de Contacto */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Información de Contacto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="contact_name">Persona de Contacto</Label>
                <div className="relative">
                  <User className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="contact_name"
                    placeholder="Nombre del contacto"
                    className="pl-8"
                    value={formData.contact_name || ""}
                    onChange={(e) => handleInputChange('contact_name', e.target.value)}
                    disabled={isReadOnly}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="contacto@empresa.com"
                      className="pl-8"
                      value={formData.email || ""}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      disabled={isReadOnly}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <div className="relative">
                    <Phone className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      placeholder="+54 11 1234-5678"
                      className="pl-8"
                      value={formData.phone || ""}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      disabled={isReadOnly}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Información de Ubicación */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ubicación</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">Dirección</Label>
                <div className="relative">
                  <MapPin className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="address"
                    placeholder="Av. Corrientes 1234"
                    className="pl-8"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    disabled={isReadOnly}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">Ciudad</Label>
                  <Input
                    id="city"
                    placeholder="Buenos Aires"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    disabled={isReadOnly}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">País</Label>
                  <Input
                    id="country"
                    placeholder="Argentina"
                    value={formData.country}
                    onChange={(e) => handleInputChange('country', e.target.value)}
                    disabled={isReadOnly}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resumen */}
          {mode === 'view' && (
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    <span className="font-medium">Proveedor:</span>
                  </div>
                  <Badge variant="outline">
                    {formData.code}
                  </Badge>
                </div>
                <p className="text-lg font-semibold mt-2">{formData.name}</p>
                {formData.contact_name && (
                  <p className="text-sm text-muted-foreground">
                    Contacto: {formData.contact_name}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            {isReadOnly ? 'Cerrar' : 'Cancelar'}
          </Button>
          {!isReadOnly && (
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? 'Guardando...' : mode === 'create' ? 'Crear Proveedor' : 'Actualizar Proveedor'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
    {confirmDialog}
    </>
  )
}
