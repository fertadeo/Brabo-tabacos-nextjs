# 📋 PLAN DE IMPLEMENTACIÓN - MÓDULO DE PROVEEDORES

## 🎯 OBJETIVO
Implementar los cambios solicitados por el cliente para mejorar la flexibilidad del módulo de proveedores, incluyendo:
- Proveedores no productivos con facturas sin OC
- Egresos sin factura (devengamientos)
- Pasivos devengados
- Validaciones condicionales según tipo de proveedor

---

## 📊 FASES DE IMPLEMENTACIÓN

### **FASE 1: Tipos y API Base** ✅ (EN PROGRESO)
- [x] Actualizar tipos TypeScript para incluir `supplier_type`
- [x] Actualizar tipos para campos opcionales (`material_code`, `purchase_id`)
- [ ] Agregar funciones API para nuevos endpoints
- [ ] Agregar tipos para egresos devengados y pasivos

### **FASE 2: Formulario de Proveedores** 
- [ ] Agregar campo `supplier_type` al formulario
- [ ] Agregar campos `has_account` y `payment_terms`
- [ ] Validaciones condicionales según tipo
- [ ] Actualizar vista de lista con filtros por tipo

### **FASE 3: Facturas de Proveedores**
- [ ] Crear componente de facturas (si no existe)
- [ ] Hacer `purchase_id` opcional en formulario
- [ ] Validaciones condicionales: `material_code` solo para productivos
- [ ] Permitir crear factura sin OC para no productivos

### **FASE 4: Egresos sin Factura**
- [ ] Crear componente para `accrued_expenses`
- [ ] Formulario de creación/edición
- [ ] Vista de lista con filtros
- [ ] Vinculación opcional con factura posterior

### **FASE 5: Pasivos Devengados**
- [ ] Crear componente para `accrued_liabilities`
- [ ] Formulario de creación/edición
- [ ] Vista de lista con filtros
- [ ] Vinculación con tesorería
- [ ] Control de vencimientos

### **FASE 6: Validaciones y UX**
- [ ] Validaciones condicionales en todos los formularios
- [ ] Mensajes de ayuda contextual
- [ ] Indicadores visuales según tipo de proveedor
- [ ] Testing y ajustes finales

---

## 🔧 CAMBIOS TÉCNICOS DETALLADOS

### **1. Tipos TypeScript**

#### **Supplier Interface**
```typescript
export interface Supplier {
  id: number;
  code: string;
  name: string;
  supplier_type: 'productivo' | 'no_productivo' | 'otro_pasivo'; // NUEVO
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  has_account?: boolean; // NUEVO
  payment_terms?: number; // NUEVO
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

#### **CreateSupplierRequest**
```typescript
export interface CreateSupplierRequest {
  code: string;
  name: string;
  supplier_type: 'productivo' | 'no_productivo' | 'otro_pasivo'; // NUEVO
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  has_account?: boolean; // NUEVO
  payment_terms?: number; // NUEVO
}
```

#### **SupplierInvoice Interface (NUEVO)**
```typescript
export interface SupplierInvoice {
  id: number;
  invoice_number: string;
  supplier_id: number;
  purchase_id?: number | null; // OPCIONAL
  invoice_date: string;
  due_date?: string | null;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  status: 'draft' | 'received' | 'partial_paid' | 'paid' | 'cancelled';
  payment_status: 'pending' | 'partial' | 'paid' | 'overdue';
  items: SupplierInvoiceItem[];
  // ...
}

