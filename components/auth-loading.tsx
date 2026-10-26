"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Loader2, Shield, XCircle, AlertCircle } from "lucide-react"
import { APP_NAME, POWERED_BY_LOGO_PATH } from "@/lib/brand"

interface AuthLoadingProps {
  status?: "loading" | "success" | "error" | "no-auth"
  errorMessage?: string
  onError?: () => void
}

export function AuthLoading({ status = "loading", errorMessage }: AuthLoadingProps) {
  const [currentStep, setCurrentStep] = useState(0)

  if (typeof window !== "undefined") {
    console.log("🎨 [AUTH_LOADING] Estado recibido:", status, "Error:", errorMessage)
  }

  const successSteps = [
    {
      icon: Loader2,
      title: "Iniciando aplicación...",
      description: "Cargando sistema de gestión",
      color: "text-blue-500",
    },
    {
      icon: Shield,
      title: "Verificando autenticación...",
      description: "Validando sesión con el servidor",
      color: "text-yellow-500",
    },
  ]

  const errorSteps = [
    {
      icon: Loader2,
      title: "Iniciando aplicación...",
      description: "Cargando sistema de gestión",
      color: "text-blue-500",
    },
    {
      icon: Shield,
      title: "Verificando autenticación...",
      description: "Validando sesión con el servidor",
      color: "text-yellow-500",
    },
    {
      icon: XCircle,
      title: "Error de autenticación",
      description: errorMessage || "No se pudo verificar la sesión",
      color: "text-red-500",
    },
  ]

  const noAuthSteps = [
    {
      icon: Loader2,
      title: "Iniciando aplicación...",
      description: "Cargando sistema de gestión",
      color: "text-blue-500",
    },
    {
      icon: AlertCircle,
      title: "Sin sesión activa",
      description: "Redirigiendo al login",
      color: "text-orange-500",
    },
  ]

  const steps =
    status === "error" ? errorSteps : status === "no-auth" ? noAuthSteps : successSteps

  useEffect(() => {
    setCurrentStep(0)

    const isDevelopment = process.env.NODE_ENV === "development"

    if (status === "loading") {
      const delay = isDevelopment ? 200 : 800
      const timer1 = setTimeout(() => setCurrentStep(1), delay)
      return () => clearTimeout(timer1)
    }
    if (status === "error") {
      const delay1 = isDevelopment ? 200 : 800
      const delay2 = isDevelopment ? 500 : 1500
      const timer1 = setTimeout(() => setCurrentStep(1), delay1)
      const timer2 = setTimeout(() => setCurrentStep(2), delay2)
      return () => {
        clearTimeout(timer1)
        clearTimeout(timer2)
      }
    }
    if (status === "no-auth" || status === "success") {
      const delay = isDevelopment ? 200 : 800
      const timer1 = setTimeout(() => setCurrentStep(1), delay)
      return () => clearTimeout(timer1)
    }
  }, [status])

  const currentStepData = steps[currentStep]
  const Icon = currentStepData.icon
  const spinIcon = !(status === "error" && currentStep === 2) && !(status === "no-auth" && currentStep === 1)

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6 max-w-md mx-auto px-6">
        <div className="flex flex-col items-center justify-center gap-3">
          <div
            className={`rounded-2xl px-6 py-4 shadow-lg transition-colors duration-300 ${
              status === "error"
                ? "bg-red-500/10 ring-1 ring-red-500/40"
                : status === "no-auth"
                  ? "bg-orange-500/10 ring-1 ring-orange-500/40"
                  : status === "success"
                    ? "bg-green-500/10 ring-1 ring-green-500/40"
                    : "bg-card ring-1 ring-border/60"
            }`}
          >
            <Image
              src={POWERED_BY_LOGO_PATH}
              alt="Aurix ERP"
              width={220}
              height={56}
              priority
              className="h-12 w-auto sm:h-14"
            />
          </div>
          <p className="text-xs tracking-wide text-muted-foreground uppercase">
            Plataforma Aurix ERP
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Icon
              className={`h-6 w-6 ${currentStepData.color} ${spinIcon ? "animate-spin" : ""}`}
            />
            <span className="text-xl font-semibold text-foreground">{currentStepData.title}</span>
          </div>

          <p className="text-sm text-muted-foreground">{currentStepData.description}</p>
        </div>

        <div className="flex items-center justify-center gap-2">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-all duration-500 ${
                index <= currentStep
                  ? (status === "error" && index === 2
                      ? "bg-red-500"
                      : status === "no-auth" && index === 1
                        ? "bg-orange-500"
                        : status === "success" && index === 1
                          ? "bg-green-500"
                          : "bg-turquoise-500") + " scale-125"
                  : "bg-gray-300 dark:bg-gray-600"
              }`}
            />
          ))}
        </div>

        <div className="text-xs text-muted-foreground opacity-70">
          {APP_NAME} · powered by Aurix
        </div>
      </div>
    </div>
  )
}
