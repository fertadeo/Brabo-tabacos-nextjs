/**

 * PDF factura electrónica — diseño alineado al comprobante oficial ARCA/AFIP.

 * Por defecto genera triplicado: ORIGINAL, DUPLICADO y TRIPLICADO (3 páginas).

 */

import jsPDF from "jspdf"

import autoTable from "jspdf-autotable"

import QRCode from "qrcode"

import {

  ARCA_TABLE_HEADER_RGB,

  fmtDateAr,

  formatDocReceptor,
  labelReceptorDocumento,

  getArcaItemTableColumnWidthsMm,

  moneyAr,

  moneyArWithSymbol,

} from "@/lib/arca-invoice-format"

import { arcaIvaDiscriminadoRows, type ArcaIvaDiscriminado } from "@/lib/sale-iva"

import { drawArcaInvoiceHeader } from "@/lib/draw-arca-invoice-header"

import {

  formatNumeroComprobanteAfip,

  formatPuntoVentaAfip,

  getCodigoComprobanteAfip,

  getLetraComprobanteAfip,

  isNotaCreditoTipoAfip,

} from "@/lib/facturacion-comprobantes"



export const FACTURA_COPIAS = ["ORIGINAL", "DUPLICADO", "TRIPLICADO"] as const

export type FacturaCopia = (typeof FACTURA_COPIAS)[number]



export interface ArcaInvoiceEmisor {

  razonSocial: string

  domicilio: string

  condicionIva: string

  cuit: string

  ingresosBrutos?: string

  inicioActividades?: string

}



export interface ArcaInvoiceReceptor {

  razonSocial: string

  docTipo: number

  docNro: number

  condicionIvaLabel: string

  domicilio?: string

}



export interface ArcaInvoiceLineItem {

  codigo?: string

  descripcion: string

  cantidad: number

  unidadMedida?: string

  /** Precio unitario neto (sin IVA). */

  precioUnitario: number

  bonificacionPct?: number

  /** Subtotal neto de la línea (sin IVA). */

  subtotal: number

  /** Ej. «21%», «10,5%», «0%». */

  alicuotaIva: string

  /** Subtotal de la línea con IVA incluido. */

  subtotalConIva: number

}



export interface GenerateArcaInvoicePdfParams {

  emisor: ArcaInvoiceEmisor

  comprobante: {

    tipo: number

    letra?: string

    puntoVenta: number

    numero: number

    fechaEmision: string

    concepto: 1 | 2 | 3

  }

  receptor: ArcaInvoiceReceptor

  items: ArcaInvoiceLineItem[]

  totales: {

    otrosTributos?: number

    total: number

    /** IVA discriminado (pie oficial ARCA). */

    ivaDiscriminado: ArcaIvaDiscriminado

    /** IVA contenido — Régimen de Transparencia Fiscal (Ley 27.743) */

    ivaContenido?: number | null

  }

  cae: string

  caeVencimiento?: string | null

  qrUrl: string

  /** Si false, solo genera la copia indicada en `copia` (o ORIGINAL). Por defecto true = triplicado. */

  triplicado?: boolean

  copia?: FacturaCopia

  condicionVenta?: string

  /** Texto entre comillas bajo totales, ej. nombre del emisor */

  firmaAutorizada?: string | null

  pagina?: string

  comprobanteIncompleto?: boolean

  /** Texto adicional en borradores previos a la emisión. */
  previewAviso?: string

  /** Moneda AFIP: PES o DOL */
  moneda?: "PES" | "DOL"

  /** Cotización de moneda extranjera */
  tipoCambio?: number

  /** Símbolo para importes en PDF (default $) */
  currencySymbol?: string

}



async function qrDataUrl(text: string): Promise<string> {

  return QRCode.toDataURL(text, { width: 160, margin: 0, errorCorrectionLevel: "M" })

}



function drawLabelValue(

  doc: jsPDF,

  label: string,

  value: string,

  x: number,

  y: number,

  maxW: number

) {

  doc.setFont("helvetica", "bold")

  const lw = doc.getTextWidth(label)

  doc.text(label, x, y)

  doc.setFont("helvetica", "normal")

  const vx = x + lw + 1

  doc.text(value, vx, y, { maxWidth: Math.max(8, maxW - lw - 1) })

}



function resolveCopias(params: GenerateArcaInvoicePdfParams): FacturaCopia[] {

  if (params.triplicado === false) {

    return [params.copia ?? "ORIGINAL"]

  }

  return [...FACTURA_COPIAS]

}



