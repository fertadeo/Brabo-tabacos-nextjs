"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"

export default function HomePage() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    // Solo redirigir cuando el contexto de autenticación haya terminado de cargar
    if (!isLoading) {
      if (isAuthenticated) {
        router.replace("/dashboard")
      } else {
        router.replace("/login")
      }
    }
  }, [isAuthenticated, isLoading, router])

  // Mostrar una pantalla de carga mientras se determina la redirección
  return (
    <div className="h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-turquoise-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    </div>
  )
}
