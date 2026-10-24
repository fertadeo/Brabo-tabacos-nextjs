# Ítems manuales en órdenes de reparación — Especificación para MF API (backend)

**Audiencia:** equipo backend / MF API  
**Estado frontend:** implementado en `mfcomputers-nextjs` (envía líneas con `description` sin `product_id`)  
**Bloqueante:** sin estos cambios, `POST /api/repair-orders/:id/items` rechazará ítems manuales.

---

## 1. Objetivo de negocio

En una orden de reparación el taller debe poder cargar:

- **Materiales del catálogo** (como hoy): repuestos con `product_id`; el stock se descuenta al pasar la orden a estado `aceptado`.
- **Ítems manuales** (nuevo): repuesto o servicio puntual que **no está en stock** o no conviene dar de alta en Productos (ej. cable traído por el cliente, mano de obra de un tercero, pieza comprada en el momento). **No debe mover inventario** ni crear fila en `products`.

---

## 2. Contrato `POST /api/repair-orders/:id/items`

### 2.1 Body

Cada ítem debe ser **exactamente uno** de estos formatos:

#### A) Línea de catálogo (comportamiento actual)

```json
{
  "product_id": 42,
  "quantity": 1,
  "unit_price": 15000
}
```

#### B) Línea manual (nuevo)

```json
{
  "description": "Display compatible (compra externa)",
  "quantity": 1,
  "unit_price": 85000
}
```

| Campo | Catálogo | Manual |
|--------|----------|--------|
| `product_id` | obligatorio, entero > 0 | **prohibido** o ignorado |
| `description` | **prohibido** | obligatorio, string 1–500 chars (trim) |
| `quantity` | obligatorio, entero ≥ 1 | igual |
| `unit_price` | obligatorio, número ≥ 0 | igual |

**Validación por ítem:**

- XOR: (`product_id` presente) ⊕ (`description` presente y no vacío).
- Si ambos o ninguno → `400` con mensaje claro.

### 2.2 Reglas de negocio

| Regla | Catálogo | Manual |
|--------|----------|--------|
| Descontar stock al `aceptado` | Sí (como hoy) | **No** |
| Validar stock al agregar ítem | Opcional (según reglas actuales) | N/A |
| Insertar en `products` | No | **No** |
| Devolver stock al eliminar ítem (si ya descontó) | Sí | **No aplica** (`stock_deducted` = 0) |
| Sumar al `total_amount` de la orden | Sí | Sí |

La **mano de obra** (`labor_amount` en la cabecera) sigue siendo independiente de los ítems.

---

## 3. Persistencia sugerida (`repair_order_items` o equivalente)

```sql
-- Ejemplo conceptual (adaptar a nombres reales)
ALTER TABLE repair_order_items
  MODIFY product_id INT NULL,
  ADD COLUMN description VARCHAR(500) NULL,
  ADD COLUMN product_name VARCHAR(500) NULL;  -- opcional, denormalizado para listados

-- CHECK: (product_id IS NOT NULL) XOR (description IS NOT NULL AND TRIM(description) <> '')
```

Al guardar línea manual:

- `product_id` = `NULL`
- `description` = texto enviado
- `stock_deducted` = `0` (y no cambiar al aceptar presupuesto)

---

## 4. Respuesta `GET /api/repair-orders/:id` y `GET .../items`

Cada ítem debe exponer:

```json
{
  "id": 501,
  "repair_order_id": 88,
  "product_id": null,
  "product_name": "Display compatible (compra externa)",
  "description": "Display compatible (compra externa)",
  "quantity": 1,
  "unit_price": "85000.00",
  "total_price": "85000.00",
  "stock_deducted": 0,
  "created_at": "2026-06-02T12:00:00Z"
}
```

**Línea de catálogo:** `product_id` numérico, `description` null, objeto `product` opcional anidado.

El frontend usa: `product.name` → `product_name` → `description` → `Producto #id`.

---

## 5. Conversión a venta / facturación

Si al aceptar o entregar la orden se genera venta POS (`convert-to-sale` o similar):

- Las líneas manuales de la orden deben mapearse a ítems de venta con el mismo patrón que POS (`description` sin `product_id`), según `docs/pos-items-manuales-backend.md`.
- Al facturar ARCA, la descripción del ítem manual debe salir del texto de la línea, no de `products`.

---

## 6. Errores HTTP recomendados

| Código | Situación |
|--------|-----------|
| `400` | Ítem sin `product_id` ni `description`; `description` vacío |
| `404` | `product_id` inexistente (solo catálogo) |
| `409` | Stock insuficiente (solo catálogo, si aplica) |
| `501` / mensaje explícito | Backend sin soporte: `"REPAIR_MANUAL_ITEMS_NOT_SUPPORTED"` |

---

## 7. Checklist backend

- [ ] Validar XOR `product_id` / `description` en `POST /api/repair-orders/:id/items`
- [ ] `repair_order_items.product_id` nullable + `description`
- [ ] No descontar ni devolver stock en líneas manuales
- [ ] `GET` orden e ítems devuelven nombre/descripción en ítems manuales
- [ ] Conversión a venta (si existe) replica líneas manuales
- [ ] Tests: orden solo manual, orden mixta, aceptar presupuesto sin tocar stock manual

---

## 8. Prueba rápida con curl

```bash
curl -X POST "%BASE%/api/repair-orders/ORDEN_ID/items" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer %TOKEN%" \
  -d "{\"description\":\"Tapa trasera genérica\",\"quantity\":1,\"unit_price\":3500}"
```

Respuesta esperada: `201` con `data.product_id: null` y texto en `product_name` o `description`.

---

## 9. Archivos frontend tocados

- `lib/api.ts` — tipos `AddRepairOrderItemBody`, `RepairOrderItem`
- `lib/repair-order-items.ts`
- `components/new-repair-order-modal.tsx`
- `components/repair-order-add-item-modal.tsx`
- `app/reparaciones/[id]/page.tsx`
- `lib/generate-repair-order-reception-pdf.ts` (ya usa `product_name` en líneas)

Cuando el backend esté en staging, validar: alta de orden con ítem manual → detalle → PDF recepción → aceptar presupuesto (stock solo en catálogo).
