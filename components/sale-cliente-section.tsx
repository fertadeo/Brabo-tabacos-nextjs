"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2 } from "lucide-react"
import { getClienteById, type Cliente } from "@/lib/api"
import { ClienteInfoCard } from "@/components/cliente-picker"
import { ClienteUbicacion } from "@/components/cliente-ubicacion"
import { getClienteDisplayName } from "@/lib/cliente-display"
import { saleToClienteSnapshot, type SaleClientFields } from "@/lib/sale-cliente"

export interface SaleClienteSectionProps {
  clientId?: number | null
  /** Cliente ya cargado (p. ej. en POS o edición). */
  cliente?: Cliente | null
  /** Datos del cliente embebidos en la venta (API). */
  saleSnapshot?: SaleClientFields | null
  fallbackName?: string | null
  compact?: boolean
  className?: string
}

function snapshotHasDetails(snapshot: SaleClientFields): boolean {
  return Boolean(
    snapshot.client_address?.trim() ||
      snapshot.client_city?.trim() ||
      snapshot.client_phone?.trim() ||
      snapshot.client_cuil_cuit?.trim() ||
      snapshot.client_code?.trim()
  )
}

export function SaleClienteSection({
  clientId,
  cliente: clienteProp,
  saleSnapshot,
  fallbackName,
  compact,
  className,
}: SaleClienteSectionProps) {
  const [fetchedCliente, setFetchedCliente] = useState<Cliente | null>(null)
  const [loading, setLoading] = useState(false)

  const resolvedId = clientId ?? saleSnapshot?.client_id ?? clienteProp?.id ?? null
  const snapshotCliente = useMemo(() => {
    if (!saleSnapshot || !(saleSnapshot.client_id || saleSnapshot.client_name?.trim())) return null
    if (!snapshotHasDetails(saleSnapshot)) return null
    return saleToClienteSnapshot(saleSnapshot)
  }, [
    saleSnapshot?.client_id,
    saleSnapshot?.client_name,
    saleSnapshot?.client_code,
    saleSnapshot?.client_address,
    saleSnapshot?.client_city,
    saleSnapshot?.client_phone,
    saleSnapshot?.client_cuil_cuit,
    saleSnapshot?.client_email,
  ])

  const cliente = clienteProp ?? snapshotCliente ?? fetchedCliente

  useEffect(() => {
    if (clienteProp || snapshotCliente) {
      setFetchedCliente(null)
      setLoading(false)
      return
    }
    if (!resolvedId) {
      setFetchedCliente(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    void getClienteById(resolvedId)
      .then((data) => {
        if (!cancelled) setFetchedCliente(data)
      })
      .catch(() => {
        if (!cancelled) setFetchedCliente(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [clienteProp, snapshotCliente, resolvedId])

  if (loading) {
    return (
      <div
        className={`rounded-lg border border-dashed p-4 text-sm text-muted-foreground flex items-center gap-2 ${className ?? ""}`}
      >
        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
        Cargando datos del cliente…
      </div>
    )
  }

  if (cliente) {
    return <ClienteInfoCard cliente={cliente} compact={compact} className={className} />
  }

  const ubicacionParts = saleSnapshot
    ? {
        address: saleSnapshot.client_address?.trim() || null,
        city: saleSnapshot.client_city?.trim() || null,
        country: null,
      }
    : null
  const hasUbicacion = Boolean(ubicacionParts?.address || ubicacionParts?.city)
  const displayName =
    fallbackName?.trim() ||
    saleSnapshot?.client_name?.trim() ||
    (resolvedId != null ? `Cliente #${resolvedId}` : getClienteDisplayName(null))

  return (
    <div
      className={`rounded-lg border border-dashed bg-muted/30 px-4 py-5 text-center space-y-1 ${className ?? ""}`}
    >
      <p className="text-sm font-medium">{getClienteDisplayName({ name: displayName } as Cliente)}</p>
      {hasUbicacion && ubicacionParts ? (
        <ClienteUbicacion
          address={ubicacionParts.address}
          city={ubicacionParts.city}
          variant="compact"
          className="justify-center"
          showIcon={false}
        />
      ) : (
        <p className="text-xs text-muted-foreground">
          {resolvedId != null
            ? "Sin dirección registrada en el ERP para este cliente."
            : "Venta sin cliente asociado (consumidor final)."}
        </p>
      )}
    </div>
  )
}