export interface SupplierInvoiceItem {
  id: number;
  invoice_id: number;
  material_code?: string | null; // OPCIONAL para no productivos
  product_id?: number | null;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  unit_cost?: number;
  affects_production_cost: boolean;
  // ...
}
```

#### **AccruedExpense Interface (NUEVO)**
```typescript
export interface AccruedExpense {
  id: number;
  expense_number: string;
  supplier_id?: number | null; // OPCIONAL
  expense_type: 'compromise' | 'accrual';
  concept: string;
  category: 'seguro' | 'impuesto' | 'alquiler' | 'servicio' | 'otro';
  amount: number;
  accrual_date: string;
  due_date?: string | null;
  payment_date?: string | null;
  status: 'pending' | 'paid' | 'cancelled';
  has_invoice: boolean;
  invoice_id?: number | null;
  // ...
}
```

#### **AccruedLiability Interface (NUEVO)**
```typescript
export interface AccruedLiability {
  id: number;
  liability_number: string;
  liability_type: 'impuesto' | 'alquiler' | 'seguro' | 'servicio' | 'prestamo' | 'otro';
  description: string;
  amount: number;
  accrual_date: string;
  due_date: string;
  payment_date?: string | null;
  status: 'pending' | 'partial_paid' | 'paid' | 'overdue' | 'cancelled';
  paid_amount: number;
  remaining_amount: number;
  treasury_account_id?: number | null;
  payment_id?: number | null;
  // ...
}
```

### **2. Funciones API**

#### **Proveedores - Actualizadas**
- `getSuppliers()` - Agregar filtro por `supplier_type`
- `createSupplier()` - Incluir nuevos campos
- `updateSupplier()` - Incluir nuevos campos

#### **Facturas - Nuevas**
- `getSupplierInvoices()`
- `getSupplierInvoice(id)`
- `createSupplierInvoice()`
- `updateSupplierInvoice()`
- `linkDeliveryNoteToInvoice()`

#### **Egresos Devengados - Nuevas**
- `getAccruedExpenses()`
- `getAccruedExpense(id)`
- `createAccruedExpense()`
- `updateAccruedExpense()`
- `linkInvoiceToAccruedExpense()`

#### **Pasivos Devengados - Nuevas**
- `getAccruedLiabilities()`
- `getAccruedLiability(id)`
- `createAccruedLiability()`
- `updateAccruedLiability()`
- `linkPaymentToAccruedLiability()`

### **3. Componentes**

#### **Actualizar Existentes**
- `components/supplier-modal.tsx` - Agregar campos nuevos
- `app/proveedores/page.tsx` - Agregar filtros por tipo

#### **Crear Nuevos**
- `components/supplier-invoice-modal.tsx` - Formulario de facturas
- `components/supplier-invoices-list.tsx` - Lista de facturas
- `components/accrued-expense-modal.tsx` - Formulario de egresos
- `components/accrued-expenses-list.tsx` - Lista de egresos
- `components/accrued-liability-modal.tsx` - Formulario de pasivos
- `components/accrued-liabilities-list.tsx` - Lista de pasivos

### **4. Validaciones**

#### **Validaciones Condicionales**
```typescript
// En formulario de factura
if (supplier.supplier_type === 'productivo') {
  // material_code es REQUERIDO
  // purchase_id es RECOMENDADO (pero opcional)
} else {
  // material_code es OPCIONAL
  // purchase_id puede ser NULL
}

