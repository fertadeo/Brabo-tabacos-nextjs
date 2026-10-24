"use client"

import type React from "react"
import { useState } from "react"
import { ERPSidebar } from "./erp-sidebar"
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      <ERPSidebar
        activeItem={activeItem}
        onItemClick={(itemId) => {
          // En una app real, aquí manejarías la navegación
          console.log(`Navigating to: ${itemId}`)
        }}
      />

      {/* Main content */}
      <main className={cn("transition-all duration-300 md:ml-64 min-h-screen min-w-0")}>
        <div className="p-4 md:p-6 pt-16 md:pt-6 min-w-0">
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
