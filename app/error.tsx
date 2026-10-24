"use client"

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log del error para debugging en producción
    console.error('💥 [ERROR_BOUNDARY] Error capturado:', {
      message: error.message,
      stack: error.stack,
      digest: error.digest,
      name: error.name
    })

    // Intentar enviar el error a un servicio de logging (opcional)
    // Ejemplo: Sentry, LogRocket, etc.
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <CardTitle>Error de aplicación</CardTitle>
          </div>
          <CardDescription>
            Se produjo una excepción del lado del cliente al cargar la aplicación (consulte la consola del navegador para obtener más información)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-destructive/10 p-4">
            <p className="text-sm text-destructive font-medium">
              {error.message || 'Error desconocido'}
            </p>
            {process.env.NODE_ENV === 'development' && error.stack && (
              <details className="mt-2">
                <summary className="text-xs text-muted-foreground cursor-pointer">
                  Ver detalles técnicos
                </summary>
                <pre className="mt-2 text-xs bg-background p-2 rounded overflow-auto max-h-40">
                  {error.stack}
                </pre>
              </details>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={reset} 
              className="flex-1"
              variant="default"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reintentar
            </Button>
            <Button 
              onClick={() => window.location.href = '/'} 
              variant="outline"
              className="flex-1"
            >
              <Home className="h-4 w-4 mr-2" />
              Ir al inicio
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Si el problema persiste, por favor contacta al administrador del sistema.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}