// En formulario de items de factura
if (supplier.supplier_type === 'productivo') {
  // Validar que material_code existe
  // Validar que affects_production_cost = true
}
```

---

## 📅 CRONOGRAMA ESTIMADO

- **Fase 1**: 1-2 horas (Tipos y API)
- **Fase 2**: 1-2 horas (Formulario Proveedores)
- **Fase 3**: 2-3 horas (Facturas)
- **Fase 4**: 2-3 horas (Egresos)
- **Fase 5**: 2-3 horas (Pasivos)
- **Fase 6**: 1-2 horas (Validaciones y UX)

**Total estimado**: 9-15 horas

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### Backend (Nota: No aplicar cambios aquí, solo frontend)
- [ ] Backend debe tener campos opcionales implementados
- [ ] Backend debe tener endpoints de facturas
- [ ] Backend debe tener endpoints de egresos devengados
- [ ] Backend debe tener endpoints de pasivos devengados

### Frontend
- [x] Tipos TypeScript actualizados
- [x] Funciones API actualizadas/creadas
- [x] Formulario de proveedores actualizado
- [x] Componente de facturas creado (`supplier-invoice-modal.tsx`)
- [x] Componente de egresos creado (`accrued-expense-modal.tsx`)
- [x] Componente de pasivos creado (`accrued-liability-modal.tsx`)
- [x] Validaciones condicionales implementadas (en facturas)
- [x] Filtros por tipo de proveedor
- [ ] Páginas de listado para facturas, egresos y pasivos
- [ ] Testing manual realizado
- [ ] Documentación actualizada

---

## 🚨 NOTAS IMPORTANTES

1. **No modificar código de API/Backend**: Solo cambios en frontend
2. **Validaciones condicionales**: Implementar según tipo de proveedor
3. **Campos opcionales**: Asegurar que UI permita valores NULL
4. **UX**: Mensajes claros sobre qué campos son requeridos según el contexto
5. **Testing**: Probar todos los flujos según documentación PROVEEDORES_DOC.md

---

**Última actualización**: 06/11/2025

---

## 📝 PROGRESO ACTUAL

### ✅ COMPLETADO

1. **Tipos TypeScript** (`lib/api.ts`)
   - ✅ Supplier con `supplier_type`, `has_account`, `payment_terms`
   - ✅ SupplierInvoice y SupplierInvoiceItem con campos opcionales
   - ✅ AccruedExpense y AccruedLiability

2. **Funciones API** (`lib/api.ts`)
   - ✅ `getSuppliers()` con filtro por `supplier_type`
   - ✅ Funciones para facturas: `getSupplierInvoices()`, `createSupplierInvoice()`, etc.
   - ✅ Funciones para egresos: `getAccruedExpenses()`, `createAccruedExpense()`, etc.
   - ✅ Funciones para pasivos: `getAccruedLiabilities()`, `createAccruedLiability()`, etc.

3. **Formulario de Proveedores** (`components/supplier-modal.tsx`)
   - ✅ Campo `supplier_type` (select)
   - ✅ Campo `payment_terms` (input numérico)
   - ✅ Campo `has_account` (checkbox)
   - ✅ Validaciones

4. **Vista de Proveedores** (`app/proveedores/page.tsx`)
   - ✅ Filtro por tipo de proveedor
   - ✅ Columna "Tipo" en tabla con badges
   - ✅ Integración con API

5. **Componente de Facturas** (`components/supplier-invoice-modal.tsx`)
   - ✅ `purchase_id` opcional
   - ✅ Validaciones condicionales: `material_code` requerido solo para productivos
   - ✅ Items con `material_code` opcional para no productivos
   - ✅ Indicadores visuales según tipo de proveedor
   - ✅ Soporte para crear/editar/ver

6. **Componente de Egresos Devengados** (`components/accrued-expense-modal.tsx`)
   - ✅ `supplier_id` opcional
   - ✅ Tipos: compromiso y devengamiento
   - ✅ Categorías: seguro, impuesto, alquiler, servicio, otro
   - ✅ Soporte para crear/editar/ver

7. **Componente de Pasivos Devengados** (`components/accrued-liability-modal.tsx`)
   - ✅ Tipos: impuesto, alquiler, seguro, servicio, préstamo, otro
   - ✅ Vinculación con tesorería
   - ✅ Validación de fechas
   - ✅ Soporte para crear/editar/ver

### 🔄 PENDIENTE

1. **Páginas de Listado**
   - [ ] Página de facturas de proveedores (`app/facturas-proveedores/page.tsx`)
   - [ ] Página de egresos devengados (`app/egresos-devengados/page.tsx`)
   - [ ] Página de pasivos devengados (`app/pasivos-devengados/page.tsx`)

2. **Mejoras Adicionales**
   - [ ] Mejorar `new-purchase-modal.tsx` para incluir `material_code` (opcional)
   - [ ] Integrar componentes en menú de navegación
   - [ ] Agregar rutas en el router

3. **Testing**
   - [ ] Probar flujo completo de facturas sin OC para no productivos
   - [ ] Probar validaciones condicionales
   - [ ] Probar egresos y pasivos devengados
