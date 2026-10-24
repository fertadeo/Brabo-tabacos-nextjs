# Sistema de Roles y Permisos - Documentación para Frontend

## 📋 Tabla de Contenidos

1. [Introducción](#introducción)
2. [Conceptos Fundamentales](#conceptos-fundamentales)
3. [Roles Disponibles](#roles-disponibles)
4. [Permisos por Módulo](#permisos-por-módulo)
5. [Endpoints de la API](#endpoints-de-la-api)
6. [Permisos Excepcionales a Usuarios](#permisos-excepcionales-a-usuarios) ⭐
7. [Ejemplos de Uso](#ejemplos-de-uso)
8. [Cómo Implementar en el Frontend](#cómo-implementar-en-el-frontend)

---

## Introducción

El sistema de roles y permisos del ERP Norte Abanicos permite gestionar de forma granular qué acciones puede realizar cada usuario o rol en el sistema. Este sistema proporciona:

- **Roles predefinidos**: Para agrupar usuarios con funciones similares
- **Permisos granulares**: Para controlar acciones específicas (crear, ver, actualizar, eliminar)
- **Asignación flexible**: Permisos pueden asignarse tanto a roles como a usuarios individuales
- **Permisos temporales**: Los permisos directos a usuarios pueden tener fecha de expiración

---

## Conceptos Fundamentales

### Roles
Los roles son grupos predefinidos que tienen un conjunto de permisos asociados. Los usuarios tienen un rol principal, pero también pueden tener permisos adicionales asignados directamente.

### Permisos
Los permisos son acciones específicas que pueden realizarse en el sistema. Cada permiso tiene:
- **Código único**: Identificador del permiso (ej: `products.create`)
- **Módulo**: Módulo al que pertenece (ej: `products`, `orders`)
- **Descripción**: Descripción legible del permiso

### Jerarquía de Permisos
Los usuarios obtienen permisos de dos fuentes:
1. **Permisos del rol**: Heredados del rol asignado al usuario
2. **Permisos directos**: Asignados específicamente al usuario (pueden tener expiración)

Si un usuario tiene un permiso de cualquiera de estas fuentes, puede realizar la acción.

---

## Roles Disponibles

### 1. **admin**
- **Descripción**: Administrador del sistema
- **Permisos**: Tiene TODOS los permisos del sistema automáticamente
- **Uso**: Acceso completo para configuración y gestión del sistema

### 2. **gerencia**
- **Descripción**: Personal gerencial
- **Permisos**: Visualización y gestión general de todos los módulos, excepto gestión completa de usuarios
- **Uso**: Gestión operativa del ERP

### 3. **ventas**
- **Descripción**: Personal del área de ventas
- **Permisos**: 
  - Ver productos y estadísticas
  - Crear y gestionar pedidos
  - Ver y crear clientes
  - Ver dashboard
  - Ver y crear pagos
- **Uso**: Gestión de ventas y atención al cliente

### 4. **logistica**
- **Descripción**: Personal del área de logística
- **Permisos**:
  - Ver productos y gestionar stock
  - Ver pedidos y actualizar estados de remito
  - Ver compras
  - Gestionar remitos (crear, actualizar, despachar, entregar)
  - Ver y gestionar trazabilidad
- **Uso**: Gestión de inventario y logística de pedidos

### 5. **finanzas**
- **Descripción**: Personal del área financiera
- **Permisos**:
  - Ver productos y estadísticas
  - Ver pedidos y estadísticas
  - Gestionar compras (crear, actualizar, gestionar proveedores)
  - Ver clientes
  - Gestionar caja (ver, gastos, exportar)
  - Gestionar pagos (crear, actualizar, eliminar)
  - Ver dashboard y estadísticas
- **Uso**: Gestión financiera y contable

### 6. **manager**
- **Descripción**: Gerentes de área
- **Permisos**: Similar a gerencia pero sin gestión de usuarios (solo visualización)
- **Uso**: Gestión operativa con restricciones de usuarios

### 7. **employee**
- **Descripción**: Empleados generales
- **Permisos básicos**:
  - Ver productos
  - Ver y crear pedidos
  - Ver clientes
  - Ver dashboard
- **Uso**: Operaciones básicas del día a día

### 8. **viewer**
- **Descripción**: Usuarios de solo lectura
- **Permisos**: Solo visualización (todos los permisos que terminan en `.view`, `.view_stats`, `.view_activities`)
- **Uso**: Consultas y reportes sin capacidad de modificación

---

## Permisos por Módulo

### Módulo: Products (Productos)

| Código | Nombre | Descripción |
|--------|--------|-------------|
| `products.view` | Ver productos | Permite ver el listado y detalles de productos |
| `products.create` | Crear productos | Permite crear nuevos productos |
| `products.update` | Actualizar productos | Permite modificar productos existentes |
| `products.delete` | Eliminar productos | Permite eliminar productos (soft delete) |
| `products.delete_permanent` | Eliminación permanente | Permite eliminar productos permanentemente |
| `products.manage_stock` | Gestionar stock | Permite actualizar el stock de productos |
| `products.view_stats` | Ver estadísticas | Permite ver estadísticas del módulo de productos |

### Módulo: Orders (Pedidos)

| Código | Nombre | Descripción |
|--------|--------|-------------|
| `orders.view` | Ver pedidos | Permite ver el listado y detalles de pedidos |
| `orders.create` | Crear pedidos | Permite crear nuevos pedidos |
| `orders.update` | Actualizar pedidos | Permite modificar pedidos existentes |
| `orders.delete` | Eliminar pedidos | Permite eliminar pedidos |
| `orders.view_stats` | Ver estadísticas | Permite ver estadísticas del módulo de pedidos |
| `orders.reserve_stock` | Reservar stock | Permite reservar stock para pedidos |
| `orders.update_remito_status` | Actualizar estado de remito | Permite actualizar el estado de remito de pedidos |

### Módulo: Purchases (Compras)

| Código | Nombre | Descripción |
|--------|--------|-------------|
| `purchases.view` | Ver compras | Permite ver el listado y detalles de compras |
| `purchases.create` | Crear compras | Permite crear nuevas compras |
| `purchases.update` | Actualizar compras | Permite modificar compras existentes |
| `purchases.delete` | Eliminar compras | Permite eliminar compras |
| `purchases.view_stats` | Ver estadísticas | Permite ver estadísticas del módulo de compras |
| `purchases.manage_items` | Gestionar items | Permite gestionar items de compras |
| `purchases.manage_suppliers` | Gestionar proveedores | Permite gestionar proveedores |

### Módulo: Clients (Clientes)

| Código | Nombre | Descripción |
|--------|--------|-------------|
| `clients.view` | Ver clientes | Permite ver el listado y detalles de clientes |
| `clients.create` | Crear clientes | Permite crear nuevos clientes |
| `clients.update` | Actualizar clientes | Permite modificar clientes existentes |
| `clients.delete` | Eliminar clientes | Permite eliminar clientes |
| `clients.view_stats` | Ver estadísticas | Permite ver estadísticas del módulo de clientes |

### Módulo: Cash (Caja)

| Código | Nombre | Descripción |
|--------|--------|-------------|
| `cash.view` | Ver resumen de caja | Permite ver resúmenes de caja (día, período, mensual) |
| `cash.manage_expenses` | Gestionar gastos | Permite crear y gestionar gastos operativos |
| `cash.export` | Exportar movimientos | Permite exportar movimientos de caja |

### Módulo: Payments (Pagos)

| Código | Nombre | Descripción |
|--------|--------|-------------|
| `payments.view` | Ver pagos | Permite ver el listado y detalles de pagos |
| `payments.create` | Crear pagos | Permite crear nuevos pagos |
| `payments.update` | Actualizar pagos | Permite modificar pagos existentes |
| `payments.delete` | Eliminar pagos | Permite eliminar pagos |

### Módulo: Dashboard

| Código | Nombre | Descripción |
|--------|--------|-------------|
| `dashboard.view` | Ver dashboard | Permite acceder al dashboard principal |
| `dashboard.view_stats` | Ver estadísticas | Permite ver estadísticas en el dashboard |
| `dashboard.view_activities` | Ver actividades | Permite ver actividades recientes en el dashboard |

### Módulo: Logistics (Logística)

| Código | Nombre | Descripción |
|--------|--------|-------------|
| `logistics.view_remitos` | Ver remitos | Permite ver remitos de logística |
| `logistics.create_remitos` | Crear remitos | Permite crear nuevos remitos |
| `logistics.update_remitos` | Actualizar remitos | Permite modificar remitos |
| `logistics.delete_remitos` | Eliminar remitos | Permite eliminar remitos |
| `logistics.manage_remito_status` | Gestionar estados | Permite cambiar estados de remitos (preparar, despachar, entregar) |
| `logistics.view_trazabilidad` | Ver trazabilidad | Permite ver trazabilidad de remitos |
| `logistics.manage_trazabilidad` | Gestionar trazabilidad | Permite crear y actualizar trazabilidad |

### Módulo: Users (Usuarios y Roles)

| Código | Nombre | Descripción |
|--------|--------|-------------|
| `users.view` | Ver usuarios | Permite ver el listado de usuarios |
| `users.create` | Crear usuarios | Permite crear nuevos usuarios |
| `users.update` | Actualizar usuarios | Permite modificar usuarios existentes |
| `users.delete` | Eliminar usuarios | Permite eliminar usuarios |
| `users.manage_roles` | Gestionar roles | Permite gestionar roles del sistema |
| `users.manage_permissions` | Gestionar permisos | Permite gestionar permisos del sistema |
| `users.assign_permissions` | Asignar permisos | Permite asignar permisos a roles y usuarios |

---

## Endpoints de la API

### Base URL
Todas las rutas comienzan con `/api/roles` o `/api/users`

### Autenticación
**TODAS las rutas requieren autenticación JWT mediante el header:**
```
Authorization: Bearer <token>
```

⚠️ **IMPORTANTE**: Todos los endpoints de usuarios y roles requieren el Bearer token en el header. Sin el token, recibirás un error 401 (Unauthorized).

---

### 🔐 PERMISOS

#### GET `/api/roles/permissions`
Obtener todos los permisos del sistema.

**Permisos requeridos**: `admin`, `gerencia`

**Query Parameters**:
- `module` (opcional): Filtrar por módulo (ej: `products`, `orders`)
- `is_active` (opcional): Filtrar por estado activo (`true`/`false`)

**Ejemplo de respuesta**:
```json
{
  "success": true,
  "message": "Permisos obtenidos exitosamente",
  "data": [
    {
      "id": 1,
      "name": "Ver productos",
      "code": "products.view",
      "module": "products",
      "description": "Permite ver el listado y detalles de productos",
      "is_active": true,
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

#### GET `/api/roles/permissions/modules`
Obtener lista de módulos únicos.

**Permisos requeridos**: `admin`, `gerencia`

**Ejemplo de respuesta**:
```json
{
  "success": true,
  "message": "Módulos obtenidos exitosamente",
  "data": [
    "cash",
    "clients",
    "dashboard",
    "logistics",
    "orders",
    "payments",
    "products",
    "purchases",
    "users"
  ],
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

#### GET `/api/roles/permissions/:id`
Obtener un permiso por ID.

**Permisos requeridos**: `admin`, `gerencia`

**Ejemplo de respuesta**:
```json
{
  "success": true,
  "message": "Permiso obtenido exitosamente",
  "data": {
    "id": 1,
    "name": "Ver productos",
    "code": "products.view",
    "module": "products",
    "description": "Permite ver el listado y detalles de productos",
    "is_active": true,
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

#### POST `/api/roles/permissions`
Crear un nuevo permiso.

**Permisos requeridos**: `admin`

**Body**:
```json
{
  "name": "Nuevo permiso",
  "code": "module.action",
  "module": "module",
  "description": "Descripción del permiso",
  "is_active": true
}
```

**Campos requeridos**:
- `name`: Nombre del permiso
- `code`: Código único del permiso
- `module`: Módulo al que pertenece

#### PUT `/api/roles/permissions/:id`
Actualizar un permiso existente.

**Permisos requeridos**: `admin`

**Body** (todos los campos son opcionales):
```json
{
  "name": "Nombre actualizado",
  "code": "module.action",
  "module": "module",
  "description": "Descripción actualizada",
  "is_active": false
}
```

#### DELETE `/api/roles/permissions/:id`
Eliminar un permiso.

**Permisos requeridos**: `admin`

---

### 👥 ROLES Y PERMISOS

#### GET `/api/roles`
Obtener lista de todos los roles disponibles en el sistema.

**Permisos requeridos**: `admin`, `gerencia`

**Ejemplo de respuesta**:
```json
{
  "success": true,
  "message": "Roles obtenidos exitosamente",
  "data": [
    {
      "code": "admin",
      "name": "Administrador",
      "description": "Acceso completo al sistema"
    },
    {
      "code": "gerencia",
      "name": "Gerencia",
      "description": "Personal gerencial con gestión operativa"
    },
    {
      "code": "ventas",
      "name": "Ventas",
      "description": "Personal del área de ventas"
    },
    {
      "code": "logistica",
      "name": "Logística",
      "description": "Personal del área de logística e inventario"
    },
    {
      "code": "finanzas",
      "name": "Finanzas",
      "description": "Personal del área financiera"
    },
    {
      "code": "manager",
      "name": "Manager",
      "description": "Gerentes de área"
    },
    {
      "code": "employee",
      "name": "Empleado",
      "description": "Empleados generales"
    },
    {
      "code": "viewer",
      "name": "Visualizador",
      "description": "Usuarios de solo lectura"
    }
  ],
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

#### GET `/api/roles/summary`
Obtener resumen de permisos por rol.

**Permisos requeridos**: `admin`, `gerencia`

**Ejemplo de respuesta**:
```json
{
  "success": true,
  "message": "Resumen de permisos por rol obtenido exitosamente",
  "data": {
    "admin": [
      {
        "id": 1,
        "name": "Ver productos",
        "code": "products.view",
        "module": "products",
        ...
      }
    ],
    "gerencia": [...],
    "ventas": [...],
    "logistica": [...],
    "finanzas": [...],
    "manager": [...],
    "employee": [...],
    "viewer": [...]
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

#### GET `/api/roles/:role/permissions`
Obtener permisos de un rol específico.

**Permisos requeridos**: `admin`, `gerencia`

**Parámetros**:
- `role`: Uno de: `admin`, `manager`, `employee`, `viewer`, `gerencia`, `ventas`, `logistica`, `finanzas`

**Ejemplo**:
```
GET /api/roles/ventas/permissions
```

#### POST `/api/roles/:role/permissions`
Asignar un permiso a un rol.

**Permisos requeridos**: `admin`

**Body**:
```json
{
  "permission_id": 1
}
```

**Parámetros**:
- `role`: Uno de los roles válidos

#### DELETE `/api/roles/:role/permissions/:permissionId`
Remover un permiso de un rol.

**Permisos requeridos**: `admin`

---

### 👤 USUARIOS Y PERMISOS

#### GET `/api/roles/users/:userId/permissions`
Obtener todos los permisos de un usuario (rol + directos).

**Permisos requeridos**: `admin`, `gerencia`

**Ejemplo de respuesta**:
```json
{
  "success": true,
  "message": "Permisos del usuario obtenidos exitosamente",
  "data": {
    "user": {
      "id": 1,
      "username": "usuario1",
      "role": "ventas"
    },
    "permissions": [
      {
        "id": 1,
        "name": "Ver productos",
        "code": "products.view",
        "module": "products",
        ...
      }
    ],
    "rolePermissions": [
      // Permisos del rol del usuario
    ],
    "directPermissions": [
      // Permisos asignados directamente al usuario
      {
        "id": 1,
        "name": "Crear productos",
        "code": "products.create",
        "module": "products",
        "expires_at": "2024-12-31T23:59:59.000Z",
        "granted_by": 2
      }
    ]
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

#### POST `/api/roles/assign`
Asignar un permiso a un rol o usuario.

**Permisos requeridos**: `admin`

**Body**:
```json
{
  "permission_id": 1,
  "role": "ventas"  // O usar user_id en su lugar
}
```

O para usuario específico:
```json
{
  "permission_id": 1,
  "user_id": 5,
  "expires_at": "2024-12-31T23:59:59.000Z"  // Opcional, NULL = permanente
}
```

**Nota**: Debe especificar `role` O `user_id`, no ambos.

#### DELETE `/api/roles/users/:userId/permissions/:permissionId`
Remover un permiso directo de un usuario.

**Permisos requeridos**: `admin`

**Nota**: Solo remueve permisos directos, no los del rol.

---

## Permisos Excepcionales a Usuarios

### Caso de Uso: Extensiones de Permisos Individuales

El sistema permite asignar permisos adicionales a usuarios individuales **más allá de su rol base**. Esto es útil para casos excepcionales donde un usuario necesita capacidades que normalmente no tiene por su rol.

**Ejemplos comunes:**
- Un vendedor (`ventas`) que necesita generar presupuestos (normalmente solo gerencia puede)
- Un empleado (`employee`) que temporalmente necesita gestionar stock (normalmente solo logística/gerencia)
- Un usuario de logística que necesita acceso temporal a módulos financieros
- Cualquier permiso específico que se requiera por situación especial

### ¿Cómo Funciona?

1. **Permisos del Rol**: El usuario mantiene todos los permisos de su rol base (ej: `ventas`)
2. **Permisos Directos**: Se pueden agregar permisos adicionales específicos al usuario
3. **Combinación**: El usuario puede realizar acciones si tiene el permiso por **cualquiera** de las dos fuentes (rol o directo)

### Pasos para Asignar Permisos Excepcionales

#### Paso 1: Verificar qué permisos necesita el usuario

```javascript
// Obtener todos los permisos disponibles en el sistema
const allPermissions = await fetch('/api/roles/permissions', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

#### Paso 2: Identificar el permiso específico necesario

Ejemplo: Si un vendedor necesita generar presupuestos:
- Primero, el permiso debe existir en el sistema (ej: `budgets.create`)
- Si no existe, un `admin` debe crearlo primero

#### Paso 3: Asignar el permiso al usuario

```javascript
// Asignar permiso de crear presupuestos a un vendedor
// Opción A: Permanente
await fetch('/api/roles/assign', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    permission_id: 25, // ID del permiso budgets.create
    user_id: 5,        // ID del usuario vendedor
    expires_at: null   // NULL = permanente
  })
});

// Opción B: Temporal (30 días)
const expiresAt = new Date();
expiresAt.setDate(expiresAt.getDate() + 30);

await fetch('/api/roles/assign', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    permission_id: 25,
    user_id: 5,
    expires_at: expiresAt.toISOString()
  })
});
```

#### Paso 4: Verificar los permisos del usuario

```javascript
// Ver todos los permisos del usuario (rol + directos)
const userPerms = await fetch(`/api/roles/users/5/permissions`, {
  headers: { 'Authorization': `Bearer ${token}` }
});

// La respuesta incluye:
// - permissions: todos los permisos (rol + directos combinados)
// - rolePermissions: solo permisos del rol
// - directPermissions: solo permisos asignados directamente
```

#### Paso 5: Remover un permiso excepcional (si es necesario)

```javascript
// Remover permiso directo de un usuario
await fetch('/api/roles/users/5/permissions/25', {
  method: 'DELETE',
  headers: { 'Authorization': `Bearer ${adminToken}` }
});
```

### Ejemplo Completo: Panel de Gestión de Permisos Excepcionales

```javascript
// Componente React para gestionar permisos excepcionales de un usuario
function UserExceptionPermissions({ userId, userRole }) {
  const [userPermissions, setUserPermissions] = useState(null);
  const [availablePermissions, setAvailablePermissions] = useState([]);
  const [filteredPermissions, setFilteredPermissions] = useState([]);
  
  // Cargar datos
  useEffect(() => {
    loadData();
  }, [userId]);
  
  const loadData = async () => {
    const [userRes, allRes, roleRes] = await Promise.all([
      fetch(`/api/roles/users/${userId}/permissions`),
      fetch('/api/roles/permissions?is_active=true'),
      fetch(`/api/roles/${userRole}/permissions`)
    ]);
    
    const userData = await userRes.json();
    const allData = await allRes.json();
    const roleData = await roleRes.json();
    
    setUserPermissions(userData.data);
    
    // Filtrar: mostrar solo permisos que NO tiene por su rol
    const rolePermIds = roleData.data.map(p => p.id);
    const exceptions = allData.data.filter(p => !rolePermIds.includes(p.id));
    setAvailablePermissions(exceptions);
    setFilteredPermissions(exceptions);
  };
  
  const assignExceptionPermission = async (permissionId, isTemporary = false, days = 30) => {
    const body = {
      permission_id: permissionId,
      user_id: userId,
      expires_at: null
    };
    
    if (isTemporary) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + days);
      body.expires_at = expiresAt.toISOString();
    }
    
    await fetch('/api/roles/assign', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    
    loadData(); // Recargar
  };
  
  const removeExceptionPermission = async (permissionId) => {
    await fetch(`/api/roles/users/${userId}/permissions/${permissionId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    
    loadData(); // Recargar
  };
  
  return (
    <div className="exception-permissions">
      <h3>Permisos Excepcionales</h3>
      <p>Usuario: {userPermissions?.user.username} (Rol: {userRole})</p>
      
      {/* Permisos actuales del usuario (excepcionales) */}
      <div className="current-exceptions">
        <h4>Permisos Excepcionales Asignados</h4>
        {userPermissions?.directPermissions.map(perm => (
          <div key={perm.id} className="permission-item">
            <span>{perm.name} ({perm.code})</span>
            {perm.expires_at && (
              <span className="expires">
                Expira: {new Date(perm.expires_at).toLocaleDateString()}
              </span>
            )}
            <button onClick={() => removeExceptionPermission(perm.id)}>
              Remover
            </button>
          </div>
        ))}
      </div>
      
      {/* Lista de permisos disponibles para asignar */}
      <div className="available-exceptions">
        <h4>Permisos Disponibles para Asignar</h4>
        <input 
          type="text" 
          placeholder="Buscar permiso..."
          onChange={(e) => {
            const search = e.target.value.toLowerCase();
            setFilteredPermissions(
              availablePermissions.filter(p => 
                p.name.toLowerCase().includes(search) || 
                p.code.toLowerCase().includes(search)
              )
            );
          }}
        />
        {filteredPermissions.map(perm => (
          <div key={perm.id} className="permission-item">
            <span>{perm.name} ({perm.code})</span>
            <button onClick={() => assignExceptionPermission(perm.id, false)}>
              Asignar Permanente
            </button>
            <button onClick={() => assignExceptionPermission(perm.id, true, 30)}>
              Asignar 30 días
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Crear Nuevos Permisos (para casos donde no existen)

Si necesitas crear un permiso nuevo (ej: `budgets.create` para presupuestos):

```javascript
// Solo admin puede crear nuevos permisos
const createPermission = async () => {
  await fetch('/api/roles/permissions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'Crear presupuestos',
      code: 'budgets.create',
      module: 'budgets',
      description: 'Permite crear nuevos presupuestos',
      is_active: true
    })
  });
};
```

---

### 👥 USUARIOS

#### GET `/api/users`
Obtener todos los usuarios del sistema con sus roles.

**Permisos requeridos**: `admin`, `gerencia`

**Query Parameters**:
- `is_active` (opcional): Filtrar por estado activo (`true`/`false`)
- `role` (opcional): Filtrar por rol específico (ej: `ventas`, `gerencia`)

**Ejemplo de respuesta**:
```json
{
  "success": true,
  "message": "Usuarios obtenidos exitosamente",
  "data": [
    {
      "id": 1,
      "username": "admin",
      "email": "admin@norte.com",
      "firstName": "Administrador",
      "lastName": "Sistema",
      "role": "admin",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    {
      "id": 2,
      "username": "vendedor1",
      "email": "vendedor@norte.com",
      "firstName": "Juan",
      "lastName": "Pérez",
      "role": "ventas",
      "isActive": true,
      "createdAt": "2024-01-02T00:00:00.000Z",
      "updatedAt": "2024-01-02T00:00:00.000Z"
    }
  ],
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

**Ejemplo de uso**:
```javascript
// Obtener todos los usuarios
const users = await fetch('/api/users', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// Obtener solo usuarios activos
const activeUsers = await fetch('/api/users?is_active=true', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// Obtener solo usuarios con rol ventas
const salesUsers = await fetch('/api/users?role=ventas', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

#### GET `/api/users/:id`
Obtener un usuario específico por ID.

**Permisos requeridos**: `admin`, `gerencia`

**Ejemplo de respuesta**:
```json
{
  "success": true,
  "message": "Usuario obtenido exitosamente",
  "data": {
    "id": 1,
    "username": "admin",
    "email": "admin@norte.com",
    "firstName": "Administrador",
    "lastName": "Sistema",
    "role": "admin",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

**Nota de Seguridad**: Estos endpoints nunca retornan el `password_hash` del usuario por seguridad.

#### POST `/api/users`
Crear un nuevo usuario en el sistema.

**Permisos requeridos**: `admin`

**Body**:
```json
{
  "username": "nuevo_usuario",
  "password": "contraseña_segura",
  "first_name": "Juan",
  "last_name": "Pérez",
  "email": "juan.perez@empresa.com",
  "role": "ventas",
  "is_active": true
}
```

**Campos requeridos**:
- `username`: Nombre de usuario único (string)
- `password`: Contraseña del usuario (string, mínimo 6 caracteres recomendado)
- `role`: Rol del usuario (string, uno de: `admin`, `gerencia`, `ventas`, `logistica`, `finanzas`, `manager`, `employee`, `viewer`)

**Campos opcionales**:
- `first_name`: Nombre del usuario (string)
- `last_name`: Apellido del usuario (string)
- `email`: Email del usuario (string, formato válido)
- `is_active`: Estado activo del usuario (boolean, default: `true`)

**Ejemplo de respuesta**:
```json
{
  "success": true,
  "message": "Usuario creado exitosamente",
  "data": {
    "id": 5,
    "username": "nuevo_usuario",
    "email": "juan.perez@empresa.com",
    "firstName": "Juan",
    "lastName": "Pérez",
    "role": "ventas",
    "is_active": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

**⚠️ IMPORTANTE - Asignación Automática de Permisos del Rol**:
Cuando se crea un usuario con un rol, el backend **DEBE** asignar automáticamente todos los permisos estándar de ese rol. El usuario debe heredar inmediatamente todos los permisos asociados al rol asignado sin necesidad de llamadas adicionales.

#### PUT `/api/users/:id`
Actualizar un usuario existente.

**Permisos requeridos**: `admin`

**Body** (todos los campos son opcionales excepto que al menos uno debe estar presente):
```json
{
  "username": "usuario_actualizado",
  "password": "nueva_contraseña",
  "first_name": "Juan",
  "last_name": "García",
  "email": "juan.garcia@empresa.com",
  "role": "logistica",
  "is_active": false
}
```

**⚠️ IMPORTANTE - Actualización de Permisos al Cambiar Rol**:
Cuando se actualiza el `role` de un usuario, el backend **DEBE**:
1. Remover los permisos del rol anterior (excepto permisos directos/excepcionales)
2. Asignar automáticamente todos los permisos del nuevo rol
3. Mantener intactos los permisos excepcionales (directos) asignados al usuario

**Ejemplo de respuesta**:
```json
{
  "success": true,
  "message": "Usuario actualizado exitosamente",
  "data": {
    "id": 5,
    "username": "usuario_actualizado",
    "email": "juan.garcia@empresa.com",
    "firstName": "Juan",
    "lastName": "García",
    "role": "logistica",
    "is_active": false,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T12:00:00.000Z"
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

#### DELETE `/api/users/:id`
Eliminar un usuario del sistema.

**Permisos requeridos**: `admin`

**Ejemplo de respuesta**:
```json
{
  "success": true,
  "message": "Usuario eliminado exitosamente",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

**Nota**: Se recomienda realizar un soft delete (marcar como inactivo) en lugar de eliminar físicamente el registro.

---

## Ejemplos de Uso

### Ejemplo 1: Verificar si un usuario puede crear productos

```javascript
// Después de obtener los permisos del usuario
const userPermissions = await fetch('/api/roles/users/5/permissions', {
  headers: { 'Authorization': `Bearer ${token}` }
});

const hasPermission = userPermissions.data.permissions.some(
  p => p.code === 'products.create'
);

if (hasPermission) {
  // Mostrar botón de crear producto
}
```

### Ejemplo 2: Asignar un permiso temporal a un usuario

```javascript
// Asignar permiso de creación de productos por 30 días
const expiresAt = new Date();
expiresAt.setDate(expiresAt.getDate() + 30);

await fetch('/api/roles/assign', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    permission_id: 2, // products.create
    user_id: 5,
    expires_at: expiresAt.toISOString()
  })
});
```

### Ejemplo 3: Obtener todos los permisos de un módulo

```javascript
// Obtener todos los permisos del módulo de productos
const permissions = await fetch('/api/roles/permissions?module=products', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### Ejemplo 4: Obtener lista de usuarios con sus roles

```javascript
// Obtener todos los usuarios con Bearer token
const users = await fetch('/api/users', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

const usersData = await users.json();
console.log('Usuarios:', usersData.data);
```

### Ejemplo 5: Obtener lista de todos los roles disponibles

```javascript
// Obtener todos los roles disponibles (solo admin y gerencia)
const roles = await fetch('/api/roles', {
  headers: { 'Authorization': `Bearer ${token}` }
});

const rolesData = await roles.json();
console.log('Roles disponibles:', rolesData.data);
```

### Ejemplo 6: Ver qué permisos tiene un rol

```javascript
// Ver permisos del rol "ventas"
const rolePermissions = await fetch('/api/roles/ventas/permissions', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

---

## Cómo Implementar en el Frontend

### 1. Obtención de Permisos del Usuario Actual

Después del login, obtener los permisos del usuario:

```javascript
// En el servicio de autenticación
async function getUserPermissions(userId, token) {
  const response = await fetch(`/api/roles/users/${userId}/permissions`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await response.json();
  return data.data.permissions.map(p => p.code);
}

// Guardar en estado (React/Redux/Vuex, etc.)
const permissions = await getUserPermissions(user.id, token);
// Guardar en: localStorage, Context, Store, etc.
```

### 2. Hook/Utilidad para Verificar Permisos

```javascript
// React Hook ejemplo
function usePermissions() {
  const [permissions, setPermissions] = useState([]);
  
  useEffect(() => {
    // Cargar permisos del usuario
    const loadPermissions = async () => {
      const user = JSON.parse(localStorage.getItem('user'));
      const token = localStorage.getItem('token');
      const perms = await getUserPermissions(user.id, token);
      setPermissions(perms);
    };
    loadPermissions();
  }, []);
  
  const hasPermission = (code) => {
    return permissions.includes(code);
  };
  
  const hasAnyPermission = (codes) => {
    return codes.some(code => permissions.includes(code));
  };
  
  const hasAllPermissions = (codes) => {
    return codes.every(code => permissions.includes(code));
  };
  
  return { permissions, hasPermission, hasAnyPermission, hasAllPermissions };
}
```

### 3. Componente de Protección de Rutas

```javascript
// React Router ejemplo
function ProtectedRoute({ permission, children }) {
  const { hasPermission } = usePermissions();
  
  if (!hasPermission(permission)) {
    return <Navigate to="/unauthorized" />;
  }
  
  return children;
}

// Uso:
<Route path="/products/create" element={
  <ProtectedRoute permission="products.create">
    <CreateProduct />
  </ProtectedRoute>
} />
```

### 4. Componente de Botón Condicional

```javascript
// Botón que solo se muestra si tiene permiso
function CreateProductButton() {
  const { hasPermission } = usePermissions();
  
  if (!hasPermission('products.create')) {
    return null;
  }
  
  return <button onClick={handleCreate}>Crear Producto</button>;
}
```

### 5. Directiva para Vue.js

```javascript
// Vue.js directive
app.directive('permission', {
  mounted(el, binding) {
    const permissions = JSON.parse(localStorage.getItem('permissions') || '[]');
    if (!permissions.includes(binding.value)) {
      el.style.display = 'none';
      // O: el.remove();
    }
  }
});

// Uso:
// <button v-permission="'products.create'">Crear</button>
```

### 6. Guard para Angular

```typescript
// Angular Guard
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private authService: AuthService) {}
  
  canActivate(route: ActivatedRouteSnapshot): boolean {
    const requiredPermission = route.data['permission'];
    const userPermissions = this.authService.getUserPermissions();
    return userPermissions.includes(requiredPermission);
  }
}

// En routing:
{
  path: 'products/create',
  component: CreateProductComponent,
  canActivate: [PermissionGuard],
  data: { permission: 'products.create' }
}
```

### 7. Gestión de Permisos (Panel de Admin)

```javascript
// Componente para gestionar permisos de usuarios
function UserPermissionsManager({ userId }) {
  const [userPermissions, setUserPermissions] = useState(null);
  const [allPermissions, setAllPermissions] = useState([]);
  
  useEffect(() => {
    // Cargar permisos del usuario y todos los permisos disponibles
    Promise.all([
      fetch(`/api/roles/users/${userId}/permissions`),
      fetch('/api/roles/permissions')
    ]).then(async ([userRes, allRes]) => {
      const userData = await userRes.json();
      const allData = await allRes.json();
      setUserPermissions(userData.data);
      setAllPermissions(allData.data);
    });
  }, [userId]);
  
  const assignPermission = async (permissionId, expiresAt = null) => {
    await fetch('/api/roles/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        permission_id: permissionId,
        user_id: userId,
        expires_at: expiresAt
      })
    });
    // Recargar permisos
  };
  
  const removePermission = async (permissionId) => {
    await fetch(`/api/roles/users/${userId}/permissions/${permissionId}`, {
      method: 'DELETE'
    });
    // Recargar permisos
  };
  
  // Renderizar interfaz de gestión...
}
```

---

## Códigos de Respuesta HTTP

- **200 OK**: Operación exitosa
- **201 Created**: Recurso creado exitosamente
- **400 Bad Request**: Datos inválidos
- **401 Unauthorized**: No autenticado o token inválido
- **403 Forbidden**: No tiene permisos suficientes
- **404 Not Found**: Recurso no encontrado
- **409 Conflict**: Conflicto (ej: permiso ya asignado)
- **500 Internal Server Error**: Error del servidor

---

## Notas Importantes

1. **Permisos del rol ADMIN**: El rol `admin` tiene automáticamente TODOS los permisos del sistema. No es necesario asignarlos manualmente.

2. **Permisos Excepcionales**: El sistema soporta completamente la asignación de permisos individuales a usuarios más allá de su rol. Esto permite casos como dar permisos especiales a vendedores, empleados, etc. Ver sección ["Permisos Excepcionales a Usuarios"](#permisos-excepcionales-a-usuarios).

3. **Expiración de permisos**: Los permisos directos a usuarios pueden tener fecha de expiración. Después de la fecha, el permiso se elimina automáticamente de las verificaciones.

4. **Permisos inactivos**: Los permisos con `is_active: false` no se consideran al verificar permisos, aunque estén asignados.

5. **Actualización de permisos**: Si se cambia el rol de un usuario, los permisos del rol se actualizan automáticamente. Los permisos directos (excepcionales) se mantienen intactos.

6. **Crear nuevos permisos**: Si necesitas un permiso que no existe (ej: `budgets.create`), un `admin` puede crearlo usando `POST /api/roles/permissions` y luego asignarlo a usuarios específicos.

7. **Performance**: Para mejor rendimiento, cachear los permisos del usuario en el frontend y actualizar solo cuando sea necesario.

8. **Validación del lado del servidor**: Siempre validar permisos en el backend. El frontend solo oculta/muestra elementos, pero el backend es la autoridad definitiva.

---

## 🔧 Requerimientos del Backend para Alineación con el Frontend

Esta sección documenta todos los requerimientos que el backend debe cumplir para que el frontend funcione correctamente.

### 📋 Checklist de Endpoints Requeridos

El backend **DEBE** implementar los siguientes endpoints:

#### ✅ Endpoints de Permisos
- [ ] `GET /api/roles/permissions` - Obtener todos los permisos
- [ ] `GET /api/roles/permissions?module=<module>&is_active=<boolean>` - Filtrar permisos
- [ ] `GET /api/roles/permissions/modules` - Obtener lista de módulos únicos
- [ ] `GET /api/roles/permissions/:id` - Obtener permiso por ID
- [ ] `POST /api/roles/permissions` - Crear nuevo permiso (solo admin)
- [ ] `PUT /api/roles/permissions/:id` - Actualizar permiso (solo admin)
- [ ] `DELETE /api/roles/permissions/:id` - Eliminar permiso (solo admin)

#### ✅ Endpoints de Roles
- [ ] `GET /api/roles` - Obtener lista de todos los roles disponibles
- [ ] `GET /api/roles/summary` - Obtener resumen de permisos por rol
- [ ] `GET /api/roles/:role/permissions` - Obtener permisos de un rol específico
- [ ] `POST /api/roles/:role/permissions` - Asignar permiso a un rol (solo admin)
- [ ] `DELETE /api/roles/:role/permissions/:permissionId` - Remover permiso de un rol (solo admin)

#### ✅ Endpoints de Usuarios
- [ ] `GET /api/users` - Obtener todos los usuarios
- [ ] `GET /api/users?is_active=<boolean>&role=<role>` - Filtrar usuarios
- [ ] `GET /api/users/:id` - Obtener usuario por ID
- [ ] `POST /api/users` - Crear nuevo usuario (solo admin)
- [ ] `PUT /api/users/:id` - Actualizar usuario (solo admin)
- [ ] `DELETE /api/users/:id` - Eliminar usuario (solo admin)

#### ✅ Endpoints de Permisos de Usuarios
- [ ] `GET /api/roles/users/:userId/permissions` - Obtener todos los permisos de un usuario
- [ ] `POST /api/roles/assign` - Asignar permiso a usuario o rol (solo admin)
- [ ] `DELETE /api/roles/users/:userId/permissions/:permissionId` - Remover permiso directo de usuario (solo admin)

### 🔐 Autenticación y Autorización

#### Requerimientos de Autenticación
1. **TODOS los endpoints** deben requerir autenticación JWT mediante el header:
   ```
   Authorization: Bearer <token>
   ```

2. **Validación de Token**:
   - El backend debe validar que el token sea válido y no esté expirado
   - Si el token es inválido o expirado, retornar `401 Unauthorized`
   - El token debe contener información del usuario (ID, rol, etc.)

3. **Verificación de Permisos**:
   - El backend debe verificar que el usuario tenga los permisos necesarios para cada operación
   - Si el usuario no tiene permisos, retornar `403 Forbidden`
   - Los permisos deben verificarse tanto del rol como los permisos directos del usuario

### 📊 Formato de Respuestas

#### Estructura Estándar de Respuesta Exitosa
Todas las respuestas exitosas deben seguir este formato:

```json
{
  "success": true,
  "message": "Mensaje descriptivo de la operación",
  "data": {
    // Datos de la respuesta
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

#### Estructura de Respuesta de Error
Todas las respuestas de error deben seguir este formato:

```json
{
  "success": false,
  "message": "Mensaje de error descriptivo",
  "error": "Detalles adicionales del error (opcional)",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### 👥 Gestión de Usuarios

#### POST `/api/users` - Crear Usuario

**Comportamiento Requerido**:

1. **Validación de Datos**:
   - Validar que `username` sea único
   - Validar que `password` cumpla con requisitos de seguridad (mínimo 6 caracteres recomendado)
   - Validar que `role` sea uno de los roles válidos del sistema
   - Validar formato de `email` si se proporciona

2. **Asignación Automática de Permisos del Rol** ⚠️ **CRÍTICO**:
   - Cuando se crea un usuario con un rol, el backend **DEBE** asignar automáticamente todos los permisos estándar de ese rol
   - El usuario debe heredar inmediatamente todos los permisos asociados al rol asignado
   - **NO** se debe requerir llamadas adicionales para asignar permisos del rol
   - Ejemplo: Si se crea un usuario con rol `logistica`, debe tener automáticamente todos los permisos del rol `logistica` (ver sección de permisos por rol)

3. **Hash de Contraseña**:
   - El backend debe hashear la contraseña antes de almacenarla
   - Nunca retornar la contraseña en las respuestas

4. **Campos de Respuesta**:
   - El backend debe retornar el usuario creado con los campos: `id`, `username`, `firstName`, `lastName`, `email`, `role`, `is_active`
   - Los campos `firstName` y `lastName` deben corresponder a `first_name` y `last_name` en la base de datos

#### PUT `/api/users/:id` - Actualizar Usuario

**Comportamiento Requerido**:

1. **Actualización de Permisos al Cambiar Rol** ⚠️ **CRÍTICO**:
   - Si se actualiza el campo `role` de un usuario:
     - El backend **DEBE** remover los permisos del rol anterior
     - El backend **DEBE** asignar automáticamente todos los permisos del nuevo rol
     - Los permisos directos (excepcionales) asignados al usuario **DEBEN** mantenerse intactos
   - Si el rol no cambia, mantener los permisos actuales

2. **Actualización de Contraseña**:
   - Si se proporciona `password`, debe ser hasheada antes de almacenarse
   - Si no se proporciona `password`, mantener la contraseña actual

3. **Validación**:
   - Validar que el `username` sea único (si se actualiza)
   - Validar que `role` sea válido (si se actualiza)
   - Validar formato de `email` (si se actualiza)

#### DELETE `/api/users/:id` - Eliminar Usuario

**Comportamiento Requerido**:

1. **Soft Delete Recomendado**:
   - Se recomienda realizar un soft delete (marcar `is_active = false`) en lugar de eliminar físicamente
   - Esto permite mantener el historial y relaciones

2. **Limpieza de Permisos**:
   - Al eliminar un usuario, se deben eliminar también sus permisos directos (excepcionales)
   - Los permisos del rol no necesitan eliminarse (pertenecen al rol, no al usuario)

### 🔑 Gestión de Roles y Permisos

#### GET `/api/roles` - Listar Roles

**Comportamiento Requerido**:

1. **Estructura de Respuesta**:
   ```json
   {
     "success": true,
     "message": "Roles obtenidos exitosamente",
     "data": [
       {
         "code": "admin",
         "name": "Administrador",
         "description": "Acceso completo al sistema"
       },
       {
         "code": "gerencia",
         "name": "Gerencia",
         "description": "Personal gerencial con gestión operativa"
       },
       // ... otros roles
     ],
     "timestamp": "2024-01-01T12:00:00.000Z"
   }
   ```

2. **Roles Requeridos**:
   - El backend debe tener definidos los siguientes roles: `admin`, `gerencia`, `ventas`, `logistica`, `finanzas`, `manager`, `employee`, `viewer`

#### GET `/api/roles/summary` - Resumen de Permisos por Rol

**Comportamiento Requerido**:

1. **Estructura de Respuesta**:
   ```json
   {
     "success": true,
     "message": "Resumen de permisos por rol obtenido exitosamente",
     "data": {
       "admin": [
         {
           "id": 1,
           "name": "Ver productos",
           "code": "products.view",
           "module": "products",
           "description": "Permite ver el listado y detalles de productos",
           "is_active": true
         }
         // ... más permisos
       ],
       "gerencia": [...],
       "ventas": [...],
       "logistica": [...],
       "finanzas": [...],
       "manager": [...],
       "employee": [...],
       "viewer": [...]
     },
     "timestamp": "2024-01-01T12:00:00.000Z"
   }
   ```

2. **Rol Admin Especial**:
   - El rol `admin` debe tener automáticamente TODOS los permisos del sistema
   - No es necesario almacenar permisos individuales para admin en la tabla de permisos de roles
   - El backend debe verificar siempre que si el usuario es `admin`, tiene acceso a todo

#### GET `/api/roles/:role/permissions` - Permisos de un Rol

**Comportamiento Requerido**:

1. **Validación de Rol**:
   - Validar que el `role` sea uno de los roles válidos
   - Si el rol no existe, retornar `404 Not Found`

2. **Rol Admin**:
   - Si se consulta permisos del rol `admin`, retornar todos los permisos activos del sistema
   - O retornar un array vacío con un mensaje indicando que admin tiene todos los permisos

### 👤 Gestión de Permisos de Usuarios

#### GET `/api/roles/users/:userId/permissions` - Permisos de un Usuario

**Comportamiento Requerido**:

1. **Estructura de Respuesta Completa**:
   ```json
   {
     "success": true,
     "message": "Permisos del usuario obtenidos exitosamente",
     "data": {
       "user": {
         "id": 5,
         "username": "usuario1",
         "role": "ventas",
         "firstName": "Juan",
         "lastName": "Pérez",
         "email": "juan@empresa.com"
       },
       "permissions": [
         // TODOS los permisos del usuario (rol + directos combinados)
         {
           "id": 1,
           "name": "Ver productos",
           "code": "products.view",
           "module": "products",
           "description": "Permite ver el listado y detalles de productos",
           "is_active": true
         }
       ],
       "rolePermissions": [
         // Solo permisos del rol del usuario
         {
           "id": 1,
           "name": "Ver productos",
           "code": "products.view",
           "module": "products",
           "description": "Permite ver el listado y detalles de productos",
           "is_active": true
         }
       ],
       "directPermissions": [
         // Solo permisos asignados directamente al usuario
         {
           "id": 25,
           "name": "Crear productos",
           "code": "products.create",
           "module": "products",
           "description": "Permite crear nuevos productos",
           "is_active": true,
           "expires_at": "2024-12-31T23:59:59.000Z",
           "granted_by": 2
         }
       ]
     },
     "timestamp": "2024-01-01T12:00:00.000Z"
   }
   ```

2. **Lógica de Combinación**:
   - `permissions`: Array con TODOS los permisos del usuario (rol + directos, sin duplicados)
   - `rolePermissions`: Array con solo los permisos del rol del usuario
   - `directPermissions`: Array con solo los permisos asignados directamente al usuario
   - Si un permiso está tanto en el rol como directo, debe aparecer en ambos arrays pero solo una vez en `permissions`

3. **Permisos Expirados**:
   - Los permisos directos con `expires_at` en el pasado NO deben aparecer en ninguna de las listas
   - El backend debe filtrar automáticamente los permisos expirados

#### POST `/api/roles/assign` - Asignar Permiso

**Comportamiento Requerido**:

1. **Validación de Body**:
   - Debe tener `permission_id` (requerido)
   - Debe tener `role` O `user_id` (no ambos)
   - Si tiene `user_id`, puede tener `expires_at` (opcional, formato ISO string o null)

2. **Asignación a Rol**:
   ```json
   {
     "permission_id": 1,
     "role": "ventas"
   }
   ```
   - Asigna el permiso al rol especificado
   - Todos los usuarios con ese rol heredarán automáticamente el permiso

3. **Asignación a Usuario (Permiso Excepcional)**:
   ```json
   {
     "permission_id": 25,
     "user_id": 5,
     "expires_at": "2024-12-31T23:59:59.000Z"  // o null para permanente
   }
   ```
   - Asigna el permiso directamente al usuario
   - Si `expires_at` es `null`, el permiso es permanente
   - Si `expires_at` tiene una fecha, el permiso expirará en esa fecha

4. **Validación**:
   - Validar que el permiso exista y esté activo
   - Validar que el rol o usuario exista
   - Si se asigna a un usuario, validar que no tenga ya ese permiso asignado directamente (o actualizar si existe)

#### DELETE `/api/roles/users/:userId/permissions/:permissionId` - Remover Permiso Directo

**Comportamiento Requerido**:

1. **Solo Permisos Directos**:
   - Este endpoint SOLO debe remover permisos directos (excepcionales) del usuario
   - NO debe remover permisos que vienen del rol del usuario
   - Si se intenta remover un permiso que viene del rol, retornar error apropiado

2. **Validación**:
   - Validar que el usuario exista
   - Validar que el permiso esté asignado directamente al usuario
   - Si el permiso no está asignado directamente, retornar `404 Not Found` o `400 Bad Request`

### 🔄 Flujo de Permisos al Crear/Actualizar Usuario

#### Flujo al Crear Usuario

1. Validar datos del usuario (username único, password válido, rol válido)
2. Crear el usuario en la base de datos
3. **Asignar automáticamente todos los permisos del rol**:
   - Obtener todos los permisos asociados al rol asignado
   - Crear registros en la tabla de permisos de usuarios para cada permiso del rol
   - O implementar una verificación en tiempo de ejecución que consulte los permisos del rol
4. Retornar el usuario creado con su información

#### Flujo al Actualizar Rol de Usuario

1. Validar que el nuevo rol existe
2. Si el rol cambió:
   - **Remover permisos del rol anterior** (solo los que vienen del rol, no los directos)
   - **Asignar permisos del nuevo rol** (todos los permisos del nuevo rol)
   - **Mantener permisos directos** (excepcionales) intactos
3. Si el rol no cambió, mantener todo como está
4. Actualizar el usuario en la base de datos
5. Retornar el usuario actualizado

### 📝 Estructura de Datos Esperada

#### Usuario (User)
```typescript
{
  id: number
  username: string
  firstName?: string  // o first_name en BD
  lastName?: string   // o last_name en BD
  email?: string
  role: string        // uno de: admin, gerencia, ventas, logistica, finanzas, manager, employee, viewer
  is_active?: boolean // o isActive en BD
  createdAt?: string  // o created_at en BD
  updatedAt?: string  // o updated_at en BD
}
```

**Nota**: El backend debe normalizar los nombres de campos. Si usa `snake_case` en la BD, debe convertir a `camelCase` en las respuestas JSON, o viceversa según lo que el frontend espera.

#### Permiso (Permission)
```typescript
{
  id: number
  name: string
  code: string          // formato: "module.action" (ej: "products.view")
  module: string       // módulo al que pertenece (ej: "products", "orders")
  description: string
  is_active: boolean
  created_at?: string
  updated_at?: string
}
```

#### Permiso Directo (DirectPermission)
```typescript
{
  id: number
  name: string
  code: string
  module: string
  description: string
  is_active: boolean
  expires_at?: string | null  // fecha ISO string o null para permanente
  granted_by?: number         // ID del usuario que asignó el permiso
}
```

### 🚨 Validaciones Críticas

#### Validación de Roles
- El backend debe validar que el `role` sea uno de los roles válidos del sistema
- Roles válidos: `admin`, `gerencia`, `ventas`, `logistica`, `finanzas`, `manager`, `employee`, `viewer`
- Si se envía un rol inválido, retornar `400 Bad Request` con mensaje descriptivo

#### Validación de Permisos
- El backend debe validar que el `permission_id` exista y esté activo
- Si el permiso no existe o está inactivo, retornar `404 Not Found` o `400 Bad Request`

#### Validación de Usuarios
- El backend debe validar que el `username` sea único
- Si el username ya existe, retornar `409 Conflict`
- Validar formato de email si se proporciona
- Validar que la contraseña cumpla con requisitos de seguridad

### ⚡ Rendimiento y Optimización

#### Caché de Permisos
- Se recomienda implementar caché de permisos por rol para mejorar el rendimiento
- Los permisos de roles no cambian frecuentemente, por lo que son candidatos ideales para caché

#### Consultas Eficientes
- Al obtener permisos de un usuario, usar JOINs eficientes en lugar de múltiples consultas
- Considerar índices en las tablas de relaciones usuario-permiso y rol-permiso

### 🔒 Seguridad

#### Protección de Rutas
- Todos los endpoints de gestión de usuarios y permisos deben estar protegidos
- Solo usuarios con rol `admin` pueden crear, actualizar y eliminar usuarios
- Solo usuarios con rol `admin` o `gerencia` pueden ver usuarios y permisos

#### Validación de Permisos en Cada Request
- El backend debe verificar permisos en cada request, no confiar en el frontend
- Verificar tanto permisos del rol como permisos directos del usuario
- Considerar permisos expirados (no aplicar si `expires_at` está en el pasado)

#### Logging y Auditoría
- Se recomienda registrar todas las operaciones de creación, actualización y eliminación de usuarios
- Registrar asignación y remoción de permisos excepcionales
- Mantener registro de quién asignó permisos (`granted_by`)

### 📋 Casos de Uso Específicos

#### Caso 1: Crear Usuario con Rol Logística
**Request**:
```json
POST /api/users
{
  "username": "logistica1",
  "password": "password123",
  "first_name": "María",
  "last_name": "González",
  "email": "maria@empresa.com",
  "role": "logistica",
  "is_active": true
}
```

**Comportamiento Esperado del Backend**:
1. Validar datos
2. Crear usuario en BD
3. **Asignar automáticamente todos los permisos del rol `logistica`**:
   - `logistics.view_remitos`
   - `logistics.create_remitos`
   - `logistics.update_remitos`
   - `logistics.delete_remitos`
   - `logistics.manage_remito_status`
   - `logistics.view_trazabilidad`
   - `logistics.manage_trazabilidad`
   - `products.view`
   - `products.manage_stock`
   - `orders.view`
   - `orders.update_remito_status`
   - `purchases.view`
   - Y cualquier otro permiso configurado para el rol `logistica`
4. Retornar usuario creado

#### Caso 2: Cambiar Rol de Usuario de Ventas a Finanzas
**Request**:
```json
PUT /api/users/5
{
  "role": "finanzas"
}
```

**Comportamiento Esperado del Backend**:
1. Obtener permisos actuales del usuario (rol + directos)
2. Identificar permisos que vienen del rol `ventas`
3. **Remover solo los permisos del rol `ventas`** (no los directos)
4. **Asignar todos los permisos del rol `finanzas`**
5. **Mantener intactos los permisos directos** (excepcionales)
6. Actualizar el rol del usuario
7. Retornar usuario actualizado

#### Caso 3: Asignar Permiso Excepcional Temporal
**Request**:
```json
POST /api/roles/assign
{
  "permission_id": 25,
  "user_id": 5,
  "expires_at": "2024-12-31T23:59:59.000Z"
}
```

**Comportamiento Esperado del Backend**:
1. Validar que el permiso existe y está activo
2. Validar que el usuario existe
3. Verificar que el usuario no tiene ya este permiso asignado directamente (o actualizar si existe)
4. Crear registro en tabla de permisos directos de usuario con fecha de expiración
5. Retornar éxito

### 🐛 Manejo de Errores

#### Códigos HTTP y Mensajes

| Código | Escenario | Mensaje de Ejemplo |
|--------|-----------|-------------------|
| 200 | Operación exitosa | "Usuario obtenido exitosamente" |
| 201 | Recurso creado | "Usuario creado exitosamente" |
| 400 | Datos inválidos | "El campo 'username' es requerido" |
| 401 | No autenticado | "Token de autenticación inválido o expirado" |
| 403 | Sin permisos | "No tienes permisos para realizar esta acción" |
| 404 | No encontrado | "Usuario no encontrado" |
| 409 | Conflicto | "El nombre de usuario ya existe" |
| 500 | Error del servidor | "Error interno del servidor" |

#### Mensajes de Error Descriptivos
- Los mensajes de error deben ser claros y descriptivos
- Incluir información sobre qué campo falló y por qué
- Ejemplo: "El campo 'email' tiene un formato inválido" en lugar de solo "Error de validación"

### ✅ Checklist de Implementación Backend

Antes de considerar el backend completo, verificar:

- [ ] Todos los endpoints están implementados y funcionando
- [ ] La autenticación JWT está funcionando en todos los endpoints
- [ ] La verificación de permisos está implementada
- [ ] Al crear un usuario, se asignan automáticamente los permisos del rol
- [ ] Al cambiar el rol de un usuario, se actualizan los permisos correctamente
- [ ] Los permisos directos se mantienen al cambiar el rol
- [ ] Los permisos expirados se filtran automáticamente
- [ ] El rol `admin` tiene acceso a todos los permisos
- [ ] Las respuestas siguen el formato estándar JSON
- [ ] Los códigos HTTP son correctos
- [ ] Los mensajes de error son descriptivos
- [ ] Las validaciones están implementadas
- [ ] El logging y auditoría están implementados (recomendado)

---

## Soporte

Para dudas o problemas con el sistema de roles y permisos, contactar al equipo de desarrollo.

---

**Última actualización**: Noviembre 2025

**Nota**: Este documento incluye soporte completo para permisos excepcionales a usuarios individuales, permitiendo que administradores y gerentes puedan extender las capacidades de usuarios específicos más allá de su rol base.

