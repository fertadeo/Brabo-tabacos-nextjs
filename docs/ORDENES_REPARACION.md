# Órdenes de reparación — especificación backend (finanzas: total, pagos, saldo)

Documento orientado al equipo de backend. Describe el **modelo económico** de la orden, la **trazabilidad obligatoria** entre el total y el saldo mediante **movimientos de dinero** (cobros y, si aplica, entregas/devoluciones), y el **contrato HTTP** que consume el frontend (`lib/api.ts`, pantallas `/reparaciones` y `/reparaciones/[id]`).

---

## 1. Objetivo

- Gestionar el ciclo de vida de una reparación (estados, ítems, presupuesto, entrega).
- **Registrar de forma explícita todo dinero que explique la diferencia entre el monto total de la orden y el saldo pendiente**: no basta con un único acumulado opaco; el negocio requiere **historial auditable** de cobros y, cuando corresponda, **entregas de dinero al cliente** (reintegros, devoluciones de seña, etc.).

El listado de órdenes muestra columnas **Total** y **Saldo**; el detalle muestra **Total**, **Pagado** y **Saldo pendiente**, más la tabla **Pagos registrados**. El backend debe garantizar que esos valores son **coherentes** con el libro de movimientos de la orden.

---

## 2. Modelo económico

### 2.1 Monto total (`total_amount`)

Representa lo que el cliente debe por la orden **en su versión actual**:

- **Mano de obra** (`labor_amount`).
- **Suma de ítems** (materiales / repuestos): cada `repair_order_item` aporta `total_price` (derivado de `quantity * unit_price`).

Regla sugerida:

```text
total_amount = labor_amount + Σ(item.total_price)
```

(ajustar redondeo/decimales de forma consistente en toda la API, p. ej. 2 decimales en string decimal como hoy el frontend.)

Cualquier cambio en ítems o en mano de obra debe **recalcular** `total_amount` en servidor y devolverlo en la respuesta; el cliente no debe ser la fuente de verdad del total.

### 2.2 Pagado acumulado (`amount_paid`)

Es el **total cobrado al cliente** según los movimientos registrados **a favor del taller** (ingresos por esa orden), neto de devoluciones si el modelo lo contempla (ver §3).

### 2.3 Saldo pendiente

Definición usada por el frontend:

```text
saldo_pendiente = total_amount − amount_paid
```

Opcionalmente el API puede exponer también `balance` como string calculado; si se envía, **debe coincidir** con la fórmula anterior salvo documentar otra convención.

**Invariante crítica:** `amount_paid` (y por ende el saldo) debe poder **reconstruirse** sumando los movimientos del historial (§3). No se recomienda permitir que un operador edite `amount_paid` a mano sin pasar por movimientos.

---

## 3. Movimientos de dinero: pagos y entregas

Entre el **total** y el **saldo** debe existir un **registro explícito** de cada operación de dinero. Se recomienda una tabla (o equivalente) de **movimientos de caja vinculados a la orden**, no solo un contador.

### 3.1 Cobros (pagos del cliente al taller)

- Corresponden a dinero **recibido**: seña, cuotas, pago final en efectivo/tarjeta/transferencia.
- **Aumentan** el efecto de “pagado” respecto del saldo (reducen lo pendiente).

### 3.2 Entregas de dinero al cliente (opcional pero recomendado)

Casos típicos:

- Devolución de seña si se cancela bajo ciertas condiciones.
- Reintegro por diferencia si se corrigió el total a la baja y ya había cobrado de más.
- Cualquier egreso de caja asociado a la orden.

Estos movimientos **disminuyen** el neto cobrado (equivalente a restar del acumulado de cobros) o se modelan con **monto con signo** / **tipo de movimiento**.

### 3.3 Contrato de entidad sugerido (alineado al frontend actual)

El frontend ya consume `RepairOrderPayment` con esta forma lógica:

| Campo           | Tipo     | Notas |
|-----------------|----------|--------|
| `id`            | int      | PK |
| `amount`        | string decimal | Monto **positivo** del movimiento en la implementación actual del cliente |
| `method`        | string   | Valores esperados hoy: `efectivo`, `tarjeta`, `transferencia` |
| `payment_date`  | ISO 8601 | Fecha/hora del hecho económico |
| `related_type`  | string   | Uso polimórfico (p. ej. `repair_order`) — documentar valores permitidos |
| `related_id`    | int      | ID de la orden de reparación |
| `created_at`    | ISO 8601 | Auditoría |

**Extensión recomendada para “entregas de dinero”** (evolución del contrato):

| Campo | Valores sugeridos |
|-------|-------------------|
| `movement_type` o `direction` | `cobro` \| `devolucion` (o `ingreso` \| `egreso`) |
| `notes` | Texto libre opcional |
| `registered_by_user_id` | Quién registró |
| `caja_movement_id` | FK al módulo de caja si existe integración |

Si se agrega `movement_type`:

- **Cobro:** `amount` positivo suma al pagado.
- **Devolución:** `amount` positivo **resta** del pagado (o `amount` negativo con reglas claras — elegir una convención y documentarla en la API).

El **POST** actual del cliente envía solo cobros positivos (`CreateRepairOrderPaymentBody`). Las devoluciones pueden ser un segundo endpoint o el mismo con `movement_type` y validaciones distintas.

