"use client"

import React, { Fragment } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Package } from "lucide-react"
import type { ProductListTabKey } from "@/lib/product-list-destination"
import {
  destinationTabLabel,
  PRODUCT_TAB_HIGHLIGHT_CLASS,
  PRODUCT_INACTIVE_HIGHLIGHT_CLASS,
} from "@/lib/product-list-destination"

/**
 * Resalta «Publicados», «Borrador», «Eliminados», «Inactivo» y las mismas palabras
 * sueltas cuando actúan como nombre de pestaña (textos de buildDestinationExplanation).
 */
function highlightTabsInExplanation(line: string): React.ReactNode {
  const pattern =
    /(«Publicados»|«Borrador»|«Eliminados»|«Inactivo»|\bPublicados\b|\bBorrador\b|\bEliminados\b)/g
  const parts = line.split(pattern)
  return parts.map((part, i) => {
    if (!part) return null
    let className: string | null = null
    if (part === "«Publicados»" || part === "Publicados") {
      className = PRODUCT_TAB_HIGHLIGHT_CLASS.published
    } else if (part === "«Borrador»" || part === "Borrador") {
      className = PRODUCT_TAB_HIGHLIGHT_CLASS.draft
    } else if (part === "«Eliminados»" || part === "Eliminados") {
      className = PRODUCT_TAB_HIGHLIGHT_CLASS.deleted
    } else if (part === "«Inactivo»") {
      className = PRODUCT_INACTIVE_HIGHLIGHT_CLASS
    }
    if (className) {
      return (
        <span key={i} className={className}>
          {part}
        </span>
      )
    }
    return <Fragment key={i}>{part}</Fragment>
  })
}

export interface ProductSaveConfirmDialogProps {
  open: boolean
  productName: string
  destination: ProductListTabKey
  explanationLines: string[]
  onConfirm: () => void
  onCancel: () => void
}

export function ProductSaveConfirmDialog({
  open,
  productName,
  destination,
  explanationLines,
  onConfirm,
  onCancel,
}: ProductSaveConfirmDialogProps) {
  const tab = destinationTabLabel(destination)
  const tabClass = PRODUCT_TAB_HIGHLIGHT_CLASS[destination]

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onCancel()
      }}
    >
      <DialogContent className="max-w-md sm:max-w-lg z-[100]" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Package className="h-5 w-5 shrink-0" />
            Confirmar guardado
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 pt-1 text-left text-sm text-foreground">
              <p>
                Tu producto{" "}
                <span className="font-semibold text-foreground">
                  {productName.trim() || "sin nombre"}
                </span>{" "}
                se guardará y lo verás en la pestaña{" "}
                <span className={tabClass}>«{tab}»</span>
                {destination === "published" ? (
                  <>
                    {" "}
                    <span className="text-muted-foreground">
                      (
                      <span className={PRODUCT_TAB_HIGHLIGHT_CLASS.published}>
                        publicado / activo
                      </span>{" "}
                      en el listado de publicados)
                    </span>
                  </>
                ) : destination === "draft" ? (
                  <>
                    {" "}
                    <span className="text-muted-foreground">
                      (
                      <span className={PRODUCT_TAB_HIGHLIGHT_CLASS.draft}>
                        borrador
                      </span>
                      : activo pero sin stock vendible sin encargo)
                    </span>
                  </>
                ) : (
                  <>
                    {" "}
                    <span className="text-muted-foreground">
                      (
                      <span className={PRODUCT_TAB_HIGHLIGHT_CLASS.deleted}>
                        eliminados
                      </span>
                      : producto inactivo)
                    </span>
                  </>
                )}
                .
              </p>
              <ul className="list-disc space-y-1.5 pl-5 text-muted-foreground">
                {explanationLines.map((line, i) => (
                  <li key={i}>{highlightTabsInExplanation(line)}</li>
                ))}
              </ul>
              <p className="font-medium text-foreground">¿Deseas continuar?</p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0 flex-col-reverse sm:flex-row">
          <Button type="button" variant="outline" onClick={onCancel}>
            No, volver atrás
          </Button>
          <Button type="button" onClick={onConfirm}>
            Sí, continuar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
