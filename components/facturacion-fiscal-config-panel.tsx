"use client"

import { useMemo } from "react"
import Link from "next/link"
import { Alert } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Cliente, FacturarSaleRequest, FacturarSugerenciaData } from "@/lib/api"
import { formatTaxConditionLabel } from "@/lib/client-tax-condition"
import {
  clienteCondicionIvaErp,
  clienteTieneDatosFiscalesErp,
  buildFacturarPayload,
} from "@/lib/facturacion-form-from-cliente"
import {
  getEmisorRegimenFromApi,
  getEmisorRegimenLabel,
  labelCondicionIvaReceptor,
  resolveFacturacionDesdeCliente,
} from "@/lib/facturacion-cliente-fiscal"
import {
  CONDICIONES_IVA_RECEPTOR,
  facturadorTipoRequiereIva,
  getTipoComprobanteLabel,
  resolveCondicionIvaReceptorForWsfe,
  TIPOS_COMPROBANTE_AFIP,
} from "@/lib/facturacion-comprobantes"
import { TipoComprobanteBadge } from "@/components/tipo-comprobante-badge"

export interface FacturacionFiscalConfigPanelProps {
  value: FacturarSaleRequest
  onChange: (next: FacturarSaleRequest) => void
  cliente: Cliente | null
  sugerencia?: FacturarSugerenciaData | null
  /** Mostrar checkbox para guardar en localStorage del navegador */
  showSaveAsDefault?: boolean
  saveAsDefault?: boolean
  onSaveAsDefaultChange?: (checked: boolean) => void
}

function conceptoLabel(concepto: number | undefined): string {
  if (concepto === 2) return "Servicios"
  if (concepto === 3) return "Productos + servicios"
  return "Productos"
}

function patchFiscal(
  prev: FacturarSaleRequest,
  patch: Partial<FacturarSaleRequest>
): FacturarSaleRequest {
  return { ...prev, ...patch, fiscalManualConfig: true }
}

