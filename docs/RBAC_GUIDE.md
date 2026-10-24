# Guía del Sistema RBAC (Role-Based Access Control)

Este documento explica cómo usar el sistema de control de acceso basado en roles implementado en el ERP, integrado con el backend JWT.

## 📋 Descripción General

El sistema RBAC permite controlar qué elementos del menú y páginas puede ver cada usuario según su rol. Esto garantiza que cada usuario solo tenga acceso a las funcionalidades apropiadas para su nivel de autorización.

## 🔗 Integración con Backend

El sistema está completamente integrado con el backend JWT:

- **Base URL**: `http://localhost:8083/api`
- **Autenticación**: JWT en header `Authorization: Bearer`
- **Formato de respuesta**: `ApiResponse` estándar con `success`, `message`, `data`, `error`, `timestamp`
- **Endpoints principales**:
  - `POST /auth/login` - Autenticación
  - `GET /auth/me` - Obtener usuario autenticado
  - `GET /products` - Listar productos (roles: gerencia, ventas, logistica, finanzas)
  - `POST /products` - Crear producto (solo gerencia)
  - `PUT /products/:id/stock` - Actualizar stock (gerencia, logistica)

## 🔐 Roles Disponibles

El sistema define los siguientes roles:

| Rol | Descripción | Nivel de Acceso |
|-----|-------------|-----------------|
| `admin` | Administrador del sistema | Acceso completo |
| `gerencia` | Gerencia | Acceso a gestión y administración |
| `manager` | Gerente | Acceso a gestión |
| `ventas` | Ventas | Acceso a módulos de ventas |
| `logistica` | Logística | Acceso a inventario y logística |
| `finanzas` | Finanzas | Acceso a módulos financieros |
| `employee` | Empleado | Acceso limitado |
| `viewer` | Visualizador | Solo lectura |

## 🏗️ Arquitectura del Sistema

### Archivos Principales

1. **`app/config/menu.ts`** - Configuración del menú con roles requeridos
2. **`app/lib/menuAuth.ts`** - Utilidades para filtrar menú por rol
3. **`app/hooks/useRole.ts`** - Hook personalizado para trabajar con roles
4. **`components/protected.tsx`** - Componente para proteger páginas
5. **`app/403/page.tsx`** - Página de acceso denegado

### Estructura del Menú

El menú está organizado en grupos con roles específicos:

```typescript
{
  id: "administracion",
  title: "Administración",
  icon: Settings,
  requiredRoles: ['admin', 'gerencia'], // Solo admin y gerencia
  items: [
    {
      id: "personal",
      label: "Personal",
      href: "/personal",
      requiredRoles: ['admin', 'gerencia']
    }
  ]
}
```

## 🚀 Uso del Sistema

### 1. Proteger una Página Completa

```tsx
import { Protected } from "@/components/protected"

export default function PersonalPage() {
  return (
    <Protected requiredRoles={['admin', 'gerencia']}>
      <div>Contenido de la página</div>
    </Protected>
  )
}
```

### 2. Verificar Permisos en Componentes

```tsx
import { useRole } from "@/app/hooks/useRole"

export default function MiComponente() {
  const { canViewSales, isAdmin, hasAnyOfRoles } = useRole()
  
  return (
    <div>
      {canViewSales() && (
        <div>Contenido solo para ventas</div>
      )}
      
      {isAdmin() && (
        <div>Contenido solo para admin</div>
      )}
      
      {hasAnyOfRoles(['gerencia', 'admin']) && (
        <div>Contenido para gerencia o admin</div>
      )}
    </div>
  )
}
```

### 3. Verificar Acceso a Rutas

```tsx
import { useRouteAccess } from "@/components/protected"

export default function MiComponente() {
  const canAccessPersonal = useRouteAccess('/personal')
  
  return (
    <div>
      {canAccessPersonal && (
        <Link href="/personal">Gestionar Personal</Link>
      )}
    </div>
  )
}
```

### 4. Usar Funciones de la API

```tsx
import { getProducts, createProductNew, updateProductStock } from "@/lib/api"
import { useRole } from "@/app/hooks/useRole"

export default function ProductosComponent() {
  const { canViewSales, canViewLogistics, isAdmin } = useRole()
  const [products, setProducts] = useState([])

  const loadProducts = async () => {
    try {
      const data = await getProducts() // Roles: gerencia, ventas, logistica, finanzas
      setProducts(data)
    } catch (error) {
      console.error('Error:', error.message)
    }
  }

  const createProduct = async () => {
    if (!isAdmin()) {
      alert('No tienes permisos para crear productos')
      return
    }

    try {
      await createProductNew({
        code: 'P-001',
        name: 'Nuevo Producto',
        price: 100,
        stock: 10,
        min_stock: 2,
        max_stock: 50
      })
    } catch (error) {
      console.error('Error:', error.message)
    }
  }

  const updateStock = async (id: number) => {
    if (!canViewLogistics()) {
      alert('No tienes permisos para actualizar stock')
      return
    }

    try {
      await updateProductStock(id, {
        stock: 20,
        operation: 'set'
      })
    } catch (error) {
      console.error('Error:', error.message)
    }
  }

  return (
    <div>
      {canViewSales() && (
        <div>Lista de productos...</div>
      )}
      
      {isAdmin() && (
        <Button onClick={createProduct}>Crear Producto</Button>
      )}
      
      {canViewLogistics() && (
        <Button onClick={() => updateStock(1)}>Actualizar Stock</Button>
      )}
    </div>
  )
}
```

## 🎯 Ejemplos Prácticos

### Dashboard Personalizado por Rol

