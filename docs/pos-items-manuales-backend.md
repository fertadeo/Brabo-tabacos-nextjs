# Ítems manuales en Punto de venta — Especificación para MF API (backend)

**Audiencia:** equipo backend / MF API  
**Estado frontend:** implementado en `mfcomputers-nextjs` (envía líneas con `description` sin `product_id`)  
**Bloqueante:** sin estos cambios, `POST /api/sales` rechazará o ignorará ítems manuales.

---

## 1. Objetivo de negocio

Permitir en el POS vender un producto/servicio **puntual** que no existe en el catálogo (`products`), con descripción y precio escritos en caja, sin dar de alta ese ítem en Productos.

La venta debe:

- registrarse en `sales` + líneas de detalle;
- sumar al total y aparecer en listados / detalle / comprobante interno;
- poder facturarse por ARCA (`POST /api/sales/:id/facturar`) con la descripción correcta;
- **no** descontar stock ni crear fila en `products`;
- **no** sincronizar esa línea a WooCommerce.

---

## 2. Contrato `POST /api/sales`

### 2.1 Body (fragmento `items`)

Cada elemento del array `items` debe ser **exactamente uno** de estos dos formatos:

#### A) Línea de catálogo (comportamiento actual)

```json
{
  "product_id": 42,
  "quantity": 2,
  "unit_price": 15000
}
```

#### B) Línea manual (nuevo)

```json
{
  "description": "Instalación de software especial",
  "quantity": 1,
  "unit_price": 8500
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
- Si ambos o ninguno → `400` con mensaje claro, p. ej. `"Cada ítem debe tener product_id o description"`.
- La venta debe tener al menos un ítem.
- `total_amount` de la venta = suma de `quantity * unit_price` de todas las líneas (redondeo según regla actual del ERP).

### 2.2 Ejemplo de venta mixta

```json
{
  "items": [
    { "product_id": 10, "quantity": 1, "unit_price": 120000 },
    { "description": "Mano de obra configuración router", "quantity": 1, "unit_price": 15000 }
  ],
  "payment_method": "efectivo",
  "client_id": 5,
  "sync_to_woocommerce": true
}
```

### 2.3 Reglas de negocio en servidor

| Regla | Catálogo | Manual |
|--------|----------|--------|
| Descontar stock | Sí (como hoy) | **No** |
| Validar producto activo / stock | Sí | N/A |
| Insertar en `products` | No | **No** |
| Sync WooCommerce por línea | Si `sync_to_woocommerce` y producto aplica | **No** |
| Movimiento de inventario | Sí si aplica hoy | **No** |

`sync_to_woocommerce` en cabecera puede seguir sincronizando **solo** las líneas con `product_id`.

---

## 3. Persistencia sugerida (`sale_items` o equivalente)

```sql
-- Ejemplo conceptual (adaptar a nombres reales del esquema)
ALTER TABLE sale_items
  MODIFY product_id INT NULL,
  ADD COLUMN description VARCHAR(500) NULL;

-- CHECK: (product_id IS NOT NULL) XOR (description IS NOT NULL AND TRIM(description) <> '')
```

Al guardar línea manual:

- `product_id` = `NULL`
- `description` = texto enviado (trim)
- Opcional: duplicar en `product_name` para compatibilidad con otros módulos

No crear FK obligatoria a `products` cuando `product_id` es null.

---

## 4. Respuesta `GET /api/sales` y `GET /api/sales/:id`

Cada ítem en `data.items` (o `data.sale.items`) debe exponer:

```json
{
  "id": 901,
  "product_id": null,
  "product_name": "Instalación de software especial",
  "description": "Instalación de software especial",
  "quantity": 1,
  "unit_price": 8500,
  "subtotal": 8500
}
```

**Línea de catálogo:**

```json
{
  "id": 900,
  "product_id": 10,
  "product_name": "Notebook XYZ",
  "description": null,
  "quantity": 1,
  "unit_price": 120000,
  "subtotal": 120000
}
```

El frontend usa, en este orden: `product_name` → `description` → `Producto #${product_id}`.

