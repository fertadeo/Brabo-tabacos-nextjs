/**
 * PDF de recepción de orden de reparación para entregar al cliente (solo cliente / window).
 * Acentos en azul de marca (alineado al logo Recurso-8).
 */
import jsPDF from "jspdf"
import {
  parseEquipmentDescriptionString,
  formatEquipmentTypeDisplay,
} from "@/lib/repair-order-equipment"
import {
  documentClientePdfFromSnapshot,
  drawDocumentClientePdfDetails,
} from "@/lib/document-cliente-pdf"

const LOGO_PATH =
  process.env.NEXT_PUBLIC_LOGO_MARK_PATH?.trim() || "/images/brabo-logo.png"

/** Azul corporativo del logo (~#1d4e9e) */
const BRAND_BLUE: [number, number, number] = [29, 78, 158]
/** Azul más oscuro para títulos sobre fondo claro */
const BRAND_BLUE_DARK: [number, number, number] = [18, 52, 112]
/** Fondo suave tintado a la marca */
const BRAND_BLUE_LIGHT: [number, number, number] = [232, 239, 250]
const GRAY_LINE: [number, number, number] = [226, 232, 240]
const TEXT_MUTED: [number, number, number] = [100, 116, 139]
const TEXT_BODY: [number, number, number] = [30, 41, 59]

const COMPANY = {
  name: process.env.NEXT_PUBLIC_COMPANY_NAME?.trim() || process.env.NEXT_PUBLIC_APP_NAME?.trim() || "Aurix Retail",
  tagline: "Soluciones informáticas",
  address: "Luther King 1095",
  city: "Santa Rosa, La Pampa",
  phone: "",
  email: "",
}

export interface RepairOrderReceptionPdfLineItem {
  product_name: string
  quantity: number
  unit_price: number
}

export interface GenerateRepairOrderReceptionPdfParams {
  repair_number: string
  reception_date: string
  clientName: string
  clientPhone?: string
  clientEmail?: string
  /** Líneas de domicilio del cliente (dirección, ciudad, etc.) */
  clientAddressLines?: string[]
  clientCode?: string
  clientCuit?: string
  clientTaxCondition?: string
  equipment_description: string
  customer_declared_fault: string
  diagnosis?: string
  work_description?: string
  delivery_date_estimated?: string
  lineItems: RepairOrderReceptionPdfLineItem[]
  labor_amount: number
}

function formatMoneyAr(n: number): string {
  return n.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

function formatDateAr(iso: string): string {
  if (!iso) return "—"
  try {
    const d = new Date(iso.includes("T") ? iso : `${iso}T12:00:00`)
    return d.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    })
  } catch {
    return iso
  }
}

function drawWrapped(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines?: number
): number {
  const lines = doc.splitTextToSize(text, maxWidth) as string[]
  const slice = maxLines != null ? lines.slice(0, maxLines) : lines
  slice.forEach((line, i) => {
    doc.text(line, x, y + i * lineHeight)
  })
  return y + slice.length * lineHeight
}

