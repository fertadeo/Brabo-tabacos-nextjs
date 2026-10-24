"use client"
import { useCallback, useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useConfirmBeforeClose } from "@/lib/use-confirm-before-close"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { User, Mail, Phone, MapPin, Building, AlertCircle, CheckCircle } from "lucide-react"
import { createCliente } from "@/lib/api"
import { getArcaPadronDisplayName, type ArcaPadronResult } from "@/lib/arca-padron"
import { ArcaPadronCuitField } from "@/components/arca-padron-cuit-field"
import { ClientTaxConditionField } from "@/components/client-tax-condition-field"
import {
  type ClientTaxCondition,
  type ClientPersoneria,
  defaultTaxConditionForPersoneria,
  isTaxConditionAllowedForPersoneria,
  taxConditionFromArcaPadron,
  inferPersoneriaFromArcaPadron,
} from "@/lib/client-tax-condition"
import { SALES_CHANNEL_CONFIG } from "@/lib/utils"
import {
  normalizeClientTaxIdDigits,
  isValidClientTaxId,
  clientTaxIdValidationMessage,
} from "@/lib/client-tax-id"

interface NewClientModalProps {
  isOpen: boolean
  onClose: () => void
  /** Llamado al crear el cliente. Opcionalmente recibe el cliente creado (id, name) si la API lo devuelve. */
  onSuccess?: (created?: { id: number; name: string }) => void
}

interface NewClientData {
  client_type: "minorista" | "mayorista" | "personalizado"
  sales_channel: "woocommerce_minorista" | "woocommerce_mayorista" | "mercadolibre" | "sistema_mf" | "manual" | "otro"
  name: string
  personeria: ClientPersoneria
  tax_condition: ClientTaxCondition
  cuil_cuit: string
  email: string
  phone: string
  address: string
  city: string
  country: string
}

// Solo dígitos del documento fiscal (máx 11)
function onlyDigits(value: string): string {
  return normalizeClientTaxIdDigits(value)
}

