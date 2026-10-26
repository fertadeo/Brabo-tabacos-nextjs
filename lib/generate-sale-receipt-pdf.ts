/**
 * Genera y descarga el PDF del comprobante de venta (solo ejecutar en el cliente).
 * Usado desde Punto de venta y desde la página Ventas.
 */
import jsPDF from "jspdf"
import type { SaleResponseData, SalePaymentMethod } from "@/lib/api"
import { COMPANY_PDF, LOGO_MARK_PATH, loadBrandLogoImage } from "@/lib/brand"

const PAYMENT_LABELS: Record<SalePaymentMethod, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
  mixto: "Mixto",
}

export interface SaleReceiptCartItem {
  product: { id: number; name: string }
  quantity: number
  unit_price: number
}

export function generateSaleReceiptPdf(params: {
  sale: SaleResponseData
  cartItems: SaleReceiptCartItem[]
  clientName: string
  clientPhone?: string
  clientAddress?: string
}) {
  if (typeof window === "undefined") return

  const { sale, cartItems, clientName, clientPhone, clientAddress } = params

  const doc = new jsPDF("p", "pt", "a4")

  const pageWidth = doc.internal.pageSize.getWidth()
  const marginX = 40
  let y = 32

  void (async () => {
    try {
      const img = await loadBrandLogoImage(LOGO_MARK_PATH)
      if (img) {
        const logoWidth = 120
        const ratio = img.width ? img.height / img.width : 0
        const logoHeight = ratio ? ratio * logoWidth : 67
        doc.addImage(img, "PNG", marginX, y, logoWidth, logoHeight)
      }
    } catch {
      /* sin logo */
    }
    renderRest()
    doc.save(`comprobante-venta-${sale.sale_number}.pdf`)
  })()

  function renderRest() {
    let cursorY = y
    const displaySaleNumber = String(sale.sale_number ?? "").replace(/^[^\d]*/, "")

    doc.setFont("helvetica", "bold")
    doc.setFontSize(14)
    doc.setTextColor(15, 23, 42)
    doc.text("COMPROBANTE DE VENTA", pageWidth - marginX, cursorY + 6, { align: "right" })

    doc.setFontSize(10)
    const headerBoxTop = cursorY + 150
    doc.setFillColor(248, 250, 252)
    doc.rect(marginX, headerBoxTop, pageWidth - marginX * 2, 66, "F")

    cursorY = headerBoxTop + 18
    doc.setFont("helvetica", "bold")
    doc.text(COMPANY_PDF.name, marginX + 10, cursorY)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(100, 116, 139)
    cursorY += 14
    doc.text(COMPANY_PDF.addressLine || COMPANY_PDF.tagline, marginX + 10, cursorY)
    cursorY += 12
    doc.text("Comprobante interno de venta", marginX + 10, cursorY)

    const rightBlockY = headerBoxTop + 18
    doc.setTextColor(15, 23, 42)
    doc.setFont("helvetica", "bold")
    doc.text("Fecha:", pageWidth - marginX - 150, rightBlockY)
    doc.setFont("helvetica", "normal")
    doc.text(
      new Date(sale.sale_date || sale.created_at).toLocaleDateString("es-AR"),
      pageWidth - marginX,
      rightBlockY,
      { align: "right" }
    )
    doc.setFont("helvetica", "bold")
    doc.text("N° comprobante:", pageWidth - marginX - 150, rightBlockY + 16)
    doc.setFont("helvetica", "normal")
    doc.text(displaySaleNumber || String(sale.sale_number), pageWidth - marginX, rightBlockY + 16, {
      align: "right",
    })
    doc.setFont("helvetica", "bold")
    doc.text("Medio de pago:", pageWidth - marginX - 150, rightBlockY + 32)
    doc.setFont("helvetica", "normal")
    doc.text(PAYMENT_LABELS[sale.payment_method] ?? sale.payment_method, pageWidth - marginX, rightBlockY + 32, {
      align: "right",
    })

    cursorY = headerBoxTop + 86 + 24
    doc.setFont("helvetica", "bold")
    doc.setFontSize(12)
    doc.setTextColor(15, 23, 42)
    doc.text("Datos del cliente", marginX, cursorY)
    doc.setDrawColor(148, 163, 184)
    doc.setLineWidth(0.6)
    doc.line(marginX, cursorY + 4, marginX + 150, cursorY + 4)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(11)
    doc.setTextColor(51, 65, 85)
    cursorY += 18
    const safeClientName = clientName || "Consumidor final"
    doc.text(`Nombre: ${safeClientName}`, marginX, cursorY)
    if (clientAddress?.trim()) {
      cursorY += 14
      doc.text(`Dirección: ${clientAddress.trim()}`, marginX, cursorY)
    }
    if (clientPhone?.trim()) {
      cursorY += 14
      doc.text(`Teléfono: ${clientPhone.trim()}`, marginX, cursorY)
    }

    cursorY += 26
    const tableTop = cursorY

    doc.setFillColor(248, 250, 252)
    doc.setDrawColor(203, 213, 225)
    doc.setLineWidth(0.6)
    doc.rect(marginX, tableTop - 18, pageWidth - marginX * 2, 24, "F")
    doc.setFontSize(11)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(30, 64, 175)
    const descColX = marginX + 6
    const qtyColX = marginX + 280
    const unitColX = marginX + 360
    const totalColX = pageWidth - marginX - 6
    doc.text("Descripción", descColX, tableTop - 2)
    doc.text("Cant.", qtyColX, tableTop - 2, { align: "right" })
    doc.text("P. Unit.", unitColX, tableTop - 2, { align: "right" })
    doc.text("Total", totalColX, tableTop - 2, { align: "right" })

    cursorY = tableTop + 6
    doc.setLineWidth(0.4)
    doc.setDrawColor(226, 232, 240)
    doc.setTextColor(15, 23, 42)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.line(marginX, cursorY, pageWidth - marginX, cursorY)
    cursorY += 14

    let subtotal = 0

    cartItems.forEach((item) => {
      const lineTotal = item.quantity * item.unit_price
      subtotal += lineTotal

      const maxWidth = qtyColX - marginX - 24
      const descLines = doc.splitTextToSize((item.product.name || "-").toUpperCase(), maxWidth) as string[]

      descLines.forEach((line: string, index: number) => {
        doc.text(line, descColX, cursorY)
        if (index === 0) {
          doc.text(String(item.quantity), qtyColX, cursorY, { align: "right" })
          doc.text(
            item.unit_price.toLocaleString("es-AR", { minimumFractionDigits: 2 }),
            unitColX,
            cursorY,
            { align: "right" }
          )
          doc.text(
            lineTotal.toLocaleString("es-AR", { minimumFractionDigits: 2 }),
            totalColX,
            cursorY,
            { align: "right" }
          )
        }
        cursorY += 14
      })

      cursorY += 4
    })

    if (cursorY + 80 > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage()
      cursorY = 60
    }

    doc.setLineWidth(0.6)
    doc.setDrawColor(148, 163, 184)
    doc.line(marginX, cursorY, pageWidth - marginX, cursorY)
    cursorY += 18

    const labelX = pageWidth - marginX - 120
    const valueX = pageWidth - marginX

    doc.setFontSize(11)
    doc.setFont("helvetica", "normal")
    doc.text("Subtotal:", labelX, cursorY, { align: "right" })
    doc.text(
      subtotal.toLocaleString("es-AR", { minimumFractionDigits: 2 }),
      valueX,
      cursorY,
      { align: "right" }
    )

    cursorY += 16
    doc.setFont("helvetica", "bold")
    doc.text("Total:", labelX, cursorY, { align: "right" })
    doc.text(
      sale.total_amount.toLocaleString("es-AR", { minimumFractionDigits: 2 }),
      valueX,
      cursorY,
      { align: "right" }
    )

    cursorY += 32
    const footerY = doc.internal.pageSize.getHeight() - 54
    doc.setFillColor(15, 23, 42)
    doc.rect(0, footerY, pageWidth, 54, "F")
    doc.setTextColor(226, 232, 240)
    doc.setFontSize(9)
    doc.setFont("helvetica", "normal")
    doc.text(
      "Comprobante interno de venta. No válido como factura fiscal (AFIP).",
      marginX,
      footerY + 20
    )
    doc.text(
      `${process.env.NEXT_PUBLIC_APP_NAME?.trim() || "Aurix Retail"} - Sistema de gestión y punto de venta`,
      marginX,
      footerY + 34
    )
    doc.text("Gracias por su compra.", pageWidth - marginX, footerY + 27, { align: "right" })
  }
}
