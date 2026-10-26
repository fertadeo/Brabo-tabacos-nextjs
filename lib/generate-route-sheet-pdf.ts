/**
 * Hoja de ruta PDF para reparto propio (logística Brabo).
 */
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import type { Order } from "@/lib/api"
import { COMPANY_PDF, LOGO_MARK_PATH, loadBrandLogoImage } from "@/lib/brand"
import {
  PDF_BRAND_BLUE as BRAND_BLUE,
  PDF_GRAY_LINE as GRAY_LINE,
  PDF_TEXT_BODY as TEXT_BODY,
  PDF_TEXT_MUTED as TEXT_MUTED,
} from "@/lib/pdf-brand-colors"
import {
  formatMoneyAR,
  getDeliveryDepotAddress,
  orderContactPhone,
  orderDeliveryAddress,
  orderTotalNumber,
} from "@/lib/delivery-route"

export type RouteSheetStop = {
  order: Order
  sequence: number
}

export type GenerateRouteSheetPdfParams = {
  deliveryDate: string
  driverName?: string
  vehicleInfo?: string
  stops: RouteSheetStop[]
  notes?: string
}

function formatDateAR(iso: string): string {
  if (!iso) return "—"
  try {
    const [y, m, d] = iso.slice(0, 10).split("-")
    if (y && m && d) return `${d}/${m}/${y}`
    return new Date(iso).toLocaleDateString("es-AR")
  } catch {
    return iso
  }
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    pendiente_preparacion: "Para preparar",
    listo_despacho: "Listo despacho",
    en_proceso: "En proceso",
    aprobado: "Aprobado",
    pagado: "Pagado",
    completado: "Completado",
    cancelado: "Cancelado",
  }
  return map[status] || status
}

export async function generateRouteSheetPdf(
  params: GenerateRouteSheetPdfParams
): Promise<void> {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 12
  let y = 12

  try {
    const logo = await loadBrandLogoImage(LOGO_MARK_PATH)
    if (logo) {
      doc.addImage(logo.dataUrl, logo.format, margin, y, 22, 14)
    }
  } catch {
    /* logo opcional */
  }

  doc.setFont("helvetica", "bold")
  doc.setFontSize(16)
  doc.setTextColor(...BRAND_BLUE)
  doc.text("Hoja de ruta — Reparto", margin + 28, y + 6)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(...TEXT_MUTED)
  doc.text(COMPANY_PDF.name, margin + 28, y + 12)
  if (COMPANY_PDF.tagline) {
    doc.text(COMPANY_PDF.tagline, margin + 28, y + 16)
  }

  y = 30
  doc.setDrawColor(...GRAY_LINE)
  doc.line(margin, y, pageW - margin, y)
  y += 8

  doc.setFontSize(10)
  doc.setTextColor(...TEXT_BODY)
  const meta: string[] = [
    `Fecha de reparto: ${formatDateAR(params.deliveryDate)}`,
    `Salida: ${getDeliveryDepotAddress()}`,
    `Paradas: ${params.stops.length}`,
  ]
  if (params.driverName?.trim()) meta.push(`Repartidor: ${params.driverName.trim()}`)
  if (params.vehicleInfo?.trim()) meta.push(`Vehículo: ${params.vehicleInfo.trim()}`)

  meta.forEach((line, i) => {
    doc.text(line, margin + (i % 2 === 0 ? 0 : pageW / 2 - margin), y + Math.floor(i / 2) * 5)
  })
  y += Math.ceil(meta.length / 2) * 5 + 6

  const rows = params.stops.map((s) => {
    const o = s.order
    const addr = orderDeliveryAddress(o) || "Sin domicilio"
    const phone = orderContactPhone(o) || "—"
    const items =
      o.items
        ?.map((it) => `${it.quantity}× ${it.product_name || it.description}`)
        .slice(0, 4)
        .join("; ") || "—"
    return [
      String(s.sequence),
      o.order_number || `#${o.id}`,
      o.client_name || o.delivery_contact || "—",
      addr,
      phone,
      statusLabel(o.status),
      `$${formatMoneyAR(orderTotalNumber(o))}`,
      items.length > 80 ? `${items.slice(0, 77)}…` : items,
    ]
  })

  autoTable(doc, {
    startY: y,
    head: [["#", "Pedido", "Cliente", "Domicilio", "Teléfono", "Estado", "Total", "Ítems"]],
    body: rows,
    styles: {
      fontSize: 8,
      cellPadding: 2,
      textColor: TEXT_BODY,
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: BRAND_BLUE,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 28 },
      2: { cellWidth: 36 },
      3: { cellWidth: 55 },
      4: { cellWidth: 28 },
      5: { cellWidth: 28 },
      6: { cellWidth: 24, halign: "right" },
      7: { cellWidth: "auto" },
    },
    margin: { left: margin, right: margin },
  })

  const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || y + 40
  let footY = finalY + 10

  if (params.notes?.trim()) {
    doc.setFontSize(9)
    doc.setTextColor(...TEXT_MUTED)
    doc.text("Observaciones:", margin, footY)
    footY += 5
    doc.setTextColor(...TEXT_BODY)
    const split = doc.splitTextToSize(params.notes.trim(), pageW - margin * 2)
    doc.text(split, margin, footY)
    footY += split.length * 4 + 6
  }

  doc.setFontSize(8)
  doc.setTextColor(...TEXT_MUTED)
  doc.text(
    "Firmas: _______________  (preparación)     _______________  (repartidor)     _______________  (recepción)",
    margin,
    Math.min(footY + 4, doc.internal.pageSize.getHeight() - 12)
  )

  const fileDate = params.deliveryDate.slice(0, 10) || "ruta"
  doc.save(`hoja-ruta-${fileDate}.pdf`)
}
