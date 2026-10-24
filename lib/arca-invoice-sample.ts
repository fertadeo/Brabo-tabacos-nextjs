import { buildAfipQrUrl } from "@/lib/arca-invoice-afip-qr"
import type { GenerateArcaInvoicePdfParams } from "@/lib/generate-arca-invoice-pdf"
import {
  buildDefaultFacturarFormRequest,
  getStoredFacturacionCuitEmisor,
  getStoredFacturacionPuntoVenta,
} from "@/lib/facturacion-settings"

/** Muestra con IVA discriminado (Factura B, alícuota 10,5%). */
export function getArcaInvoiceSampleParams(): GenerateArcaInvoicePdfParams {
  const defaults = buildDefaultFacturarFormRequest()
  const tipo = defaults.tipo ?? 6
  const puntoVenta = getStoredFacturacionPuntoVenta() ?? 4
  const numero = 2378
  const fechaEmision = "2026-05-07"
  const cuit =
    getStoredFacturacionCuitEmisor() ||
    process.env.NEXT_PUBLIC_FACTURADOR_CUIT_EMISOR?.replace(/\D/g, "") ||
    "20339985945"
  const docTipo = 99
  const docNro = 0

  const netoGravado = 334842
  const iva105 = 35158.41
  const total = 370000.41

  const qrUrl = buildAfipQrUrl({
    fechaEmision,
    cuitEmisor: cuit,
    puntoVenta,
    tipoComprobante: tipo,
    numeroComprobante: numero,
    importe: total,
    docTipoReceptor: docTipo,
    docNroReceptor: docNro,
    cae: "86194547780882",
  })

  return {
    emisor: {
      razonSocial: "FIGUEROA MAXIMILIANO IVAN JESUS",
      domicilio: "Luther King 1095 - Santa Rosa, La Pampa",
      condicionIva: "IVA Responsable Inscripto",
      cuit,
      ingresosBrutos: "2275400",
      inicioActividades: "03/01/2011",
    },
    comprobante: {
      tipo,
      puntoVenta,
      numero,
      fechaEmision,
      concepto: (defaults.concepto ?? 1) as 1 | 2 | 3,
    },
    receptor: {
      razonSocial: "",
      docTipo,
      docNro,
      condicionIvaLabel: "Consumidor Final",
    },
    items: [
      {
        descripcion: "Disco dvr 1tb",
        cantidad: 1,
        unidadMedida: "unidades",
        precioUnitario: netoGravado,
        bonificacionPct: 0,
        subtotal: netoGravado,
        alicuotaIva: "10,5%",
        subtotalConIva: total,
      },
    ],
    totales: {
      otrosTributos: 0,
      total,
      ivaDiscriminado: {
        netoGravado,
        iva27: 0,
        iva21: 0,
        iva105,
        iva5: 0,
        iva25: 0,
        iva0: 0,
      },
      ivaContenido: iva105,
    },
    cae: "86194547780882",
    caeVencimiento: "2026-05-17",
    qrUrl,
    condicionVenta: "Contado",
  }
}
