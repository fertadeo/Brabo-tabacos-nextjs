/**
 * PDF de presupuesto comercial para entregar al cliente (retail: cigarrillos, golosinas, medicamentos).
 */
import jsPDF from "jspdf"
import type { CommercialBudgetDetail } from "@/lib/api"
import type { SaleCurrency } from "@/lib/pos-usd"
import { formatBudgetMoney, resolveBudgetLineCurrency } from "@/lib/budget-currency"
import {
  documentClientePdfFromSnapshot,
  drawDocumentClientePdfDetails,
} from "@/lib/document-cliente-pdf"
import { COMPANY_PDF, LOGO_MARK_PATH, loadBrandLogoImage } from "@/lib/brand"
import {
  PDF_BRAND_BLUE as BRAND_BLUE,
  PDF_BRAND_BLUE_DARK as BRAND_BLUE_DARK,
  PDF_BRAND_BLUE_LIGHT as BRAND_BLUE_LIGHT,
  PDF_GRAY_LINE as GRAY_LINE,
  PDF_TEXT_BODY as TEXT_BODY,
  PDF_TEXT_MUTED as TEXT_MUTED,
} from "@/lib/pdf-brand-colors"

const COMPANY = {
  name: COMPANY_PDF.name,
  legalName: COMPANY_PDF.legalName,
  cuit: COMPANY_PDF.cuit || "—",
  tagline: COMPANY_PDF.tagline,
  address: COMPANY_PDF.address || COMPANY_PDF.addressLine || "—",
  city: COMPANY_PDF.city,
  phone: "",
  email: COMPANY_PDF.email,
}

export interface CommercialBudgetPdfLineItem {
  product_name: string
  product_code?: string
  quantity: number
  unit_price: number
  currency?: SaleCurrency
}

export interface GenerateCommercialBudgetPdfParams {
  budget_number: string
  emission_date: string
  valid_until: string | null
  clientName: string
  clientPhone?: string
  clientEmail?: string
  clientAddressLines?: string[]
  clientCode?: string
  clientCuit?: string
  clientTaxCondition?: string
  lineItems: CommercialBudgetPdfLineItem[]
  subtotal: number
  vat21: number
  vat105: number
  total: number
  exchange_rate?: number | null
  observaciones?: string
}

/** Formato mínimo compatible con `BudgetPdfModalData` (evita dependencia circular con el modal). */
export interface CommercialPdfFromModalInput {
  numero: string
  estado: string
  fecha: string
  fechaVencimiento: string
  cliente: string
  telefono?: string
  email?: string
  direccion?: string
  codigo?: string
  cuit?: string
  condicionFiscal?: string
  items: Array<{
    service: string
    description: string
    equipmentModel?: string
    quantity: number
    unitPrice: number
    currency?: SaleCurrency
  }>
  subtotal: number
  vat21: number
  vat105: number
  total: number
  observaciones?: string
}

function commercialPdfLineProductCode(item: CommercialPdfFromModalInput["items"][number]): string | undefined {
  const model = item.equipmentModel?.trim()
  if (model && model !== "—") return model
  const fromDesc = item.description?.replace(/^Código:\s*/i, "").trim()
  if (!fromDesc || fromDesc === "—") return undefined
  return fromDesc
}

export function commercialPdfParamsFromModalInput(data: CommercialPdfFromModalInput): GenerateCommercialBudgetPdfParams {
  const lineItems: CommercialBudgetPdfLineItem[] = data.items.map((it) => ({
    product_name: it.service,
    product_code: commercialPdfLineProductCode(it),
    quantity: it.quantity,
    unit_price: it.unitPrice,
    currency: it.currency,
  }))

  return {
    budget_number: data.numero,
    emission_date: data.fecha,
    valid_until: data.fechaVencimiento?.trim() ? data.fechaVencimiento : null,
    clientName: data.cliente,
    clientPhone: data.telefono,
    clientEmail: data.email,
    clientAddressLines: data.direccion ? data.direccion.split(" · ") : undefined,
    clientCode: data.codigo,
    clientCuit: data.cuit,
    clientTaxCondition: data.condicionFiscal,
    lineItems,
    subtotal: data.subtotal,
    vat21: data.vat21,
    vat105: data.vat105,
    total: data.total,
    observaciones: data.observaciones,
  }
}

