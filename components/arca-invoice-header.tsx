"use client"

import { fmtDateAr } from "@/lib/arca-invoice-format"
import type { ArcaInvoiceEmisor, GenerateArcaInvoicePdfParams } from "@/lib/generate-arca-invoice-pdf"
import type { FacturaCopia } from "@/lib/generate-arca-invoice-pdf"
import {
  formatNumeroComprobanteAfip,
  formatPuntoVentaAfip,
  getCodigoComprobanteAfip,
  getComprobanteArcaTitulo,
  getLetraComprobanteAfip,
} from "@/lib/facturacion-comprobantes"

const border = "1px solid #000"
const font = "Arial, Helvetica, sans-serif"
/** Ancho de la columna central (recuadro letra + COD). */
const CENTER_COL_W = 44

function LabelValue({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ fontSize: "11px", lineHeight: 1.35, marginTop: "3px" }}>
      <span style={{ fontWeight: 700 }}>{label}</span>
      <span>{value}</span>
    </div>
  )
}

export interface ArcaInvoiceHeaderProps {
  copia: FacturaCopia
  emisor: ArcaInvoiceEmisor
  comprobante: GenerateArcaInvoicePdfParams["comprobante"]
  numeroComprobanteDisplay?: string
}

export function ArcaInvoiceHeader({
  copia,
  emisor,
  comprobante,
  numeroComprobanteDisplay,
}: ArcaInvoiceHeaderProps) {
  const letra = comprobante.letra ?? getLetraComprobanteAfip(comprobante.tipo)
  const codigo = getCodigoComprobanteAfip(comprobante.tipo)
  const titulo = getComprobanteArcaTitulo(comprobante.tipo)
  const cuit = String(emisor.cuit).replace(/\D/g, "")

  return (
    <header style={{ fontFamily: font, color: "#000", position: "relative" }}>
      <div
        style={{
          textAlign: "center",
          fontWeight: 700,
          fontSize: "11px",
          padding: "5px 8px",
          borderBottom: border,
          letterSpacing: "0.03em",
        }}
      >
        {copia}
      </div>

      <div
        style={{
          position: "relative",
          display: "grid",
          gridTemplateColumns: `minmax(0, 1fr) ${CENTER_COL_W}px minmax(0, 1fr)`,
          alignItems: "start",
          minHeight: "108px",
        }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: "50%",
            top: "52px",
            bottom: 0,
            width: "1px",
            background: "#000",
            transform: "translateX(-50%)",
            pointerEvents: "none",
          }}
        />

        <div style={{ borderTop: border, padding: "10px 8px 10px 10px" }}>
          <div
            style={{
              textAlign: "center",
              fontWeight: 700,
              fontSize: "12px",
              lineHeight: 1.25,
              marginBottom: "6px",
              letterSpacing: "0.02em",
            }}
          >
            {emisor.razonSocial}
          </div>
          <LabelValue label="Razón Social: " value={emisor.razonSocial} />
          <LabelValue label="Domicilio Comercial: " value={emisor.domicilio} />
          <LabelValue label="Condición frente al IVA: " value={emisor.condicionIva} />
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            marginTop: "-19px",
            paddingBottom: "4px",
            background: "#fff",
            zIndex: 2,
          }}
        >
          <div
            style={{
              width: "40px",
              height: "38px",
              border,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "26px",
              fontWeight: 700,
              lineHeight: 1,
              background: "#fff",
            }}
          >
            {letra}
          </div>
          <div style={{ fontSize: "9px", marginTop: "2px", lineHeight: 1.2, whiteSpace: "nowrap" }}>
            COD. {codigo}
          </div>
        </div>

        <div style={{ borderTop: border, padding: "10px 10px 10px 8px" }}>
          <div
            style={{
              fontWeight: 700,
              fontSize: titulo.length > 10 ? "11px" : "13px",
              marginBottom: "4px",
              letterSpacing: "0.02em",
              lineHeight: 1.2,
            }}
          >
            {titulo}
          </div>
          <LabelValue label="Punto de Venta: " value={formatPuntoVentaAfip(comprobante.puntoVenta)} />
          <LabelValue
            label="Comp. Nro: "
            value={numeroComprobanteDisplay ?? formatNumeroComprobanteAfip(comprobante.numero)}
          />
          <LabelValue label="Fecha de Emisión: " value={fmtDateAr(comprobante.fechaEmision)} />
          <LabelValue label="CUIT: " value={cuit} />
          <LabelValue label="Ingresos Brutos: " value={emisor.ingresosBrutos ?? "—"} />
          <LabelValue
            label="Fecha de Inicio de Actividades: "
            value={emisor.inicioActividades ?? "—"}
          />
        </div>
      </div>

      <div aria-hidden style={{ borderBottom: border }} />
    </header>
  )
}
