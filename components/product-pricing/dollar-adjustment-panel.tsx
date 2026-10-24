"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { AlertCircle, DollarSign, Loader2, RefreshCw } from "lucide-react"
import { useToast } from "@/contexts/ToastContext"
import { PricingProductPreviewList } from "@/components/product-pricing/pricing-product-preview-list"
import { cn } from "@/lib/utils"
import {
  applyDollarPriceAdjustmentWithMessage,
  formatArs,
  getDollarRate,
  previewDollarPriceAdjustment,
  type DollarRateData,
} from "@/lib/product-pricing"

interface DollarAdjustmentPanelProps {
  onApplied?: () => void
}

export function DollarAdjustmentPanel({ onApplied }: DollarAdjustmentPanelProps) {
  const { showToast } = useToast()
  const [info, setInfo] = useState<DollarRateData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [applying, setApplying] = useState(false)
  const [syncWoo, setSyncWoo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const infoRef = useRef<DollarRateData | null>(null)
  infoRef.current = info

  const allSampleIds = useMemo(
    () => new Set(info?.sample_preview.map((p) => p.id) ?? []),
    [info?.sample_preview]
  )

  const loadRate = useCallback(async (options?: { silent?: boolean }) => {
    const hasData = infoRef.current != null
    if (hasData) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setError(null)
    try {
      const data = await getDollarRate()
      setInfo(data)
      if (options?.silent !== true && hasData) {
        showToast({
          message: `Cotización actualizada: ${formatArs(data.current_rate)}`,
          type: "success",
          duration: 3000,
        })
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al cargar cotización"
      setError(msg)
      if (!hasData) {
        setInfo(null)
      }
      if (hasData) {
        showToast({ message: msg, type: "error" })
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [showToast])

  useEffect(() => {
    void loadRate()
  }, [loadRate])

  const loadExtendedPreview = async () => {
    setLoading(true)
    try {
      const data = await previewDollarPriceAdjustment({ preview_limit: 15 })
      setInfo(data)
    } catch (e) {
      showToast({
        message: e instanceof Error ? e.message : "Error en vista previa",
        type: "error",
      })
    } finally {
      setLoading(false)
    }
  }

  const runApply = async () => {
    if (!info) return
    const msg = info.is_first_adjustment
      ? "¿Guardar la cotización actual como referencia? Los precios no se modificarán."
      : info.products_affected_estimate === 0 || info.increment_percent === 0
        ? "¿Actualizar la referencia del dólar? No hay variación que aplicar a precios."
        : `¿Aplicar un incremento del ${info.increment_percent.toFixed(2)}% a aproximadamente ${info.products_affected_estimate} productos?`
    if (!window.confirm(msg)) return

    setApplying(true)
    try {
      const { data, message } = await applyDollarPriceAdjustmentWithMessage({
        sync_to_woocommerce: syncWoo,
      })
      let detail = message
      if (data.woocommerce_sync && syncWoo) {
        detail += ` · WooCommerce: ${data.woocommerce_sync.synced} ok`
        if (data.woocommerce_sync.failed > 0) {
          detail += `, ${data.woocommerce_sync.failed} fallidos`
        }
      }
      showToast({ message: detail, type: "success", duration: 6000 })
      await loadRate({ silent: true })
      onApplied?.()
    } catch (e) {
      showToast({
        message: e instanceof Error ? e.message : "Error al aplicar",
        type: "error",
      })
    } finally {
      setApplying(false)
    }
  }

  const applyLabel = info?.is_first_adjustment
    ? "Establecer referencia"
    : "Aplicar ajuste por dólar"

  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <DollarSign className="h-5 w-5 shrink-0" />
          <span className="min-w-0">Ajuste por variación del dólar (ARS)</span>
        </CardTitle>
        <CardDescription className="text-sm">
          Cotización Argentina vía DolarAPI. La aplicación es manual: no hay actualización automática
          en segundo plano.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6 pt-0 sm:pt-0">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
            onClick={() => void loadRate()}
            disabled={loading || refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading || refreshing ? "animate-spin" : ""}`} />
            Actualizar cotización
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full sm:w-auto"
            onClick={() => void loadExtendedPreview()}
            disabled={loading || !!error}
          >
            Vista previa ampliada
          </Button>
        </div>

        {error && (
          <div className="flex gap-2 text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/5 p-3">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading && !info ? (
          <div className="flex items-center gap-2 text-muted-foreground py-8">
            <Loader2 className="h-5 w-5 animate-spin" />
            Obteniendo cotización…
          </div>
        ) : info ? (
          <div
            className={cn(
              "relative space-y-4 sm:space-y-6",
              info && "pb-20 sm:pb-0",
              refreshing && "opacity-60 pointer-events-none"
            )}
          >
            {refreshing && (
              <div className="absolute inset-0 z-10 flex items-center justify-center">
                <div className="flex items-center gap-2 rounded-md border bg-background/90 px-3 py-2 text-sm shadow-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Actualizando cotización…
                </div>
              </div>
            )}
            {info.is_first_adjustment && (
              <p className="text-sm rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-amber-900 dark:text-amber-100">
                La primera vez que confirmes solo se guardará la cotización de referencia; los
                precios no cambiarán.
              </p>
            )}

            <dl className="grid gap-3 grid-cols-1 sm:grid-cols-2 text-sm">
              {[
                { label: "Tipo de dólar", value: info.quote.dollar_label, mono: false },
                {
                  label: "Cotización actual (venta)",
                  value: formatArs(info.current_rate),
                  mono: true,
                },
                {
                  label: "Última referencia guardada",
                  value:
                    info.reference_rate != null
                      ? formatArs(info.reference_rate)
                      : "— (primera vez)",
                  mono: true,
                },
                {
                  label: "Incremento estimado",
                  value: `${info.increment_percent.toFixed(2)}%`,
                  mono: true,
                },
                {
                  label: "Productos estimados",
                  value: String(info.products_affected_estimate),
                  mono: true,
                },
                {
                  label: "Fuente / actualizado",
                  value: `${info.quote.source} · ${new Date(info.quote.fetched_at).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}`,
                  mono: false,
                  small: true,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg border bg-muted/20 p-3 sm:bg-transparent sm:border-0 sm:p-0"
                >
                  <dt className="text-muted-foreground text-xs">{item.label}</dt>
                  <dd
                    className={cn(
                      "font-medium mt-0.5 break-words",
                      item.mono && "tabular-nums",
                      item.small && "text-xs text-muted-foreground font-normal"
                    )}
                  >
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>

            {info.sample_preview.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Muestra de precios</p>
                <div className="max-h-[min(50vh,24rem)] overflow-y-auto">
                  <PricingProductPreviewList
                    products={info.sample_preview}
                    includedProductIds={allSampleIds}
                    allIncluded
                    someIncluded={false}
                    onToggleAll={() => {}}
                    onToggleProduct={() => {}}
                    readOnly
                  />
                </div>
              </div>
            )}

            <label className="flex min-h-10 items-start gap-3 text-sm cursor-pointer rounded-lg border p-3 sm:border-0 sm:p-0">
              <Checkbox
                className="mt-0.5"
                checked={syncWoo}
                onCheckedChange={(v) => setSyncWoo(v === true)}
              />
              <span>Sincronizar con WooCommerce al aplicar</span>
            </label>

            <Button
              type="button"
              className="hidden sm:inline-flex w-full sm:w-auto"
              onClick={() => void runApply()}
              disabled={loading || applying}
            >
              {applying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {applyLabel}
            </Button>

            {/* Barra fija móvil */}
            <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:hidden shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
              <div className="mx-auto max-w-7xl">
                {info.increment_percent !== 0 && !info.is_first_adjustment && (
                  <p className="text-xs text-center text-muted-foreground mb-2 tabular-nums">
                    +{info.increment_percent.toFixed(2)}% · ~{info.products_affected_estimate} productos
                  </p>
                )}
                <Button
                  type="button"
                  className="w-full"
                  size="lg"
                  onClick={() => void runApply()}
                  disabled={loading || applying}
                >
                  {applying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {applyLabel}
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
