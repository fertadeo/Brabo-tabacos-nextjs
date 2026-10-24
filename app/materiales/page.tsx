"use client"

import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { ERPLayout } from "@/components/erp-layout"
import { Protected } from "@/components/protected"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Boxes,
  Factory,
  TrendingUp,
  TrendingDown,
  Package,
  ClipboardList,
  PackageCheck,
  FileText,
  AlertTriangle,
  Truck,
  CheckCircle2,
  Hourglass,
} from "lucide-react"
import { NewMaterialModal } from "@/components/new-material-modal"
import { NewMaterialOrderModal } from "@/components/new-material-order-modal"

interface SupplierInfo {
  name: string
  cost: number
  leadTime: number
}

interface MaterialItem {
  code: string
  supplierCode?: string
  northDescription?: string
  northMaterialCode?: string
  materialsCatalog?: string
  name: string
  category: string
  supplierName?: string
  unit: string
  unitQuantity?: number
  coefficient?: number
  unitPrice?: number
  purchasePrice?: number
  updatedAt: string
  averageCost?: number
  lastCost?: number
  yieldAmount?: number
  yieldDescription?: string
  costCenter?: string
  productDescription?: string
  productFinish?: string
  checklistName?: string
  checklistOk?: boolean
  stockAvailable: number
  stockInTransit: number
  stockCommitted: number
  minStock: number
  leadTime: number
  suppliers: SupplierInfo[]
}

interface PurchaseOrderItem {
  id: string
  supplier: string
  material: string
  quantity: number
  unit: string
  unitPrice: number
  commitmentValue: number
  recognizedDebt: number
  eta: string
  orderDate: string
  status: "Borrador" | "Emitida" | "Parcial" | "Completada" | "Facturada"
  priority: "Alta" | "Media" | "Baja"
  receivedQuantity: number
}

interface GoodsReceiptItem {
  id: string
  orderId: string
  supplier: string
  material: string
  receivedQuantity: number
  acceptedQuantity: number
  pendingQuantity: number
  date: string
  status: "Registrado" | "Observado" | "Aprobado"
  notes?: string
}

