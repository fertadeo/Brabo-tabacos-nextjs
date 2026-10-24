# Integración WooCommerce ↔ ERP — contrato sugerido (backend)

Este documento describe qué espera el frontend y qué debe implementar el **API/backend** para vinculación, huérfanos y productos **sin SKU en WooCommerce**.

---

## 1. `POST .../products/link-woocommerce-ids`

**Objetivo:** Completar `woocommerce_id` en productos del ERP que aún no lo tengan, cruzando con WooCommerce.

### Comportamiento recomendado

1. **Cruce por SKU** cuando el producto WC tenga SKU no vacío y exista un producto ERP con el mismo código/SKU.
2. **Cruce por `woocommerce_id`** si el ERP ya guarda el ID de WC (p. ej. re-ejecución o datos migrados), aunque el SKU en WC esté vacío.
3. **Productos en WC sin SKU:** no pueden emparejarse solo por SKU. Deben:
   - Contarse en `not_found_in_erp` (o en un subconjunto explícito), **y**
   - Aparecer en `not_found_in_erp_details` con `woocommerce_id`, `name`, `sku` null o `""`, y **`sku_missing_in_wc: true`**.

### Respuesta `data` (campos que usa el front)

| Campo | Tipo | Obligatorio | Descripción |
|--------|------|-------------|-------------|
| `linked` | number | sí | Nuevas vinculaciones `woocommerce_id` guardadas. |
| `already_linked` | number | sí | Ya estaban vinculados. |
| `not_found_in_erp` | number | sí | Casos WC→ERP sin producto equivalente (huérfanos desde la perspectiva del ERP). |
| `not_found_in_erp_without_wc_sku` | number | no | Subconjunto: de esos, cuántos son WC **sin SKU** (no emparejables por SKU). |
| `total_processed` | number | sí | Total de filas/ítems considerados. |
| `errors` | string[] | sí | Mensajes de error no fatales (puede ser `[]`). |
| `not_found_in_erp_details` | array | no | Detalle fila a fila (ver abajo). |

### `not_found_in_erp_details[]`

| Campo | Tipo | Descripción |
|--------|------|-------------|
| `sku` | string \| null | SKU en WC; vacío si no hay. |
| `woocommerce_id` | number \| null | ID del producto en WooCommerce (recomendado siempre que exista). |
| `name` | string \| null | Nombre en WC. |
| `sku_missing_in_wc` | boolean | `true` si WC no tiene SKU; ayuda al UI a etiquetar la fila. |

**Alias aceptado por el front:** `orphans_not_in_erp` (mismo contenido que `not_found_in_erp_details`).

---

## 2. `POST .../integration/products/import-woocommerce-orphans`

**Objetivo:** Crear en el ERP productos inactivos para artículos que están en WooCommerce y aún no en el ERP (huérfanos).

### Reglas importantes

1. **Incluir productos WC sin SKU** en el escaneo. No filtrar con `sku IS NOT NULL` a nivel de query si eso excluye huérfanos reales.
2. **Código interno en el ERP:** si el ERP exige SKU/código único, generar uno estable (p. ej. prefijo + `woocommerce_id` o secuencia). Eso alimenta `imported_with_generated_code` / `created_without_wc_sku`.
3. **Opcional:** Tras crear el producto, escribir el SKU generado en WooCommerce para futuros cruces (política de negocio).
4. **Variaciones:** definir si se importan padres, variaciones o ambos.

### Campos opcionales en `data` (recomendados para métricas)

| Campo | Descripción |
|--------|-------------|
| `scanned_without_wc_sku` | Cantidad de huérfanos detectados en WC **sin SKU** en la tienda. |
| `created_without_wc_sku` | Cantidad de filas ERP creadas cuyo origen WC no tenía SKU. |

**Alias aceptados en el cliente:** `orphans_without_sku` → `scanned_without_wc_sku`; `imported_without_wc_sku` → `created_without_wc_sku`.

Los campos ya existentes (`created`, `skipped`, `imported_with_generated_code`, `errors`, `scanned_wc_products`, `dry_run`, `error_details`, `created_codes`, etc.) se mantienen.

---

## 3. Coherencia entre flujos

- Tras **importar** un huérfano, el ERP debería persistir `woocommerce_id` (y opcionalmente slug).
- La siguiente ejecución de **link** no debería volver a contar ese producto como huérfano si el emparejamiento usa `woocommerce_id` o el código ya está alineado en ambos sistemas.

---

## Referencias en código (frontend)

- Tipos: `lib/api.ts` — `LinkWooCommerceIdsSummary`, `WooCommerceUnmatchedErpItem`, `WooCommerceOrphansImportData`.
- UI: `components/products/link-woocommerce-ids-button.tsx`, `components/products/woocommerce-orphans-import-dialog.tsx`.
- Proxy import: `app/api/integration/products/import-woocommerce-orphans/route.ts`.