export function NewClientModal({ isOpen, onClose, onSuccess }: NewClientModalProps) {
  const [formData, setFormData] = useState<NewClientData>({
    client_type: "minorista",
    sales_channel: "manual",
    name: "",
    personeria: "consumidor_final",
    tax_condition: "consumidor_final",
    cuil_cuit: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    country: "Argentina"
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [padronLocked, setPadronLocked] = useState(false)
  const [padronSuggestedTax, setPadronSuggestedTax] = useState<ClientTaxCondition | undefined>()

  const isManualChannel = formData.sales_channel === "manual"

  useEffect(() => {
    if (!isOpen) setPadronLocked(false)
  }, [isOpen])

  const applyPadron = useCallback((data: ArcaPadronResult) => {
    const name = getArcaPadronDisplayName(data)
    let suggestedTax: ClientTaxCondition | undefined
    setFormData((prev) => {
      const nextPersoneria =
        inferPersoneriaFromArcaPadron(data) ?? data.personeriaSugerida ?? prev.personeria
      suggestedTax = taxConditionFromArcaPadron({
        ...data,
        personeriaSugerida: nextPersoneria,
      })
      let tax_condition = suggestedTax ?? prev.tax_condition
      if (!isTaxConditionAllowedForPersoneria(nextPersoneria, tax_condition)) {
        tax_condition = defaultTaxConditionForPersoneria(nextPersoneria)
      }
      return {
        ...prev,
        name: name || prev.name,
        personeria: nextPersoneria,
        tax_condition,
      }
    })
    setPadronSuggestedTax(suggestedTax)
  }, [])

  const resetPadron = useCallback(() => {
    setPadronLocked(false)
    setPadronSuggestedTax(undefined)
    setFormData((prev) => ({
      ...prev,
      cuil_cuit: "",
      name: "",
      personeria: "consumidor_final",
      tax_condition: "consumidor_final",
    }))
  }, [])

  const handleInputChange = (field: keyof NewClientData, value: string) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value } as NewClientData
      if (field === "personeria") {
        const p = value as ClientPersoneria
        if (!isTaxConditionAllowedForPersoneria(p, next.tax_condition)) {
          next.tax_condition = defaultTaxConditionForPersoneria(p)
        }
      }
      return next
    })
    if (error) setError(null)
  }

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setError("El nombre es obligatorio")
      return false
    }
    if (!isManualChannel) {
      setError("Solo se pueden crear clientes con canal de venta «Manual». Seleccione Manual para completar el formulario.")
      return false
    }
    if (formData.cuil_cuit.trim() && !isValidClientTaxId(formData.cuil_cuit)) {
      setError(clientTaxIdValidationMessage())
      return false
    }
    // Si ingresaron email, validar formato
    if (formData.email.trim() && !formData.email.includes("@")) {
      setError("El email debe tener un formato válido")
      return false
    }
    if (
      formData.cuil_cuit.trim() &&
      !isTaxConditionAllowedForPersoneria(formData.personeria, formData.tax_condition)
    ) {
      setError("Seleccioná la condición frente al IVA acorde a la personería")
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setLoading(true)
    setError(null)

    try {
      const payload = {
        client_type: "minorista" as const,
        sales_channel: formData.sales_channel,
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim() || undefined,
        city: formData.city.trim(),
        country: formData.country.trim(),
        personeria: formData.personeria,
        tax_condition: formData.tax_condition,
        cuil_cuit: formData.cuil_cuit.trim() ? onlyDigits(formData.cuil_cuit) : null
      }
      console.log('📡 [NEW CLIENT] Enviando datos:', payload)
      
      const res = await createCliente(payload)
      const raw = res?.data ?? res
      const created =
        raw && typeof raw === "object" && "id" in raw && "name" in raw
          ? { id: (raw as { id: number }).id, name: String((raw as { name: string }).name) }
          : undefined

      console.log('✅ [NEW CLIENT] Cliente creado exitosamente')

      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        onSuccess?.(created)
        onClose()
        setFormData({
          client_type: "minorista",
          sales_channel: "manual",
          name: "",
          personeria: "consumidor_final",
          tax_condition: "consumidor_final",
          cuil_cuit: "",
          email: "",
          phone: "",
          address: "",
          city: "",
          country: "Argentina"
        })
        setPadronLocked(false)
        setPadronSuggestedTax(undefined)
      }, 1500)

    } catch (err) {
      console.error('💥 [NEW CLIENT] Error al crear cliente:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido al crear el cliente')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setError(null)
      setSuccess(false)
      setPadronLocked(false)
      onClose()
    }
  }

  const [handleOpenChange, confirmDialog] = useConfirmBeforeClose((open) => {
    if (!open) handleClose()
  })

  return (
    <>
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Nuevo Cliente
          </DialogTitle>
          <DialogDescription>
            Complete la información del nuevo cliente para agregarlo al sistema
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información Personal */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Información Personal</CardTitle>
              <CardDescription>Datos básicos del cliente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sales_channel">Canal de Venta</Label>
                  <Select
                    value={formData.sales_channel}
                    onValueChange={(value) => handleInputChange("sales_channel", value)}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona el canal" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">
                        <div className="flex items-center gap-2">
                          <span>{SALES_CHANNEL_CONFIG.manual?.icon}</span>
                          <span>{SALES_CHANNEL_CONFIG.manual?.label ?? "Manual"}</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="personeria">Personería</Label>
                  <Select
                    value={formData.personeria}
                    onValueChange={(value: ClientPersoneria) => handleInputChange("personeria", value)}
                    disabled={loading || !isManualChannel || padronLocked}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="consumidor_final">Consumidor final</SelectItem>
                      <SelectItem value="persona_fisica">Persona física</SelectItem>
                      <SelectItem value="persona_juridica">Persona jurídica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="name">Nombre / Razón social *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="Nombre o razón social"
                    disabled={loading || !isManualChannel || padronLocked}
                    className="w-full"
                  />
                </div>
                <div className="md:col-span-2">
                  <ArcaPadronCuitField
                    entityType="client"
                    cuitValue={formData.cuil_cuit}
                    onCuitChange={(v) => handleInputChange("cuil_cuit", v)}
                    onApplyPadron={applyPadron}
                    onPadronLockChange={setPadronLocked}
                    onPadronReset={resetPadron}
                    disabled={loading || !isManualChannel}
                    inputId="cuil_cuit"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <ClientTaxConditionField
                    key={`${formData.personeria}-${formData.tax_condition}`}
                    personeria={formData.personeria}
                    value={formData.tax_condition}
                    onChange={(tax_condition) =>
                      setFormData((prev) => ({ ...prev, tax_condition }))
                    }
                    disabled={loading || !isManualChannel || padronLocked}
                    padronSuggested={padronSuggestedTax}
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
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      placeholder="Correo electrónico"
                      className="pl-8"
                      disabled={loading || !isManualChannel}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <div className="relative">
                    <Phone className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                      placeholder="Teléfono de contacto"
                      className="pl-8"
                      disabled={loading || !isManualChannel}
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
              <CardDescription>Dirección y datos de localización</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">Dirección</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  placeholder="Dirección"
                  disabled={loading || !isManualChannel}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">Ciudad</Label>
                  <div className="relative">
                    <MapPin className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => handleInputChange("city", e.target.value)}
                      placeholder="Ciudad"
                      className="pl-8"
                      disabled={loading || !isManualChannel}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">País</Label>
                  <div className="relative">
                    <Building className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="country"
                      value={formData.country}
                      onChange={(e) => handleInputChange("country", e.target.value)}
                      placeholder="País"
                      className="pl-8"
                      disabled={loading || !isManualChannel}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>


          {/* Mensajes de Error y Éxito */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-red-700">{error}</span>
            </div>
          )}

          {success && (
            <div className="p-4 bg-turquoise-50 border border-turquoise-200 rounded-lg flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-turquoise-500" />
              <span className="text-turquoise-700">Cliente creado exitosamente</span>
            </div>
          )}

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !isManualChannel}
              className="min-w-[120px]"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creando...
                </>
              ) : (
                "Crear Cliente"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    {confirmDialog}
    </>
  )
}
