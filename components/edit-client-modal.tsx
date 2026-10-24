"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Building,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  IdCard
} from "lucide-react"
import { getClienteById, updateCliente, type Cliente } from "@/lib/api"
import { toast } from "sonner"
import { getArcaPadronDisplayName, type ArcaPadronResult } from "@/lib/arca-padron"
import { ArcaPadronCuitField } from "@/components/arca-padron-cuit-field"
import { ClientTaxConditionField } from "@/components/client-tax-condition-field"
import {
  type ClientTaxCondition,
  type ClientPersoneria,
  defaultTaxConditionForPersoneria,
  isTaxConditionAllowedForPersoneria,
  normalizeTaxConditionFromApi,
  taxConditionFromArcaPadron,
  inferPersoneriaFromArcaPadron,
} from "@/lib/client-tax-condition"
import type { ClienteUI } from "@/lib/cliente-ui-map"
import type { SalesChannel } from "@/lib/utils"
import { useConfirmBeforeClose } from "@/lib/use-confirm-before-close"
import {
  normalizeClientTaxIdDigits,
  isValidClientTaxId,
  formatClientTaxIdDisplay,
  clientTaxIdValidationMessage,
} from "@/lib/client-tax-id"

interface EditClientData {
  client_type: "minorista" | "mayorista" | "personalizado"
  sales_channel: SalesChannel
  name: string
  email: string
  phone: string
  address: string
  city: string
  country: string
  personeria: ClientPersoneria
  tax_condition: ClientTaxCondition
  cuil_cuit: string
}

function coerceFormText(value: string | null | undefined): string {
  return (value ?? "").trim()
}

interface EditClientModalProps {
  cliente: ClienteUI | null
  isOpen: boolean
  onClose: () => void
  onSuccess?: (updated: Cliente) => void
}

function personeriaFromUi(cliente: ClienteUI): ClientPersoneria {
  if (
    cliente.personeria === "persona_fisica" ||
    cliente.personeria === "persona_juridica" ||
    cliente.personeria === "consumidor_final"
  ) {
    return cliente.personeria
  }
  if (cliente.personType === "Persona Jurídica") return "persona_juridica"
  if (cliente.personType === "Persona Física") return "persona_fisica"
  return "consumidor_final"
}

function taxConditionFromUi(cliente: ClienteUI, personeria: ClientPersoneria): ClientTaxCondition {
  const tax =
    cliente.taxConditionCode ??
    normalizeTaxConditionFromApi(cliente.taxCondition) ??
    defaultTaxConditionForPersoneria(personeria)
  return isTaxConditionAllowedForPersoneria(personeria, tax)
    ? tax
    : defaultTaxConditionForPersoneria(personeria)
}

function buildEditFormFromUi(cliente: ClienteUI): EditClientData {
  const personeria = personeriaFromUi(cliente)
  const cuilRaw = cliente.cuit ?? ""
  const cuilDisplay = formatClientTaxIdDisplay(cuilRaw)
  return {
    client_type: cliente.tipo.toLowerCase() as "minorista" | "mayorista" | "personalizado",
    sales_channel: cliente.salesChannel ?? "manual",
    name: coerceFormText(cliente.nombre),
    email: coerceFormText(cliente.email),
    phone: coerceFormText(cliente.telefono),
    address: coerceFormText(cliente.direccion),
    city: coerceFormText(cliente.ciudad),
    country: "Argentina",
    personeria,
    tax_condition: taxConditionFromUi(cliente, personeria),
    cuil_cuit: cuilDisplay,
  }
}

function normalizeEditFormForCompare(data: EditClientData): EditClientData {
  return {
    ...data,
    name: coerceFormText(data.name),
    email: coerceFormText(data.email),
    phone: coerceFormText(data.phone),
    address: coerceFormText(data.address),
    city: coerceFormText(data.city),
    country: coerceFormText(data.country),
    cuil_cuit: normalizeClientTaxIdDigits(data.cuil_cuit),
  }
}

function editFormsEqual(a: EditClientData, b: EditClientData): boolean {
  return (
    JSON.stringify(normalizeEditFormForCompare(a)) ===
    JSON.stringify(normalizeEditFormForCompare(b))
  )
}