export function commercialPdfParamsFromApiDetail(detail: CommercialBudgetDetail): GenerateCommercialBudgetPdfParams {
  const clientFields = documentClientePdfFromSnapshot(detail)
  const lineItems: CommercialBudgetPdfLineItem[] = (detail.items || []).map((i) => {
    const isCustom = i.product_id == null
    const name = (i.description ?? i.product_name ?? "").trim() || i.product_name
    return {
      product_name: name,
      product_code: isCustom ? undefined : i.product_code?.trim() || undefined,
      quantity: i.quantity,
      unit_price: i.unit_price,
      currency: resolveBudgetLineCurrency(i.currency),
    }
  })

  const exchangeNote =
    detail.exchange_rate != null && Number(detail.exchange_rate) > 0
      ? `Cotización de referencia: $${Number(detail.exchange_rate).toLocaleString("es-AR", { maximumFractionDigits: 2 })} por USD.`
      : ""
  const notes = [detail.notes?.trim(), exchangeNote].filter(Boolean).join("\n\n")

  return {
    budget_number: detail.budget_number,
    emission_date: detail.created_at.split("T")[0],
    valid_until: detail.valid_until ? detail.valid_until.split("T")[0] : null,
    clientName: clientFields.clientName,
    clientPhone: clientFields.clientPhone,
    clientEmail: clientFields.clientEmail,
    clientAddressLines: clientFields.clientAddressLines,
    clientCode: clientFields.clientCode,
    clientCuit: clientFields.clientCuit,
    clientTaxCondition: clientFields.clientTaxCondition,
    lineItems,
    subtotal: detail.total_amount,
    vat21: 0,
    vat105: 0,
    total: detail.total_amount,
    exchange_rate: detail.exchange_rate ?? null,
    observaciones: notes || undefined,
  }
}