export function generateRepairOrderReceptionPdf(params: GenerateRepairOrderReceptionPdfParams): void {
  if (typeof window === "undefined") return

  const doc = new jsPDF("p", "pt", "a4")
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const mx = 40
  const contentW = pageW - mx * 2
  const topY = 36

  const safeFile = String(params.repair_number || "orden").replace(/[^\w\-]+/g, "-")

  const finish = (logoH: number) => {
    let y = topY

    doc.setFont("helvetica", "bold")
    doc.setFontSize(20)
    doc.setTextColor(...BRAND_BLUE)
    doc.text("ORDEN DE REPARACIÓN", pageW - mx, y + (logoH > 0 ? 8 : 4), { align: "right" })

    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(...TEXT_MUTED)
    doc.text(formatDateAr(params.reception_date), pageW - mx, y + (logoH > 0 ? 28 : 22), {
      align: "right",
    })

    doc.setFont("helvetica", "bold")
    doc.setTextColor(...TEXT_BODY)
    doc.text(`N° ${params.repair_number}`, pageW - mx, y + (logoH > 0 ? 44 : 38), { align: "right" })

    y = topY + Math.max(logoH, 52) + 20

    doc.setDrawColor(...GRAY_LINE)
    doc.setLineWidth(0.5)
    doc.line(mx, y, pageW - mx, y)
    y += 18

    const colGap = 24
    const colW = (contentW - colGap) / 2

    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.setTextColor(...BRAND_BLUE)
    doc.text("DATOS DEL LOCAL", mx, y)

    doc.text("CLIENTE", mx + colW + colGap, y)
    y += 12

    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.setTextColor(...TEXT_BODY)
    doc.text(COMPANY.name, mx, y)
    doc.text(params.clientName || "—", mx + colW + colGap, y)
    y += 12

    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor(...TEXT_MUTED)
    doc.text(COMPANY.tagline, mx, y)
    y += 11
    doc.text(COMPANY.address, mx, y)
    y += 11
    doc.text(COMPANY.city, mx, y)

    let yRight = y - 22
    yRight = drawDocumentClientePdfDetails(doc, mx + colW + colGap, yRight, {
      clientCode: params.clientCode,
      clientCuit: params.clientCuit,
      clientPhone: params.clientPhone,
      clientEmail: params.clientEmail,
      clientAddressLines: params.clientAddressLines,
      clientTaxCondition: params.clientTaxCondition,
    })

    y = Math.max(y, yRight) + 8

    doc.line(mx, y, pageW - mx, y)
    y += 16

    const parsed = parseEquipmentDescriptionString(params.equipment_description)
    const innerW = contentW - 20
    const equipTitleY = y + 16
    let bodyLineCount = 3
    if (parsed.legacy) {
      const lines = doc.splitTextToSize(parsed.brandModel, innerW) as string[]
      bodyLineCount = Math.min(Math.max(lines.length, 1), 8)
    }
    const equipBoxH = Math.max(72, 30 + bodyLineCount * 11 + 14)
    doc.setFillColor(...BRAND_BLUE_LIGHT)
    doc.setDrawColor(...BRAND_BLUE)
    doc.setLineWidth(0.3)
    doc.roundedRect(mx, y, contentW, equipBoxH, 3, 3, "FD")

    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.setTextColor(...BRAND_BLUE_DARK)
    doc.text("Equipo recibido", mx + 10, equipTitleY)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor(...TEXT_BODY)
    let ty = y + 30
    if (parsed.legacy) {
      drawWrapped(doc, parsed.brandModel, mx + 10, ty, innerW, 11, 8)
    } else {
      doc.text(`Marca y modelo: ${parsed.brandModel}`, mx + 10, ty)
      ty += 12
      doc.text(`Tipo de equipo: ${formatEquipmentTypeDisplay(parsed)}`, mx + 10, ty)
      ty += 12
      doc.text(
        parsed.serialNumber.trim()
          ? `N.º de serie: ${parsed.serialNumber}`
          : "N.º de serie: —",
        mx + 10,
        ty
      )
    }

    y = y + equipBoxH + 14

    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.setTextColor(...TEXT_BODY)
    doc.text("Nota — Falla declarada por el cliente", mx, y)
    y += 10
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor(...TEXT_MUTED)
    y = drawWrapped(doc, params.customer_declared_fault.trim() || "—", mx, y, contentW, 11)
    y += 14

    if (params.diagnosis?.trim()) {
      doc.setFont("helvetica", "bold")
      doc.setTextColor(...TEXT_BODY)
      doc.text("Diagnóstico técnico (referencia / presupuesto)", mx, y)
      y += 10
      doc.setFont("helvetica", "normal")
      doc.setTextColor(...TEXT_MUTED)
      y = drawWrapped(doc, params.diagnosis.trim(), mx, y, contentW, 11)
      y += 12
    }

    if (params.work_description?.trim()) {
      doc.setFont("helvetica", "bold")
      doc.setTextColor(...TEXT_BODY)
      doc.text("Trabajo a realizar", mx, y)
      y += 10
      doc.setFont("helvetica", "normal")
      doc.setTextColor(...TEXT_MUTED)
      y = drawWrapped(doc, params.work_description.trim(), mx, y, contentW, 11)
      y += 12
    }

    if (params.delivery_date_estimated?.trim()) {
      doc.setFont("helvetica", "normal")
      doc.setTextColor(...TEXT_BODY)
      doc.text(`Entrega estimada: ${formatDateAr(params.delivery_date_estimated)}`, mx, y)
      y += 16
    } else {
      y += 4
    }

    if (y > pageH - 220) {
      doc.addPage()
      y = 48
    }

    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.setTextColor(255, 255, 255)
    doc.setFillColor(...BRAND_BLUE)
    const headH = 22
    doc.rect(mx, y, contentW, headH, "F")
    const colDesc = mx + 8
    const colUnit = mx + contentW * 0.52
    const colQty = mx + contentW * 0.72
    const colTot = pageW - mx - 8
    doc.text("Descripción del ítem", colDesc, y + 14)
    doc.text("P. unit.", colUnit, y + 14, { align: "right" })
    doc.text("Cant.", colQty, y + 14, { align: "right" })
    doc.text("Total", colTot, y + 14, { align: "right" })

    y += headH + 4
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor(...TEXT_BODY)

    let materialsSubtotal = 0
    if (params.lineItems.length === 0) {
      doc.setTextColor(...TEXT_MUTED)
      doc.text("Sin materiales / repuestos cargados en esta recepción.", colDesc, y + 10)
      y += 24
    } else {
      params.lineItems.forEach((item) => {
        const lineTotal = item.quantity * item.unit_price
        materialsSubtotal += lineTotal

        doc.setDrawColor(...GRAY_LINE)
        doc.setLineWidth(0.3)
        doc.line(mx, y, pageW - mx, y)
        y += 6

        const nameLines = doc.splitTextToSize(item.product_name || "—", colUnit - colDesc - 10) as string[]
        const rowH = Math.max(22, 10 + nameLines.length * 11)

        doc.setFont("helvetica", "bold")
        doc.setTextColor(...TEXT_BODY)
        nameLines.forEach((line, i) => {
          doc.text(line, colDesc, y + 12 + i * 11)
        })
        doc.setFont("helvetica", "normal")
        doc.setTextColor(...TEXT_MUTED)
        doc.text(formatMoneyAr(item.unit_price), colUnit, y + 12, { align: "right" })
        doc.setTextColor(...TEXT_BODY)
        doc.text(String(item.quantity), colQty, y + 12, { align: "right" })
        doc.text(formatMoneyAr(lineTotal), colTot, y + 12, { align: "right" })

        y += rowH
      })
    }

    doc.setDrawColor(...GRAY_LINE)
    doc.line(mx, y, pageW - mx, y)
    y += 20

    const labor = Number(params.labor_amount) || 0
    const grandTotal = materialsSubtotal + labor

    const sumX = pageW - mx - 140
    const valX = pageW - mx - 4

    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.setTextColor(...TEXT_BODY)
    doc.text("Subtotal materiales:", sumX, y, { align: "right" })
    doc.text(formatMoneyAr(materialsSubtotal), valX, y, { align: "right" })
    y += 16

    doc.text("Mano de obra:", sumX, y, { align: "right" })
    doc.text(formatMoneyAr(labor), valX, y, { align: "right" })
    y += 18

    const totalBoxH = 28
    const totalLabel = "TOTAL ESTIMADO:"
    const totalValue = formatMoneyAr(grandTotal)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    const totalLabelWidth = doc.getTextWidth(totalLabel)
    const boxPadX = 12
    const boxRight = pageW - mx
    const boxLeft = sumX - totalLabelWidth - boxPadX
    doc.setFillColor(...BRAND_BLUE)
    doc.rect(boxLeft, y - 4, boxRight - boxLeft, totalBoxH, "F")
    doc.setTextColor(255, 255, 255)
    doc.text(totalLabel, sumX, y + 12, { align: "right" })
    doc.text(totalValue, valX, y + 12, { align: "right" })

    y += totalBoxH + 28

    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.setTextColor(...BRAND_BLUE)
    doc.text("Gracias por confiar en nosotros", mx, y)
    y += 22

    const footTop = pageH - 72
    if (y > footTop - 10) {
      doc.addPage()
      y = 48
    }

    y = Math.max(y, footTop)

    doc.setDrawColor(...GRAY_LINE)
    doc.line(mx, y, pageW - mx, y)
    y += 10

    doc.setFont("helvetica", "normal")
    doc.setFontSize(7)
    doc.setTextColor(...TEXT_MUTED)
    const third = contentW / 3
    let c1 = y
    doc.setFont("helvetica", "bold")
    doc.setTextColor(...BRAND_BLUE)
    doc.text("Consultas", mx, c1)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(...TEXT_MUTED)
    c1 += 9
    if (COMPANY.email) {
      doc.text(`Email: ${COMPANY.email}`, mx, c1)
      c1 += 8
    } else {
      doc.text("Acercate al local o escribinos por los canales habituales.", mx, c1)
      c1 += 8
    }
    if (COMPANY.phone) {
      doc.text(`Tel: ${COMPANY.phone}`, mx, c1)
      c1 += 8
    }

    let c2 = y
    doc.setFont("helvetica", "bold")
    doc.setTextColor(...BRAND_BLUE)
    doc.text("Información de pago", mx + third, c2)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(...TEXT_MUTED)
    c2 += 9
    doc.text("Los montos son referenciales hasta aceptación", mx + third, c2)
    c2 += 8
    doc.text("del presupuesto por parte del cliente.", mx + third, c2)

    let c3 = y
    doc.setFont("helvetica", "bold")
    doc.setTextColor(...BRAND_BLUE)
    doc.text("Términos", mx + third * 2, c3)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(...TEXT_MUTED)
    c3 += 9
    const terms = doc.splitTextToSize(
      "Comprobante de recepción. No constituye factura fiscal. El diagnóstico y presupuesto definitivo pueden variar tras la evaluación técnica.",
      third - 6
    ) as string[]
    terms.forEach((t, i) => {
      doc.text(t, mx + third * 2, c3 + i * 8)
    })

    doc.save(`orden-reparacion-${safeFile}.pdf`)
  }

  const img = new window.Image()
  img.crossOrigin = "anonymous"
  img.src = LOGO_PATH
  img.onload = () => {
    const lw = 108
    const lh = img.width ? (img.height / img.width) * lw : 56
    try {
      doc.addImage(img, "PNG", mx, topY, lw, lh)
    } catch {
      /* continuar sin logo */
    }
    finish(lh)
  }
  img.onerror = () => finish(0)
}