function buildEditFormFromApi(cliente: Cliente): EditClientData {
  const personeria: ClientPersoneria =
    cliente.personeria === "persona_fisica" ||
    cliente.personeria === "persona_juridica" ||
    cliente.personeria === "consumidor_final"
      ? cliente.personeria
      : cliente.person_type === "persona_juridica"
        ? "persona_juridica"
        : cliente.person_type === "persona_fisica"
          ? "persona_fisica"
          : "consumidor_final"
  const cuilRaw = cliente.cuil_cuit ?? cliente.primary_tax_id ?? ""
  const cuilDisplay = formatClientTaxIdDisplay(cuilRaw)
  const tax_condition =
    normalizeTaxConditionFromApi(cliente.tax_condition) ?? defaultTaxConditionForPersoneria(personeria)
  return {
    client_type: cliente.client_type,
    sales_channel: cliente.sales_channel,
    name: coerceFormText(cliente.name),
    email: coerceFormText(cliente.email),
    phone: coerceFormText(cliente.phone),
    address: coerceFormText(cliente.address),
    city: coerceFormText(cliente.city),
    country: coerceFormText(cliente.country) || "Argentina",
    personeria,
    tax_condition: isTaxConditionAllowedForPersoneria(personeria, tax_condition)
      ? tax_condition
      : defaultTaxConditionForPersoneria(personeria),
    cuil_cuit: cuilDisplay,
  }
}