const materialsData: MaterialItem[] = [
  {
    code: "MAT-001",
    supplierCode: "18535",
    northDescription: "Madera Fibroplus 3mm - Negra",
    northMaterialCode: "MENDIO S.A",
    materialsCatalog: "FONDO FAPLAC 3 MM NEGRO PROFUNDO 1.83 X 2.60",
    name: "Madera Fibroplus 3mm - Negra",
    category: "Maderas",
    supplierName: "MENDIO S.A",
    unit: "plancha",
    coefficient: 0.0043,
    unitPrice: 103.19,
    purchasePrice: 24081.58,
    yieldAmount: 1110.39,
    yieldDescription: "Coef. x hoja",
    costCenter: "MADERA",
    productDescription: "Computadora de Escritorio Estándar",
    productFinish: "Acabado Madera Negro",
    checklistName: "Check List Nombre",
    checklistOk: true,
    stockAvailable: 280,
    stockInTransit: 60,
    stockCommitted: 120,
    minStock: 240,
    leadTime: 6,
    averageCost: 1890,
    lastCost: 1940,
    suppliers: [
      { name: "Tableros Córdoba", cost: 1940, leadTime: 6 },
      { name: "Fibroplus Argentina", cost: 2050, leadTime: 8 },
    ],
    updatedAt: "2025-11-05",
  },
  {
    code: "MAT-002",
    supplierCode: "18536",
    northDescription: "Madera Fibroplus 3mm - Blanca",
    northMaterialCode: "MENDIO S.A",
    materialsCatalog: "FONDO FAPLAC 3 MM BLANCO 1.83 X 2.60",
    name: "Madera Fibroplus 3mm - Blanca",
    category: "Maderas",
    supplierName: "MENDIO S.A",
    unit: "plancha",
    coefficient: 0.0043,
    unitPrice: 105.42,
    purchasePrice: 24560.0,
    yieldAmount: 1110.39,
    yieldDescription: "Coef. x hoja",
    costCenter: "MADERA",
    productDescription: "Computadora de Escritorio Estándar",
    productFinish: "Acabado Madera Blanco",
    checklistName: "Check Lista Blanca",
    checklistOk: true,
    stockAvailable: 320,
    stockInTransit: 40,
    stockCommitted: 140,
    minStock: 260,
    leadTime: 6,
    averageCost: 1950,
    lastCost: 2020,
    suppliers: [
      { name: "Tableros Córdoba", cost: 2020, leadTime: 6 },
      { name: "Decor Panel", cost: 2100, leadTime: 9 },
    ],
    updatedAt: "2025-11-04",
  },
  {
    code: "MAT-003",
    supplierCode: "18537",
    northDescription: "Madera Fibroplus 3mm - Crudo",
    northMaterialCode: "FIBROPLUS AR",
    materialsCatalog: "FONDO MDF 3 MM NATURAL 1.83 X 2.60",
    name: "Madera Fibroplus 3mm - Crudo",
    category: "Maderas",
    supplierName: "Fibroplus Argentina",
    unit: "plancha",
    coefficient: 0.0043,
    unitPrice: 90.25,
    purchasePrice: 21015.0,
    yieldAmount: 1110.39,
    yieldDescription: "Coef. x hoja",
    costCenter: "MADERA",
    productDescription: "Notebook Professional",
    productFinish: "Acabado Madera Crudo",
    checklistName: "Check Madera Crudo",
    checklistOk: true,
    stockAvailable: 410,
    stockInTransit: 0,
    stockCommitted: 160,
    minStock: 300,
    leadTime: 5,
    averageCost: 1720,
    lastCost: 1780,
    suppliers: [
      { name: "Fibroplus Argentina", cost: 1780, leadTime: 5 },
      { name: "Componentes Tech", cost: 1820, leadTime: 7 },
    ],
    updatedAt: "2025-11-03",
  },
  {
    code: "MAT-010",
    supplierCode: "22011",
    northDescription: "Pintura negra",
    northMaterialCode: "PIN-NEG-01",
    materialsCatalog: "ESMALTE ACRÍLICO NEGRO BIDÓN 20L",
    name: "Pintura negra",
    category: "Químicos",
    supplierName: "Pinturas Andinas",
    unit: "litro",
    coefficient: 0.025,
    unitPrice: 87.5,
    purchasePrice: 1750,
    yieldAmount: 40,
    yieldDescription: "Litros por tanda",
    costCenter: "ACABADOS",
    productDescription: "Computadora de Escritorio Estándar",
    productFinish: "Color Negro",
    checklistName: "Check Pintura Negro",
    checklistOk: true,
    stockAvailable: 95,
    stockInTransit: 25,
    stockCommitted: 30,
    minStock: 120,
    leadTime: 4,
    averageCost: 2150,
    lastCost: 2190,
    suppliers: [
      { name: "Pinturas Andinas", cost: 2190, leadTime: 4 },
      { name: "ColorMix", cost: 2250, leadTime: 6 },
    ],
    updatedAt: "2025-11-06",
  },
  {
    code: "MAT-011",
    supplierCode: "22012",
    northDescription: "Pintura blanca",
    northMaterialCode: "PIN-BLA-01",
    materialsCatalog: "ESMALTE ACRÍLICO BLANCO BIDÓN 20L",
    name: "Pintura blanca",
    category: "Químicos",
    supplierName: "Pinturas Andinas",
    unit: "litro",
    coefficient: 0.024,
    unitPrice: 83.5,
    purchasePrice: 1670,
    yieldAmount: 42,
    yieldDescription: "Litros por tanda",
    costCenter: "ACABADOS",
    productDescription: "Computadora de Escritorio Estándar",
    productFinish: "Color Blanco",
    checklistName: "Check Pintura Blanco",
    checklistOk: false,
    stockAvailable: 88,
    stockInTransit: 20,
    stockCommitted: 24,
    minStock: 100,
    leadTime: 4,
    averageCost: 2100,
    lastCost: 2150,
    suppliers: [
      { name: "Pinturas Andinas", cost: 2150, leadTime: 4 },
      { name: "ColorMix", cost: 2200, leadTime: 6 },
    ],
    updatedAt: "2025-11-06",
  },
  {
    code: "MAT-020",
    name: "Posicionador",
    category: "Componentes",
    unit: "unidad",
    stockAvailable: 520,
    stockInTransit: 140,
    stockCommitted: 210,
    minStock: 480,
    leadTime: 10,
    averageCost: 940,
    lastCost: 980,
    suppliers: [
      { name: "Industrias AB", cost: 980, leadTime: 10 },
      { name: "Piezas Pocket", cost: 1020, leadTime: 12 },
    ],
    updatedAt: "2025-11-01",
  },
  {
    code: "MAT-025",
    name: "Remaches",
    category: "Ferretería",
    unit: "bolsa",
    stockAvailable: 840,
    stockInTransit: 100,
    stockCommitted: 260,
    minStock: 700,
    leadTime: 3,
    averageCost: 520,
    lastCost: 540,
    suppliers: [
      { name: "Fixaciones Centro", cost: 540, leadTime: 3 },
      { name: "Herrería SRL", cost: 555, leadTime: 5 },
    ],
    updatedAt: "2025-11-05",
  },
  {
    code: "MAT-028",
    name: "Varillas de plástico pocket",
    category: "Componentes",
    unit: "unidad",
    stockAvailable: 620,
    stockInTransit: 200,
    stockCommitted: 180,
    minStock: 600,
    leadTime: 12,
    averageCost: 1380,
    lastCost: 1420,
    suppliers: [
      { name: "Plásticos Andes", cost: 1420, leadTime: 12 },
      { name: "Ecofan Parts", cost: 1450, leadTime: 15 },
    ],
    updatedAt: "2025-11-02",
  },
  {
    code: "MAT-029",
    name: "Varillas de plástico standard",
    category: "Componentes",
    unit: "unidad",
    stockAvailable: 780,
    stockInTransit: 160,
    stockCommitted: 220,
    minStock: 700,
    leadTime: 12,
    averageCost: 1450,
    lastCost: 1490,
    suppliers: [
      { name: "Plásticos Andes", cost: 1490, leadTime: 12 },
      { name: "Ecofan Parts", cost: 1520, leadTime: 15 },
    ],
    updatedAt: "2025-11-02",
  },
  {
    code: "MAT-040",
    name: "Pulseras de ecofan standard",
    category: "Packaging",
    unit: "unidad",
    stockAvailable: 960,
    stockInTransit: 300,
    stockCommitted: 280,
    minStock: 900,
    leadTime: 9,
    averageCost: 310,
    lastCost: 320,
    suppliers: [
      { name: "Ecofan Parts", cost: 320, leadTime: 9 },
      { name: "Packaging Tech", cost: 335, leadTime: 11 },
    ],
    updatedAt: "2025-11-06",
  },
  {
    code: "MAT-055",
    name: "Papel para plotter",
    category: "Insumos de impresión",
    unit: "rollo",
    stockAvailable: 42,
    stockInTransit: 18,
    stockCommitted: 12,
    minStock: 40,
    leadTime: 7,
    averageCost: 9600,
    lastCost: 9740,
    suppliers: [
      { name: "Plotter Supplies", cost: 9740, leadTime: 7 },
      { name: "Impresiones del Sur", cost: 9950, leadTime: 9 },
    ],
    updatedAt: "2025-11-05",
  },
  {
    code: "MAT-060",
    name: "Tinta negra",
    category: "Insumos de impresión",
    unit: "litro",
    stockAvailable: 32,
    stockInTransit: 10,
    stockCommitted: 8,
    minStock: 30,
    leadTime: 5,
    averageCost: 14800,
    lastCost: 15050,
    suppliers: [
      { name: "Plotter Supplies", cost: 15050, leadTime: 5 },
      { name: "ColorPrint", cost: 15300, leadTime: 6 },
    ],
    updatedAt: "2025-11-06",
  },
  {
    code: "MAT-090",
    name: "Pegamento",
    category: "Químicos",
    unit: "litro",
    stockAvailable: 68,
    stockInTransit: 30,
    stockCommitted: 16,
    minStock: 60,
    leadTime: 4,
    averageCost: 2850,
    lastCost: 2900,
    suppliers: [
      { name: "Adhesivos Río", cost: 2900, leadTime: 4 },
      { name: "Pegamax", cost: 2990, leadTime: 6 },
    ],
    updatedAt: "2025-11-05",
  },
  {
    code: "MAT-110",
    name: "Cinta de embalaje",
    category: "Packaging",
    unit: "rollo",
    stockAvailable: 220,
    stockInTransit: 90,
    stockCommitted: 70,
    minStock: 200,
    leadTime: 3,
    averageCost: 780,
    lastCost: 795,
    suppliers: [
      { name: "PackPro", cost: 795, leadTime: 3 },
      { name: "Fábrica de Cintas", cost: 820, leadTime: 5 },
    ],
    updatedAt: "2025-11-06",
  },
]

