"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert } from "@/components/ui/alert"
import { getClientArcaPadron, getSupplierArcaPadron } from "@/lib/api"
import {
  normalizeClientTaxIdDigits,
  isValidCuitForArcaPadron,
  formatClientTaxIdDisplay,
  clientTaxIdFieldLabel,
  clientTaxIdValidationMessage,
} from "@/lib/client-tax-id"
import { getArcaPadronDisplayName, buildArcaPadronBusinessSummary, type ArcaPadronEntity, type ArcaPadronResult } from "@/lib/arca-padron"
import { ArcaPadronResultSummary } from "@/components/arca-padron-result-summary"
import { Loader2, Search, UserRoundSearch } from "lucide-react"
import { toast } from "sonner"

export interface ArcaPadronCuitFieldProps {
  entityType: ArcaPadronEntity
  cuitValue: string
  onCuitChange: (formatted: string) => void
  onApplyPadron: (data: ArcaPadronResult) => void
  /** true cuando ARCA autocompletó campos vinculados en el formulario padre */
  onPadronLockChange?: (locked: boolean) => void
  /** Limpia datos de ARCA en el formulario padre para consultar otro CUIT */
  onPadronReset?: () => void
  disabled?: boolean
  inputId?: string
  label?: string
  className?: string
}

export function ArcaPadronCuitField({
  entityType,
  cuitValue,
  onCuitChange,
  onApplyPadron,
  onPadronLockChange,
  onPadronReset,
  disabled = false,
  inputId = "arca-padron-cuit",
  label = clientTaxIdFieldLabel(),
  className,
}: ArcaPadronCuitFieldProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<ArcaPadronResult | null>(null)
  const [padronLocked, setPadronLocked] = useState(false)
  const lastSearchedRef = useRef<string>("")
  const searchingRef = useRef(false)

  const unlockPadron = useCallback(() => {
    lastSearchedRef.current = ""
    setLastResult(null)
    setPadronLocked(false)
    onPadronLockChange?.(false)
  }, [onPadronLockChange])

  const runSearch = useCallback(
    async (digits: string) => {
      if (digits.length !== 11 || searchingRef.current) return
      if (lastSearchedRef.current === digits) return

      searchingRef.current = true
      setLoading(true)
      setError(null)
      try {
        const fetcher = entityType === "client" ? getClientArcaPadron : getSupplierArcaPadron
        const data = await fetcher(digits)
        lastSearchedRef.current = digits
        setLastResult(data)
        onApplyPadron(data)
        onCuitChange(formatClientTaxIdDisplay(data.cuit || digits))
        setPadronLocked(true)
        onPadronLockChange?.(true)
        const displayName = getArcaPadronDisplayName(data)
        const summary = buildArcaPadronBusinessSummary(data)
        toast.success("Datos de ARCA aplicados", {
          description:
            summary.condicionFiscal?.shortLabel != null
              ? `${displayName || summary.cuitFormatted} · ${summary.condicionFiscal.shortLabel}`
              : displayName || `CUIT ${formatClientTaxIdDisplay(digits)}`,
        })
      } catch (e) {
        lastSearchedRef.current = ""
        setLastResult(null)
        setPadronLocked(false)
        onPadronLockChange?.(false)
        const msg = e instanceof Error ? e.message : "Error al consultar ARCA"
        setError(msg)
        toast.error(msg)
      } finally {
        searchingRef.current = false
        setLoading(false)
      }
    },
    [entityType, onApplyPadron, onCuitChange, onPadronLockChange]
  )

  useEffect(() => {
    if (!cuitValue.trim()) {
      setError(null)
      setLastResult(null)
      lastSearchedRef.current = ""
      setPadronLocked(false)
      onPadronLockChange?.(false)
    }
  }, [cuitValue, onPadronLockChange])

  const handleCuitInput = (raw: string) => {
    const formatted = formatClientTaxIdDisplay(raw)
    const prevDigits = normalizeClientTaxIdDigits(cuitValue)
    const digits = normalizeClientTaxIdDigits(formatted)
    if (padronLocked && digits !== prevDigits) {
      unlockPadron()
    }
    onCuitChange(formatted)
    if (error) setError(null)
  }

  const handleSearchAnother = () => {
    setError(null)
    unlockPadron()
    onPadronReset?.()
    onCuitChange("")
  }

  const canSearch = isValidCuitForArcaPadron(cuitValue) && !loading && !disabled
  const inputDisabled = disabled || loading

  return (
    <div className={className}>
      <Label htmlFor={inputId}>{label}</Label>
      <div className="flex flex-col sm:flex-row gap-2 mt-1.5">
        <Input
          id={inputId}
          value={cuitValue}
          onChange={(e) => handleCuitInput(e.target.value)}
          placeholder="DNI (7-8) o CUIL/CUIT (11 dígitos)"
          disabled={inputDisabled}
          maxLength={13}
          className="flex-1"
        />
        {padronLocked ? (
          <Button
            type="button"
            variant="outline"
            className="shrink-0 gap-1.5"
            disabled={disabled || loading}
            onClick={handleSearchAnother}
          >
            <UserRoundSearch className="h-4 w-4" />
            Buscar otro contribuyente
          </Button>
        ) : (
          <Button
            type="button"
            variant="secondary"
            className="shrink-0 gap-1.5"
            disabled={!canSearch}
            onClick={() => void runSearch(normalizeClientTaxIdDigits(cuitValue))}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Buscar en ARCA
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground mt-1.5">
        {padronLocked
          ? "Los datos de ARCA quedaron aplicados. Podés editar el documento o usar «Buscar otro contribuyente»."
          : `${clientTaxIdValidationMessage()}. Presioná «Buscar en ARCA» solo para CUIL/CUIT.`}
      </p>

      {error && (
        <Alert variant="error" className="mt-3" title="Error al consultar ARCA" description={error} />
      )}

      {lastResult && !error && <ArcaPadronResultSummary result={lastResult} />}
    </div>
  )
}
