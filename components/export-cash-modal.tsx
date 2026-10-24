"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useConfirmBeforeClose } from "@/lib/use-confirm-before-close"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, FileSpreadsheet, FileText } from "lucide-react"

interface ExportCashModalProps {
  onExport: (format: 'csv' | 'excel', from?: string, to?: string) => void
  trigger?: React.ReactNode
}

export function ExportCashModal({ onExport, trigger }: ExportCashModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [format, setFormat] = useState<'csv' | 'excel'>('csv')
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [exportType, setExportType] = useState<'day' | 'period' | 'monthly' | 'movements'>('movements')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (exportType === 'period' && (!fromDate || !toDate)) {
      alert("Por favor, selecciona ambas fechas para exportar por período")
      return
    }

    if (exportType === 'period' && new Date(fromDate) > new Date(toDate)) {
      alert("La fecha de inicio no puede ser posterior a la fecha de fin")
      return
    }

    onExport(format, fromDate || undefined, toDate || undefined)
    setIsOpen(false)
  }

  const handleToday = () => {
    const today = new Date().toISOString().split('T')[0]
    setFromDate(today)
    setToDate(today)
  }

  const handleThisMonth = () => {
    const today = new Date()
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    
    setFromDate(startOfMonth.toISOString().split('T')[0])
    setToDate(endOfMonth.toISOString().split('T')[0])
  }

  const [handleOpenChange, confirmDialog] = useConfirmBeforeClose(setIsOpen)

  return (
    <>
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-slate-400 dark:hover:border-slate-500 focus:ring-2 focus:ring-turquoise-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 active:bg-slate-200 dark:active:bg-slate-600 text-slate-700 dark:text-slate-300 transition-all duration-200">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Exportar Datos de Caja</DialogTitle>
          <DialogDescription>
            Selecciona el formato y tipo de datos a exportar
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo de exportación */}
          <div className="space-y-2">
            <Label htmlFor="exportType">Tipo de datos</Label>
            <Select value={exportType} onValueChange={(value: any) => setExportType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el tipo de datos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Resumen del día</SelectItem>
                <SelectItem value="period">Resumen por período</SelectItem>
                <SelectItem value="monthly">Resumen mensual</SelectItem>
                <SelectItem value="movements">Movimientos recientes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Formato de exportación */}
          <div className="space-y-2">
            <Label htmlFor="format">Formato</Label>
            <div className="flex space-x-4">
              <Button
                type="button"
                variant={format === 'csv' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFormat('csv')}
                className="flex items-center space-x-2"
              >
                <FileText className="h-4 w-4" />
                <span>CSV</span>
              </Button>
              <Button
                type="button"
                variant={format === 'excel' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFormat('excel')}
                className="flex items-center space-x-2"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>Excel</span>
              </Button>
            </div>
          </div>

          {/* Fechas para período */}
          {exportType === 'period' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fromDate">Desde</Label>
                  <Input
                    id="fromDate"
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="toDate">Hasta</Label>
                  <Input
                    id="toDate"
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Botones de selección rápida */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Selección rápida:</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleToday}
                    className="text-xs"
                  >
                    Hoy
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleThisMonth}
                    className="text-xs"
                  >
                    Este mes
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex items-center space-x-2">
              <Download className="h-4 w-4" />
              <span>Exportar</span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    {confirmDialog}
    </>
  )
}
