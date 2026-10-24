"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useConfirmBeforeClose } from "@/lib/use-confirm-before-close"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Download,
  Printer,
  Mail,
  Share2,
  FileText,
  Package,
  MapPin,
  Calendar,
  Truck,
  User,
  Phone,
  CheckCircle,
} from "lucide-react"
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface RemitoData {
  id: string
  numeroRemito: string
  pedidoId: string
  cliente: string
  direccion: string
  fecha: string
  fechaEntrega: string
  estado: string
  items: number
  bultos: number
  peso: string
  transporte: string
  observaciones: string
  prioridad: string
  telefono?: string
  email?: string
  dni?: string
  localidad?: string
  provincia?: string
  empresaNombre?: string
  empresaDireccion?: string
  empresaCuit?: string
  empresaTelefono?: string
  transporteDireccion?: string
  transporteHorario?: string
  transporteTelefono?: string
  transporteNotas?: string
  itemsDetalle?: Array<{
    producto: string
    cantidad: number
    precio: number
    total: number
  }>
}

interface RemitoPdfModalProps {
  isOpen: boolean
  onClose: () => void
  remito: RemitoData | null
}

export function RemitoPdfModal({ isOpen, onClose, remito }: RemitoPdfModalProps) {
  const [isGeneratingRemito, setIsGeneratingRemito] = useState(false)
  const [isGeneratingLabels, setIsGeneratingLabels] = useState(false)

  const [handleOpenChange, confirmDialog] = useConfirmBeforeClose((open) => {
    if (!open) onClose()
  })

  if (!remito) return null

  const handleDownloadPDF = async () => {
    setIsGeneratingRemito(true)
    
    try {
      // Crear documento PDF en formato A4
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      // Configuración de márgenes
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 15
      let yPosition = margin

      // Función auxiliar para verificar espacio en página
      const checkPageBreak = (requiredSpace: number) => {
        if (yPosition + requiredSpace > pageHeight - margin) {
          doc.addPage()
          yPosition = margin
          return true
        }
        return false
      }

      // **HEADER** - Logo y datos de la empresa
      doc.setFillColor(20, 184, 166) // turquoise-600
      doc.rect(0, 0, pageWidth, 35, 'F')
      
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(22)
      doc.setFont('helvetica', 'bold')
      doc.text(process.env.NEXT_PUBLIC_APP_NAME?.trim() || 'Aurix Retail', margin, 15)
      
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text('Sistema de Gestión ERP', margin, 21)
      doc.text('Av. Ejemplo 1234, CABA | Tel: (011) 4444-5555', margin, 26)
      doc.text(process.env.NEXT_PUBLIC_COMPANY_EMAIL?.trim() || 'soporte@example.com', margin, 31)

      // **RECUADRO DE REMITO**
      const boxX = pageWidth - margin - 50
      doc.setFillColor(240, 240, 240)
      doc.roundedRect(boxX, 8, 48, 22, 2, 2, 'FD')
      
      doc.setTextColor(20, 184, 166)
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('REMITO', boxX + 24, 15, { align: 'center' })
      
      doc.setFontSize(12)
      doc.text(remito.numeroRemito, boxX + 24, 22, { align: 'center' })

      yPosition = 45

      // **INFORMACIÓN DEL CLIENTE Y ENTREGA**
      doc.setTextColor(0, 0, 0)
      doc.setFillColor(248, 250, 252)
      doc.rect(margin, yPosition, pageWidth - (2 * margin), 45, 'F')

      // Columna Izquierda - Cliente
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(100, 116, 139)
      doc.text('CLIENTE', margin + 3, yPosition + 5)
      
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0)
      doc.text(remito.cliente, margin + 3, yPosition + 11)

      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(100, 116, 139)
      doc.text('DIRECCIÓN DE ENTREGA', margin + 3, yPosition + 18)
      
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(0, 0, 0)
      const direccionLines = doc.splitTextToSize(remito.direccion, 80)
      doc.text(direccionLines, margin + 3, yPosition + 24)

      // Columna Derecha - Detalles
      const rightColumn = pageWidth / 2 + 5
      
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(100, 116, 139)
      doc.text('FECHA DE EMISIÓN', rightColumn, yPosition + 5)
      
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(0, 0, 0)
      doc.text(remito.fecha, rightColumn, yPosition + 11)

      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(100, 116, 139)
      doc.text('FECHA DE ENTREGA ESTIMADA', rightColumn, yPosition + 18)
      
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(0, 0, 0)
      doc.text(remito.fechaEntrega, rightColumn, yPosition + 24)

      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(100, 116, 139)
      doc.text('TRANSPORTE', rightColumn, yPosition + 31)
      
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(0, 0, 0)
      doc.text(remito.transporte, rightColumn, yPosition + 37)

      yPosition += 52

      // Verificar espacio antes de la tabla
      checkPageBreak(60)

      // **TABLA DE PRODUCTOS**
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0)
      doc.text('DETALLE DE PRODUCTOS', margin, yPosition)
      yPosition += 8

      // Preparar datos de la tabla
      const tableData = itemsEjemplo.map(item => [
        item.producto,
        item.cantidad.toString(),
        `$${item.precio.toLocaleString('es-AR')}`,
        `$${item.total.toLocaleString('es-AR')}`
      ])

      // Usar autoTable para evitar cortes
      autoTable(doc, {
        startY: yPosition,
        head: [['Producto', 'Cantidad', 'Precio Unit.', 'Total']],
        body: tableData,
        foot: [[
          { content: 'SUBTOTAL', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } },
          { content: `$${subtotal.toLocaleString('es-AR')}`, styles: { fontStyle: 'bold' } }
        ]],
        theme: 'striped',
        headStyles: {
          fillColor: [20, 184, 166],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 10
        },
        bodyStyles: {
          fontSize: 9,
          textColor: [0, 0, 0]
        },
        footStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          fontSize: 10
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        margin: { left: margin, right: margin },
        didDrawPage: (data) => {
          // Actualizar yPosition después de dibujar la tabla
          yPosition = data.cursor ? data.cursor.y + 10 : yPosition + 10
        }
      })

      // Actualizar yPosition después de la tabla
      // @ts-ignore
      yPosition = doc.lastAutoTable.finalY + 10

      // **INFORMACIÓN ADICIONAL**
      checkPageBreak(25)
      
      doc.setFillColor(248, 250, 252)
      doc.rect(margin, yPosition, pageWidth - (2 * margin), 20, 'F')

      const boxWidth = (pageWidth - (2 * margin)) / 3
      
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 116, 139)
      doc.text('Total Items', margin + boxWidth/2, yPosition + 6, { align: 'center' })
      
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(20, 184, 166)
      doc.text(remito.items.toString(), margin + boxWidth/2, yPosition + 14, { align: 'center' })

      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 116, 139)
      doc.text('Total Bultos', margin + boxWidth + boxWidth/2, yPosition + 6, { align: 'center' })
      
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(20, 184, 166)
      doc.text(remito.bultos.toString(), margin + boxWidth + boxWidth/2, yPosition + 14, { align: 'center' })

      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 116, 139)
      doc.text('Peso Total', margin + 2*boxWidth + boxWidth/2, yPosition + 6, { align: 'center' })
      
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(20, 184, 166)
      doc.text(remito.peso, margin + 2*boxWidth + boxWidth/2, yPosition + 14, { align: 'center' })

      yPosition += 27

      // **OBSERVACIONES**
      if (remito.observaciones) {
        checkPageBreak(20)
        
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(100, 116, 139)
        doc.text('OBSERVACIONES', margin, yPosition)
        yPosition += 5

        doc.setFillColor(254, 252, 232)
        doc.setDrawColor(253, 224, 71)
        doc.rect(margin, yPosition, pageWidth - (2 * margin), 15, 'FD')
        
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(0, 0, 0)
        const obsLines = doc.splitTextToSize(remito.observaciones, pageWidth - (2 * margin) - 6)
        doc.text(obsLines, margin + 3, yPosition + 5)
        
        yPosition += 20
      }

      // **FIRMAS**
      checkPageBreak(40)
      
      yPosition += 5
      doc.setDrawColor(200, 200, 200)
      doc.line(margin, yPosition, pageWidth - margin, yPosition)
      yPosition += 8

      const signatureWidth = (pageWidth - (2 * margin) - 10) / 2
      
      // Firma Transportista
      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(100, 116, 139)
      doc.text('FIRMA DEL TRANSPORTISTA', margin, yPosition)
      yPosition += 3
      
      doc.setDrawColor(150, 150, 150)
      doc.line(margin, yPosition + 15, margin + signatureWidth, yPosition + 15)
      
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.text('Aclaración: .......................................', margin, yPosition + 20)
      doc.text('DNI: .......................................', margin, yPosition + 25)

      // Firma Recepción
      const rightSignature = pageWidth - margin - signatureWidth
      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(100, 116, 139)
      doc.text('FIRMA Y SELLO DE RECEPCIÓN', rightSignature, yPosition)
      yPosition += 3
      
      doc.setDrawColor(150, 150, 150)
      doc.line(rightSignature, yPosition + 15, pageWidth - margin, yPosition + 15)
      
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.text('Aclaración: .......................................', rightSignature, yPosition + 20)
      doc.text('Fecha: ....../....../......', rightSignature, yPosition + 25)

      // **FOOTER**
      doc.setFontSize(7)
      doc.setFont('helvetica', 'italic')
      doc.setTextColor(150, 150, 150)
      doc.text(
        'Este remito NO es un documento fiscal. Consulte su factura correspondiente.',
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      )
      doc.text(
        'Documento generado automáticamente',
        pageWidth / 2,
        pageHeight - 6,
        { align: 'center' }
      )

      // Guardar el PDF
      doc.save(`Remito_${remito.numeroRemito}_${new Date().toISOString().split('T')[0]}.pdf`)
      
    } catch (error) {
      console.error('Error al generar PDF:', error)
      alert('Hubo un error al generar el PDF. Por favor intente nuevamente.')
    } finally {
      setIsGeneratingRemito(false)
    }
  }

  const handleGenerateLabelsPDF = async () => {
    setIsGeneratingLabels(true)

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 10
      const columns = 2
      const rows = 3
      const horizontalGap = 6
      const verticalGap = 6
      const labelWidth = (pageWidth - (2 * margin) - (columns - 1) * horizontalGap) / columns
      const labelHeight = (pageHeight - (2 * margin) - (rows - 1) * verticalGap) / rows

      const itemsDetalle = remito.itemsDetalle ?? []
      const totalBultos = remito.bultos || (itemsDetalle.length > 0
        ? itemsDetalle.reduce((acc, item) => acc + (item.cantidad || 0), 0)
        : remito.items || 1)

      const companyName = remito.empresaNombre || process.env.NEXT_PUBLIC_COMPANY_NAME?.trim() || process.env.NEXT_PUBLIC_APP_NAME?.trim() || 'Aurix Retail'
      const companyAddress = remito.empresaDireccion || 'LIMA 420 - BARRIO: CENTRO - Córdoba (Córdoba)'
      const companyCuit = remito.empresaCuit || 'CUIT: 30-71824921-6'
      const companyPhone = remito.empresaTelefono || 'Tel: 0810-777-2274'
      const destinatario = remito.cliente
      const destinatarioDni = remito.dni || '-'
      const domicilio = remito.direccion
      const telefono = remito.telefono || '-'
      const localidad = remito.localidad || 'Córdoba'
      const provincia = remito.provincia || 'Córdoba'
      const transporte = remito.transporte || '-'
      const transporteDireccion = remito.transporteDireccion || 'AV. LA VOZ DEL INTERIOR 7000 - Córdoba'
      const transporteHorario = remito.transporteHorario || 'Zona: - Hs.: 9-16'
      const transporteTelefono = remito.transporteTelefono || 'Tel: 0810-777-2274'

      const drawLabel = (index: number) => {
        if (index > 0 && index % (columns * rows) === 0) {
          doc.addPage()
        }

        const positionInPage = index % (columns * rows)
        const column = positionInPage % columns
        const row = Math.floor(positionInPage / columns)
        const x = margin + column * (labelWidth + horizontalGap)
        const y = margin + row * (labelHeight + verticalGap)

        doc.setDrawColor(120, 120, 120)
        doc.setLineWidth(0.4)
        doc.roundedRect(x, y, labelWidth, labelHeight, 3, 3)

        const centerX = x + labelWidth / 2
        let currentY = y + 6

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(10)
        doc.text(companyName, centerX, currentY, { align: 'center' })

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
        currentY += 3.6
        doc.text(companyAddress, centerX, currentY, { align: 'center' })
        currentY += 3.6
        doc.text(companyCuit, centerX, currentY, { align: 'center' })
        currentY += 3.6
        doc.text(companyPhone, centerX, currentY, { align: 'center' })

        // Cinta "Destinatario"
        const destinatarioBandY = y + 18
        doc.setFillColor(200, 200, 200)
        doc.rect(x, destinatarioBandY, labelWidth, 6, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.setTextColor(0, 0, 0)
        doc.text('DESTINATARIO', centerX, destinatarioBandY + 4.2, { align: 'center' })

        let contentY = destinatarioBandY + 9
        const lineHeight = 3.6

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8.5)
        doc.text(destinatario, x + 4, contentY)
        contentY += lineHeight + 0.8

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        doc.text('DNI:', x + 4, contentY)
        doc.setFont('helvetica', 'normal')
        doc.text(destinatarioDni, x + 18, contentY)
        contentY += lineHeight

        doc.setFont('helvetica', 'bold')
        doc.text('DOMICILIO:', x + 4, contentY)
        doc.setFont('helvetica', 'normal')
        const domicilioLines = doc.splitTextToSize(domicilio, labelWidth - 28)
        doc.text(domicilioLines, x + 28, contentY)
        contentY += lineHeight * domicilioLines.length

        doc.setFont('helvetica', 'bold')
        doc.text('LOCALIDAD:', x + 4, contentY)
        doc.setFont('helvetica', 'normal')
        doc.text(localidad, x + 28, contentY)
        contentY += lineHeight

        doc.setFont('helvetica', 'bold')
        doc.text('PROVINCIA:', x + 4, contentY)
        doc.setFont('helvetica', 'normal')
        doc.text(provincia, x + 28, contentY)
        contentY += lineHeight

        doc.setFont('helvetica', 'bold')
        doc.text('TELÉFONO:', x + 4, contentY)
        doc.setFont('helvetica', 'normal')
        doc.text(telefono, x + 28, contentY)
        contentY += lineHeight + 1

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(12)
        doc.text(`BULTO: ${index + 1} de ${totalBultos}`, centerX, contentY)
        contentY += lineHeight * 1.6

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        doc.text('TRANSPORTE:', x + 4, contentY)
        doc.setFont('helvetica', 'normal')
        doc.text(transporte, x + 32, contentY)
        contentY += lineHeight

        doc.setFont('helvetica', 'bold')
        doc.text('Domicilio:', x + 4, contentY)
        doc.setFont('helvetica', 'normal')
        const transporteLines = doc.splitTextToSize(transporteDireccion, labelWidth - 28)
        doc.text(transporteLines, x + 28, contentY)
        contentY += lineHeight * transporteLines.length

        doc.setFont('helvetica', 'normal')
        const transporteHorarioLines = doc.splitTextToSize(`${transporteHorario}`, labelWidth - 20)
        doc.text(transporteHorarioLines, x + 4, contentY)
        contentY += lineHeight * transporteHorarioLines.length

        doc.text(transporteTelefono, x + 4, contentY)
      }

      for (let index = 0; index < totalBultos; index++) {
        drawLabel(index)
      }

      const date = new Date().toISOString().split('T')[0]
      doc.save(`Rotulos_${remito.numeroRemito}_${date}.pdf`)
    } catch (error) {
      console.error('Error al generar rótulos:', error)
      alert('No se pudieron generar los rótulos. Intenta nuevamente.')
    } finally {
      setIsGeneratingLabels(false)
    }
  }

  const handlePrint = () => {
    window.print()
    console.log("Imprimiendo remito:", remito.numeroRemito)
  }

  const handleSendEmail = () => {
    console.log("Enviando remito por email:", remito.numeroRemito)
    // Aquí iría la lógica de envío de email
  }

  const handleShare = () => {
    console.log("Compartiendo remito:", remito.numeroRemito)
    // Aquí iría la lógica de compartir (WhatsApp, etc.)
  }

  // Datos de ejemplo para items
  const itemsEjemplo = remito.itemsDetalle || [
    { producto: "Roller Sunscreen 1.80m", cantidad: 2, precio: 3500, total: 7000 },
    { producto: "Cortina Blackout 2.00m", cantidad: 1, precio: 4200, total: 4200 },
    { producto: "Riel de Aluminio 3m", cantidad: 3, precio: 850, total: 2550 },
  ]

  const subtotal = itemsEjemplo.reduce((acc, item) => acc + item.total, 0)

  return (
    <>
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <FileText className="h-6 w-6 text-primary" />
            Remito {remito.numeroRemito}
          </DialogTitle>
          <DialogDescription>
            Vista previa del remito - Documento de entrega de mercadería
          </DialogDescription>
        </DialogHeader>

        {/* Acciones Rápidas */}
        <div className="flex gap-2 flex-wrap">
          <Button 
            onClick={handleDownloadPDF} 
            disabled={isGeneratingRemito}
            className="flex-1 min-w-[140px]"
          >
            <Download className="h-4 w-4 mr-2" />
            {isGeneratingRemito ? "Generando..." : "Descargar PDF"}
          </Button>
          <Button 
            onClick={handleGenerateLabelsPDF}
            variant="outline"
            disabled={isGeneratingLabels}
            className="flex-1 min-w-[140px]"
          >
            <Printer className="h-4 w-4 mr-2" />
            {isGeneratingLabels ? "Creando rótulos..." : "Rótulos por caja"}
          </Button>
          <Button variant="outline" onClick={handlePrint} className="flex-1 min-w-[140px]">
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
          <Button variant="outline" onClick={handleSendEmail} className="flex-1 min-w-[140px]">
            <Mail className="h-4 w-4 mr-2" />
            Enviar Email
          </Button>
          <Button variant="outline" onClick={handleShare} className="flex-1 min-w-[140px]">
            <Share2 className="h-4 w-4 mr-2" />
            Compartir
          </Button>
        </div>

        <Separator />

        {/* Vista Previa del Remito - Estilo documento */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-lg border-2 shadow-lg print:shadow-none">
          {/* Header del Remito */}
          <div className="flex justify-between items-start mb-6 border-b-2 pb-4">
            <div>
              <h2 className="text-3xl font-bold text-primary">
                {process.env.NEXT_PUBLIC_APP_NAME?.trim() || "Aurix Retail"}
              </h2>
              <p className="text-sm text-muted-foreground">Sistema de Gestión ERP</p>
              <p className="text-xs text-muted-foreground mt-1">
                Av. Ejemplo 1234, CABA<br />
                Tel: (011) 4444-5555<br />
                {process.env.NEXT_PUBLIC_COMPANY_EMAIL?.trim() || 'soporte@example.com'}
              </p>
            </div>
            <div className="text-right">
              <div className="bg-primary/10 p-4 rounded-lg border-2 border-primary">
                <h3 className="text-xl font-bold text-primary">REMITO</h3>
                <p className="text-2xl font-bold mt-1">{remito.numeroRemito}</p>
              </div>
            </div>
          </div>

          {/* Información del Cliente y Entrega */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">Cliente</label>
                <p className="text-base font-semibold flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  {remito.cliente}
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">Dirección de Entrega</label>
                <p className="text-sm flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-primary mt-0.5" />
                  {remito.direccion}
                </p>
              </div>
              {remito.telefono && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Teléfono</label>
                  <p className="text-sm flex items-center gap-2">
                    <Phone className="h-4 w-4 text-primary" />
                    {remito.telefono}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">Fecha de Emisión</label>
                <p className="text-sm flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  {remito.fecha}
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">Fecha de Entrega Estimada</label>
                <p className="text-sm flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  {remito.fechaEntrega}
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">Transporte</label>
                <p className="text-sm flex items-center gap-2">
                  <Truck className="h-4 w-4 text-primary" />
                  {remito.transporte}
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">Pedido Relacionado</label>
                <Badge variant="outline">{remito.pedidoId}</Badge>
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Detalle de Items */}
          <div className="mb-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Detalle de Productos
            </h3>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-100 dark:bg-slate-800">
                  <tr>
                    <th className="text-left p-3 text-sm font-semibold">Producto</th>
                    <th className="text-center p-3 text-sm font-semibold">Cantidad</th>
                    <th className="text-right p-3 text-sm font-semibold">Precio Unit.</th>
                    <th className="text-right p-3 text-sm font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {itemsEjemplo.map((item, index) => (
                    <tr key={index} className="border-t">
                      <td className="p-3 text-sm">{item.producto}</td>
                      <td className="p-3 text-sm text-center">{item.cantidad}</td>
                      <td className="p-3 text-sm text-right">${item.precio.toLocaleString()}</td>
                      <td className="p-3 text-sm text-right font-semibold">${item.total.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 dark:bg-slate-900 border-t-2">
                  <tr>
                    <td colSpan={3} className="p-3 text-right font-bold">Subtotal:</td>
                    <td className="p-3 text-right font-bold text-lg">${subtotal.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Información Adicional */}
          <div className="grid grid-cols-3 gap-4 mb-6 bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Total Items</p>
              <p className="text-2xl font-bold text-primary">{remito.items}</p>
            </div>
            <div className="text-center border-x">
              <p className="text-xs text-muted-foreground">Total Bultos</p>
              <p className="text-2xl font-bold text-primary">{remito.bultos}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Peso Total</p>
              <p className="text-2xl font-bold text-primary">{remito.peso}</p>
            </div>
          </div>

          {/* Observaciones */}
          {remito.observaciones && (
            <div className="mb-6">
              <label className="text-sm font-semibold text-muted-foreground uppercase">Observaciones</label>
              <p className="text-sm mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                {remito.observaciones}
              </p>
            </div>
          )}

          {/* Firma y Aclaración */}
          <div className="mt-8 pt-6 border-t-2">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-xs text-muted-foreground mb-2">FIRMA DEL TRANSPORTISTA</p>
                <div className="border-b-2 border-slate-300 h-16 mb-2"></div>
                <p className="text-xs text-muted-foreground">Aclaración: ...................................</p>
                <p className="text-xs text-muted-foreground mt-1">DNI: ...................................</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2">FIRMA Y SELLO DE RECEPCIÓN</p>
                <div className="border-b-2 border-slate-300 h-16 mb-2"></div>
                <p className="text-xs text-muted-foreground">Aclaración: ...................................</p>
                <p className="text-xs text-muted-foreground mt-1">Fecha: ....../....../......</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t text-center text-xs text-muted-foreground">
            <p>Este remito NO es un documento fiscal. Consulte su factura correspondiente.</p>
            <p className="mt-1">Documento generado automáticamente</p>
          </div>
        </div>

        {/* Estado Actual */}
        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span className="font-semibold">Estado Actual:</span>
            <Badge variant={remito.estado === "Entregado" ? "default" : "secondary"}>
              {remito.estado}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            Última actualización: {new Date().toLocaleString('es-AR')}
          </div>
        </div>
      </DialogContent>
    </Dialog>
    {confirmDialog}
    </>
  )
}