export function EditClientModal({ cliente, isOpen, onClose, onSuccess }: EditClientModalProps) {
  const [formData, setFormData] = useState<EditClientData>({
    client_type: "minorista",
    sales_channel: "manual",
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    country: "Argentina",
    personeria: "consumidor_final",
    tax_condition: "consumidor_final",
    cuil_cuit: ""
  })

  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [successMessage, setSuccessMessage] = useState("")
  const [padronLocked, setPadronLocked] = useState(false)
  const [padronSuggestedTax, setPadronSuggestedTax] = useState<ClientTaxCondition | undefined>()
  const [loadingCliente, setLoadingCliente] = useState(false)
  const [savedSnapshot, setSavedSnapshot] = useState<EditClientData | null>(null)
  const loadedForDbIdRef = useRef<number | null>(null)
  const clienteRef = useRef(cliente)
  const formDataRef = useRef(formData)
  const savedSnapshotRef = useRef(savedSnapshot)
  clienteRef.current = cliente
  formDataRef.current = formData
  savedSnapshotRef.current = savedSnapshot

  const isDirty = useMemo(() => {
    if (!savedSnapshot) return false
    return !editFormsEqual(formData, savedSnapshot)
  }, [formData, savedSnapshot])

  // Cargar datos frescos del cliente al abrir (evita props desactualizadas y resets al re-renderizar)
  useEffect(() => {
    if (!isOpen || !cliente?.dbId) {
      if (!isOpen) {
        loadedForDbIdRef.current = null
        setSavedSnapshot(null)
        setLoadingCliente(false)
      }
      return
    }

    setErrors({})
    setSuccessMessage("")
    setPadronLocked(false)
    setPadronSuggestedTax(undefined)

    if (loadedForDbIdRef.current === cliente.dbId) return

    const snapshot = clienteRef.current
    if (snapshot) {
      const uiForm = buildEditFormFromUi(snapshot)
      setFormData(uiForm)
      setSavedSnapshot(uiForm)
    }

    let cancelled = false
    setLoadingCliente(true)

    void (async () => {
      try {
        const fresh = await getClienteById(cliente.dbId)
        if (cancelled) return
        const freshForm = buildEditFormFromApi(fresh)
        const baseline = savedSnapshotRef.current
        const userEdited =
          baseline != null && !editFormsEqual(formDataRef.current, baseline)
        if (!userEdited) {
          setFormData(freshForm)
          setSavedSnapshot(freshForm)
        }
      } catch {
        if (cancelled) return
        if (snapshot) {
          const fallbackForm = buildEditFormFromUi(snapshot)
          setFormData(fallbackForm)
          setSavedSnapshot(fallbackForm)
        }
      } finally {
        loadedForDbIdRef.current = cliente.dbId
        if (!cancelled) setLoadingCliente(false)
      }
    })()

    return () => {
      cancelled = true
      setLoadingCliente(false)
    }
  }, [isOpen, cliente?.dbId])

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
    setErrors((prev) => {
      const next = { ...prev }
      delete next.cuil_cuit
      delete next.name
      delete next.personeria
      delete next.tax_condition
      return next
    })
  }, [])

  const resetPadron = useCallback(() => {
    setPadronLocked(false)
    setPadronSuggestedTax(undefined)
    setFormData((prev) => ({
      ...prev,
      cuil_cuit: "",
    }))
  }, [])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!coerceFormText(formData.name)) {
      newErrors.name = "El nombre es requerido"
    } else if (coerceFormText(formData.name).length < 2) {
      newErrors.name = "El nombre debe tener al menos 2 caracteres"
    }

    const email = coerceFormText(formData.email)
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "El formato del email no es válido"
    }

    const phone = coerceFormText(formData.phone)
    if (phone && phone.length < 8) {
      newErrors.phone = "El teléfono debe tener al menos 8 dígitos"
    }

    const cuil = coerceFormText(formData.cuil_cuit)
    if (cuil && !isValidClientTaxId(cuil)) {
      newErrors.cuil_cuit = clientTaxIdValidationMessage()
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!cliente) return

    if (!validateForm()) {
      toast.error("Revisá los campos marcados antes de guardar")
      return
    }

    if (!cliente.dbId || !Number.isFinite(cliente.dbId)) {
      toast.error("No se pudo identificar el cliente a actualizar")
      return
    }

    setIsLoading(true)
    setErrors({})

    try {
      const payload = {
        client_type: formData.client_type,
        sales_channel: formData.sales_channel,
        name: coerceFormText(formData.name),
        email: coerceFormText(formData.email),
        phone: coerceFormText(formData.phone),
        address: coerceFormText(formData.address) || undefined,
        city: coerceFormText(formData.city),
        country: coerceFormText(formData.country),
        personeria: formData.personeria,
        tax_condition: formData.tax_condition,
        cuil_cuit: coerceFormText(formData.cuil_cuit)
          ? normalizeClientTaxIdDigits(formData.cuil_cuit)
          : null
      }
      console.log('📝 [EDIT] Enviando datos de actualización:', { clienteId: cliente.dbId, payload })

      const updated = await updateCliente(cliente.dbId, payload)
      loadedForDbIdRef.current = null
      setSavedSnapshot(formData)

      setSuccessMessage("Cliente actualizado exitosamente")
      toast.success("Cliente actualizado")

      setTimeout(() => {
        onSuccess?.(updated)
        onClose()
      }, 800)

    } catch (error) {
      console.error('💥 [EDIT] Error al actualizar cliente:', error)
      const msg = error instanceof Error ? error.message : "Error al actualizar el cliente"
      toast.error(msg)
      setErrors(prev => {
        const next = { ...prev, submit: msg }
        if (msg.toLowerCase().includes("cuil") || msg.toLowerCase().includes("cuit")) next.cuil_cuit = msg
        if (msg.toLowerCase().includes("personeria") || msg.toLowerCase().includes("personería")) next.personeria = msg
        return next
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: keyof EditClientData, value: string) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value } as EditClientData
      if (field === "personeria") {
        const p = value as ClientPersoneria
        if (!isTaxConditionAllowedForPersoneria(p, next.tax_condition)) {
          next.tax_condition = defaultTaxConditionForPersoneria(p)
        }
      }
      return next
    })
    
    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const [handleOpenChange, confirmDialog] = useConfirmBeforeClose(
    (open) => {
      if (!open) onClose()
    },
    "¿Descartar cambios?",
    "Hay modificaciones sin guardar en este cliente."
  )

  if (!cliente) return null

  return (
    <>
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (open) {
          handleOpenChange(open)
          return
        }
        if (isDirty) {
          handleOpenChange(false)
          return
        }
        onClose()
      }}
    >
      <DialogContent className="w-[95vw] max-w-4xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="p-2 bg-turquoise-100 dark:bg-turquoise-900/20 rounded-lg">
              <User className="h-5 w-5 text-turquoise-600 dark:text-turquoise-400" />
            </div>
            Editar Cliente: {cliente.nombre}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información Básica */}
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-1.5 bg-turquoise-100 dark:bg-turquoise-900/20 rounded-md">
                  <User className="h-4 w-4 text-turquoise-600 dark:text-turquoise-400" />
                </div>
                Información Básica
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="client_type" className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-gray-500" />
                    Tipo de Cliente
                  </Label>
                  <Select 
                    value={formData.client_type} 
                    onValueChange={(value: "minorista" | "mayorista" | "personalizado") => 
                      handleInputChange("client_type", value)
                    }
                  >
                    <SelectTrigger className={errors.client_type ? "border-red-500" : ""}>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minorista">Minorista</SelectItem>
                      <SelectItem value="mayorista">Mayorista</SelectItem>
                      <SelectItem value="personalizado">Personalizado</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.client_type && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.client_type}
                    </p>
                  )}
                </div>

              </div>

              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  Nombre / Razón social *
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Nombre o razón social"
                  className={`w-full ${errors.name ? "border-red-500" : ""}`}
                  disabled={isLoading}
                />
                {errors.name && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.name}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    placeholder="Ej: maria.gonzalez@gmail.com"
                    className={errors.email ? "border-red-500" : ""}
                  />
                  {errors.email && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.email}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    Teléfono
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    placeholder="Ej: +54 11 4567-8900"
                    className={errors.phone ? "border-red-500" : ""}
                  />
                  {errors.phone && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.phone}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="personeria" className="flex items-center gap-2">
                    <IdCard className="h-4 w-4 text-gray-500" />
                    Personería
                  </Label>
                  <Select
                    value={formData.personeria}
                    onValueChange={(value: ClientPersoneria) => handleInputChange("personeria", value)}
                    disabled={isLoading}
                  >
                    <SelectTrigger className={errors.personeria ? "border-red-500" : ""}>
                      <SelectValue placeholder="Seleccionar personería" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="consumidor_final">Consumidor final</SelectItem>
                      <SelectItem value="persona_fisica">Persona física</SelectItem>
                      <SelectItem value="persona_juridica">Persona jurídica</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.personeria && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.personeria}
                    </p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <ArcaPadronCuitField
                    entityType="client"
                    cuitValue={formData.cuil_cuit}
                    onCuitChange={(v) => handleInputChange("cuil_cuit", v)}
                    onApplyPadron={applyPadron}
                    onPadronLockChange={setPadronLocked}
                    onPadronReset={resetPadron}
                    disabled={isLoading}
                    inputId="cuil_cuit"
                    label="CUIL / CUIT / DNI"
                  />
                  {errors.cuil_cuit && (
                    <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.cuil_cuit}
                    </p>
                  )}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <ClientTaxConditionField
                    key={`${formData.personeria}-${formData.tax_condition}`}
                    personeria={formData.personeria}
                    value={formData.tax_condition}
                    onChange={(tax_condition) =>
                      setFormData((prev) => ({ ...prev, tax_condition }))
                    }
                    disabled={isLoading}
                    padronSuggested={padronSuggestedTax}
                    error={errors.tax_condition}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Información de Ubicación */}
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-1.5 bg-turquoise-100 dark:bg-turquoise-900/20 rounded-md">
                  <MapPin className="h-4 w-4 text-turquoise-600 dark:text-turquoise-400" />
                </div>
                Información de Ubicación
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  Dirección
                </Label>
                <Input
                  id="address"
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  placeholder="Ej: Av. Industrial 567, Zona Tecnológica"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    Ciudad
                  </Label>
                  <Input
                    id="city"
                    type="text"
                    value={formData.city}
                    onChange={(e) => handleInputChange("city", e.target.value)}
                    placeholder="Ej: Córdoba"
                    className={errors.city ? "border-red-500" : ""}
                  />
                  {errors.city && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.city}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    País
                  </Label>
                  <Input
                    id="country"
                    type="text"
                    value={formData.country}
                    onChange={(e) => handleInputChange("country", e.target.value)}
                    placeholder="Ej: Argentina"
                    className={errors.country ? "border-red-500" : ""}
                  />
                  {errors.country && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.country}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mensajes de Error y Éxito */}
          {errors.submit && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center gap-2 p-3 bg-turquoise-50 dark:bg-turquoise-900/20 border border-turquoise-200 dark:border-turquoise-800 rounded-lg">
              <CheckCircle className="h-4 w-4 text-turquoise-600 dark:text-turquoise-400 flex-shrink-0" />
              <p className="text-sm text-turquoise-600 dark:text-turquoise-400">{successMessage}</p>
            </div>
          )}

          <Separator />

          {/* Botones de Acción */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !isDirty}
              className="flex items-center gap-2 bg-turquoise-600 hover:bg-turquoise-700"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Actualizando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {loadingCliente ? "Guardar Cambios…" : "Guardar Cambios"}
                </>
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
