"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useConfirmBeforeClose } from "@/lib/use-confirm-before-close"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar, X } from "lucide-react"

interface PeriodSelectorModalProps {
  onPeriodSelect: (from: string, to: string) => void
  trigger?: React.ReactNode
}

export function PeriodSelectorModal({ onPeriodSelect, trigger }: PeriodSelectorModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!fromDate || !toDate) {
      alert("Por favor, selecciona ambas fechas")
      return
    }

    if (new Date(fromDate) > new Date(toDate)) {
      alert("La fecha de inicio no puede ser posterior a la fecha de fin")
      return
    }

    onPeriodSelect(fromDate, toDate)
    setIsOpen(false)
    setFromDate("")
    setToDate("")
  }

  const handleToday = () => {
    const today = new Date().toISOString().split('T')[0]
    setFromDate(today)
    setToDate(today)
  }

  const handleThisWeek = () => {
    const today = new Date()
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()))
    const endOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 6))
    
    setFromDate(startOfWeek.toISOString().split('T')[0])
    setToDate(endOfWeek.toISOString().split('T')[0])
  }

  const handleThisMonth = () => {
    const today = new Date()
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    
    setFromDate(startOfMonth.toISOString().split('T')[0])
    setToDate(endOfMonth.toISOString().split('T')[0])
  }

  const handleLastMonth = () => {
    const today = new Date()
    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0)
    
    setFromDate(startOfLastMonth.toISOString().split('T')[0])
    setToDate(endOfLastMonth.toISOString().split('T')[0])
  }

  const [handleOpenChange, confirmDialog] = useConfirmBeforeClose(setIsOpen)

  return (
    <>
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-slate-400 dark:hover:border-slate-500 focus:ring-2 focus:ring-turquoise-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 active:bg-slate-200 dark:active:bg-slate-600 text-slate-700 dark:text-slate-300 transition-all duration-200">
            <Calendar className="h-4 w-4 mr-2" />
            Período
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Seleccionar Período</DialogTitle>
          <DialogDescription>
            Elige el rango de fechas para consultar el resumen de caja
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
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
                onClick={handleThisWeek}
                className="text-xs"
              >
                Esta semana
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
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleLastMonth}
                className="text-xs"
              >
                Mes anterior
              </Button>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit">
              Consultar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    {confirmDialog}
    </>
  )
}
