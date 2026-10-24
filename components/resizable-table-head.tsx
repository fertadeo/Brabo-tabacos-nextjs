"use client"

import type { ComponentProps } from "react"

import { TableHead } from "@/components/ui/table"
import { cn } from "@/lib/utils"

interface ResizableTableHeadProps extends ComponentProps<typeof TableHead> {
  columnId: string
  onResizeStart?: (columnId: string, clientX: number) => void
  resizable?: boolean
}

export function ResizableTableHead({
  columnId,
  onResizeStart,
  resizable = true,
  className,
  children,
  ...props
}: ResizableTableHeadProps) {
  return (
    <TableHead className={cn("relative overflow-hidden", className)} {...props}>
      <span className="block truncate pr-2">{children}</span>
      {resizable && onResizeStart ? (
        <button
          type="button"
          tabIndex={-1}
          aria-label="Redimensionar columna"
          className="absolute right-0 top-0 z-10 h-full w-2 cursor-col-resize touch-none border-r border-border/60 hover:border-primary/50 hover:bg-primary/10 active:bg-primary/20"
          onMouseDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onResizeStart(columnId, e.clientX)
          }}
        />
      ) : null}
    </TableHead>
  )
}
