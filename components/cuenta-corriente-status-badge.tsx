"use client"

import { Badge } from "@/components/ui/badge"
import { CreditCard, CheckCircle, XCircle, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react"

interface CuentaCorrienteStatusBadgeProps {
  hasAccount: boolean
  balance?: number
  creditLimit?: number
  isActive?: boolean
  className?: string
}

export function CuentaCorrienteStatusBadge({ 
  hasAccount, 
  balance = 0, 
  creditLimit = 0, 
  isActive = true,
  className = ""
}: CuentaCorrienteStatusBadgeProps) {
  
  if (!hasAccount) {
    return (
      <Badge variant="outline" className={`text-xs ${className}`}>
        <CreditCard className="h-3 w-3 mr-1" />
        Sin Cuenta
      </Badge>
    )
  }

  if (!isActive) {
    return (
      <Badge variant="secondary" className={`text-xs ${className}`}>
        <XCircle className="h-3 w-3 mr-1" />
        Inactiva
      </Badge>
    )
  }

  // Calcular utilización del crédito
  const utilizationPercentage = creditLimit > 0 ? Math.abs(balance) / creditLimit : 0
  
  if (balance < 0) {
    // Cuenta en rojo
    return (
      <Badge variant="destructive" className={`text-xs ${className}`}>
        <AlertTriangle className="h-3 w-3 mr-1" />
        En Rojo
      </Badge>
    )
  }
  
  if (utilizationPercentage >= 0.9) {
    // Cerca del límite
    return (
      <Badge variant="outline" className={`text-xs text-orange-600 border-orange-300 ${className}`}>
        <AlertTriangle className="h-3 w-3 mr-1" />
        Cerca del Límite
      </Badge>
    )
  }
  
  if (balance > 0) {
    // Tiene saldo a favor
    return (
      <Badge variant="default" className={`text-xs bg-green-100 text-green-700 border-green-300 ${className}`}>
        <TrendingUp className="h-3 w-3 mr-1" />
        Saldo Positivo
      </Badge>
    )
  }
  
  // Cuenta activa sin saldo
  return (
    <Badge variant="default" className={`text-xs ${className}`}>
      <CheckCircle className="h-3 w-3 mr-1" />
      Activa
    </Badge>
  )
}