Mínimo aceptable si no quieren dos campos: devolver **solo** `product_name` poblado también para ítems manuales.

---

## 5. Facturación ARCA — `POST /api/sales/:id/facturar`

Al armar el payload para MultiCUIT / AFIP:

| Campo fiscal | Catálogo | Manual |
|--------------|----------|--------|
| Descripción del ítem | Nombre del producto (o `description` de línea si se guardó override) | **`description` de la línea de venta** |
| Código / NCM | `product.code` o id | `"0"` o código genérico acordado con contador |
| Cantidad / precio | Desde línea | Desde línea |
| IVA | `iva_rate` por línea (21, 10.5 o 0) — ver `docs/sale-items-iva-backend.md` | Igual |

**No** exigir que exista `product_id` para facturar. Validar que cada línea tenga descripción usable y importe > 0.

Persistir en la venta el desglose usado en la emisión (ya recomendado en `docs/facturacion.md`).

---

## 6. Errores HTTP recomendados

| Código | Situación |
|--------|-----------|
| `400` | Ítem sin `product_id` ni `description`; `description` vacío; `quantity` < 1 |
| `404` | `product_id` inexistente (solo líneas catálogo) |
| `409` | Stock insuficiente (solo catálogo) |
| `501` / mensaje explícito | Si aún no implementaron ítems manuales: `"ITEM_MANUAL_NOT_SUPPORTED"` |

Mensaje útil para el POS si el backend no está listo:

```json
{
  "success": false,
  "message": "Los ítems manuales requieren actualización del servidor",
  "error": "SALE_MANUAL_ITEMS_NOT_SUPPORTED"
}
```

---

## 7. Caja, reportes y nota de crédito

- **Caja / ingresos:** el `total_amount` de la venta ya incluye ítems manuales; no hace falta tabla nueva.
- **Nota de crédito** (`POST /api/sales/:id/nota-credito`): al replicar ítems de la venta original, incluir líneas con `product_id` null y la misma descripción/importe.

---

## 8. Checklist de implementación backend

- [ ] Validar XOR `product_id` / `description` en `POST /api/sales`
- [ ] `sale_items.product_id` nullable + columna `description` (o solo `product_name` denormalizado)
- [ ] No descontar stock ni sync Woo en líneas manuales
- [ ] `GET /api/sales/:id` devuelve `product_name` o `description` en ítems manuales
- [ ] `POST /api/sales/:id/facturar` usa descripción de línea manual en payload ARCA
- [ ] Tests: venta solo manual, venta mixta, facturación de venta mixta
- [ ] (Opcional) Código de error `SALE_MANUAL_ITEMS_NOT_SUPPORTED` hasta deploy

---

## 9. Prueba rápida con curl

Reemplazar `BASE`, `TOKEN` o `API_KEY`.

```bash
curl -X POST "%BASE%/api/sales" \
  -H "Content-Type: application/json" \
  -H "x-api-key: %API_KEY%" \
  -d "{\"items\":[{\"description\":\"Servicio puntual POS\",\"quantity\":1,\"unit_price\":5000}],\"payment_method\":\"efectivo\"}"
```

Respuesta esperada: `201`/`200` con `data.items[0].product_id: null` y texto en `product_name` o `description`.

---

## 10. Contacto frontend

Archivos tocados en el repo Next.js:

- `lib/api.ts` — tipos `CreateSaleItem` / `SaleItemResponse`
- `lib/pos-cart.ts`, `lib/sale-items.ts`
- `app/punto-venta/page.tsx`, `components/pos-manual-item-card.tsx`, `components/pos-cart-item-row.tsx`
- `components/sale-detail-modal.tsx`, `app/ventas/page.tsx`, `lib/build-arca-invoice-pdf-input.ts`

Cuando el backend esté en staging, avisar para validar flujo: POS → Ventas → Facturar → PDF ARCA.