export function FacturacionFiscalConfigPanel({
  value,
  onChange,
  cliente,
  sugerencia,
  showSaveAsDefault = false,
  saveAsDefault = false,
  onSaveAsDefaultChange,
}: FacturacionFiscalConfigPanelProps) {
  const emisorLabel = getEmisorRegimenLabel(getEmisorRegimenFromApi())
  const desdeCliente = resolveFacturacionDesdeCliente(cliente)
  const condicionErpCliente = clienteCondicionIvaErp(cliente)
  const sugeridoTipo = sugerencia?.sugerencia?.tipo ?? desdeCliente.tipoComprobante
  const sugeridoCondicion =
    sugerencia?.condicionIvaReceptor ?? desdeCliente.condicionIvaReceptor

  const tipo = value.tipo ?? 6
  const condicionErp = value.condicionIvaReceptor ?? 5
  const condicionWsfe = resolveCondicionIvaReceptorForWsfe(tipo, condicionErp)
  const payloadPreview = useMemo(
    () => buildFacturarPayload({ ...value, fiscalManualConfig: true }, cliente),
    [value, cliente]
  )

  const requiereIva = facturadorTipoRequiereIva(tipo)
  const condicionMapeadaWsfe = condicionWsfe !== condicionErp

  return (
    <div className="space-y-5">
      <Alert variant="info" title="Dos datos distintos (no los mezcles)">
        <div className="space-y-2 text-sm">
          <p>
            <strong>Tipo de comprobante</strong> (Factura A / B / C) es la <em>letra</em> del comprobante según tu
            régimen como emisor y el perfil del receptor.
          </p>
          <p>
            <strong>Condición IVA del receptor</strong> es el <em>código fiscal del cliente</em> ante AFIP (1 =
            Responsable inscripto, 5 = Consumidor final, 6 = Monotributo, etc.). Es independiente del tipo de factura.
          </p>
        </div>
      </Alert>

      <div className="rounded-lg border bg-muted/20 p-3 text-sm space-y-2">
        <p className="font-medium">Sugerencia para este cliente</p>
        <div className="flex flex-wrap items-center gap-2">
          <TipoComprobanteBadge tipo={sugeridoTipo} />
          <span>{getTipoComprobanteLabel(sugeridoTipo)}</span>
          <span className="text-muted-foreground">·</span>
          <span>
            Condición IVA {sugeridoCondicion} ({labelCondicionIvaReceptor(sugeridoCondicion)})
          </span>
        </div>
        {cliente ? (
          <p className="text-muted-foreground text-xs">
            Cliente ERP:{" "}
            {cliente.tax_condition
              ? formatTaxConditionLabel(cliente.tax_condition)
              : condicionErpCliente != null
                ? labelCondicionIvaReceptor(condicionErpCliente)
                : "sin condición fiscal cargada"}
            {clienteTieneDatosFiscalesErp(cliente) ? " · datos fiscales en ficha" : ""}
          </p>
        ) : (
          <p className="text-muted-foreground text-xs">Sin cliente en la venta → consumidor final (docTipo 99).</p>
        )}
        {sugerencia?.sugerencia?.motivo ? (
          <p className="text-muted-foreground text-xs">Motivo API: {sugerencia.sugerencia.motivo}</p>
        ) : null}
        <p className="text-muted-foreground text-xs">
          Emisor ({emisorLabel}): RI suele emitir Factura B a consumidor final y Factura A a RI o monotributo con CUIT;
          monotributo emite Factura C.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="fiscal-config-tipo">Tipo de comprobante</Label>
          <Select
            value={String(value.tipo ?? 6)}
            onValueChange={(v) =>
              onChange(patchFiscal(value, { tipo: parseInt(v, 10) || 6 }))
            }
          >
            <SelectTrigger id="fiscal-config-tipo" className="w-full">
              <SelectValue placeholder="Elegí tipo" />
            </SelectTrigger>
            <SelectContent>
              {TIPOS_COMPROBANTE_AFIP.filter((t) => [1, 6, 11].includes(t.value)).map((t) => (
                <SelectItem key={t.value} value={String(t.value)}>
                  {t.label} — código WSFE {t.value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-xs">
            {requiereIva
              ? "Factura A/B: se envía desglose IVA por alícuota al facturador."
              : "Factura C: no se discrimina IVA en el payload AFIP (ítems deben estar en 0% si el emisor es monotributo)."}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="fiscal-config-condicion">Condición IVA del receptor</Label>
          <Select
            value={String(value.condicionIvaReceptor ?? 5)}
            onValueChange={(v) =>
              onChange(patchFiscal(value, { condicionIvaReceptor: parseInt(v, 10) || 5 }))
            }
          >
            <SelectTrigger id="fiscal-config-condicion" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONDICIONES_IVA_RECEPTOR.map((c) => (
                <SelectItem key={c.value} value={String(c.value)}>
                  {c.label} ({c.value})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {condicionMapeadaWsfe ? (
            <p className="text-amber-700 dark:text-amber-300 text-xs">
              En Factura B, monotributo del ERP ({condicionErp}) se envía a ARCA como consumidor final ({condicionWsfe}).
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="fiscal-config-concepto">Concepto del comprobante</Label>
          <Select
            value={String(value.concepto ?? 1)}
            onValueChange={(v) =>
              onChange(patchFiscal(value, { concepto: Number(v) as 1 | 2 | 3 }))
            }
          >
            <SelectTrigger id="fiscal-config-concepto" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 — Productos</SelectItem>
              <SelectItem value="2">2 — Servicios</SelectItem>
              <SelectItem value="3">3 — Productos + servicios</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="fiscal-config-doc-tipo">Tipo documento receptor (docTipo)</Label>
          <Input
            id="fiscal-config-doc-tipo"
            type="number"
            value={value.docTipo ?? ""}
            onChange={(e) =>
              onChange(
                patchFiscal(value, {
                  docTipo: e.target.value === "" ? undefined : Number(e.target.value),
                })
              )
            }
            placeholder="80 = CUIT · 99 = sin identificar"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="fiscal-config-doc-nro">Número documento (docNro)</Label>
          <Input
            id="fiscal-config-doc-nro"
            value={value.docNro ?? ""}
            onChange={(e) =>
              onChange(
                patchFiscal(value, {
                  docNro: e.target.value ? Number(e.target.value) : undefined,
                })
              )
            }
            placeholder="CUIT sin guiones · 0 si docTipo 99"
          />
        </div>

        {(value.concepto === 2 || value.concepto === 3) && (
          <>
            <div className="space-y-2">
              <Label htmlFor="fiscal-config-serv-desde">Servicio — desde</Label>
              <Input
                id="fiscal-config-serv-desde"
                type="date"
                value={value.fechaServicioDesde ?? ""}
                onChange={(e) =>
                  onChange(patchFiscal(value, { fechaServicioDesde: e.target.value || undefined }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fiscal-config-serv-hasta">Servicio — hasta</Label>
              <Input
                id="fiscal-config-serv-hasta"
                type="date"
                value={value.fechaServicioHasta ?? ""}
                onChange={(e) =>
                  onChange(patchFiscal(value, { fechaServicioHasta: e.target.value || undefined }))
                }
              />
            </div>
          </>
        )}
      </div>

      <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4 space-y-2">
        <p className="text-sm font-semibold">Vista previa de lo que se enviará a ARCA</p>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <TipoComprobanteBadge tipo={payloadPreview.tipo} />
          <span>{getTipoComprobanteLabel(payloadPreview.tipo)}</span>
          {value.tipo !== payloadPreview.tipo ? (
            <Badge variant="outline" className="text-xs">
              tipo ajustado WSFE
            </Badge>
          ) : null}
        </div>
        <ul className="text-sm space-y-1 text-muted-foreground">
          <li>
            Condición IVA receptor:{" "}
            <strong className="text-foreground">
              {payloadPreview.condicionIvaReceptor} ({labelCondicionIvaReceptor(payloadPreview.condicionIvaReceptor ?? 5)})
            </strong>
            {condicionMapeadaWsfe ? (
              <span className="text-xs"> — en ERP elegiste {condicionErp}</span>
            ) : null}
          </li>
          <li>
            Concepto: <strong className="text-foreground">{conceptoLabel(value.concepto)}</strong>
          </li>
          <li>
            Documento:{" "}
            <strong className="text-foreground font-mono text-xs">
              docTipo {payloadPreview.docTipo ?? 99} · docNro {payloadPreview.docNro ?? 0}
            </strong>
          </li>
          <li>
            IVA discriminado en payload:{" "}
            <strong className="text-foreground">{requiereIva ? "Sí (Factura A/B)" : "No (Factura C)"}</strong>
          </li>
        </ul>
      </div>

      {showSaveAsDefault ? (
        <div className="flex items-start gap-3 rounded-lg border p-3">
          <Checkbox
            id="fiscal-save-default"
            checked={saveAsDefault}
            onCheckedChange={(checked) => onSaveAsDefaultChange?.(checked === true)}
          />
          <div className="space-y-1">
            <Label htmlFor="fiscal-save-default" className="font-normal cursor-pointer leading-snug">
              Recordar tipo, condición y concepto para próximas emisiones en este navegador
            </Label>
            <p className="text-muted-foreground text-xs">
              No reemplaza la sugerencia por cliente; solo precarga valores al abrir facturación. Podés cambiarlos en{" "}
              <Link href="/configuracion?tab=facturacion" className="underline">
                Configuración ARCA
              </Link>
              .
            </p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