---

## 4. Reglas de negocio y validaciones

1. **Consistencia:** Tras cada alta/baja/modificación de movimiento, recalcular y persistir `amount_paid` (o calcularlo siempre en lectura con agregación SQL). El `GET repair-orders/:id` y el listado deben devolver valores alineados con `GET .../payments`.
2. **Límite de cobro:** Validar que la suma de cobros no supere `total_amount` salvo política explícita de “vueltos” o anticipos no imputables (si aplica); en caso contrario rechazar o exigir nota de crédito.
3. **Devoluciones:** No permitir que el neto cobrado sea negativo sin regla contable clara.
4. **Estado de la orden:** El frontend solo ofrece “Registrar pago” en ciertos estados (`aceptado`, `en_proceso_reparacion`, `listo_entrega` en la tarjeta de totales). El backend debe **replicar** esas reglas (y cualquier otra) para no depender del cliente.
5. **Orden cancelada / entregada:** Definir si se permiten nuevos movimientos (típico: no en `entregado`; cancelación puede requerir devolución registrada).
6. **Idempotencia:** Si en el futuro se integra con pasarelas o caja, considerar `idempotency_key` por request.
7. **Moneda:** Asumir una moneda por orden (ARS según UI); si hubiera multi-moneda, documentar tipo de cambio y campo explícito.

---

## 5. Endpoints (contrato esperado por el frontend)

Base path asumido: `repair-orders` (como en `getApiUrl()` + `repair-orders`).

**Autenticación en el cliente (`lib/api.ts`):** todas las llamadas a `repair-orders` (incluido `POST …/payments`) usan la misma función **`getRepairOrderHeaders()`**: si el usuario tiene sesión, `Authorization: Bearer <JWT>`; si no hay JWT, `x-api-key`. Así el registro de pagos envía **los mismos headers** que el listado de reparaciones, alineado con el backend (`authenticateJWT` vs api-key).

### 5.1 Orden

| Método | Ruta | Uso |
|--------|------|-----|
| GET | `/repair-orders` | Listado paginado; cada ítem debe incluir `total_amount`, `amount_paid` coherentes con movimientos |
| GET | `/repair-orders/:id` | Detalle completo |
| POST | `/repair-orders` | Alta (`CreateRepairOrderBody`) |
| PUT | `/repair-orders/:id` | Actualización parcial |
| … | `/send-budget`, `/accept`, `/cancel`, `/status` | Flujo de estados (ya referenciados en cliente) |

### 5.2 Pagos / movimientos

| Método | Ruta | Uso |
|--------|------|-----|
| GET | `/repair-orders/:id/payments` | Lista **todos** los movimientos que componen el “pagado” (cobros y, si existen, devoluciones con convención acordada) |
| POST | `/repair-orders/:id/payments` | Registra un movimiento (`amount`, `method`, `payment_date` ISO) |

**Respuesta del POST:** devolver el movimiento creado y, en lo posible, la orden actualizada (`amount_paid`, `total_amount`, `balance`) para evitar desincronización en UI.

**Evolución sugerida:**

- DELETE o POST de reversión anulando un movimiento (solo roles autorizados, con auditoría).
- GET con paginación si el historial crece mucho.

### 5.3 Ítems (impacto en total)

| Método | Ruta |
|--------|------|
| GET/POST/PUT/DELETE | `/repair-orders/:id/items` … |

Tras mutar ítems, el backend debe **actualizar `total_amount`** y devolverlo; el saldo pendiente cambia aunque `amount_paid` se mantenga.

---

## 6. Listado vs detalle (columnas Total y Saldo)

En `GET /repair-orders`:

- Incluir `delivery_date_estimated` para la columna “Retiro estimado” en UI.
- **`total_amount` y `amount_paid` deben reflejar el mismo criterio que en detalle** (idealmente derivados de las mismas tablas o triggers).

Si el listado se optimiza con columnas desnormalizadas, mantenerlas actualizadas en la misma transacción que los movimientos.

---

## 7. Integración con caja / contabilidad (recomendación)

Cada **cobro** en efectivo o transferencia podría generar un movimiento en el módulo de **Caja** o asiento contable:

- `related_type` / `related_id` en el pago pueden enlazar la orden; un `caja_movement_id` evita duplicar lógica.
- Las **entregas** al cliente deben registrarse como **egresos** explícitos, no solo como ajuste manual de `amount_paid`.

---

## 8. Resumen para implementación

1. **`total_amount`**: calculado por servidor (mano de obra + ítems).
2. **Historial obligatorio**: cada variación del neto cobrado debe tener fila(s) en `repair_order_payments` (o tabla equivalente), incluyendo en el futuro **devoluciones** si el negocio las requiere.
3. **`amount_paid`**: agregado consistente con ese historial (cobros − devoluciones según convención).
4. **Saldo**: `total_amount − amount_paid`, expuesto de forma coherente en listado y detalle.
5. **Validaciones** por estado de orden y montos; **auditoría** (`created_at`, usuario).

Este documento refleja el uso actual del frontend en el repo; cualquier cambio de contrato (p. ej. `movement_type`) debe actualizarse en `lib/api.ts` y en las pantallas de reparaciones.
