# Productos: borrado y sincronización con WooCommerce (frontend)

Indicaciones para el frontend según el comportamiento actual de la API.

## Comportamiento en backend

- **DELETE /api/products/:id** (soft delete): desactiva el producto en el ERP (`is_active = false`) y, si tiene `woocommerce_id`, lo envía a la **papelera de WooCommerce**. No hace falta ningún query param ni llamar a sync después.
- **DELETE /api/products/:id/permanent**: borra el producto en WooCommerce (force = true) si está vinculado y luego lo borra de la base del ERP.

## Uso en el frontend

| Acción en la UI | Endpoint | Efecto |
|-----------------|----------|--------|
| **Eliminar** / Mover a papelera | `DELETE /api/products/:id` | Producto inactivo en ERP y enviado a la papelera en WooCommerce (si tiene `woocommerce_id`). **No** llamar a sync después. |
| **Eliminar permanentemente** | `DELETE /api/products/:id/permanent` | Borrado definitivo en WC y en el ERP. Usar solo desde la pestaña "Eliminados", con confirmación clara. |

## Implementación actual

- **Papelera:** se llama a `deleteProduct(id)`. No se envía ningún parámetro extra; el backend sincroniza con WC automáticamente.
- **Eliminar permanentemente:** se llama a `deleteProductPermanent(id)` solo cuando el usuario confirma desde la pestaña "Eliminados".

## Listados y reactivación

- Los productos inactivos (soft delete) se listan con `GET /api/products?active_only=false` y se muestran en la pestaña "Eliminados".
- Para volver a publicar un producto en el ERP se usa **editar producto** y se pone "Activo" (y sync con WooCommerce si corresponde); la API no expone un endpoint específico de "restaurar".

## Respuestas de la API

- **200:** borrado correcto (soft o permanente).
- **404:** producto no encontrado.
- **401/403:** no autorizado o sin permisos.

En caso de error en la llamada a WooCommerce, el backend registra el error pero no falla la respuesta: el producto queda desactivado en el ERP aunque WC no se haya actualizado.
