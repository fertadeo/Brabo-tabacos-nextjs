import {
  Package,
  Users,
  DollarSign,
  Factory,
  UserCheck,
  ShoppingCart,
  ClipboardList,
  FileText,
  BarChart3,
  Calculator,
  Building2,
  Truck,
  Settings,
  PackageCheck,
  Shield,
  Boxes,
  FolderTree,
  BookText,
  PenLine,
  BookOpen,
  ListOrdered,
  CalendarDays,
  Receipt,
  TrendingUp,
  Wrench,
  Table2,
  BadgePercent,
  Activity,
  HeartPulse,
  UserPlus,
} from "lucide-react"
import { FEATURE_REPARACIONES, FEATURE_TIENDA } from "@/lib/features"

// Definición de roles disponibles según el backend
export type Role = 
  | 'admin' 
  | 'manager' 
  | 'employee' 
  | 'viewer' 
  | 'gerencia' 
  | 'ventas' 
  | 'logistica' 
  | 'finanzas'
  | 'superadmin'

// Interfaz para items del menú
export interface MenuItem {
  id: string
  label: string
  href: string
  icon: any // Componente de icono de Lucide
  requiredRoles?: Role[]
  children?: MenuItem[]
}

// Interfaz para grupos del menú
export interface MenuGroup {
  id: string
  title: string
  icon: any // Componente de icono de Lucide
  requiredRoles?: Role[]
  items: MenuItem[]
}