function formatPdfMoney(n: number, currency: SaleCurrency = "ARS"): string {
  if (currency === "USD") {
    return formatBudgetMoney(n, "USD")
  }
  return `$${n.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
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

const LINE_ITEM_LINE_H = 11
const LINE_ITEM_PAD_TOP = 14
const TABLE_UNIT_COL_W = 58
const TABLE_QTY_COL_W = 34
const TABLE_TOT_COL_W = 66
const TABLE_COL_GAP = 12
/** Límite de caracteres por línea en descripciones muy largas (refuerzo al wrap por ancho). */
const PRODUCT_DESC_MAX_CHARS_PER_LINE = 40

interface BudgetTableColumns {
  colDesc: number
  colUnit: number
  colQty: number
  colTot: number
  descMaxW: number
}

function getBudgetTableColumns(mx: number, pageW: number): BudgetTableColumns {
  const colDesc = mx + 10
  const colTot = pageW - mx - 10
  const colQty = colTot - TABLE_TOT_COL_W - TABLE_COL_GAP
  const colUnit = colQty - TABLE_QTY_COL_W - TABLE_COL_GAP
  const descMaxW = colUnit - TABLE_UNIT_COL_W - colDesc - TABLE_COL_GAP
  return { colDesc, colUnit, colQty, colTot, descMaxW }
}

function wrapBudgetProductText(
  doc: jsPDF,
  text: string,
  maxWidth: number,
  fontStyle: "normal" | "bold" = "bold"
): string[] {
  const trimmed = text.trim() || "—"
  doc.setFont("helvetica", fontStyle)
  const safeWidth = Math.max(48, maxWidth - 8)
  const fromWidth = doc.splitTextToSize(trimmed, safeWidth) as string[]

  const lines: string[] = []
  for (const line of fromWidth) {
    if (line.length <= PRODUCT_DESC_MAX_CHARS_PER_LINE && doc.getTextWidth(line) <= safeWidth) {
      lines.push(line)
      continue
    }

    let remaining = line
    while (remaining.length > 0) {
      let end = Math.min(PRODUCT_DESC_MAX_CHARS_PER_LINE, remaining.length)
      if (end < remaining.length) {
        const spaceAt = remaining.lastIndexOf(" ", end)
        if (spaceAt > 16) end = spaceAt
      }
      let chunk = remaining.slice(0, end).trimEnd()
      while (chunk.length > 1 && doc.getTextWidth(chunk) > safeWidth) {
        chunk = chunk.slice(0, -1).trimEnd()
      }
      if (!chunk) chunk = remaining.slice(0, 1)
      lines.push(chunk)
      remaining = remaining.slice(chunk.length).trimStart()
    }
  }

  return lines.length > 0 ? lines : ["—"]
}

function drawBudgetItemsTableHeader(
  doc: jsPDF,
  y: number,
  mx: number,
  contentW: number,
  cols: BudgetTableColumns
): number {
  const headH = 22
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.setTextColor(255, 255, 255)
  doc.setFillColor(...BRAND_BLUE)
  doc.rect(mx, y, contentW, headH, "F")
  doc.text("Descripción", cols.colDesc, y + 14)
  doc.text("P. unit.", cols.colUnit, y + 14, { align: "right" })
  doc.text("Cant.", cols.colQty, y + 14, { align: "right" })
  doc.text("Importe", cols.colTot, y + 14, { align: "right" })
  return y + headH + 4
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

function renderCommercialBudgetPdf(
  doc: jsPDF,
  params: GenerateCommercialBudgetPdfParams,
  logoH: number
): void {
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const mx = 40
  const contentW = pageW - mx * 2
  const topY = 36

  let y = topY

  const headerLeftY0 = topY + (logoH > 0 ? logoH + 10 : 0)
  let headerLeftY = headerLeftY0
  if (logoH === 0) {
    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.setTextColor(...BRAND_BLUE)
    doc.text(COMPANY.name, mx, headerLeftY)
    headerLeftY += 13
  }
  doc.setFont("helvetica", "bold")
  doc.setFontSize(8)
  doc.setTextColor(...TEXT_BODY)
  doc.text(COMPANY.legalName, mx, headerLeftY)
  headerLeftY += 11
  if (COMPANY.cuit && COMPANY.cuit !== "—") {
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor(...TEXT_MUTED)
    doc.text(`CUIT: ${COMPANY.cuit}`, mx, headerLeftY)
    headerLeftY += 11
  }
  const headerLeftBottom = headerLeftY + 8

  doc.setFont("helvetica", "bold")
  doc.setFontSize(20)
  doc.setTextColor(...BRAND_BLUE)
  doc.text("PRESUPUESTO", pageW - mx, y + (logoH > 0 ? 8 : 4), { align: "right" })

  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(...TEXT_MUTED)
  doc.text(`Emitido: ${formatDateAr(params.emission_date)}`, pageW - mx, y + (logoH > 0 ? 28 : 22), {
    align: "right",
  })

  doc.setFont("helvetica", "bold")
  doc.setTextColor(...TEXT_BODY)
  doc.text(`N° ${params.budget_number}`, pageW - mx, y + (logoH > 0 ? 42 : 36), { align: "right" })

  if (params.valid_until) {
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor(...TEXT_MUTED)
    doc.text(`Válido hasta: ${formatDateAr(params.valid_until)}`, pageW - mx, y + (logoH > 0 ? 54 : 48), {
      align: "right",
    })
  }

  y = topY + Math.max(logoH, headerLeftBottom - topY, params.valid_until ? 60 : 52) + 20

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

    const clientColX = mx + colW + colGap

    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.setTextColor(...TEXT_BODY)
    doc.text(COMPANY.name, mx, y)
    doc.text(params.clientName || "—", clientColX, y)
    y += 12

    let yClient = y
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor(...TEXT_BODY)
    if (params.clientAddressLines?.length) {
      for (const line of params.clientAddressLines) {
        const trimmed = line.trim()
        if (trimmed) {
          doc.text(trimmed, clientColX, yClient)
          yClient += 11
        }
      }
    }

    doc.text(COMPANY.legalName, mx, y)
    y += 11
    if (COMPANY.cuit && COMPANY.cuit !== "—") {
      doc.setFontSize(8)
      doc.setTextColor(...TEXT_MUTED)
      doc.text(`CUIT: ${COMPANY.cuit}`, mx, y)
      y += 11
    }
    doc.setFontSize(9)
    doc.setTextColor(...TEXT_BODY)
    doc.text(COMPANY.tagline, mx, y)
    y += 11
    if (COMPANY.address && COMPANY.address !== "—") {
      doc.text(COMPANY.address, mx, y)
      y += 11
    }
    if (COMPANY.city) {
      doc.text(COMPANY.city, mx, y)
      y += 11
    }

    yClient = drawDocumentClientePdfDetails(doc, clientColX, yClient, {
      clientCuit: params.clientCuit,
      clientPhone: params.clientPhone,
      clientEmail: params.clientEmail,
      clientTaxCondition: params.clientTaxCondition,
    })

    y = Math.max(y, yClient) + 8
    doc.line(mx, y, pageW - mx, y)
    y += 16

    if (y > pageH - 220) {
      doc.addPage()
      y = 48
    }

    const tableCols = getBudgetTableColumns(mx, pageW)
    const { colDesc, colUnit, colQty, colTot, descMaxW } = tableCols
    const tableBottomMargin = 160

    const ensureTableRowSpace = (rowH: number) => {
      if (y + rowH <= pageH - tableBottomMargin) return
      doc.addPage()
      y = 48
      y = drawBudgetItemsTableHeader(doc, y, mx, contentW, tableCols)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)
      doc.setTextColor(...TEXT_BODY)
    }

    y = drawBudgetItemsTableHeader(doc, y, mx, contentW, tableCols)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor(...TEXT_BODY)

    if (params.lineItems.length === 0) {
      doc.setTextColor(...TEXT_MUTED)
      doc.text("Sin ítems en este presupuesto.", colDesc, y + 10)
      y += 24
    } else {
      params.lineItems.forEach((item) => {
        const lineTotal = item.quantity * item.unit_price
        const productName = (item.product_name || "—").trim() || "—"

        doc.setFont("helvetica", "bold")
        doc.setFontSize(9)
        const nameLines = wrapBudgetProductText(doc, productName, descMaxW, "bold")
        const subtitle = item.product_code ? `Código: ${item.product_code.trim()}` : ""
        doc.setFont("helvetica", "normal")
        const subtitleLines = subtitle
          ? wrapBudgetProductText(doc, subtitle, descMaxW, "normal")
          : []
        const descLineCount = nameLines.length + subtitleLines.length
        const rowH = Math.max(26, LINE_ITEM_PAD_TOP + descLineCount * LINE_ITEM_LINE_H + 4)

        ensureTableRowSpace(rowH + 6)

        doc.setDrawColor(...GRAY_LINE)
        doc.setLineWidth(0.3)
        doc.line(mx, y, pageW - mx, y)
        y += 6

        doc.setFont("helvetica", "bold")
        doc.setFontSize(9)
        doc.setTextColor(...TEXT_BODY)
        nameLines.forEach((line, i) => {
          doc.text(line, colDesc, y + LINE_ITEM_PAD_TOP + i * LINE_ITEM_LINE_H)
        })

        doc.setFont("helvetica", "normal")
        doc.setTextColor(...TEXT_MUTED)
        const subtitleStartY = y + LINE_ITEM_PAD_TOP + nameLines.length * LINE_ITEM_LINE_H
        subtitleLines.forEach((line, i) => {
          doc.text(line, colDesc, subtitleStartY + i * LINE_ITEM_LINE_H)
        })

        const valueY = y + Math.min(LINE_ITEM_PAD_TOP, (rowH - 10) / 2 + 8)
        doc.setTextColor(...TEXT_BODY)
        const lineCurrency = resolveBudgetLineCurrency(item.currency)
        doc.text(formatPdfMoney(item.unit_price, lineCurrency), colUnit, valueY, { align: "right" })
        doc.text(String(item.quantity), colQty, valueY, { align: "right" })
        doc.text(formatPdfMoney(lineTotal, lineCurrency), colTot, valueY, { align: "right" })

        y += rowH
      })
    }

    doc.setDrawColor(...GRAY_LINE)
    doc.line(mx, y, pageW - mx, y)
    y += 18

    if (y > pageH - 120) {
      doc.addPage()
      y = 48
    }

    const summaryValueX = pageW - mx - 10
    const summaryLabelX = pageW - mx - 132
    const summaryLineH = 13

    function drawSummaryRow(label: string, value: string, bold = false) {
      doc.setFont("helvetica", bold ? "bold" : "normal")
      doc.setFontSize(10)
      doc.setTextColor(...TEXT_BODY)
      doc.text(label, summaryLabelX, y, { align: "right" })
      doc.text(value, summaryValueX, y, { align: "right" })
      y += summaryLineH
    }

    drawSummaryRow("Subtotal", formatPdfMoney(params.subtotal, "ARS"))

    if (params.vat21 > 0) {
      drawSummaryRow("IVA 21%", formatPdfMoney(params.vat21, "ARS"))
    }
    if (params.vat105 > 0) {
      drawSummaryRow("IVA 10,5%", formatPdfMoney(params.vat105, "ARS"))
    }

    const totalBoxH = 28
    const totalBoxPadX = 14
    const totalBoxW = 188
    const totalBoxLeft = summaryValueX - totalBoxW + 8
    doc.setFillColor(...BRAND_BLUE)
    doc.rect(totalBoxLeft, y, totalBoxW, totalBoxH, "F")
    const totalTextY = y + totalBoxH / 2 + 4
    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.setTextColor(255, 255, 255)
    doc.text("Total", totalBoxLeft + totalBoxPadX, totalTextY)
    doc.text(formatPdfMoney(params.total, "ARS"), summaryValueX, totalTextY, { align: "right" })

    y += totalBoxH + 22

    if (params.observaciones?.trim()) {
      if (y > pageH - 160) {
        doc.addPage()
        y = 48
      }
      doc.setFont("helvetica", "bold")
      doc.setFontSize(10)
      doc.setTextColor(...TEXT_BODY)
      doc.text("Observaciones", mx, y)
      y += 12
      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)
      doc.setTextColor(...TEXT_MUTED)
      y = drawWrapped(doc, params.observaciones.trim(), mx, y, contentW, 11)
      y += 16
    }

    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.setTextColor(...BRAND_BLUE)
    doc.text("Gracias por su compra", mx, y)
}

export async function buildCommercialBudgetPdf(
  params: GenerateCommercialBudgetPdfParams
): Promise<{ doc: jsPDF; safeFile: string }> {
  if (typeof window === "undefined") {
    throw new Error("PDF solo disponible en el navegador")
  }

  const doc = new jsPDF("p", "pt", "a4")
  const mx = 40
  const topY = 36
  const safeFile = String(params.budget_number || "presupuesto").replace(/[^\w\-]+/g, "-")

  const img = await loadBrandLogoImage(LOGO_MARK_PATH)
  let logoH = 0
  if (img) {
    const lw = 108
    logoH = img.width ? (img.height / img.width) * lw : 56
    try {
      doc.addImage(img, "PNG", mx, topY, lw, logoH)
    } catch {
      logoH = 0
    }
  }
  renderCommercialBudgetPdf(doc, params, logoH)
  return { doc, safeFile }
}

export async function getCommercialBudgetPdfBlob(params: GenerateCommercialBudgetPdfParams): Promise<Blob> {
  const { doc } = await buildCommercialBudgetPdf(params)
  return doc.output("blob")
}

export async function generateCommercialBudgetPdf(params: GenerateCommercialBudgetPdfParams): Promise<void> {
  const { doc, safeFile } = await buildCommercialBudgetPdf(params)
  doc.save(`presupuesto-${safeFile}.pdf`)
}
