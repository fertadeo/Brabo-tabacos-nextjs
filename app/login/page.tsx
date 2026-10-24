"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useAuth } from "@/contexts/AuthContext"
import { LoginBackground } from "@/components/login-background"

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const { login, isLoginLoading } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("") // Limpiar errores anteriores
    
    try {
      console.log("🔐 [LOGIN] Intentando autenticación:", { username })
      
      // Validar que los campos no estén vacíos
      if (!username.trim() || !password.trim()) {
        setError("Por favor, completa todos los campos")
        return
      }

      // Usar la función de login del contexto (que maneja la redirección automáticamente)
      await login({
        username: username.trim(),
        password: password.trim()
      })
      
    } catch (error) {
      console.error("❌ [LOGIN] Error en la autenticación:", error)
      
      // Manejar diferentes tipos de errores
      if (error instanceof Error) {
        if (error.message.includes("401")) {
          setError("Credenciales incorrectas. Verifica tu usuario y contraseña.")
        } else if (error.message.includes("404")) {
          setError("Usuario no encontrado. Verifica tu nombre de usuario.")
        } else if (error.message.includes("500")) {
          setError("Error del servidor. Intenta nuevamente más tarde.")
        } else if (error.message.includes("NetworkError") || error.message.includes("fetch")) {
          setError("Error de conexión. Verifica tu conexión a internet.")
        } else {
          setError(error.message || "Error inesperado. Intenta nuevamente.")
        }
      } else {
        setError("Error inesperado. Intenta nuevamente.")
      }
    }
  }

  return (
    <div className="relative min-h-screen flex overflow-hidden bg-background">
      <LoginBackground />
      <div className="relative z-10 w-full lg:w-1/2 lg:ml-auto flex items-center justify-center p-6 min-h-screen overflow-y-auto">
        <div className="w-full max-w-md space-y-6 p-6 bg-card rounded-lg shadow-sm border border-border/50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Iniciar Sesión</h1>
          <p className="text-sm text-muted-foreground">
            ¿No tienes una cuenta?{" "}
            <Link href="/register" className="text-turquoise-500 hover:text-turquoise-600 font-medium">
              Regístrate
            </Link>
          </p>
        </div>

        {/* Formulario */}
        <Card className="border-0 shadow-none">
          <CardContent className="p-0">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium">
                  Usuario *
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Ingresa tu nombre de usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Contraseña *
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Ingresa tu contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-10 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Debe tener al menos 8 caracteres.
                </p>
              </div>

              {/* Mensaje de error */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

               <Button
                 type="submit"
                 disabled={isLoginLoading}
                 className="w-full h-10 bg-turquoise-500 hover:bg-turquoise-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 {isLoginLoading ? (
                   <>
                     <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                     Iniciando sesión...
                   </>
                 ) : (
                   "Iniciar Sesión"
                 )}
               </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">O</span>
                </div>
              </div>

               <Button
                 type="button"
                 variant="outline"
                 className="w-full h-10 border-2 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 dark:hover:bg-blue-950/20 dark:hover:border-blue-400 dark:hover:text-blue-300 transition-all duration-200"
               >
                 <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                   <path
                     fill="currentColor"
                     d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                   />
                   <path
                     fill="currentColor"
                     d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                   />
                   <path
                     fill="currentColor"
                     d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                   />
                   <path
                     fill="currentColor"
                     d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                   />
                 </svg>
                 Iniciar sesión con Google
               </Button>
            </form>
          </CardContent>
        </Card>

        {/* Enlaces adicionales */}
        <div className="text-center">
          <Link
            href="/forgot-password"
            className="text-sm text-turquoise-500 hover:text-turquoise-600"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
        </div>
      </div>

      <footer className="pointer-events-none absolute bottom-6 left-0 right-0 z-10 flex justify-center px-6 lg:right-1/2">
        <Image
          src="/images/aurix-logo.png"
          alt="Aurix ERP by FENEC"
          width={400}
          height={100}
          priority
          className="h-10 w-auto drop-shadow-lg sm:h-12 md:h-14"
        />
      </footer>
    </div>
  )
}
