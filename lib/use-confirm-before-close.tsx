"use client"

import { useState, useCallback, useMemo } from "react"
import { ConfirmCloseDialog } from "@/components/ui/confirm-close-dialog"

/**
 * Hook para modales: al intentar cerrar (clic fuera, Escape o X) muestra
 * un diálogo de confirmación propio. Solo cierra si el usuario confirma.
 * Evita perder datos que se estaban cargando por cierre accidental.
 *
 * @returns [handleOpenChange, confirmDialog] - Usar handleOpenChange en el Dialog y renderizar confirmDialog en el mismo componente (ej. como hermano del Dialog).
 */
export function useConfirmBeforeClose(
  onOpenChange: (open: boolean) => void,
  message = "¿Quieres cerrar esta ventana?",
  description = "Los datos que estés cargando podrían perderse si no se guardan."
): [(open: boolean) => void, React.ReactNode] {
  const [showConfirm, setShowConfirm] = useState(false)

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open === false) {
        setShowConfirm(true)
        return
      }
      onOpenChange(open)
    },
    [onOpenChange]
  )

  const handleConfirm = useCallback(() => {
    setShowConfirm(false)
    onOpenChange(false)
  }, [onOpenChange])

  const handleCancel = useCallback(() => {
    setShowConfirm(false)
  }, [])

  const confirmDialog = useMemo(
    () => (
      <ConfirmCloseDialog
        open={showConfirm}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        message={message}
        description={description}
      />
    ),
    [showConfirm, handleConfirm, handleCancel, message, description]
  )

  return [handleOpenChange, confirmDialog]
}