async function drawInvoicePage(

  doc: jsPDF,

  params: GenerateArcaInvoicePdfParams,

  copia: FacturaCopia,

  qrImg: string,

  pageIndex: number,

  totalPages: number

): Promise<void> {

  const pageW = doc.internal.pageSize.getWidth()

  const margin = 8

  const innerW = pageW - margin * 2

  const tipo = params.comprobante.tipo

  const letra = params.comprobante.letra ?? getLetraComprobanteAfip(tipo)

  const codigo = getCodigoComprobanteAfip(tipo)

  const condicionVenta = params.condicionVenta ?? "Contado"

  const currencySym = params.currencySymbol ?? "$"

  const moneyWithSym = (n: number | string | null | undefined) => `${currencySym} ${moneyAr(n)}`

  const pagina =

    params.pagina ?? (totalPages > 1 ? `${pageIndex + 1}/${totalPages}` : "1/1")



  doc.setDrawColor(0, 0, 0)

  doc.setLineWidth(0.25)



  let y = margin



  const pageH = doc.internal.pageSize.getHeight()

  const bottomY = pageH - margin

  doc.rect(margin, margin, innerW, bottomY - margin)



  y = drawArcaInvoiceHeader({
    doc,
    margin,
    innerW,
    startY: y,
    copia,
    emisor: params.emisor,
    comprobante: params.comprobante,
    letra,
    codigo,
    tipoComprobante: params.comprobante.tipo,
  })



  const recH = 18

  doc.line(margin, y + recH, margin + innerW, y + recH)

  doc.line(margin + innerW / 2, y, margin + innerW / 2, y + recH)



  const recY1 = y + 5

  const halfW = innerW / 2 - 4

  drawLabelValue(

    doc,

    labelReceptorDocumento(params.receptor.docTipo, params.receptor.docNro),

    formatDocReceptor(params.receptor.docTipo, params.receptor.docNro),

    margin + 2,

    recY1,

    halfW

  )

  drawLabelValue(

    doc,

    "Apellido y Nombre / Razón Social: ",

    params.receptor.razonSocial || "",

    margin + innerW / 2 + 2,

    recY1,

    halfW

  )



  const recY2 = y + 10

  drawLabelValue(

    doc,

    "Condición frente al IVA: ",

    params.receptor.condicionIvaLabel,

    margin + 2,

    recY2,

    halfW

  )

  drawLabelValue(doc, "Domicilio: ", params.receptor.domicilio ?? "", margin + innerW / 2 + 2, recY2, halfW)



  const recY3 = y + 15

  drawLabelValue(doc, "Condición de venta: ", condicionVenta, margin + 2, recY3, innerW - 4)



  y += recH



  const tableBody = params.items.map((it) => [

    it.codigo ?? "",

    it.descripcion,

    moneyAr(it.cantidad),

    it.unidadMedida ?? "unidades",

    moneyAr(it.precioUnitario),

    moneyAr(it.bonificacionPct ?? 0),

    moneyAr(it.subtotal),

    it.alicuotaIva,

    moneyAr(it.subtotalConIva),

  ])



  autoTable(doc, {

    startY: y,

    margin: { left: margin, right: margin },

    tableWidth: innerW,

    head: [

      [

        "Código",

        "Producto / Servicio",

        "Cantidad",

        "U. Medida",

        "Precio Unit.",

        "% Bonif",

        "Subtotal",

        "Alicuota IVA",

        "Subtotal c/IVA",

      ],

    ],

    body: tableBody,

    theme: "grid",

    styles: {

      fontSize: 7,

      cellPadding: 1.5,

      lineColor: [0, 0, 0],

      lineWidth: 0.15,

      textColor: [0, 0, 0],

      valign: "middle",

    },

    headStyles: {

      fillColor: ARCA_TABLE_HEADER_RGB,

      textColor: [0, 0, 0],

      fontStyle: "bold",

      halign: "center",

      fontSize: 7,

    },

    columnStyles: (() => {
      const [w0, w1, w2, w3, w4, w5, w6, w7, w8] = getArcaItemTableColumnWidthsMm(innerW)
      return {
        0: { cellWidth: w0, halign: "left" as const },
        1: { cellWidth: w1, halign: "left" as const },
        2: { cellWidth: w2, halign: "right" as const },
        3: { cellWidth: w3, halign: "center" as const },
        4: { cellWidth: w4, halign: "right" as const },
        5: { cellWidth: w5, halign: "right" as const },
        6: { cellWidth: w6, halign: "right" as const },
        7: { cellWidth: w7, halign: "center" as const },
        8: { cellWidth: w8, halign: "right" as const },
      }
    })(),

  })



  // eslint-disable-next-line @typescript-eslint/no-explicit-any

  let yAfter = ((doc as any).lastAutoTable?.finalY as number) ?? y + 20



  const ivaDisc = params.totales.ivaDiscriminado

  const ivaRateLines = arcaIvaDiscriminadoRows(ivaDisc)

  const otrosTributos = params.totales.otrosTributos ?? 0

  const transBlockH = params.totales.ivaContenido != null ? 14 : 0

  const rightColumnLineCount = 1 + ivaRateLines.length + 1 + 1

  const totalsBoxH = Math.max(22, 8 + 4.5 * rightColumnLineCount) + transBlockH

  const totalsBoxTop = yAfter

  doc.rect(margin, totalsBoxTop, innerW, totalsBoxH)



  const labelX = margin + innerW - 78

  let yT = totalsBoxTop + 6

  doc.setFontSize(8)

  doc.setFont("helvetica", "normal")



  doc.text(`Importe Otros Tributos: ${currencySym}`, margin + 3, yT)

  doc.text(moneyWithSym(otrosTributos), margin + innerW * 0.45, yT, { align: "right" })



  const drawTotalLine = (label: string, amount: number, bold = false) => {

    if (bold) doc.setFont("helvetica", "bold")

    else doc.setFont("helvetica", "normal")

    doc.text(label, labelX, yT)

    doc.text(moneyWithSym(amount), margin + innerW - 2, yT, { align: "right" })

    yT += 4.5

  }



  drawTotalLine(`Importe Neto Gravado: ${currencySym}`, ivaDisc.netoGravado)

  for (const row of ivaRateLines) {
    drawTotalLine(row.label, row.amount)
  }

  drawTotalLine(`Importe Otros Tributos: ${currencySym}`, otrosTributos)

  drawTotalLine(`Importe Total: ${currencySym}`, params.totales.total, true)



  if (params.totales.ivaContenido != null) {

    const transY = totalsBoxTop + totalsBoxH - 12

    doc.setLineWidth(0.15)

    doc.line(margin + 2, transY - 2, margin + innerW - 2, transY - 2)

    doc.setFontSize(7)

    doc.setFont("helvetica", "bolditalic")

    const leyTitle = "Régimen de Transparencia Fiscal al Consumidor (Ley 27.743)"

    doc.text(leyTitle, margin + 3, transY + 2)

    const tw = doc.getTextWidth(leyTitle)

    doc.setLineWidth(0.1)

    doc.line(margin + 3, transY + 2.8, margin + 3 + tw, transY + 2.8)

    doc.setFont("helvetica", "normal")

    doc.text(`IVA Contenido: ${currencySym}`, labelX, transY + 7)

    doc.text(moneyWithSym(params.totales.ivaContenido), margin + innerW - 2, transY + 7, {

      align: "right",

    })

  }



  yAfter = totalsBoxTop + totalsBoxH + 4



  const footerTop = Math.max(yAfter, bottomY - 38)

  const qrSize = 26

  if (qrImg) {
    doc.addImage(qrImg, "PNG", margin + 3, footerTop, qrSize, qrSize)
  } else {
    doc.setFontSize(6)
    doc.setFont("helvetica", "normal")
    doc.text("QR no disponible", margin + 3, footerTop + qrSize / 2)
  }



  doc.setFontSize(8)

  doc.setFont("helvetica", "bold")

  doc.text("ARCA", margin + 3, footerTop + qrSize + 4)

  doc.setFontSize(7)

  doc.setFont("helvetica", "normal")

  doc.text("Comprobante Autorizado", margin + 3, footerTop + qrSize + 8)

  const disclaimer =

    "Esta Agencia no se responsabiliza por los datos ingresados en el detalle de la operación"

  doc.setFontSize(5.5)

  doc.text(disclaimer, margin + 3, footerTop + qrSize + 12, { maxWidth: 70 })



  doc.setFontSize(8)

  doc.text(`Pág. ${pagina}`, margin + innerW / 2, footerTop + qrSize + 6, {

    align: "center",

  })



  const caeX = margin + innerW - 58

  doc.setFontSize(8)

  drawLabelValue(doc, "CAE N°: ", params.cae, caeX, footerTop + 4, 56)

  drawLabelValue(

    doc,

    "Fecha de Vto. de CAE: ",

    fmtDateAr(params.caeVencimiento ?? ""),

    caeX,

    footerTop + 10,

    56

  )

}