const purchaseOrdersData: PurchaseOrderItem[] = [
  {
    id: "OC-2025-0320",
    supplier: "Tableros Córdoba",
    material: "Madera Fibroplus 3mm - Negra",
    quantity: 400,
    unit: "plancha",
    unitPrice: 1940,
    commitmentValue: 776000,
    recognizedDebt: 0,
    eta: "2025-11-18",
    orderDate: "2025-11-06",
    status: "Emitida",
    priority: "Alta",
    receivedQuantity: 120,
  },
  {
    id: "OC-2025-0314",
    supplier: "Pinturas Andinas",
    material: "Pintura negra",
    quantity: 120,
    unit: "litro",
    unitPrice: 2190,
    commitmentValue: 262800,
    recognizedDebt: 0,
    eta: "2025-11-12",
    orderDate: "2025-11-04",
    status: "Parcial",
    priority: "Media",
    receivedQuantity: 60,
  },
  {
    id: "OC-2025-0298",
    supplier: "Plásticos Andes",
    material: "Varillas de plástico standard",
    quantity: 900,
    unit: "unidad",
    unitPrice: 1490,
    commitmentValue: 1341000,
    recognizedDebt: 447000,
    eta: "2025-11-22",
    orderDate: "2025-10-28",
    status: "Parcial",
    priority: "Alta",
    receivedQuantity: 270,
  },
  {
    id: "OC-2025-0275",
    supplier: "Plotter Supplies",
    material: "Tinta negra",
    quantity: 40,
    unit: "litro",
    unitPrice: 15050,
    commitmentValue: 602000,
    recognizedDebt: 602000,
    eta: "2025-11-09",
    orderDate: "2025-10-24",
    status: "Facturada",
    priority: "Baja",
    receivedQuantity: 40,
  },
]