```tsx
import { useRole } from "@/app/hooks/useRole"

export default function Dashboard() {
  const { getCurrentRoleLabel, canViewSales, canViewLogistics } = useRole()
  
  return (
    <div>
      <h1>Dashboard - {getCurrentRoleLabel()}</h1>
      
      {canViewSales() && (
        <Card>
          <h3>Métricas de Ventas</h3>
          <p>Información específica para ventas</p>
        </Card>
      )}
      
      {canViewLogistics() && (
        <Card>
          <h3>Estado del Inventario</h3>
          <p>Información específica para logística</p>
        </Card>
      )}
    </div>
  )
}
```

### Botones Condicionales

```tsx
import { useRole } from "@/app/hooks/useRole"

export default function Toolbar() {
  const { canViewAdministration, isAdmin } = useRole()
  
  return (
    <div className="toolbar">
      <Button>Acción General</Button>
      
      {canViewAdministration() && (
        <Button>Gestionar Usuarios</Button>
      )}
      
      {isAdmin() && (
        <Button variant="destructive">Configuración Avanzada</Button>
      )}
    </div>
  )
}
```

## 🔧 Configuración de Nuevos Elementos

### Agregar un Nuevo Item al Menú

1. Editar `app/config/menu.ts`
2. Agregar el item con los roles requeridos:

```typescript
{
  id: "nuevo_modulo",
  label: "Nuevo Módulo",
  icon: NuevoIcon,
  href: "/nuevo-modulo",
  requiredRoles: ['admin', 'gerencia']
}
```

### Crear una Nueva Página Protegida

1. Crear la página en `app/nuevo-modulo/page.tsx`
2. Protegerla con el componente `Protected`:

```tsx
import { Protected } from "@/components/protected"

export default function NuevoModuloPage() {
  return (
    <Protected requiredRoles={['admin', 'gerencia']}>
      <div>Contenido del nuevo módulo</div>
    </Protected>
  )
}
```

## 🛡️ Seguridad

### Principios de Seguridad

1. **Defensa en Profundidad**: La seguridad se implementa tanto en frontend como backend
2. **Principio de Menor Privilegio**: Los usuarios solo ven lo que necesitan
3. **Validación del Backend**: El frontend solo oculta elementos, el backend valida realmente

### Buenas Prácticas

- ✅ Siempre proteger páginas sensibles con `Protected`
- ✅ Usar `useRole` para mostrar/ocultar elementos condicionalmente
- ✅ Mantener la configuración de roles centralizada en `menu.ts`
- ✅ Documentar qué roles pueden acceder a cada funcionalidad
- ❌ No confiar solo en la ocultación del frontend
- ❌ No hardcodear roles en múltiples lugares

## 🐛 Debugging

### Verificar Roles del Usuario

```tsx
import { useRole } from "@/app/hooks/useRole"

export default function DebugInfo() {
  const { getCurrentRole, getCurrentRoleLabel, hasAnyOfRoles } = useRole()
  
  console.log('Rol actual:', getCurrentRole())
  console.log('Etiqueta del rol:', getCurrentRoleLabel())
  console.log('Puede ver ventas:', hasAnyOfRoles(['ventas']))
  
  return (
    <div>
      <p>Rol: {getCurrentRole()}</p>
      <p>Etiqueta: {getCurrentRoleLabel()}</p>
    </div>
  )
}
```

### Verificar Acceso a Rutas

```tsx
import { canAccessRoute } from "@/app/lib/menuAuth"
import { MENU_GROUPS } from "@/app/config/menu"

const userRole = 'ventas'
const canAccess = canAccessRoute('/personal', userRole, MENU_GROUPS)
console.log('Puede acceder a personal:', canAccess) // false
```

## 📚 API Reference

### Hook `useRole`

```typescript
const {
  userRole,                    // Rol actual del usuario
  isRole,                     // Verifica si tiene un rol específico
  hasAnyOfRoles,              // Verifica si tiene alguno de los roles
  isRoleOrHigher,             // Verifica si tiene el rol o uno superior
  isAdmin,                    // Verifica si es admin
  isManagement,               // Verifica si es de gerencia
  canViewSales,               // Verifica si puede ver ventas
  canViewLogistics,           // Verifica si puede ver logística
  canViewFinance,             // Verifica si puede ver finanzas
  canViewAdministration,      // Verifica si puede ver administración
  getCurrentRole,             // Obtiene el rol actual
  getCurrentRoleLabel         // Obtiene la etiqueta del rol
} = useRole()
```

### Componente `Protected`

```typescript
<Protected
  requiredRoles={['admin', 'gerencia']}  // Roles requeridos
  fallback={<div>Acceso denegado</div>}   // Contenido si no tiene acceso
  redirectTo="/custom-403"               // Ruta personalizada para redirección
>
  <div>Contenido protegido</div>
</Protected>
```

### Utilidades de `menuAuth`

```typescript
import { 
  filterMenuGroupsByRole,    // Filtra grupos por rol
  canAccessRoute,           // Verifica acceso a ruta
  getRolesForRoute,         // Obtiene roles para una ruta
  hasRole,                  // Verifica si tiene un rol
  hasAnyRole,               // Verifica si tiene alguno de los roles
  getRoleAccessLevel,       // Obtiene nivel de acceso del rol
  hasRoleOrHigher           // Verifica si tiene rol o superior
} from "@/app/lib/menuAuth"
```

## 🎉 Conclusión

El sistema RBAC implementado proporciona una base sólida para controlar el acceso a diferentes partes del ERP. Es extensible, mantenible y sigue las mejores prácticas de seguridad.

Para cualquier duda o mejora, consultar la documentación del código o contactar al equipo de desarrollo.
