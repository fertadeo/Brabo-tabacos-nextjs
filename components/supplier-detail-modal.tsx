"use client"

import { useState, useEffect, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useConfirmBeforeClose } from "@/lib/use-confirm-before-close"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Building2,
  ShoppingCart, 
  FileText, 
  Truck,
  CreditCard,
  Link2,
  TrendingUp,
  DollarSign,
  Eye,
  CheckCircle,
  AlertCircle,
  Plus,
  Wallet
} from "lucide-react"
import { type Supplier, getPurchases, type Purchase } from "@/lib/api"
import { SupplierInvoiceModal } from "@/components/supplier-invoice-modal"
import { AccruedExpenseModal } from "@/components/accrued-expense-modal"
import { AccruedLiabilityModal } from "@/components/accrued-liability-modal"

interface SupplierDetailModalProps {
  supplier: Supplier | null
  isOpen: boolean
  onClose: () => void
  onEdit?: () => void
  onRefresh?: () => void
}

export function SupplierDetailModal({ supplier, isOpen, onClose, onEdit, onRefresh }: SupplierDetailModalProps) {
  const [activeTab, setActiveTab] = useState<string>("resumen")
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false)
  const [isAccruedExpenseModalOpen, setIsAccruedExpenseModalOpen] = useState(false)
  const [isAccruedLiabilityModalOpen, setIsAccruedLiabilityModalOpen] = useState(false)
  const [supplierPurchases, setSupplierPurchases] = useState<Purchase[]>([])
  const [loadingPurchases, setLoadingPurchases] = useState(false)

  const [handleOpenChange, confirmDialog] = useConfirmBeforeClose((open) => {
    if (!open) onClose()
  })

  useEffect(() => {
    if (!isOpen || !supplier) {
      setSupplierPurchases([])
      return
    }
    let cancelled = false
    setLoadingPurchases(true)
    getPurchases({ supplier_id: supplier.id, all: true })
      .then((res) => {
        if (cancelled) return
        if (res.success && Array.isArray(res.data?.purchases)) {
          setSupplierPurchases(res.data.purchases)
        } else {
          setSupplierPurchases([])
        }
      })
      .catch(() => {
        if (!cancelled) setSupplierPurchases([])
      })
      .finally(() => {
        if (!cancelled) setLoadingPurchases(false)
      })
    return () => {
      cancelled = true
    }
  }, [isOpen, supplier?.id])

  const ocStats = useMemo(() => {
    const count = supplierPurchases.length
    const total = supplierPurchases.reduce((s, p) => s + (Number(p.total_amount) || 0), 0)
    const commitment = supplierPurchases.reduce((s, p) => s + (Number(p.commitment_amount) || 0), 0)
    const debt = supplierPurchases.reduce((s, p) => s + (Number(p.debt_amount) || 0), 0)
    const pending = supplierPurchases
      .filter((p) => p.status === "pending")
      .reduce((s, p) => s + (Number(p.total_amount) || 0), 0)
    return { count, total, commitment, debt, pending }
  }, [supplierPurchases])

  if (!supplier) return null

  // Determinar tipo de proveedor
  const isProductivo = supplier.supplier_type === 'productivo'
  const isNoProductivo = supplier.supplier_type === 'no_productivo'
  const isOtroPasivo = supplier.supplier_type === 'otro_pasivo'

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR')
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      pending: { label: "Pendiente", variant: "secondary" },
      received: { label: "Recibida", variant: "default" },
      paid: { label: "Pagada", variant: "default" },
      validated: { label: "Validada", variant: "default" },
      complete: { label: "Completa", variant: "default" },
      pending_payment: { label: "Pago Pendiente", variant: "secondary" }
    }
    const config = statusMap[status] || { label: status, variant: "outline" }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getDebtTypeBadge = (debtType?: string | null) => {
    if (!debtType) {
      return (
        <Badge variant="outline" className="text-muted-foreground">
          Sin tipo
        </Badge>
      )
    }
    if (debtType === "compromiso") {
      return <Badge className="bg-blue-500 hover:bg-blue-600 text-white">Compromiso</Badge>
    }
    if (debtType === "deuda_directa") {
      return <Badge className="bg-orange-500 hover:bg-orange-600 text-white">Deuda Directa</Badge>
    }
    return <Badge variant="outline">{debtType}</Badge>
  }

  // Resumen cuenta corriente: alineado a órdenes de compra reales; pagos/movimientos detallados pendientes de API
  const totalCommitment = ocStats.commitment
  const totalDebt = ocStats.debt
  const totalPayments = 0
  const currentBalance = ocStats.total

  return (
    <>
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[95vw] max-w-7xl h-[95vh] max-h-[95vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5" />
              {supplier.legal_name || supplier.name}
          </DialogTitle>
            {onEdit && (
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Eye className="h-4 w-4 mr-2" />
                Editar
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Tabs de navegación */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 py-2 border-b bg-background">
            <TabsList className={`grid w-full ${isOtroPasivo ? 'grid-cols-4' : isNoProductivo ? 'grid-cols-7' : 'grid-cols-6'}`}>
              <TabsTrigger value="resumen" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">Resumen</span>
              </TabsTrigger>
              {!isOtroPasivo && (
                <>
                  <TabsTrigger value="oc" className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    <span className="hidden sm:inline">Órdenes</span>
                  </TabsTrigger>
                  <TabsTrigger value="facturas" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span className="hidden sm:inline">Facturas</span>
                  </TabsTrigger>
                  {isProductivo && (
                    <TabsTrigger value="remitos" className="flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      <span className="hidden sm:inline">Remitos</span>
                    </TabsTrigger>
                  )}
                </>
              )}
              {isNoProductivo && (
                <TabsTrigger value="egresos" className="flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  <span className="hidden sm:inline">Egresos</span>
                </TabsTrigger>
              )}
              {isOtroPasivo && (
                <TabsTrigger value="pasivos" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">Pasivos</span>
                </TabsTrigger>
              )}
              <TabsTrigger value="cuenta-corriente" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                <span className="hidden sm:inline">Cuenta</span>
              </TabsTrigger>
              {isProductivo && (
                <TabsTrigger value="trazabilidad" className="flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Trazabilidad</span>
                </TabsTrigger>
              )}
            </TabsList>
              </div>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            {/* Tab: Resumen */}
            <TabsContent value="resumen" className="space-y-4 mt-0">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total OC</CardTitle>
                    <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                    <div className="text-2xl font-bold">{ocStats.count}</div>
                <p className="text-xs text-muted-foreground">
                      {formatCurrency(ocStats.total)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Compromiso</CardTitle>
                    <DollarSign className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {formatCurrency(ocStats.commitment)}
                    </div>
                    <p className="text-xs text-muted-foreground">En compromiso (OC)</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Deuda</CardTitle>
                    <AlertCircle className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                    <div className="text-2xl font-bold text-orange-600">
                      {formatCurrency(ocStats.debt)}
                    </div>
                    <p className="text-xs text-muted-foreground">Deuda en OC</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(ocStats.pending)}
                    </div>
                    <p className="text-xs text-muted-foreground">Monto en OC con estado pendiente</p>
              </CardContent>
            </Card>
          </div>

              {/* Información del Proveedor */}
              <Card>
                <CardHeader>
                  <CardTitle>Información del Proveedor</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Código</p>
                      <p className="text-base font-semibold">{supplier.code}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Tipo</p>
                      <p className="text-base">
                        {supplier.supplier_type ? (
                          <Badge variant="outline">
                            {supplier.supplier_type === 'productivo' ? 'Productivo' :
                             supplier.supplier_type === 'no_productivo' ? 'No Productivo' : 'Otro Pasivo'}
                          </Badge>
                        ) : '-'}
                      </p>
                    </div>
                    {supplier.legal_name && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Razón Social</p>
                        <p className="text-base">{supplier.legal_name}</p>
                  </div>
                    )}
                    {supplier.trade_name && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Nombre de Fantasía</p>
                        <p className="text-base">{supplier.trade_name}</p>
                    </div>
                    )}
                    {supplier.contact_name && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Contacto</p>
                        <p className="text-base">{supplier.contact_name}</p>
                      </div>
                    )}
                    {supplier.email && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Email</p>
                        <p className="text-base">{supplier.email}</p>
                    </div>
                  )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Órdenes de Compra */}
            <TabsContent value="oc" className="space-y-4 mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Órdenes de Compra</CardTitle>
                  <CardDescription>Lista de órdenes de compra con indicadores de compromiso/deuda</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>OC</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Compromiso</TableHead>
                        <TableHead>Deuda</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Items</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingPurchases ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            Cargando órdenes de compra…
                          </TableCell>
                        </TableRow>
                      ) : supplierPurchases.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            Sin órdenes de compra para este proveedor.
                          </TableCell>
                        </TableRow>
                      ) : (
                        supplierPurchases.map((oc) => (
                          <TableRow key={oc.id}>
                            <TableCell className="font-medium">{oc.purchase_number}</TableCell>
                            <TableCell>{formatDate(oc.purchase_date)}</TableCell>
                            <TableCell>{getDebtTypeBadge(oc.debt_type)}</TableCell>
                            <TableCell>
                              {(Number(oc.commitment_amount) || 0) > 0 ? (
                                <span className="text-blue-600 font-medium">
                                  {formatCurrency(Number(oc.commitment_amount))}
                                </span>
                              ) : (
                                "-"
                              )}
                            </TableCell>
                            <TableCell>
                              {(Number(oc.debt_amount) || 0) > 0 ? (
                                <span className="text-orange-600 font-medium">
                                  {formatCurrency(Number(oc.debt_amount))}
                                </span>
                              ) : (
                                "-"
                              )}
                            </TableCell>
                            <TableCell className="font-semibold">
                              {formatCurrency(Number(oc.total_amount) || 0)}
                            </TableCell>
                            <TableCell>{getStatusBadge(oc.status)}</TableCell>
                            <TableCell className="text-muted-foreground">—</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Facturas */}
            <TabsContent value="facturas" className="space-y-4 mt-0">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Facturas</CardTitle>
                      <CardDescription>
                        {isProductivo 
                          ? "Facturas con códigos de materiales" 
                          : "Facturas (pueden existir sin OC previa)"}
                      </CardDescription>
                    </div>
                    <Button 
                      onClick={() => setIsInvoiceModalOpen(true)}
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Nueva Factura
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Factura</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Vencimiento</TableHead>
                        <TableHead>OC Relacionada</TableHead>
                        <TableHead>Materiales</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-10 text-muted-foreground text-sm">
                          Sin facturas cargadas. Los datos provendrán del backend al integrar el listado de facturas del
                          proveedor.
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Remitos (Solo Productivos) */}
            {isProductivo && (
              <TabsContent value="remitos" className="space-y-4 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Remitos de Entrega</CardTitle>
                    <CardDescription>Remitos con validación de coincidencia</CardDescription>
                  </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Remito</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>OC Relacionada</TableHead>
                        <TableHead>Factura Relacionada</TableHead>
                        <TableHead>Validación</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-10 text-muted-foreground text-sm">
                          Sin remitos. Integrar remitos de entrega vinculados a este proveedor desde el backend.
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              </TabsContent>
            )}

            {/* Tab: Egresos Devengados (Solo No Productivos) */}
            {isNoProductivo && (
              <TabsContent value="egresos" className="space-y-4 mt-0">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Egresos Devengados</CardTitle>
                        <CardDescription>Compromisos o devengamientos sin factura (seguros, impuestos, alquileres)</CardDescription>
                      </div>
                      <Button 
                        onClick={() => setIsAccruedExpenseModalOpen(true)}
                        size="sm"
                        variant="outline"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Nuevo Egreso
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground py-8 text-center">
                      Sin egresos devengados registrados. Usá &quot;Nuevo Egreso&quot; o integrá el listado desde el
                      backend.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Tab: Pasivos Devengados (Solo Otros Pasivos) */}
            {isOtroPasivo && (
              <TabsContent value="pasivos" className="space-y-4 mt-0">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Pasivos Devengados</CardTitle>
                        <CardDescription>Obligaciones no derivadas de proveedores tradicionales (impuestos, seguros, alquileres)</CardDescription>
                      </div>
                      <Button 
                        onClick={() => setIsAccruedLiabilityModalOpen(true)}
                        size="sm"
                        variant="outline"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Nuevo Pasivo
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Descripción</TableHead>
                          <TableHead>Devengamiento</TableHead>
                          <TableHead>Vencimiento</TableHead>
                          <TableHead>Monto</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Cuenta Tesorería</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-10 text-muted-foreground text-sm">
                            Sin pasivos devengados. Usá &quot;Nuevo Pasivo&quot; o cargá los datos desde el backend.
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Tab: Cuenta Corriente */}
            <TabsContent value="cuenta-corriente" className="space-y-4 mt-0">
              {/* Resumen de Cuenta */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Compromiso</CardTitle>
                    <DollarSign className="h-4 w-4 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {formatCurrency(totalCommitment)}
                    </div>
                    <p className="text-xs text-muted-foreground">En compromiso</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Deuda</CardTitle>
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">
                      {formatCurrency(totalDebt)}
                  </div>
                    <p className="text-xs text-muted-foreground">Deuda real</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pagos</CardTitle>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(totalPayments)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Sin registro de pagos en esta vista (conectar API de pagos al proveedor)
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total órdenes</CardTitle>
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(currentBalance)}
                    </div>
                    <p className="text-xs text-muted-foreground">Suma de totales de órdenes de compra</p>
                </CardContent>
              </Card>
            </div>

              {/* Movimientos */}
            <Card>
              <CardHeader>
                  <CardTitle>Movimientos de Cuenta Corriente</CardTitle>
                  <CardDescription>Historial de movimientos</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead>Monto</TableHead>
                        <TableHead>Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-muted-foreground text-sm">
                        Sin movimientos de cuenta corriente detallados. El resumen superior refleja montos de órdenes de
                        compra; el historial completo requiere API de movimientos.
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            </TabsContent>

            {/* Tab: Trazabilidad */}
            <TabsContent value="trazabilidad" className="space-y-4 mt-0">
            <Card>
              <CardHeader>
                  <CardTitle>Trazabilidad Completa</CardTitle>
                  <CardDescription>Vista de flujo OC → Factura → Remito → Pago</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground py-10 text-center">
                  Sin cadena de trazabilidad (OC → factura → remito → pago). Mostrar aquí cuando el backend exponga el
                  vínculo entre documentos.
                </p>
              </CardContent>
            </Card>
            </TabsContent>
        </div>
        </Tabs>

        {/* Modales */}
        <SupplierInvoiceModal
          isOpen={isInvoiceModalOpen}
          onClose={() => setIsInvoiceModalOpen(false)}
          onSuccess={() => {
            setIsInvoiceModalOpen(false)
            onRefresh?.()
          }}
          supplierId={supplier.id}
          mode="create"
        />

        <AccruedExpenseModal
          isOpen={isAccruedExpenseModalOpen}
          onClose={() => setIsAccruedExpenseModalOpen(false)}
          onSuccess={() => {
            setIsAccruedExpenseModalOpen(false)
            onRefresh?.()
          }}
          supplierId={supplier.id}
          mode="create"
        />

        <AccruedLiabilityModal
          isOpen={isAccruedLiabilityModalOpen}
          onClose={() => setIsAccruedLiabilityModalOpen(false)}
          onSuccess={() => {
            setIsAccruedLiabilityModalOpen(false)
            onRefresh?.()
          }}
          mode="create"
        />
      </DialogContent>
    </Dialog>
    {confirmDialog}
    </>
  )
}
