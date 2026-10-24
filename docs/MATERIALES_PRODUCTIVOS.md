## 📦 Módulo de Materiales Productivos

### 🎯 Objetivos

- Controlar el ciclo completo de los materiales productivos: planificación, compra, recepción y consumo.
- Diferenciar el **compromiso** generado por una orden de compra de la **deuda real** reconocida una vez recibida la factura.
- Vincular cada material con sus proveedores productivos para gestionar costos, tiempos de entrega y desempeño.
- Asegurar la trazabilidad entre orden de compra → remito recibido → factura → movimientos de stock.

---

### 🧭 Flujo General

1. **Planificación / MRP**
   - El área de producción define necesidades futuras de materiales (por lista de materiales, proyecciones o pedidos confirmados).
   - Se genera una **solicitud de compra** o se agenda la reposición según stock mínimo.

2. **Orden de Compra (OC)**
   - Compras emite la OC asociada al proveedor productivo.
   - Estado inicial `Borrador` → `Emitida`.
   - El monto de la OC se registra como **compromiso** contable, no como deuda.
   - Se asigna fecha estimada, condiciones de entrega, ítems y precios.

3. **Recepción de Remito / Material**
   - Logística o Depósito registra el remito del proveedor.
   - Se validan cantidades vs. OC (aceptado, diferencia, pendiente).
   - Se generan movimientos de stock (`entrada_oc`) actualizando inventario productivo.
   - La OC pasa a `Parcialmente recibida` o `Completada`.

4. **Recepción de Factura**
   - Finanzas registra la factura y la concilia con la OC y los remitos recibidos.
   - Se convierte el compromiso en **deuda real** (cuenta corriente del proveedor).
   - La OC cambia a `Facturada`.

5. **Consumo en Producción**
   - Producción registra las salidas de material (`consumo_produccion`) contra órdenes de fabricación.
   - Se actualiza stock disponible, reservado y consumido.

6. **Cierre y Auditoría**
   - Reportes de desviaciones (cantidad, precio, tiempos).
   - Indicadores: cumplimiento de proveedor, rotación de stock, aging de compromisos vs deudas.

---

### 🧑‍🤝‍🧑 Roles Involucrados

| Rol            | Responsabilidades principales |
| -------------- | ------------------------------ |
| **Producción** | Solicitar materiales, validar consumos reales. |
| **Compras**    | Emitir OC, negociar condiciones, mantener lista de proveedores. |
| **Logística**  | Recepcionar remitos, actualizar stock de materiales productivos. |
| **Finanzas**   | Registrar facturas, convertir compromisos en deuda, gestionar pagos. |
| **Gerencia**   | Aprobar compras críticas, monitorear KPIs de proveedores y stock. |

---

### 📑 Estados Clave

#### Orden de Compra

| Estado                  | Descripción |
| ----------------------- | ----------- |
| `Borrador`              | OC creada, pendiente de aprobación. |
| `Emitida`               | OC enviada al proveedor → **compromiso contable**. |
| `Parcialmente recibida` | Hay remitos cargados, aún quedan cantidades pendientes. |
| `Completada`            | Todo lo solicitado fue recibido (remitos). |
| `Facturada`             | Existe factura asociada → **deuda real**. |
| `Cerrada`               | Sin pendientes administrativos ni logísticos. |

#### Recepción / Remito

| Estado    | Uso |
| --------- | --- |
| `Registrado` | Remito cargado, stock actualizado. |
| `Observado`  | Diferencias con la OC (faltantes, dañados). |
| `Aprobado`   | Remito conciliado y aceptado. |

#### Material Productivo

| Atributo              | Uso |
| --------------------- | --- |
| Stock disponible      | Cantidad utilizable. |
| Stock comprometido    | Cantidad reservada para OTs u OCs. |
| Stock en tránsito     | Pendiente de recibir (OC emitida, remito no cargado). |
| Costo estándar/último | Base para valoración y variaciones. |

---

### 🔗 Estructura de Datos

- `materials`
  - Código interno, descripción, unidad, categoría, stock, costos.
  - Indicadores: stock mínimo, punto de reposición, lote de compra.

- `material_suppliers`
  - Relación N:N material ↔ proveedor.
  - Campos: costo acordado, moneda, lead time, condición de compra, código del proveedor, rating.

- `purchase_orders` y `purchase_order_items`
  - Ítems con materiales, cantidades, precios, fechas comprometidas.
  - Estado de cada renglón (pendiente, recibido parcial/completo, facturado).

- `goods_receipts`
  - Registro del remito: fecha, proveedor, OC, items recibidos, diferencias.

- `inventory_movements`
  - Entradas/salidas con tipo (`entrada_oc`, `consumo_produccion`, `ajuste`).

- `supplier_invoices`
  - Enlace a OC y proveedor, estado de conciliación.

---

### ⚙️ Procesos Detallados

#### 1. Emisión de Orden de Compra

1. Seleccionar proveedor productivo y materiales.
2. Definir cantidades, precios, plazos y forma de entrega.
3. Guardar como borrador o enviar a aprobación según monto.
4. Al aprobar, cambiar estado a `Emitida` y registrar compromiso.

#### 2. Recepción de Materiales

1. Buscar OC abierta, crear remito (`goods_receipt`).
2. Ingresar número de remito, fecha, transportista.
3. Registrar cantidades recibidas (admite parcial) y observaciones.
4. Generar movimiento de stock de entrada, actualizando `stock disponible` y reduciendo `en tránsito`.
5. Si corresponde, marcar diferencias y notificar a compras.

#### 3. Conversión a Deuda Real

1. Recibir factura del proveedor.
2. Asociarla a la OC y remitos (conciliación 3 vías).
3. Validar precios/cantidades; registrar impuestos y condiciones de pago.
4. Cambiar estado de OC a `Facturada` y generar movimiento contable (cuenta por pagar).

#### 4. Consumo de Material en Producción

1. A partir de una orden de trabajo se reservan materiales (`stock comprometido`).
2. Al ejecutar la OT se registra el consumo (`inventory_movement` tipo `consumo_produccion`).
3. Se pueden registrar mermas o devoluciones.

#### 5. Reportes / KPIs

- Rotación de inventario productivo.
- Lead time real vs. pactado por proveedor.
- Cumplimiento de OC (cantidades, fechas, precio).
- Aging de compromisos y deudas.
- Costos estándar vs. reales (variaciones).

---

### 🛠️ Integración con el ERP

- **Compras**: comparte flujo con `compras` existente, pero enfocado en materiales.
- **Proveedores**: usa la clasificación `productivo` y muestra métricas de desempeño.
- **Producción**: provee stock disponible y reservas.
- **Finanzas**: abastece cuentas corrientes y proyecciones de pagos.

---

### 🚀 Próximos pasos técnicos

1. Implementar página `app/materiales/page.tsx` con tablero y listas de materiales, órdenes y recepciones.
2. Crear componentes reutilizables (`MaterialModal`, `GoodsReceiptModal`, widgets de stock).
3. Conectar con API (`/api/materials`, `/api/purchase-orders`, `/api/goods-receipts`).
4. Incorporar validaciones de stock mínimo y alertas de abastecimiento.
5. Sincronizar con el módulo de producción (reservas y consumos). 

---

> Este documento guía la implementación incremental del módulo de materiales productivos, asegurando la coherencia operativa entre compras, logística, producción y finanzas.

