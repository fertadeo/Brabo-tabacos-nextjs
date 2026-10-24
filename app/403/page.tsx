"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, ArrowLeft, Home, Shield } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useRole } from "@/app/hooks/useRole"

export default function ForbiddenPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { getCurrentRoleLabel } = useRole()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <Card className="w-full max-w-md mx-auto shadow-xl border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
            <Shield className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Acceso Denegado
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400 mt-2">
              No tienes permisos para acceder a esta página
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Información del usuario */}
          {user && (
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">Información de tu cuenta:</span>
              </div>
              <div className="text-sm">
                <div className="font-medium text-slate-900 dark:text-slate-100">
                  {user.firstName} {user.lastName}
                </div>
                <div className="text-slate-600 dark:text-slate-400">
                  Rol: {getCurrentRoleLabel()}
                </div>
                <div className="text-slate-600 dark:text-slate-400">
                  Usuario: {user.username}
                </div>
              </div>
            </div>
          )}

          {/* Mensaje explicativo */}
          <div className="text-center text-sm text-slate-600 dark:text-slate-400">
            <p>
              Tu rol actual no tiene los permisos necesarios para acceder a esta sección del sistema.
            </p>
            <p className="mt-2">
              Si crees que esto es un error, contacta al administrador del sistema.
            </p>
          </div>

          {/* Botones de acción */}
          <div className="flex flex-col gap-3">
            <Button 
              onClick={() => router.back()}
              variant="outline"
              className="w-full gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver Atrás
            </Button>
            
            <Button 
              onClick={() => router.push('/dashboard')}
              className="w-full gap-2"
            >
              <Home className="h-4 w-4" />
              Ir al Dashboard
            </Button>
          </div>

          {/* Información adicional */}
          <div className="text-center text-xs text-slate-500 dark:text-slate-500">
            <p>Error 403 - Forbidden</p>
            <p>Aurix ERP v1.0</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
