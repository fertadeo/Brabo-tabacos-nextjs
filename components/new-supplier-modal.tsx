"use client"
import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useConfirmBeforeClose } from "@/lib/use-confirm-before-close"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Truck, Mail, Phone, MapPin, Building, AlertCircle, CheckCircle, User } from "lucide-react"
import { createProveedor } from "@/lib/api"

interface NewSupplierModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface NewSupplierData {
  name: string
  email: string
  phone: string
  address: string
  city: string
  country: string
  contact_person: string
  tax_id: string
}

export function NewSupplierModal({ isOpen, onClose, onSuccess }: NewSupplierModalProps) {
  const [formData, setFormData] = useState<NewSupplierData>({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    country: "Argentina",
    contact_person: "",
    tax_id: ""
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleInputChange = (field: keyof NewSupplierData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    // Limpiar errores cuando el usuario empiece a escribir
    if (error) setError(null)
  }

  const validateForm = (): boolean => {
    const errors: string[] = []

    if (!formData.name.trim()) errors.push("El nombre es obligatorio")
    if (!formData.email.trim()) errors.push("El email es obligatorio")
    if (!formData.phone.trim()) errors.push("El teléfono es obligatorio")
    if (!formData.city.trim()) errors.push("La ciudad es obligatoria")
    if (!formData.country.trim()) errors.push("El país es obligatorio")

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (formData.email && !emailRegex.test(formData.email)) {
      errors.push("El formato del email no es válido")
    }

    if (errors.length > 0) {
      setError(errors.join(", "))
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    try {
      setLoading(true)
      setError(null)

      console.log('📋 [MODAL] Enviando datos del proveedor:', formData)

      const response = await createProveedor(formData)
      console.log('✅ [MODAL] Proveedor creado exitosamente:', response)

      setSuccess(true)
      
      // Cerrar modal después de un breve delay para mostrar el mensaje de éxito
      setTimeout(() => {
        setSuccess(false)
        setFormData({
          name: "",
          email: "",
          phone: "",
          address: "",
          city: "",
          country: "Argentina",
          contact_person: "",
          tax_id: ""
        })
        onSuccess()
        onClose()
      }, 1500)

    } catch (err) {
      console.error('💥 [MODAL] Error al crear proveedor:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido al crear el proveedor')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setFormData({
        name: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        country: "Argentina",
        contact_person: "",
        tax_id: ""
      })
      setError(null)
      setSuccess(false)
      onClose()
    }
  }

  const [handleOpenChange, confirmDialog] = useConfirmBeforeClose((open) => {
    if (!open) handleClose()
  })

  return (
    <>
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            Nuevo Proveedor
          </DialogTitle>
          <DialogDescription>
            Agrega un nuevo proveedor a tu base de datos. Completa todos los campos obligatorios.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center justify-center py-8">
            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
            <h3 className="text-lg font-semibold text-green-700 mb-2">¡Proveedor creado exitosamente!</h3>
            <p className="text-muted-foreground text-center">
              El proveedor ha sido agregado a tu base de datos.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Información Básica */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building className="h-4 w-4" />
                  Información Básica
                </CardTitle>
                <CardDescription>
                  Datos principales del proveedor
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium">
                      Nombre del Proveedor *
                    </Label>
                    <Input
                      id="name"
                      placeholder="Ej: Distribuidora Tech Solutions"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      disabled={loading}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">
                      Email *
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="contacto@proveedor.com"
                        value={formData.email}
                        onChange={(e) => handleInputChange("email", e.target.value)}
                        disabled={loading}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium">
                      Teléfono *
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        placeholder="+54 9 11 1234-5678"
                        value={formData.phone}
                        onChange={(e) => handleInputChange("phone", e.target.value)}
                        disabled={loading}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact_person" className="text-sm font-medium">
                      Persona de Contacto
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="contact_person"
                        placeholder="Juan Pérez"
                        value={formData.contact_person}
                        onChange={(e) => handleInputChange("contact_person", e.target.value)}
                        disabled={loading}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tax_id" className="text-sm font-medium">
                      CUIT/CUIL
                    </Label>
                    <Input
                      id="tax_id"
                      placeholder="20-12345678-9"
                      value={formData.tax_id}
                      onChange={(e) => handleInputChange("tax_id", e.target.value)}
                      disabled={loading}
                      className="w-full"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Ubicación */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MapPin className="h-4 w-4" />
                  Ubicación
                </CardTitle>
                <CardDescription>
                  Dirección y ubicación del proveedor
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="address" className="text-sm font-medium">
                    Dirección
                  </Label>
                  <Input
                    id="address"
                    placeholder="Av. Corrientes 1234"
                    value={formData.address}
                    onChange={(e) => handleInputChange("address", e.target.value)}
                    disabled={loading}
                    className="w-full"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city" className="text-sm font-medium">
                      Ciudad *
                    </Label>
                    <Input
                      id="city"
                      placeholder="Buenos Aires"
                      value={formData.city}
                      onChange={(e) => handleInputChange("city", e.target.value)}
                      disabled={loading}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="country" className="text-sm font-medium">
                      País *
                    </Label>
                    <Input
                      id="country"
                      placeholder="Argentina"
                      value={formData.country}
                      onChange={(e) => handleInputChange("country", e.target.value)}
                      disabled={loading}
                      className="w-full"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                <span className="text-red-700 text-sm">{error}</span>
              </div>
            )}

            {/* Form Actions */}
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
                disabled={loading}
                className="min-w-[120px]"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creando...
                  </>
                ) : (
                  <>
                    <Truck className="h-4 w-4 mr-2" />
                    Crear Proveedor
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
    {confirmDialog}
    </>
  )
}