const goodsReceiptsData: GoodsReceiptItem[] = [
  {
    id: "GR-00126",
    orderId: "OC-2025-0314",
    supplier: "Pinturas Andinas",
    material: "Pintura negra",
    receivedQuantity: 60,
    acceptedQuantity: 60,
    pendingQuantity: 60,
    date: "2025-11-06",
    status: "Aprobado",
  },
  {
    id: "GR-00118",
    orderId: "OC-2025-0298",
    supplier: "Plásticos Andes",
    material: "Varillas de plástico standard",
    receivedQuantity: 270,
    acceptedQuantity: 260,
    pendingQuantity: 630,
    date: "2025-11-03",
    status: "Observado",
    notes: "10 varillas con deformaciones, en reclamo",
  },
  {
    id: "GR-00110",
    orderId: "OC-2025-0275",
    supplier: "Plotter Supplies",
    material: "Tinta negra",
    receivedQuantity: 40,
    acceptedQuantity: 40,
    pendingQuantity: 0,
    date: "2025-10-28",
    status: "Registrado",
    notes: "Ingresó con factura, deuda real generada",
  },
]

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(value)

const formatDate = (value: string) => new Date(value).toLocaleDateString("es-AR")

const formatDecimal = (value: number, maximumFractionDigits = 2) =>
  new Intl.NumberFormat("es-AR", {
    maximumFractionDigits,
  }).format(value)

const getMaterialYield = (material: MaterialItem) => {
  if (material.yieldAmount && material.yieldAmount > 0) {
    return material.yieldAmount
  }
  if (material.coefficient && material.coefficient > 0) {
    return 1 / material.coefficient
  }
  return undefined
}

const getMaterialUnitCost = (material: MaterialItem) => {
  if (material.unitPrice && material.unitPrice > 0) {
    return material.unitPrice
  }
  if (material.purchasePrice && material.coefficient) {
    return material.purchasePrice * material.coefficient
  }
  if (material.averageCost) {
    return material.averageCost
  }
  return undefined
}

const getStockEquivalent = (material: MaterialItem) => {
  const yieldValue = getMaterialYield(material)
  if (!yieldValue) return undefined
  return material.stockAvailable * yieldValue
}

