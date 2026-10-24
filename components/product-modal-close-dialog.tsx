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
import { FileEdit, Loader2 } from "lucide-react"
import {
  PRODUCT_TAB_HIGHLIGHT_CLASS,
  destinationTabLabel,
} from "@/lib/product-list-destination"

export interface ProductModalCloseDialogProps {
  open: boolean
  onStay: () => void
  onDiscard: () => void
  onSaveDraft: () => void | Promise<void>
  draftLoading?: boolean
}

/**
 * Al cerrar crear/editar producto con cambios sin guardar: seguir editando,
 * descartar o guardar en Borrador (activo, stock 0, sin venta por encargo).
 */
export function ProductModalCloseDialog({
  open,
  onStay,
  onDiscard,
  onSaveDraft,
  draftLoading = false,
}: ProductModalCloseDialogProps) {
  const borrador = destinationTabLabel("draft")
  const borradorClass = PRODUCT_TAB_HIGHLIGHT_CLASS.draft

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && !draftLoading && onStay()}>
      <DialogContent className="max-w-md sm:max-w-lg z-[110]" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
              <FileEdit className="h-4 w-4 text-amber-700 dark:text-amber-400" />
            </span>
            ¿Salir del formulario?
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 pt-1 text-left text-sm text-foreground">
              <p>
                Tenés cambios sin guardar. Podés cerrar y perderlos, o guardar el producto en la
                pestaña{" "}
                <span className={borradorClass}>«{borrador}»</span> para completarlo más tarde.
              </p>
              <p className="text-muted-foreground">
                Si elegís <span className={borradorClass}>guardar en borradores</span>, el producto
                quedará <strong className="text-foreground">activo</strong> con{" "}
                <strong className="text-foreground">stock en 0</strong> y sin venta por encargo; lo
                verás en <span className={borradorClass}>Borrador</span> hasta que cargues stock o
                actives reservas con stock 0.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            type="button"
            className="w-full"
            disabled={draftLoading}
            onClick={() => void onSaveDraft()}
          >
            {draftLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Guardando en borradores…
              </>
            ) : (
              `Guardar en «${borrador}»`
            )}
          </Button>
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              disabled={draftLoading}
              onClick={onStay}
            >
              Seguir editando
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto"
              disabled={draftLoading}
              onClick={onDiscard}
            >
              Cerrar sin guardar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
