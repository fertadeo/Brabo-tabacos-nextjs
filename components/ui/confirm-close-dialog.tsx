"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"

interface ConfirmCloseDialogProps {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
  message?: string
  description?: string
}

export function ConfirmCloseDialog({
  open,
  onConfirm,
  onCancel,
  message = "¿Quieres cerrar esta ventana?",
  description = "Los datos que estés cargando podrían perderse si no se guardan.",
}: ConfirmCloseDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="max-w-sm sm:max-w-md z-[100]" showCloseButton={false}>
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <DialogTitle className="text-lg">{message}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="button" onClick={onConfirm}>
            Sí, cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
