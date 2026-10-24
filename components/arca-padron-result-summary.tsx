"use client"

import { Badge } from "@/components/ui/badge"
import { Alert } from "@/components/ui/alert"
import {
  buildArcaPadronBusinessSummary,
  type ArcaPadronResult,
} from "@/lib/arca-padron"
import { Building2, FileText, IdCard, Receipt, ShieldCheck } from "lucide-react"

interface ArcaPadronResultSummaryProps {
  result: ArcaPadronResult
  className?: string
}

export function ArcaPadronResultSummary({ result, className }: ArcaPadronResultSummaryProps) {
  const summary = buildArcaPadronBusinessSummary(result)

  return (
    <div className={className}>
      <Alert variant="success" className="mt-3" title="Contribuyente verificado en ARCA">
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <p className="text-base font-semibold leading-snug text-foreground">
                {summary.displayName || "—"}
              </p>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <IdCard className="h-3.5 w-3.5 shrink-0" />
                CUIT {summary.cuitFormatted}
              </p>
            </div>
            {summary.verificadoEnArca && (
              <Badge variant="secondary" className="gap-1 shrink-0">
                <ShieldCheck className="h-3 w-3" />
                Verificado
              </Badge>
            )}
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {summary.condicionFiscal ? (
              <div className="rounded-lg border bg-background/80 p-3 space-y-2 sm:col-span-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                  <Receipt className="h-3.5 w-3.5" />
                  Condición fiscal (orientativa)
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="text-sm px-3 py-1">{summary.condicionFiscal.shortLabel}</Badge>
                  {summary.condicionFiscal.codigoAfip != null && (
                    <span className="text-xs text-muted-foreground">
                      Código AFIP receptor: {summary.condicionFiscal.codigoAfip}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{summary.condicionFiscal.label}</p>
                <p className="text-sm font-medium text-foreground/90">
                  {summary.condicionFiscal.facturacionHint}
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-3 sm:col-span-2">
                <p className="text-sm text-muted-foreground">
                  ARCA no indicó condición IVA con claridad. Consultala con tu contador antes de facturar.
                </p>
              </div>
            )}

            {summary.personeriaLabel && (
              <div className="rounded-lg border bg-background/60 p-3">
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" />
                  Tipo de contribuyente
                </p>
                <p className="text-sm font-medium">{summary.personeriaLabel}</p>
              </div>
            )}

            <div className="rounded-lg border bg-background/60 p-3">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                Estado del padrón
              </p>
              <p className="text-sm font-medium">
                {summary.padronParcial ? "Datos parciales" : "Datos completos"}
              </p>
            </div>
          </div>

          {summary.notas.length > 0 && (
            <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4">
              {summary.notas.map((nota) => (
                <li key={nota}>{nota}</li>
              ))}
            </ul>
          )}
        </div>
      </Alert>
    </div>
  )
}