export default function MaterialesPage() {
  const [isNewMaterialOpen, setIsNewMaterialOpen] = useState(false)
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false)
  const [selectedMaterialCode, setSelectedMaterialCode] = useState<string | null>(materialsData[0]?.code ?? null)

  const selectedMaterial = useMemo(() => {
    if (!selectedMaterialCode) return null
    return materialsData.find((material) => material.code === selectedMaterialCode) ?? null
  }, [selectedMaterialCode])

  const stats = useMemo(() => {
    const totalMaterials = materialsData.length
    const stockValue = materialsData.reduce((acc, material) => {
      const purchaseCost = material.purchasePrice ?? material.averageCost ?? 0
      return acc + material.stockAvailable * purchaseCost
    }, 0)
    const commitments = purchaseOrdersData.reduce((acc, order) => acc + order.commitmentValue, 0)
    const recognizedDebt = purchaseOrdersData.reduce((acc, order) => acc + order.recognizedDebt, 0)
    const pendingOrders = purchaseOrdersData.filter((order) => order.status !== "Facturada").length
    const lowStockAlerts = materialsData.filter(
      (material) => material.stockAvailable + material.stockInTransit < material.minStock,
    ).length

    return {
      totalMaterials,
      stockValue,
      commitments,
      recognizedDebt,
      pendingOrders,
      lowStockAlerts,
    }
  }, [])

  const commitmentCoverage = useMemo(() => {
    const ratio = stats.recognizedDebt / (stats.commitments || 1)
    return Math.round(ratio * 100)
  }, [stats.commitments, stats.recognizedDebt])

  const coverageTooltip = commitmentCoverage < 40
    ? "Alto compromiso aún no facturado"
    : commitmentCoverage < 80
      ? "Seguimiento activo hasta recibir facturas"
      : "Mayoría de órdenes ya facturadas"

  const selectedMaterialUnitCost = selectedMaterial ? getMaterialUnitCost(selectedMaterial) : undefined
  const selectedMaterialYield = selectedMaterial ? getMaterialYield(selectedMaterial) : undefined
  const selectedMaterialStockEquivalent = selectedMaterial ? getStockEquivalent(selectedMaterial) : undefined
  const selectedMaterialTransitEquivalent = selectedMaterial && selectedMaterialYield
    ? selectedMaterial.stockInTransit * selectedMaterialYield
    : undefined
  const selectedMaterialCommittedEquivalent = selectedMaterial && selectedMaterialYield
    ? selectedMaterial.stockCommitted * selectedMaterialYield
    : undefined

  const relatedOrders = useMemo(() => {
    if (!selectedMaterial) return []
    return purchaseOrdersData.filter((order) => order.material === selectedMaterial.name)
  }, [selectedMaterial])

  const relatedReceipts = useMemo(() => {
    if (!selectedMaterial) return []
    return goodsReceiptsData.filter((receipt) => receipt.material === selectedMaterial.name)
  }, [selectedMaterial])

  return (
    <Protected requiredRoles={['gerencia', 'logistica', 'finanzas', 'admin']}>
      <ERPLayout activeItem="materiales">
        <div className="space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Boxes className="h-7 w-7 text-primary" />
                Materiales productivos
              </h1>
              <p className="text-muted-foreground">
                Gestiona órdenes de compra, compromisos y stock de insumos críticos vinculados a proveedores productivos.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setIsNewMaterialOpen(true)}>
                <Package className="h-4 w-4 mr-2" />
                Nuevo material
              </Button>
              <Button onClick={() => setIsNewOrderOpen(true)}>
                <ClipboardList className="h-4 w-4 mr-2" />
                Nueva orden de compra
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Materiales activos</CardTitle>
                <Boxes className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalMaterials}</div>
                <p className="text-xs text-muted-foreground">Con stock y proveedores asignados</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Valor del stock disponible</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.stockValue)}</div>
                <p className="text-xs text-muted-foreground">Basado en costo promedio</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Compromisos vs deuda</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Compromisos vigentes</p>
                    <p className="text-lg font-semibold">{formatCurrency(stats.commitments)}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Deuda real {formatCurrency(stats.recognizedDebt)}
                  </Badge>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Facturado</span>
                    <span>{commitmentCoverage}%</span>
                  </div>
                  <Progress value={commitmentCoverage} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">{coverageTooltip}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Alertas de abastecimiento</CardTitle>
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">{stats.lowStockAlerts}</div>
                <p className="text-xs text-muted-foreground">Materiales por debajo del mínimo (incluye tránsito)</p>
              </CardContent>
            </Card>
          </div>

        {selectedMaterial && (
          <Card className="border-primary/10 shadow-sm">
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <CardTitle className="text-2xl font-bold flex items-center gap-3">
                  <Boxes className="h-6 w-6 text-primary" />
                  {selectedMaterial.northDescription ?? selectedMaterial.name}
                </CardTitle>
                <CardDescription className="flex flex-wrap gap-3 mt-3 text-sm">
                  <span className="inline-flex items-center gap-1">
                    <Badge variant="outline" className="text-xs">
                      {selectedMaterial.code}
                    </Badge>
                    {selectedMaterial.supplierCode && (
                      <Badge variant="outline" className="text-xs">Proveedor #{selectedMaterial.supplierCode}</Badge>
                    )}
                  </span>
                  {selectedMaterial.materialsCatalog && (
                    <span className="text-muted-foreground">{selectedMaterial.materialsCatalog}</span>
                  )}
                  {selectedMaterial.productDescription && (
                    <span className="text-muted-foreground">{selectedMaterial.productDescription}</span>
                  )}
                </CardDescription>
              </div>
              <div className="flex flex-col items-start gap-2 md:items-end">
                {selectedMaterial.checklistName && (
                  <Badge variant={selectedMaterial.checklistOk ? "default" : "secondary"}>
                    {selectedMaterial.checklistOk ? "Checklist validado" : "Checklist pendiente"}
                  </Badge>
                )}
                <p className="text-xs text-muted-foreground">
                  Última actualización {formatDate(selectedMaterial.updatedAt)}
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Costo unitario aplicado</p>
                  <p className="text-2xl font-bold mt-2">
                    {selectedMaterialUnitCost ? formatCurrency(selectedMaterialUnitCost) : "-"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedMaterial.coefficient
                      ? `Coeficiente ${formatDecimal(selectedMaterial.coefficient, 4)}`
                      : "Configura el coeficiente para calcular el costo real"}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Rinde por unidad de compra</p>
                  <p className="text-2xl font-bold mt-2">
                    {selectedMaterialYield ? formatDecimal(selectedMaterialYield, 2) : "-"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedMaterial.yieldDescription ?? "Define una descripción de rinde (ej. piezas por hoja)"}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Stock equivalente</p>
                  <p className="text-2xl font-bold mt-2">
                    {selectedMaterialStockEquivalent ? formatDecimal(selectedMaterialStockEquivalent, 0) : "-"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedMaterialYield
                      ? `${formatDecimal(selectedMaterial.stockAvailable)} ${selectedMaterial.unit}(s) × rinde`
                      : "Configura coeficiente para conocer el stock equivalente"}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Min/Compromisos</p>
                  <p className="text-2xl font-bold mt-2">
                    {formatDecimal(selectedMaterial.minStock)} <span className="text-base text-muted-foreground">mín</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Comprometido: {formatDecimal(selectedMaterial.stockCommitted)} {selectedMaterial.unit}
                  </p>
                </div>
              </div>

              <Tabs defaultValue="ficha" className="w-full">
                <TabsList className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <TabsTrigger value="ficha">Ficha técnica</TabsTrigger>
                  <TabsTrigger value="costeo">Costeo y rendimiento</TabsTrigger>
                  <TabsTrigger value="stock">Stock y abastecimiento</TabsTrigger>
                </TabsList>

                <TabsContent value="ficha" className="mt-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-3 rounded-lg border p-4">
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Proveedor principal</p>
                      <p className="text-sm font-semibold">
                        {selectedMaterial.supplierName ?? selectedMaterial.suppliers[0]?.name ?? "Sin asignar"}
                      </p>
                      <div className="text-sm text-muted-foreground space-y-1">
                        {selectedMaterial.suppliers.map((supplier) => (
                          <div key={`${selectedMaterial.code}-${supplier.name}`} className="flex items-center justify-between text-xs">
                            <span>{supplier.name}</span>
                            <span>{formatCurrency(supplier.cost)} · {supplier.leadTime} días</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-3 rounded-lg border p-4">
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Clasificación</p>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div className="flex items-center justify-between">
                          <span>Categoría</span>
                          <span className="font-medium text-foreground">{selectedMaterial.category}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Unidad de medida</span>
                          <span className="font-medium text-foreground">{selectedMaterial.unit}</span>
                        </div>
                        {selectedMaterial.costCenter && (
                          <div className="flex items-center justify-between">
                            <span>Centro de costos</span>
                            <span className="font-medium text-foreground">{selectedMaterial.costCenter}</span>
                          </div>
                        )}
                        {selectedMaterial.productFinish && (
                          <div className="flex items-center justify-between">
                            <span>Acabado</span>
                            <span className="font-medium text-foreground">{selectedMaterial.productFinish}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="costeo" className="mt-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-lg border p-4">
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Precio de adquisición</p>
                      <p className="text-lg font-semibold mt-2">
                        {selectedMaterial.purchasePrice ? formatCurrency(selectedMaterial.purchasePrice) : "-"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Unidad de compra ({selectedMaterial.unit})</p>
                    </div>
                    <div className="rounded-lg border p-4">
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Coeficiente aplicado</p>
                      <p className="text-lg font-semibold mt-2">
                        {selectedMaterial.coefficient ? formatDecimal(selectedMaterial.coefficient, 4) : "-"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Consumo por unidad final</p>
                    </div>
                    <div className="rounded-lg border p-4">
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Costo unitario calculado</p>
                      <p className="text-lg font-semibold mt-2">
                        {selectedMaterialUnitCost ? formatCurrency(selectedMaterialUnitCost) : "-"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Resultado precio × coeficiente</p>
                    </div>
                  </div>
                  {selectedMaterial.purchasePrice && selectedMaterial.coefficient && (
                    <div className="mt-4 rounded-lg border bg-muted/30 p-4 text-sm">
                      <p className="font-semibold text-muted-foreground">Detalle del cálculo</p>
                      <p className="mt-1">
                        {formatCurrency(selectedMaterial.purchasePrice)} × {formatDecimal(selectedMaterial.coefficient, 4)} =
                        <span className="font-semibold text-primary"> {selectedMaterialUnitCost ? formatCurrency(selectedMaterialUnitCost) : "-"}</span>
                      </p>
                      {selectedMaterialYield && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Rinde aproximado: {formatDecimal(selectedMaterialYield, 2)} unidades finales por {selectedMaterial.unit}
                        </p>
                      )}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="stock" className="mt-4 space-y-4">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-lg border p-4">
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Stock disponible</p>
                      <p className="text-lg font-semibold mt-2">{formatDecimal(selectedMaterial.stockAvailable)} {selectedMaterial.unit}</p>
                      {selectedMaterialStockEquivalent && (
                        <p className="text-xs text-muted-foreground mt-1">
                          ≈ {formatDecimal(selectedMaterialStockEquivalent, 0)} unidades finales
                        </p>
                      )}
                    </div>
                    <div className="rounded-lg border p-4">
                      <p className="text-xs font-semibold text-muted-foreground uppercase">En tránsito</p>
                      <p className="text-lg font-semibold mt-2">{formatDecimal(selectedMaterial.stockInTransit)} {selectedMaterial.unit}</p>
                      {selectedMaterialTransitEquivalent && (
                        <p className="text-xs text-muted-foreground mt-1">
                          ≈ {formatDecimal(selectedMaterialTransitEquivalent, 0)} unidades finales
                        </p>
                      )}
                    </div>
                    <div className="rounded-lg border p-4">
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Comprometido</p>
                      <p className="text-lg font-semibold mt-2">{formatDecimal(selectedMaterial.stockCommitted)} {selectedMaterial.unit}</p>
                      {selectedMaterialCommittedEquivalent && (
                        <p className="text-xs text-muted-foreground mt-1">
                          ≈ {formatDecimal(selectedMaterialCommittedEquivalent, 0)} unidades finales
                        </p>
                      )}
                    </div>
                    <div className="rounded-lg border p-4">
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Alertas</p>
                      <p className="text-lg font-semibold mt-2">
                        {selectedMaterial.stockAvailable + selectedMaterial.stockInTransit < selectedMaterial.minStock
                          ? "⚠️ Reponer"
                          : "Stock saludable"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Mínimo requerido: {formatDecimal(selectedMaterial.minStock)} {selectedMaterial.unit}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-lg border p-4">
                      <p className="text-sm font-semibold flex items-center gap-2">
                        <ClipboardList className="h-4 w-4 text-primary" /> Órdenes vinculadas
                      </p>
                      <div className="mt-3 space-y-3 text-sm">
                        {relatedOrders.length === 0 && (
                          <p className="text-muted-foreground text-sm">No hay órdenes asociadas a este material.</p>
                        )}
                        {relatedOrders.map((order) => (
                          <div key={order.id} className="rounded-md border bg-muted/40 p-3">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold">{order.id}</span>
                              <Badge
                                variant={
                                  order.status === "Facturada"
                                    ? "default"
                                    : order.status === "Parcial"
                                      ? "secondary"
                                      : "outline"
                                }
                              >
                                {order.status}
                              </Badge>
                            </div>
                            <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
                              <span>{order.quantity} {order.unit}</span>
                              <span>ETA {formatDate(order.eta)}</span>
                              <span>Compromiso {formatCurrency(order.commitmentValue)}</span>
                              {order.recognizedDebt > 0 && (
                                <span className="text-emerald-600">Deuda {formatCurrency(order.recognizedDebt)}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-lg border p-4">
                      <p className="text-sm font-semibold flex items-center gap-2">
                        <PackageCheck className="h-4 w-4 text-primary" /> Recepciones recientes
                      </p>
                      <div className="mt-3 space-y-3 text-sm">
                        {relatedReceipts.length === 0 && (
                          <p className="text-muted-foreground text-sm">Sin remitos registrados para este material.</p>
                        )}
                        {relatedReceipts.map((receipt) => (
                          <div key={receipt.id} className="rounded-md border bg-muted/40 p-3">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold">{receipt.id}</span>
                              <Badge
                                variant={
                                  receipt.status === "Aprobado"
                                    ? "default"
                                    : receipt.status === "Observado"
                                      ? "destructive"
                                      : "secondary"
                                }
                              >
                                {receipt.status}
                              </Badge>
                            </div>
                            <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
                              <span>{receipt.receivedQuantity} recibidas</span>
                              <span>{formatDate(receipt.date)}</span>
                              {receipt.pendingQuantity > 0 && (
                                <span>Pendiente {receipt.pendingQuantity}</span>
                              )}
                            </div>
                            {receipt.notes && (
                              <p className="mt-2 text-xs text-muted-foreground">{receipt.notes}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Factory className="h-5 w-5 text-primary" />
                  Resumen de abastecimiento
                </CardTitle>
                <CardDescription>Visión rápida del flujo compra → recepción → factura</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="text-sm font-medium">Órdenes pendientes</p>
                    <p className="text-xs text-muted-foreground">Sin factura asociada</p>
                  </div>
                  <Badge variant="outline" className="text-sm">
                    {stats.pendingOrders} OC activas
                  </Badge>
                </div>
                <Separator />
                <div className="grid gap-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <ClipboardList className="h-4 w-4" />
                      Compromisos
                    </span>
                    <span className="font-semibold">{formatCurrency(stats.commitments - stats.recognizedDebt)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <PackageCheck className="h-4 w-4" />
                      Recepciones registradas
                    </span>
                    <span className="font-semibold">{goodsReceiptsData.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      Facturas conciliadas
                    </span>
                    <span className="font-semibold">{purchaseOrdersData.filter((order) => order.status === "Facturada").length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-primary" />
                  Seguimiento de proveedores productivos
                </CardTitle>
                <CardDescription>Lead time, costos y desempeño reciente</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {materialsData.map((material) => (
                  <div key={material.code} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{material.name}</p>
                        <p className="text-xs text-muted-foreground">Código {material.code}</p>
                      </div>
                      <Badge variant="outline">LT {material.leadTime} días</Badge>
                    </div>
                    <div className="mt-2 space-y-2">
                      {material.suppliers.map((supplier) => (
                        <div key={`${material.code}-${supplier.name}`} className="flex items-center justify-between text-xs">
                          <span>{supplier.name}</span>
                          <span className="flex items-center gap-2">
                            <Badge variant="outline">{formatCurrency(supplier.cost)}</Badge>
                            <span className="text-muted-foreground">{supplier.leadTime} días</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Materiales productivos</CardTitle>
              <CardDescription>Stock disponible, compromisos y proveedores asociados</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Material</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Costo unitario</TableHead>
                      <TableHead>Rinde</TableHead>
                      <TableHead>Stock equiv.</TableHead>
                      <TableHead className="text-center">Stock disp.</TableHead>
                      <TableHead className="text-center">En tránsito</TableHead>
                      <TableHead className="text-center">Comprometido</TableHead>
                      <TableHead className="text-center">Stock mínimo</TableHead>
                      <TableHead>Costos</TableHead>
                      <TableHead>Proveedores</TableHead>
                      <TableHead>Actualizado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {materialsData.map((material) => {
                      const totalFutureStock = material.stockAvailable + material.stockInTransit - material.stockCommitted
                      const isBelowMin = totalFutureStock < material.minStock
                      const costVariation = (material.lastCost ?? 0) - (material.averageCost ?? 0)
                      const unitCost = getMaterialUnitCost(material)
                      const yieldValue = getMaterialYield(material)
                      const stockEquivalent = yieldValue ? material.stockAvailable * yieldValue : undefined
                      const isSelected = selectedMaterial?.code === material.code

                      return (
                        <TableRow
                          key={material.code}
                          className={cn(
                            "cursor-pointer transition-colors",
                            "hover:bg-muted/50",
                            isBelowMin && "bg-amber-50/70 dark:bg-amber-950/20",
                            isSelected && "bg-primary/5 border-l-4 border-primary"
                          )}
                          onClick={() => setSelectedMaterialCode(material.code)}
                        >
                          <TableCell className="font-mono text-xs">
                            <Badge variant="outline">{material.code}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">{material.name}</TableCell>
                          <TableCell>{material.category}</TableCell>
                          <TableCell>
                            {unitCost ? (
                              <span className="font-semibold">{formatCurrency(unitCost)}</span>
                            ) : (
                              <span className="text-muted-foreground text-xs">Configurar</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {yieldValue ? (
                              <span className="text-sm">{formatDecimal(yieldValue, 0)}</span>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {stockEquivalent ? (
                              <span className="text-sm font-semibold">{formatDecimal(stockEquivalent, 0)}</span>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center font-semibold">{material.stockAvailable}</TableCell>
                          <TableCell className="text-center text-muted-foreground">{material.stockInTransit}</TableCell>
                          <TableCell className="text-center text-muted-foreground">{material.stockCommitted}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-col items-center">
                              <span>{material.minStock}</span>
                              {isBelowMin && (
                                <Badge variant="destructive" className="mt-1 text-[10px]">Reponer</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col text-sm">
                              <span className="font-semibold">
                                Prom: {material.averageCost ? formatCurrency(material.averageCost) : "-"}
                              </span>
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                Último: {material.lastCost ? formatCurrency(material.lastCost) : "-"}
                                {material.lastCost && material.averageCost && costVariation !== 0 && (
                                  <span className={costVariation > 0 ? "text-rose-500" : "text-emerald-500"}>
                                    {costVariation > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                  </span>
                                )}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1 text-xs">
                              {material.suppliers.map((supplier) => (
                                <div key={`${material.code}-${supplier.name}`} className="flex items-center justify-between">
                                  <span>{supplier.name}</span>
                                  <span className="text-muted-foreground">{formatCurrency(supplier.cost)}</span>
                                </div>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>{formatDate(material.updatedAt)}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Órdenes de compra productivas</CardTitle>
                <CardDescription>Control de compromisos vs. deuda real</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>OC</TableHead>
                        <TableHead>Proveedor</TableHead>
                        <TableHead>Material</TableHead>
                        <TableHead className="text-center">Cant.</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Compromiso</TableHead>
                        <TableHead>Deuda real</TableHead>
                        <TableHead>ETA</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {purchaseOrdersData.map((order) => {
                        const commitmentPending = order.commitmentValue - order.recognizedDebt
                        const progress = Math.round((order.receivedQuantity / order.quantity) * 100)

                        return (
                          <TableRow key={order.id}>
                            <TableCell className="font-mono text-xs">
                              <Badge variant="outline">{order.id}</Badge>
                            </TableCell>
                            <TableCell>{order.supplier}</TableCell>
                            <TableCell>{order.material}</TableCell>
                            <TableCell className="text-center">{order.quantity}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  order.status === "Facturada"
                                    ? "default"
                                    : order.status === "Parcial"
                                      ? "secondary"
                                      : "outline"
                                }
                              >
                                {order.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatCurrency(order.commitmentValue)}</TableCell>
                            <TableCell>
                              <div className="flex flex-col text-sm">
                                <span className="font-semibold text-emerald-600">{formatCurrency(order.recognizedDebt)}</span>
                                {commitmentPending > 0 && (
                                  <span className="text-xs text-muted-foreground">Pendiente {formatCurrency(commitmentPending)}</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col text-xs">
                                <span>{formatDate(order.eta)}</span>
                                <span className="text-muted-foreground">Avance {progress}%</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recepciones de remitos</CardTitle>
                <CardDescription>Actualización de stock productivo</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Remito</TableHead>
                        <TableHead>Proveedor</TableHead>
                        <TableHead>Material</TableHead>
                        <TableHead className="text-center">Recibido</TableHead>
                        <TableHead className="text-center">Aceptado</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Fecha</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {goodsReceiptsData.map((receipt) => (
                        <TableRow key={receipt.id}>
                          <TableCell className="font-mono text-xs">
                            <Badge variant="outline">{receipt.id}</Badge>
                          </TableCell>
                          <TableCell>{receipt.supplier}</TableCell>
                          <TableCell>{receipt.material}</TableCell>
                          <TableCell className="text-center">{receipt.receivedQuantity}</TableCell>
                          <TableCell className="text-center">{receipt.acceptedQuantity}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                receipt.status === "Aprobado"
                                  ? "default"
                                  : receipt.status === "Observado"
                                    ? "destructive"
                                    : "secondary"
                              }
                            >
                              {receipt.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col text-xs">
                              <span>{formatDate(receipt.date)}</span>
                              {receipt.status === "Aprobado" && (
                                <span className="flex items-center gap-1 text-emerald-600">
                                  <CheckCircle2 className="h-3 w-3" /> Stock actualizado
                                </span>
                              )}
                              {receipt.status === "Registrado" && (
                                <span className="flex items-center gap-1 text-amber-600">
                                  <Hourglass className="h-3 w-3" /> Pendiente de control
                                </span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <NewMaterialModal
          isOpen={isNewMaterialOpen}
          onClose={() => setIsNewMaterialOpen(false)}
          onSuccess={() => setIsNewMaterialOpen(false)}
        />

        <NewMaterialOrderModal
          isOpen={isNewOrderOpen}
          onClose={() => setIsNewOrderOpen(false)}
          onSuccess={() => setIsNewOrderOpen(false)}
        />
      </ERPLayout>
    </Protected>
  )
}