// Configuración del menú con roles requeridos según las reglas del backend
export const MENU_GROUPS: MenuGroup[] = [
  {
    id: "principal",
    title: "Principal",
    icon: BarChart3,
    requiredRoles: ['gerencia', 'ventas', 'logistica', 'finanzas', 'admin', 'manager', 'viewer', 'superadmin'],
    items: [
      { 
        id: "dashboard", 
        label: "Dashboard", 
        icon: BarChart3, 
        href: "/dashboard",
        requiredRoles: ['gerencia', 'ventas', 'logistica', 'finanzas', 'admin', 'manager', 'viewer', 'superadmin']
      },
      // Módulo Caja oculto temporalmente
      // {
      //   id: "caja",
      //   label: "Caja",
      //   icon: DollarSign,
      //   href: "/caja",
      //   requiredRoles: ['gerencia', 'finanzas', 'admin']
      // },
    ]
  },
  {
    id: "inventario",
    title: "Inventario",
    icon: Package,
    requiredRoles: ['gerencia', 'ventas', 'logistica', 'finanzas', 'admin'],
    items: [
      { 
        id: "productos", 
        label: "Productos", 
        icon: Package, 
        href: "/productos",
        requiredRoles: ['gerencia', 'ventas', 'logistica', 'finanzas', 'admin']
      },
      {
        id: "actualizacion-precios",
        label: "Actualización de precios",
        icon: BadgePercent,
        href: "/productos/actualizacion-precios",
        requiredRoles: ['gerencia', 'admin']
      },
      {
        id: "categorias",
        label: "Categorías",
        icon: FolderTree,
        href: "/categorias",
        requiredRoles: ['gerencia', 'ventas', 'logistica', 'finanzas', 'admin']
      },
      // { 
      //   id: "stock", 
      //   label: "Stock", 
      //   icon: Package, 
      //   href: "/stock",
      //   requiredRoles: ['gerencia', 'logistica', 'admin']
      // },
      { 
        id: "compras", 
        label: "Compras", 
        icon: ShoppingCart, 
        href: "/compras",
        requiredRoles: ['gerencia', 'finanzas', 'admin']
      },
    ]
  },
  {
    id: "ventas",
    title: "Ventas",
    icon: Users,
    requiredRoles: ['gerencia', 'ventas', 'finanzas', 'logistica', 'admin', 'manager', 'employee', 'viewer'],
    items: [
      { 
        id: "ventas", 
        label: "Ventas", 
        icon: TrendingUp, 
        href: "/ventas",
        requiredRoles: ['gerencia', 'ventas', 'admin']
      },
      { 
        id: "punto-venta", 
        label: "Punto de venta", 
        icon: Receipt, 
        href: "/punto-venta",
        requiredRoles: ['gerencia', 'ventas', 'admin']
      },
      { 
        id: "clientes", 
        label: "Clientes", 
        icon: Users, 
        href: "/clientes",
        requiredRoles: ['gerencia', 'ventas', 'admin']
      },
      { 
        id: "pedidos", 
        label: "Pedidos", 
        icon: ClipboardList, 
        href: "/pedidos",
        requiredRoles: ['gerencia', 'ventas', 'admin', 'logistica']
      },
      {
        id: "reparto",
        label: "Reparto",
        icon: Truck,
        href: "/reparto",
        requiredRoles: ['gerencia', 'ventas', 'admin', 'logistica']
      },
      { 
        id: "presupuestos", 
        label: "Presupuestos", 
        icon: Calculator, 
        href: "/presupuestos",
        requiredRoles: ['admin', 'gerencia', 'ventas', 'finanzas', 'logistica', 'manager', 'employee', 'viewer']
      },
      {
        id: "facturacion",
        label: "Facturación",
        icon: FileText,
        href: "/facturacion",
        requiredRoles: ['gerencia', 'ventas', 'finanzas', 'admin']
      },
      ...(FEATURE_REPARACIONES
        ? [
            {
              id: "reparaciones",
              label: "Órdenes de reparación",
              icon: Wrench,
              href: "/reparaciones",
              requiredRoles: ['gerencia', 'ventas', 'admin'] as Role[],
            },
          ]
        : []),
      // Tienda: solo si FEATURE_TIENDA=true
      ...(FEATURE_TIENDA
        ? [
            {
              id: "tienda",
              label: "Tienda",
              icon: ShoppingCart,
              href: "/tienda",
              requiredRoles: ['gerencia', 'ventas', 'admin'] as Role[],
            },
          ]
        : []),
    ]
  },
  {
    id: "contabilidad",
    title: "Contabilidad",
    icon: BookText,
    requiredRoles: ['gerencia', 'finanzas', 'admin'],
    items: [
      {
        id: "contabilidad-inicio",
        label: "Inicio",
        icon: BookText,
        href: "/contabilidad",
        requiredRoles: ['gerencia', 'finanzas', 'admin']
      },
      {
        id: "asientos-manuales",
        label: "Asientos manuales",
        icon: PenLine,
        href: "/contabilidad/asientos",
        requiredRoles: ['gerencia', 'finanzas', 'admin']
      },
      {
        id: "asientos-nuevo",
        label: "Nuevo asiento",
        icon: PenLine,
        href: "/contabilidad/asientos/nuevo",
        requiredRoles: ['gerencia', 'finanzas', 'admin']
      },
      {
        id: "libro-diario",
        label: "Libro diario",
        icon: BookOpen,
        href: "/contabilidad/libro-diario",
        requiredRoles: ['gerencia', 'finanzas', 'admin']
      },
      {
        id: "libro-mayor",
        label: "Libro mayor",
        icon: BookOpen,
        href: "/contabilidad/libro-mayor",
        requiredRoles: ['gerencia', 'finanzas', 'admin']
      },
      {
        id: "sumas-saldos",
        label: "Sumas y saldos",
        icon: Table2,
        href: "/contabilidad/sumas-saldos",
        requiredRoles: ['gerencia', 'finanzas', 'admin']
      },
      {
        id: "plan-cuentas",
        label: "Plan de cuentas",
        icon: ListOrdered,
        href: "/contabilidad/plan-cuentas",
        requiredRoles: ['gerencia', 'finanzas', 'admin']
      },
      {
        id: "ejercicios-contables",
        label: "Ejercicios contables",
        icon: CalendarDays,
        href: "/contabilidad/ejercicios",
        requiredRoles: ['gerencia', 'finanzas', 'admin']
      },
      {
        id: "reportes-contables",
        label: "Reportes",
        icon: BarChart3,
        href: "/contabilidad/reportes",
        requiredRoles: ['gerencia', 'finanzas', 'admin']
      },
    ]
  },
  {
    id: "administracion",
    title: "Administración",
    icon: Settings,
    requiredRoles: ['admin', 'gerencia', 'superadmin'], // Admin, gerencia y superadmin
    items: [
      { 
        id: "proveedores", 
        label: "Proveedores", 
        icon: Truck, 
        href: "/proveedores",
        requiredRoles: ['admin', 'gerencia', 'superadmin']
      },
      { 
        id: "bancos", 
        label: "Bancos", 
        icon: Building2, 
        href: "/bancos",
        requiredRoles: ['admin', 'gerencia', 'superadmin']
      },
      {
        id: "centro-cuentas",
        label: "Centro de cuentas",
        icon: UserPlus,
        href: "/centro-cuentas",
        requiredRoles: ['admin', 'gerencia', 'superadmin']
      },
      { 
        id: "configuracion", 
        label: "Configuración", 
        icon: Shield, 
        href: "/configuracion",
        requiredRoles: ['admin', 'gerencia', 'superadmin'] // Admin y gerencia pueden gestionar roles y permisos
      },
    ]
  },
  {
    id: "desarrollo",
    title: "Desarrollo",
    icon: HeartPulse,
    requiredRoles: ['superadmin'],
    items: [
      {
        id: "salud-sistema",
        label: "Salud del sistema",
        icon: Activity,
        href: "/salud-sistema",
        requiredRoles: ['superadmin'],
      },
    ],
  },
]

/** Grupos del sidebar colapsados al iniciar (el resto quedan abiertos). */
export const MENU_GROUP_IDS_COLLAPSED_BY_DEFAULT: readonly string[] = [
  "contabilidad",
  "administracion",
]

// Función helper para verificar si un rol tiene acceso a un item
export function hasRoleAccess(userRole: Role | undefined, requiredRoles?: Role[]): boolean {
  if (!userRole) return false
  if (userRole === 'superadmin') return true
  if (!requiredRoles || requiredRoles.length === 0) return true
  return requiredRoles.includes(userRole)
}

// Función helper para verificar si un rol tiene acceso a un grupo
export function hasGroupAccess(userRole: Role | undefined, requiredRoles?: Role[]): boolean {
  return hasRoleAccess(userRole, requiredRoles)
}

// Mapeo de roles a nombres legibles en español
export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrador',
  manager: 'Gerente',
  employee: 'Empleado',
  viewer: 'Visualizador',
  gerencia: 'Gerencia',
  ventas: 'Ventas',
  logistica: 'Logística',
  finanzas: 'Finanzas',
  superadmin: 'Super Admin (Dev)',
}
