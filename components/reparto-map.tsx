"use client"

import { useEffect, useRef, useState } from "react"
import { AlertTriangle, Loader2, MapPin } from "lucide-react"
import {
  getDeliveryDepotAddress,
  getGoogleMapsApiKey,
  type RouteStop,
} from "@/lib/delivery-route"

type GMaps = {
  maps: {
    Map: new (el: HTMLElement, opts: Record<string, unknown>) => { fitBounds: (b: unknown) => void }
    LatLngBounds: new () => { extend: (loc: unknown) => void }
    Marker: new (opts: Record<string, unknown>) => unknown
    Geocoder: new () => {
      geocode: (
        req: Record<string, unknown>,
        cb: (results: Array<{ geometry: { location: unknown } }> | null, status: string) => void
      ) => void
    }
    DirectionsService: new () => {
      route: (
        req: Record<string, unknown>,
        cb: (result: DirectionsResult | null, status: string) => void
      ) => void
    }
    DirectionsRenderer: new (opts: Record<string, unknown>) => {
      setDirections: (r: DirectionsResult) => void
    }
    TravelMode: { DRIVING: string }
  }
}

type DirectionsResult = {
  routes: Array<{
    waypoint_order?: number[]
    legs: Array<{ distance?: { value: number }; duration?: { value: number } }>
  }>
}

declare global {
  interface Window {
    google?: GMaps
    __braboMapsCallback?: () => void
  }
}

type RepartoMapProps = {
  stops: RouteStop[]
  className?: string
  onOptimizedOrder?: (orderedIds: number[]) => void
}

let mapsScriptPromise: Promise<void> | null = null

function loadGoogleMaps(apiKey: string): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"))
  if (window.google?.maps) return Promise.resolve()
  if (mapsScriptPromise) return mapsScriptPromise

  mapsScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-brabo-maps]")
    if (existing) {
      existing.addEventListener("load", () => resolve())
      existing.addEventListener("error", () => reject(new Error("No se pudo cargar Google Maps")))
      return
    }
    window.__braboMapsCallback = () => resolve()
    const script = document.createElement("script")
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&callback=__braboMapsCallback&language=es&region=AR`
    script.async = true
    script.defer = true
    script.dataset.braboMaps = "1"
    script.onerror = () => reject(new Error("No se pudo cargar Google Maps"))
    document.head.appendChild(script)
  })
  return mapsScriptPromise
}

export function RepartoMap({ stops, className, onOptimizedOrder }: RepartoMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<string | null>(null)
  const apiKey = getGoogleMapsApiKey()
  const depot = getDeliveryDepotAddress()

  // Serializar stops para dependencia estable
  const stopsKey = stops.map((s) => `${s.order.id}:${s.address}`).join("|")

  useEffect(() => {
    if (!apiKey) {
      setLoading(false)
      setError(null)
      return
    }
    if (!containerRef.current) return

    let cancelled = false
    const usable = stops.filter((s) => s.address.length >= 5)

    setLoading(true)
    setError(null)
    setSummary(null)

    void loadGoogleMaps(apiKey)
      .then(() => {
        if (cancelled || !containerRef.current || !window.google?.maps) return
        const g = window.google

        const map = new g.maps.Map(containerRef.current, {
          zoom: 12,
          center: { lat: -34.6037, lng: -58.3816 },
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        })

        if (usable.length === 0) {
          setSummary("Sin domicilios geocodificables en la selección.")
          setLoading(false)
          return
        }

        const directionsService = new g.maps.DirectionsService()
        const directionsRenderer = new g.maps.DirectionsRenderer({
          map,
          suppressMarkers: false,
        })

        // Ida y vuelta al depósito: todas las paradas son waypoints optimizables
        const waypoints = usable.map((s) => ({
          location: s.address,
          stopover: true,
        }))

        directionsService.route(
          {
            origin: depot,
            destination: depot,
            waypoints,
            optimizeWaypoints: waypoints.length > 1,
            travelMode: g.maps.TravelMode.DRIVING,
            region: "AR",
          },
          (result, status) => {
            if (cancelled) return
            setLoading(false)
            if (status !== "OK" || !result) {
              setError(
                status === "ZERO_RESULTS"
                  ? "Google Maps no encontró ruta para esos domicilios."
                  : `No se pudo calcular la ruta (${status}).`
              )
              const bounds = new g.maps.LatLngBounds()
              const geocoder = new g.maps.Geocoder()
              usable.forEach((s, i) => {
                geocoder.geocode({ address: s.address, region: "AR" }, (results, gStatus) => {
                  if (gStatus !== "OK" || !results?.[0]) return
                  const loc = results[0].geometry.location
                  new g.maps.Marker({
                    map,
                    position: loc,
                    label: String(i + 1),
                    title: s.label,
                  })
                  bounds.extend(loc)
                  map.fitBounds(bounds)
                })
              })
              return
            }

            directionsRenderer.setDirections(result)
            const route = result.routes[0]
            const orderIdx = route.waypoint_order || []
            if (onOptimizedOrder && orderIdx.length > 0) {
              onOptimizedOrder(orderIdx.map((i) => usable[i].order.id))
            }

            const meters = route.legs.reduce((sum, leg) => sum + (leg.distance?.value || 0), 0)
            const seconds = route.legs.reduce((sum, leg) => sum + (leg.duration?.value || 0), 0)
            const km = (meters / 1000).toFixed(1)
            const mins = Math.round(seconds / 60)
            setSummary(`Ruta sugerida · ~${km} km · ~${mins} min`)
          }
        )
      })
      .catch((err) => {
        if (cancelled) return
        setLoading(false)
        setError(err instanceof Error ? err.message : "Error al cargar el mapa")
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stopsKey resume stops
  }, [apiKey, depot, stopsKey, onOptimizedOrder])

  if (!apiKey) {
    return (
      <div
        className={
          className ||
          "rounded-lg border border-dashed bg-muted/30 p-6 text-sm text-muted-foreground flex flex-col items-center justify-center gap-2 min-h-[280px]"
        }
      >
        <MapPin className="h-8 w-8 text-muted-foreground/70" />
        <p className="text-center max-w-md">
          Para el mapa embebido configurá{" "}
          <code className="text-xs bg-muted px-1 rounded">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>{" "}
          (Maps JavaScript API + Directions). Mientras tanto podés abrir la ruta en Google Maps
          con el botón de la barra.
        </p>
        <p className="text-xs text-center">
          Depósito: <span className="font-medium text-foreground">{depot}</span>
        </p>
      </div>
    )
  }

  return (
    <div className={className || "relative rounded-lg border overflow-hidden min-h-[320px] bg-muted/20"}>
      <div ref={containerRef} className="absolute inset-0 min-h-[320px] h-full w-full" style={{ minHeight: 320 }} />
      {loading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-background/60 z-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : null}
      {error ? (
        <div className="absolute bottom-3 left-3 right-3 z-10 rounded-md border border-amber-500/40 bg-amber-50 dark:bg-amber-950/40 px-3 py-2 text-xs text-amber-900 dark:text-amber-100 flex gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}
      {summary && !error ? (
        <div className="absolute top-3 left-3 z-10 rounded-md bg-background/90 border px-2.5 py-1 text-xs font-medium shadow-sm">
          {summary}
        </div>
      ) : null}
    </div>
  )
}
