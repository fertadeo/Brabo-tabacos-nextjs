# Guía backend: Nota de crédito ARCA por venta facturada por error

Documento para el equipo de **MF API** / integración **MultiCUIT**. El frontend ya ofrece la acción **«¿Fue un error?»** en ventas con `arca_status = success`; la emisión de la NC debe hacerse en servidor con las mismas reglas que la factura original.

---

## ¿Es correcto emitir una nota de crédito?

**Sí**, cuando la factura fiscal ya fue autorizada en AFIP y la operación debe **anularse o corregirse por el importe total** (error de emisión, venta duplicada, monto incorrecto que se revierte por completo, etc.).

| Situación | Acción recomendada |
|-----------|-------------------|
| Factura emitida por error, no hubo operación real | **Nota de crédito** por el **100 %** del comprobante original, referenciando factura (CbtesAsoc). |
| Solo corregir datos sin cambiar importe | Nota de crédito + nueva factura, o mecanismo de corrección según política contable. |
| La factura **nunca** obtuvo CAE | No usar NC: reintentar o dejar la venta en error; no `force` con otro número. |
| Error en AFIP sin autorización | No marcar `arca_status = success`; no hace falta NC. |

La NC debe ser del **mismo circuito** que la factura: Factura B (6) → Nota de crédito B (8); Factura C (11) → NC C (13); Factura A (1) → NC A (3).

---

## Endpoint propuesto (MF API)

### `POST /api/sales/:id/nota-credito`

Emite nota de crédito en MultiCUIT por una venta ya facturada.

**Autenticación:** igual que `POST /api/sales/:id/facturar` (JWT / `x-api-key`).

**Precondiciones (backend):**

- `sales.arca_status = 'success'`
- Existen `arca_cae`, datos de comprobante original (tipo, PV, número) persistidos
- No existe ya una NC exitosa para esa venta (`arca_nc_status = success` → 409)

**Body (ejemplo):**

```json
{
  "motivo": "error_emision",
  "observaciones": "Factura emitida por error operativo",
  "importe": null,
  "confirmar": true
}
```

| Campo | Descripción |
|-------|-------------|
| `motivo` | `error_emision` \| `devolucion` \| `descuento` \| `otro` (auditoría). |
| `observaciones` | Texto libre opcional. |
| `importe` | `null` = NC por **total** de la factura original (caso «fue un error»). Si en el futuro se permiten NC parciales, importe &lt;= total facturado. |
| `confirmar` | Debe ser `true` (evita clics accidentales). |

**Idempotencia:** cabecera `Idempotency-Key: sale-{saleId}-nc-{motivo}` (estable por venta + motivo).

---

## Qué debe armar MF API hacia MultiCUIT

Reutilizar el mismo flujo que facturación (`POST /api/facturas`), cambiando:

1. **`tipo`**: código NC (8 si la factura fue 6, etc.).
2. **`CbtesAsoc`** (comprobantes asociados) — **obligatorio** en WSFE para NC:

```json
{
  "cuitEmisor": 20322803851,
  "tipo": 8,
  "puntoVenta": 1,
  "concepto": 1,
  "docTipo": 99,
  "docNro": 0,
  "condicionIvaReceptor": 5,
  "importe": 121,
  "iva": [{ "id": 5, "base": 100, "cuota": 21 }],
  "cbtesAsoc": [
    {
      "tipo": 6,
      "ptoVta": 1,
      "nro": 100
    }
  ],
  "omitirPdf": true
}
```

Los valores de `cbtesAsoc` deben salir de lo persistido al facturar la venta (`tipo`, `puntoVenta`, `numero` del comprobante original), **no** inventados en el frontend.

3. **Importe e IVA**: mismos criterios que la factura original (mismo neto/alícuota si NC total). Ideal: guardar en `sales` el desglose usado en la emisión o reconstruirlo desde ítems de la venta con la misma lógica que `POST /facturar`.

4. **Receptor:** mismo `docTipo`, `docNro`, `condicionIvaReceptor` que la factura (persistidos o recalculados igual que en facturar).

---

## Persistencia sugerida en `sales`

Además de los campos ARCA actuales:

| Columna | Uso |
|---------|-----|
| `arca_invoice_tipo` | Tipo WSFE factura (6, 11, …) |
| `arca_invoice_punto_venta` | PV factura |
| `arca_invoice_numero` | Número AFIP factura |
| `arca_invoice_fecha` | Fecha comprobante |
| `arca_facturar_payload` | JSON del body usado (opcional, auditoría) |
| `arca_nc_status` | `null` \| `pending` \| `success` \| `error` |
| `arca_nc_cae` | CAE de la NC |
| `arca_nc_cae_vto` | Vencimiento CAE NC |
| `arca_nc_factura_id` | UUID MultiCUIT de la NC |
| `arca_nc_tipo` | 8, 13, … |
| `arca_nc_numero` | Número NC |
| `arca_nc_error_code` / `arca_nc_error_message` | Errores |

Tras NC exitosa, la venta puede seguir `arca_status = success` en la factura original y `arca_nc_status = success`, o pasar a un estado compuesto `anulada_por_nc` según reglas de negocio del ERP.

---

## Respuesta exitosa (HTTP 200)

```json
{
  "success": true,
  "message": "Nota de crédito emitida correctamente en ARCA",
  "data": {
    "sale": {
      "id": 123,
      "arca_nc_status": "success",
      "arca_nc_cae": "74996052728746"
    },
    "notaCredito": {
      "cae": "74996052728746",
      "vencimientoCae": "20250730",
      "tipo": 8,
      "puntoVenta": 1,
      "numero": 5,
      "facturaId": "uuid-nc",
      "cbtesAsoc": [{ "tipo": 6, "ptoVta": 1, "nro": 100 }]
    }
  }
}
```

Misma forma de errores que facturación (`VALIDATION_ERROR`, `WSFE_NO_CAE`, `PERSIST_DB_ERROR`, etc.).

---

## Reglas de negocio

1. **No** permitir segunda NC total si ya hay `arca_nc_status = success` (salvo NC parcial futura con otro diseño).
2. **No** usar `POST /facturar` con `force=true` para «deshacer» una factura con CAE; la vía fiscal es la NC.
3. Registrar en auditoría: usuario, `motivo`, request/response MultiCUIT, `Idempotency-Key`.
4. Opcional: tras NC total, marcar venta como no facturable de nuevo o bloquear re-factura sin flujo explícito.

---

## Contrato frontend (cuando exista el endpoint)

El ERP llamará:

```http
POST /api/sales/:id/nota-credito
Content-Type: application/json

{ "motivo": "error_emision", "confirmar": true }
```

Y mostrará CAE/ PDF de la NC con la misma UX que la factura (descarga PDF, QR, etc.).

Hasta entonces la UI muestra el diálogo informativo y los datos de referencia tomados de caché de emisión / columnas persistidas.

---

## Checklist implementación backend

- [ ] Persistir tipo, PV y número de factura al emitir (`POST /facturar`).
- [ ] Implementar `POST /api/sales/:id/nota-credito` con validaciones.
- [ ] Mapear tipo factura → tipo NC y armar `cbtesAsoc`.
- [ ] Reutilizar idempotencia y manejo de errores MultiCUIT.
- [ ] Persistir `arca_nc_*` y exponerlos en `GET /api/sales` y `GET /api/sales/:id`.
- [ ] Documentar en `docs/facturacion.md` el nuevo endpoint.
