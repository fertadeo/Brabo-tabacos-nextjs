"use client"

import { useState, useEffect } from "react"
import { Loader2, Shield, CheckCircle, XCircle, AlertCircle } from "lucide-react"

interface AuthLoadingProps {
  status?: 'loading' | 'success' | 'error' | 'no-auth'
  errorMessage?: string
  onError?: () => void
}

export function AuthLoading({ status = 'loading', errorMessage }: AuthLoadingProps) {
  const [currentStep, setCurrentStep] = useState(0)
  
  // Solo loggear en el cliente para evitar errores durante el build
  if (typeof window !== 'undefined') {
    console.log('🎨 [AUTH_LOADING] Estado recibido:', status, 'Error:', errorMessage)
  }
  
  const successSteps = [
    { 
      icon: Loader2, 
      title: "Iniciando aplicación...", 
      description: "Cargando sistema de gestión",
      color: "text-blue-500"
    },
    { 
      icon: Shield, 
      title: "Verificando autenticación...", 
      description: "Validando sesión con el servidor",
      color: "text-yellow-500"
    }
  ]

  const errorSteps = [
    { 
      icon: Loader2, 
      title: "Iniciando aplicación...", 
      description: "Cargando sistema de gestión",
      color: "text-blue-500"
    },
    { 
      icon: Shield, 
      title: "Verificando autenticación...", 
      description: "Validando sesión con el servidor",
      color: "text-yellow-500"
    },
    { 
      icon: XCircle, 
      title: "Error de autenticación", 
      description: errorMessage || "No se pudo verificar la sesión",
      color: "text-red-500"
    }
  ]

  const noAuthSteps = [
    { 
      icon: Loader2, 
      title: "Iniciando aplicación...", 
      description: "Cargando sistema de gestión",
      color: "text-blue-500"
    },
    { 
      icon: AlertCircle, 
      title: "Sin sesión activa", 
      description: "Redirigiendo al login",
      color: "text-orange-500"
    }
  ]

  // Determinar qué pasos usar según el estado
  const steps = status === 'error' ? errorSteps : 
                status === 'no-auth' ? noAuthSteps : 
                successSteps

  useEffect(() => {
    // Reset step cuando cambia el status
    setCurrentStep(0)
    
    // Verificar si estamos en modo desarrollo
    const isDevelopment = process.env.NODE_ENV === 'development'
    
    if (status === 'loading') {
      // En desarrollo, reducir delays significativamente
      const delay = isDevelopment ? 200 : 800
      const timer1 = setTimeout(() => setCurrentStep(1), delay)
      
      return () => {
        clearTimeout(timer1)
      }
    } else if (status === 'error') {
      // Para errores, mostrar progreso hasta el paso final
      const delay1 = isDevelopment ? 200 : 800
      const delay2 = isDevelopment ? 500 : 1500
      const timer1 = setTimeout(() => setCurrentStep(1), delay1)
      const timer2 = setTimeout(() => setCurrentStep(2), delay2)
      
      return () => {
        clearTimeout(timer1)
        clearTimeout(timer2)
      }
    } else if (status === 'no-auth') {
      // Para no-auth, solo mostrar 2 pasos
      const delay = isDevelopment ? 200 : 800
      const timer1 = setTimeout(() => setCurrentStep(1), delay)
      
      return () => {
        clearTimeout(timer1)
      }
    } else if (status === 'success') {
      // Para éxito, solo mostrar 2 pasos
      const delay = isDevelopment ? 200 : 800
      const timer1 = setTimeout(() => setCurrentStep(1), delay)
      
      return () => {
        clearTimeout(timer1)
      }
    }
  }, [status])

  const currentStepData = steps[currentStep]
  const Icon = currentStepData.icon

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6 max-w-md mx-auto px-6">
        {/* Logo */}
        <div className="flex items-center justify-center">
          <div className={`w-20 h-20 rounded-xl flex items-center justify-center shadow-lg transition-colors duration-300 ${
            status === 'error' ? 'bg-red-500' :
            status === 'no-auth' ? 'bg-orange-500' :
            status === 'success' ? 'bg-green-500' :
            'bg-turquoise-500'
          }`}>
            <span className="text-3xl font-bold text-white">MF</span>
          </div>
        </div>

        {/* Contenido principal */}
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Icon className={`h-6 w-6 ${currentStepData.color} ${
              status === 'error' && currentStep === 2 ? '' : 'animate-spin'
            }`} />
            <span className="text-xl font-semibold text-foreground">
              {currentStepData.title}
            </span>
          </div>
          
          <p className="text-sm text-muted-foreground">
            {currentStepData.description}
          </p>
        </div>

        {/* Indicadores de progreso */}
        <div className="flex items-center justify-center gap-2">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-all duration-500 ${
                index <= currentStep 
                  ? (status === 'error' && index === 2 ? 'bg-red-500' :
                     status === 'no-auth' && index === 1 ? 'bg-orange-500' :
                     status === 'success' && index === 1 ? 'bg-green-500' :
                     'bg-turquoise-500') + ' scale-125'
                  : 'bg-gray-300 dark:bg-gray-600'
              }`}
            />
          ))}
        </div>

        {/* Información adicional */}
        <div className="text-xs text-muted-foreground opacity-70">
          {process.env.NEXT_PUBLIC_APP_NAME?.trim() || "Aurix Retail"} ERP
        </div>
      </div>
    </div>
  )
}