export async function buildArcaInvoicePdf(

  params: GenerateArcaInvoicePdfParams

): Promise<{ doc: jsPDF; fileName: string }> {

  if (typeof window === "undefined") {

    throw new Error("PDF ARCA solo disponible en el navegador")

  }



  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })

  const tipo = params.comprobante.tipo

  const letra = params.comprobante.letra ?? getLetraComprobanteAfip(tipo)

  const copias = resolveCopias(params)

  const qrImg = params.qrUrl ? await qrDataUrl(params.qrUrl) : ""



  for (let i = 0; i < copias.length; i++) {

    if (i > 0) doc.addPage()

    await drawInvoicePage(doc, params, copias[i], qrImg, i, copias.length)

  }



  const suffix = copias.length > 1 ? "-triplicado" : ""

  const docKind = isNotaCreditoTipoAfip(tipo) ? "nota-credito" : "factura"

  const fileName = `${docKind}-${letra}-${formatPuntoVentaAfip(params.comprobante.puntoVenta)}-${formatNumeroComprobanteAfip(params.comprobante.numero)}${suffix}.pdf`

  return { doc, fileName }

}



export async function generateArcaInvoicePdf(params: GenerateArcaInvoicePdfParams): Promise<void> {

  const { doc, fileName } = await buildArcaInvoicePdf(params)

  doc.save(fileName)

}



export async function generateArcaInvoicePdfFromBuildArgs(

  args: import("@/lib/build-arca-invoice-pdf-input").BuildArcaInvoicePdfInputArgs

): Promise<void> {

  const { buildArcaInvoicePdfInput } = await import("@/lib/build-arca-invoice-pdf-input")

  const input = await buildArcaInvoicePdfInput(args)

  await generateArcaInvoicePdf(input)

}


