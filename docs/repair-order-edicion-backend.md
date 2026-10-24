# Edición de órdenes de reparación — Guía para MF API (backend)

**Audiencia:** equipo backend / MF API  
**Estado frontend:** implementado en `mfcomputers-nextjs` (detalle `/reparaciones/[id]`, listado con enlace Editar)  
**Bloqueante parcial:** si `PUT /api/repair-orders/:id` no persiste todos los campos o rechaza cambios por estado, la UI mostrará error al guardar.

---

## 1. Objetivo

Permitir **modificar una orden de reparación** después de crearla:

- Datos de cabecera (equipo, falla del cliente, diagnóstico, fechas, mano de obra, notas, cliente).
- Materiales / ítems (agregar, editar cantidad/precio, quitar) según estado y si ya se descontó stock.

El frontend **no** permite editar órdenes en estado `entregado` o `cancelado`.

---

## 2. Actualizar orden — `PUT /api/repair-orders/:id`

### 2.1 Campos aceptados (todos opcionales en el body; enviar solo lo que cambia o el conjunto completo)

| Campo | Tipo | Notas |
|--------|------|--------|
| `client_id` | int | Cambiar cliente de la orden (validar que exista y esté activo) |
| `equipment_description` | string | Texto estructurado del equipo (marca, tipo, serie) |
| `customer_declared_fault` | string | **Requerido en frontend** al guardar; falla que declara el cliente |
| `diagnosis` | string \| null | Diagnóstico técnico |
| `work_description` | string \| null | Trabajo a realizar |
| `reception_date` | string (YYYY-MM-DD) | Fecha de recepción |
| `delivery_date_estimated` | string \| null | Fecha estimada de entrega |
| `labor_amount` | number | Mano de obra; debe recalcular `total_amount` |
| `notes` | string \| null | Notas internas |

### 2.2 Ejemplo

```json
{
  "client_id": 12,
  "equipment_description": "Notebook Dell Inspiron 15|notebook||SN123",
  "customer_declared_fault": "No enciende",
  "diagnosis": "Fuente dañada",
  "work_description": "Reemplazo de fuente y limpieza",
  "reception_date": "2026-06-01",
  "delivery_date_estimated": "2026-06-10",
  "labor_amount": 18000,
  "notes": "Cliente avisado por teléfono"
}
```

### 2.3 Reglas por estado (recomendadas)

| Estado | Editar cabecera | Cambiar `client_id` |
|--------|-----------------|---------------------|
| `consulta_recibida` | Sí | Sí |
| `presupuestado` | Sí | Sí (con cuidado si ya se envió presupuesto) |
| `aceptado`, `en_proceso_reparacion`, `listo_entrega` | Sí (fechas, diagnóstico, mano de obra, notas) | Opcional / restringir |
| `entregado`, `cancelado` | **No** → `409` o `400` | No |

### 2.4 Recálculo de totales

Tras cualquier cambio en `labor_amount` o en ítems, el backend debe actualizar:

```text
total_amount = labor_amount + SUM(repair_order_items.total_price)
```

y devolver la orden actualizada en `data` con `items` y totales coherentes.

### 2.5 Respuesta

Misma forma que `GET /api/repair-orders/:id`: incluir `items[]`, `client` (opcional), `customer_declared_fault`, montos como string o number según convención actual.

---

## 3. Ítems — rutas existentes

### 3.1 Agregar — `POST /api/repair-orders/:id/items`

Catálogo o manual (ver `docs/repair-order-items-manuales-backend.md`).

**Frontend:** solo muestra “Agregar ítem” en estados `consulta_recibida` y `presupuestado` (antes de aceptar y descontar stock).

**Backend sugerido:** rechazar POST de ítems de catálogo con `product_id` si la orden ya está `aceptado` o posterior, salvo política explícita de “agregar repuesto extra” con descuento inmediato de stock.

### 3.2 Editar — `PUT /api/repair-orders/:id/items/:itemId`

```json
{
  "quantity": 2,
  "unit_price": 9500
}
```

- Recalcular `total_price` de la línea y `total_amount` de la orden.
- Si `stock_deducted = 1`, ajustar movimiento de inventario (diferencia de cantidad) o devolver `409` si no se puede cambiar cantidad.

**Frontend:** permite editar línea si la orden no está cerrada y (`consulta_recibida` \| `presupuestado` \| `stock_deducted = 0`).

### 3.3 Eliminar — `DELETE /api/repair-orders/:id/items/:itemId`

- Si `stock_deducted = 1`, **devolver stock** al producto.
- Recalcular `total_amount`.

---

## 4. Campos que el frontend asume en GET

Si faltan en la respuesta, la edición falla o se ve incompleta:

| Campo | Uso en UI |
|--------|-----------|
| `customer_declared_fault` | Mostrar y editar (distinto de `diagnosis`) |
| `equipment_description` | Parseo de equipo |
| `client_id` + `client.name` | Mostrar y permitir cambio de cliente |
| `items[]` con `product_id`, `description`, `product_name`, `quantity`, `unit_price`, `total_price`, `stock_deducted` | Tabla de materiales |

---

## 5. Errores HTTP recomendados

| Código | Situación |
|--------|-----------|
| `400` | Validación (fechas, falla vacía, cantidad &lt; 1) |
| `404` | Orden o ítem inexistente |
| `409` | Orden `entregado`/`cancelado`; editar ítem con stock ya descontado sin política de ajuste |
| `422` | `client_id` inválido |

Mensaje claro en español en `message`.

---

## 6. Checklist backend

- [ ] `PUT /api/repair-orders/:id` persiste `customer_declared_fault`
- [ ] `PUT` acepta `client_id` y valida cliente
- [ ] `PUT` rechaza o permite según `status` (documentar política)
- [ ] Recálculo automático de `total_amount` al cambiar mano de obra o ítems
- [ ] `PUT /items/:itemId` recalcula totales y maneja `stock_deducted`
- [ ] `DELETE` ítem devuelve stock si correspondía
- [ ] `POST` ítems manuales (`description` sin `product_id`) — ver guía ítems manuales
- [ ] Tests: editar cabecera en `consulta_recibida`, editar ítem antes de aceptar, bloqueo en `entregado`

---

## 7. Archivos frontend

- `app/reparaciones/[id]/page.tsx` — modo edición, cliente, ítems
- `app/reparaciones/page.tsx` — enlace Editar en listado
- `components/repair-order-edit-item-modal.tsx`
- `components/repair-order-add-item-modal.tsx`
- `lib/api.ts` — `updateRepairOrder`, `updateRepairOrderItem`

Cuando el backend esté listo en staging, probar: crear orden → editar datos → agregar/editar/quitar ítems → enviar presupuesto → aceptar.
