# IVA por línea en ventas POS y facturación ARCA — Guía backend

El frontend ya envía y muestra la alícuota IVA por ítem de venta. El backend debe persistirla y usarla al armar el payload para ARCA/AFIP.

**Guía de alineación frontend (tipos, UI, fórmulas, flujos):** `docs/FRONTEND_IVA_VENTAS_FACTURACION.md`

---

## Alícuotas soportadas

| `iva_rate` (frontend) | Etiqueta UI        | Código WSFE alícuota |
|-----------------------|--------------------|----------------------|
| `21`                  | 21%                | `5`                  |
| `10.5`                | 10,5%              | `4`                  |
| `0`                   | Exento (0%)        | `3`                  |

**Default:** `21` si el campo no viene o es inválido.

Los precios de venta en POS son **finales (IVA incluido)**. El `total_amount` de la venta es la suma de `quantity × unit_price` por línea, sin sumar IVA encima.

---

## Cambios en base de datos

Agregar en `sale_items`:

```sql
ALTER TABLE sale_items
  ADD COLUMN iva_rate DECIMAL(4,2) NOT NULL DEFAULT 21.00
  COMMENT 'Alícuota IVA: 21, 10.5 o 0';
```

Opcional en `products` (para default al agregar al carrito):

```sql
ALTER TABLE products
  ADD COLUMN iva_rate DECIMAL(4,2) NOT NULL DEFAULT 21.00;
```

---

## `POST /api/sales`

Cada ítem puede incluir `iva_rate`:

```json
{
  "items": [
    {
      "product_id": 10,
      "quantity": 1,
      "unit_price": 121000,
      "iva_rate": 21
    },
    {
      "description": "Servicio reparación",
      "quantity": 1,
      "unit_price": 55000,
      "iva_rate": 10.5
    },
    {
      "description": "Exportación local exenta",
      "quantity": 1,
      "unit_price": 10000,
      "iva_rate": 0
    }
  ],
  "payment_method": "efectivo"
}
```

Validación:

- `iva_rate` ∈ `{21, 10.5, 0}`; si falta → `21`.
- `total_amount` = suma de subtotales de línea (sin recalcular IVA sobre el total).

---

## `GET /api/sales` y `GET /api/sales/:id`

Devolver `iva_rate` en cada ítem:

```json
{
  "product_id": 10,
  "quantity": 1,
  "unit_price": 121000,
  "subtotal": 121000,
  "iva_rate": 21
}
```

Ventas antiguas sin columna: responder `iva_rate: 21`.

---

## `POST /api/sales/:id/facturar` (ARCA)

Al armar ítems para el facturador:

1. Leer `iva_rate` de cada `sale_item`.
2. Mapear a alícuota WSFE (`5`, `4`, `3`).
3. Enviar importes con la convención que use el facturador (precio final o neto + IVA según tipo de comprobante).
4. Agrupar IVA por alícuota en el comprobante (Factura A) o calcular **IVA contenido** (Factura B/C, Ley 27.743).

Fórmula IVA contenido (precio final):

```
iva_linea = subtotal - subtotal / (1 + iva_rate/100)
```

Para `iva_rate = 0`, `iva_linea = 0`.

**No** asumir 21% fijo en todo el comprobante.

---

## Nota de crédito

Al replicar ítems de la venta original, copiar también `iva_rate`.

---

## Checklist backend

- [ ] Migración `sale_items.iva_rate`
- [ ] Validar y persistir en `POST /api/sales`
- [ ] Devolver en listado y detalle de ventas
- [ ] Usar alícuota por línea en `POST /api/sales/:id/facturar`
- [ ] Tests: venta mixta 21% + 10,5% + 0%, facturación ARCA
