"use client"

import type React from "react"
import { ERPSidebar } from "./erp-sidebar"
import { ErpAtajosButton, ErpAtajosQuickStrip } from "./erp-atajos"
import { cn } from "@/lib/utils"

interface ERPLayoutProps {
  children: React.ReactNode
  activeItem?: string
  /** Más ancho útil para tablas extensas (p. ej. facturación). */
  wideContent?: boolean
  /** Ocupa todo el ancho del área principal, sin tope fijo. */
  fullWidth?: boolean
}

export function ERPLayout({ children, activeItem, wideContent, fullWidth }: ERPLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <ERPSidebar
        activeItem={activeItem}
        onItemClick={(itemId) => {
          console.log(`Navigating to: ${itemId}`)
        }}
      />

      <main className={cn("transition-all duration-300 md:ml-64 min-h-screen min-w-0")}>
        <header
          className={cn(
            "sticky top-0 z-30 border-b bg-background/85 backdrop-blur-md",
            "px-4 md:px-6 h-14 flex items-center justify-between gap-3",
            "pl-16 md:pl-6"
          )}
        >
          <ErpAtajosQuickStrip />
          <div className="flex items-center gap-2 ml-auto shrink-0">
            <ErpAtajosButton />
          </div>
        </header>

        <div className="p-4 md:p-6 min-w-0">
          <div
            className={cn(
              "mx-auto w-full min-w-0",
              fullWidth ? "max-w-none" : wideContent ? "max-w-[min(100%,96rem)]" : "max-w-7xl"
            )}
          >
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
