/**
 * Cabecera factura ARCA/AFIP — layout oficial:
 * barra ORIGINAL | recuadro B centrado cortando la línea | dos columnas con divisor vertical bajo el recuadro.
 */
import type jsPDF from "jspdf"
import { fmtDateAr } from "@/lib/arca-invoice-format"
import {
  formatNumeroComprobanteAfip,
  formatPuntoVentaAfip,
  getComprobanteArcaTitulo,
} from "@/lib/facturacion-comprobantes"
import type { FacturaCopia } from "@/lib/generate-arca-invoice-pdf"

interface ArcaHeaderEmisor {
  razonSocial: string
  domicilio: string
  condicionIva: string
  cuit: string
  ingresosBrutos?: string
  inicioActividades?: string
}

interface ArcaHeaderComprobante {
  puntoVenta: number
  numero: number
  fechaEmision: string
}

/** Altura de la franja ORIGINAL / DUPLICADO / TRIPLICADO (sin solapar el recuadro de letra). */
const COPY_BAR_H = 14
const BODY_H = 38
const BOX_W = 12
const BOX_H = 11

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
  doc.text(value, x + lw + 0.5, y, { maxWidth: Math.max(8, maxW - lw - 0.5) })
}

export interface DrawArcaInvoiceHeaderArgs {
  doc: jsPDF
  margin: number
  innerW: number
  startY: number
  copia: FacturaCopia
  emisor: ArcaHeaderEmisor
  comprobante: ArcaHeaderComprobante
  letra: string
  codigo: string
  tipoComprobante: number
}

/** Dibuja la cabecera y devuelve la coordenada Y donde continúa el comprobante (bloque receptor). */
export function drawArcaInvoiceHeader(args: DrawArcaInvoiceHeaderArgs): number {
  const { doc, margin, innerW, startY, copia, emisor, comprobante, letra, codigo, tipoComprobante } =
    args
  const titulo = getComprobanteArcaTitulo(tipoComprobante)
  const centerX = margin + innerW / 2
  const sepY = startY + COPY_BAR_H
  const headerBottom = sepY + BODY_H

  const boxLeft = centerX - BOX_W / 2
  /** Centro del recuadro sobre la línea separadora; el texto de copia queda solo arriba. */
  const boxTop = sepY - BOX_H / 2
  const centerBlockBottom = boxTop + BOX_H + 4.5

  doc.setDrawColor(0, 0, 0)

  // Barra superior: ORIGINAL / DUPLICADO / TRIPLICADO
  doc.setFontSize(9)
  doc.setFont("helvetica", "bold")
  doc.text(copia, centerX, startY + COPY_BAR_H * 0.38, { align: "center" })

  // Línea bajo la barra de copia (interrumpida por el recuadro central)
  doc.setLineWidth(0.25)
  const gapL = boxLeft - 1.2
  const gapR = boxLeft + BOX_W + 1.2
  doc.line(margin, sepY, gapL, sepY)
  doc.line(gapR, sepY, margin + innerW, sepY)

  // Divisor vertical (solo debajo del bloque B + COD)
  doc.line(centerX, centerBlockBottom, centerX, headerBottom)

  // Cierre inferior de cabecera
  doc.line(margin, headerBottom, margin + innerW, headerBottom)

  // Recuadro letra (fondo blanco sobre la línea)
  doc.setFillColor(255, 255, 255)
  doc.setLineWidth(0.35)
  doc.rect(boxLeft, boxTop, BOX_W, BOX_H, "FD")
  doc.rect(boxLeft, boxTop, BOX_W, BOX_H)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(19)
  doc.text(letra, centerX, boxTop + BOX_H / 2 + 1.8, { align: "center" })

  doc.setFontSize(6.5)
  doc.setFont("helvetica", "normal")
  doc.text(`COD. ${codigo}`, centerX, boxTop + BOX_H + 2.8, { align: "center" })

  const leftX = margin + 2.5
  const centerGap = 2.5
  const leftW = centerX - BOX_W / 2 - centerGap - leftX
  const rightX = centerX + BOX_W / 2 + centerGap
  const rightW = margin + innerW - rightX - 2.5
  const textY0 = sepY + 5.5

  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.text(emisor.razonSocial, leftX + leftW / 2, sepY + 3.2, {
    align: "center",
    maxWidth: leftW,
  })

  doc.setFontSize(8)
  let yL = textY0 + 3.5
  drawLabelValue(doc, "Razón Social: ", emisor.razonSocial, leftX, yL, leftW)
  yL += 3.8
  drawLabelValue(doc, "Domicilio Comercial: ", emisor.domicilio, leftX, yL, leftW)
  yL += 3.8
  drawLabelValue(doc, "Condición frente al IVA: ", emisor.condicionIva, leftX, yL, leftW)

  let yR = textY0
  doc.setFont("helvetica", "bold")
  doc.setFontSize(titulo.length > 10 ? 10 : 12)
  doc.text(titulo, rightX, yR)
  yR += 4.8
  doc.setFontSize(8)

  const pv = formatPuntoVentaAfip(comprobante.puntoVenta)
  const nro = formatNumeroComprobanteAfip(comprobante.numero)
  drawLabelValue(doc, "Punto de Venta: ", pv, rightX, yR, rightW)
  yR += 3.8
  drawLabelValue(doc, "Comp. Nro: ", nro, rightX, yR, rightW)
  yR += 3.8
  drawLabelValue(doc, "Fecha de Emisión: ", fmtDateAr(comprobante.fechaEmision), rightX, yR, rightW)
  yR += 3.8
  const cuitEmisor = String(emisor.cuit).replace(/\D/g, "")
  drawLabelValue(doc, "CUIT: ", cuitEmisor || "—", rightX, yR, rightW)
  yR += 3.8
  drawLabelValue(doc, "Ingresos Brutos: ", emisor.ingresosBrutos ?? "—", rightX, yR, rightW)
  yR += 3.8
  drawLabelValue(
    doc,
    "Fecha de Inicio de Actividades: ",
    emisor.inicioActividades ?? "—",
    rightX,
    yR,
    rightW
  )

  return headerBottom
}
