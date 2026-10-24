# Implementacion para Frontend: Facturacion ARCA via MF API

## Regla principal de arquitectura

El frontend **NO** debe consumir `api-facturador.fenecstudio.com` directamente.

El frontend debe consumir **solo** esta API (`mfcomputers-api`) y dejar que el backend:

- gestione credenciales (`FACTURADOR_API_KEY`);
- arme el payload de facturacion;
- maneje idempotencia y errores de ARCA;
- persista trazabilidad (CAE, facturaId, estado, errores).

Esto evita exponer secretos en navegador y centraliza la logica fiscal en backend.

---

## Flujo funcional para frontend

1. El usuario crea/selecciona una venta en MF API.
2. Desde UI se dispara la accion "Facturar".
3. Frontend llama a `POST /api/sales/:id/facturar` en MF API.
4. MF API emite en facturador ARCA de forma servidor-servidor.
5. Frontend recibe estado final + datos de trazabilidad para mostrar.

---

## Endpoint que debe usar frontend

### `POST /api/sales/:id/facturar`

Emite comprobante ARCA para una venta ya existente.

### Autenticacion

Usa la autenticacion habitual de MF API:

- `Authorization: Bearer <jwt>` (recomendado en frontend autenticado)
- o `x-api-key` en integraciones internas (no para browser publico)

### Body soportado (frontend)

```json
{
  "tipo": 11,
  "condicionIvaReceptor": 5,
  "concepto": 1,
  "force": false
}
```

Campos opcionales:

- `cuitEmisor`: si no se envia, backend usa `FACTURADOR_CUIT_EMISOR`.
- `puntoVenta`: si no se envia, backend usa `FACTURADOR_PUNTO_VENTA`.
- `docTipo`, `docNro`: override manual si hace falta.
- `tipo`: default `11` (Factura C).
- `condicionIvaReceptor`: default `5` (Consumidor final).
- `concepto`: `1`, `2` o `3`.
- `fechaServicioDesde`, `fechaServicioHasta`: obligatorias cuando `concepto` es `2` o `3`.
- `force`: `true` solo para reintento explicito si ya habia facturacion previa.

---

## Respuestas esperadas por frontend

### Caso exitoso (HTTP 200)

```json
{
  "success": true,
  "message": "Factura emitida correctamente en ARCA",
  "data": {
    "sale": {
      "id": 123,
      "arca_status": "success",
      "arca_factura_id": "uuid-o-id-remoto",
      "arca_cae": "12345678901234"
    },
    "arca": {
      "facturaId": "uuid-o-id-remoto",
      "cae": "12345678901234",
      "idempotencyKey": "sale-123-...",
      "response": {}
    }
  },
  "timestamp": "2026-05-05T..."
}
```

### Caso error funcional (4xx/5xx)

```json
{
  "success": false,
  "message": "Error al facturar venta en ARCA",
  "error": "Detalle legible",
  "data": {
    "status": 401,
    "code": "AUTH_INVALID_KEY",
    "retryAfter": null
  },
  "timestamp": "2026-05-05T..."
}
```

---

## Estados de facturacion que puede mostrar frontend

El backend persiste en `sales`:

- `arca_status`: `pending` | `success` | `error`
- `arca_factura_id`
- `arca_cae`
- `arca_last_attempt_at`
- `arca_error_code`
- `arca_error_message`

Recomendacion UI:

- `pending`: "Procesando facturacion..."
- `success`: "Facturado" + mostrar CAE
- `error`: "Error de facturacion" + mensaje corto + opcion "Reintentar"

---

## Reglas importantes para UX

- Si la venta ya esta facturada (`arca_status=success`), backend bloquea segunda emision salvo `force=true`.
- Si el backend responde codigo `429`, respetar `retryAfter` y reintentar luego.
- Para concepto `2` o `3`, pedir fechas de servicio en formulario antes de enviar.
- No guardar ni manejar API keys del facturador en frontend.

---

## Que hace MF API internamente (resumen tecnico)

Cuando recibe `POST /api/sales/:id/facturar`, MF API:

1. valida venta y items;
2. valida configuracion de facturador;
3. arma payload ARCA en backend;
4. genera `Idempotency-Key` estable (`saleId + hash payload`);
5. hace `ping` al facturador;
6. emite comprobante (`POST /api/facturas` remoto);
7. guarda request/response/errores en `sales`;
8. devuelve respuesta normalizada al frontend.

---

## Contrato frontend recomendado

- Boton "Facturar" en detalle de venta.
- Modal con campos minimos: `tipo`, `condicionIvaReceptor`, `concepto`.
- Campos condicionales para servicios (`fechaServicioDesde`, `fechaServicioHasta`).
- Mostrar resultado con `arca_cae` cuando `success`.
- Boton "Reintentar" enviando `{ "force": true }` solo si usuario confirma.

---

## Recuperar comprobante para vista previa / PDF (otra sesion u otra API)

El frontend puede armar la plantilla si la venta tiene **CAE** y datos de venta (items, cliente, total).

### Que ya se puede usar sin caché del navegador

- `GET /api/sales` / `GET /api/sales/:id`: `arca_cae`, `arca_cae_vto`, `arca_factura_id`, items.
- Configuracion local: CUIT emisor, punto de venta por defecto, tipo de comprobante por defecto.
- Si `GET /api/sales/:id` devuelve `data.arca.response` (JSON guardado al emitir), se extraen **numero**, **puntoVenta**, **tipo** y **qrUrl**.

### Que debe persistir el backend (recomendado)

En `sales` o en la respuesta de detalle:

| Campo | Uso |
|-------|-----|
| `arca_punto_venta` | Punto de venta AFIP |
| `arca_numero` o `arca_comprobante_numero` | Número de comprobante |
| `arca_tipo` | Tipo WSFE (6 = Factura B, etc.) |
| `arca_fecha_emision` | Fecha del comprobante |
| `arca_qr_url` | Opcional; si no, el frontend arma el QR AFIP |

Alternativa: `GET /api/sales/:id/comprobante-arca` que consulte el facturador con `arca_factura_id` y devuelva el payload normalizado (sin exponer API keys al browser).

### Vista previa parcial

Si hay CAE pero falta el número AFIP, la UI muestra la plantilla con aviso (sin QR válido). El PDF completo requiere número confirmado.

---

## Mensaje final para el equipo frontend

El frontend integra facturacion **solo** contra MF API.
No debe existir ninguna llamada desde browser hacia `api-facturador.fenecstudio.com`.
