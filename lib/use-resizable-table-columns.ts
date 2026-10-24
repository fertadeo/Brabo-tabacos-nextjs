"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export type ColumnWidthMap = Record<string, number>

function loadWidths(key: string, defaults: ColumnWidthMap): ColumnWidthMap {
  if (typeof window === "undefined") return { ...defaults }
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return { ...defaults }
    const parsed = JSON.parse(raw) as ColumnWidthMap
    const merged = { ...defaults }
    for (const [colId, width] of Object.entries(parsed)) {
      if (typeof width === "number" && Number.isFinite(width) && width > 0) {
        merged[colId] = width
      }
    }
    return merged
  } catch {
    return { ...defaults }
  }
}

export function useResizableTableColumns(
  storageKey: string,
  defaults: ColumnWidthMap,
  mins: ColumnWidthMap = {}
) {
  const defaultsRef = useRef(defaults)
  defaultsRef.current = defaults

  const [widths, setWidths] = useState<ColumnWidthMap>(() => ({ ...defaults }))
  const widthsRef = useRef(widths)
  widthsRef.current = widths

  useEffect(() => {
    setWidths(loadWidths(storageKey, defaultsRef.current))
  }, [storageKey])

  const persist = useCallback(
    (next: ColumnWidthMap) => {
      if (typeof window === "undefined") return
      try {
        localStorage.setItem(storageKey, JSON.stringify(next))
      } catch {
        /* quota / private mode */
      }
    },
    [storageKey]
  )

  const beginResize = useCallback(
    (columnId: string, clientX: number) => {
      const startWidth = widthsRef.current[columnId] ?? defaultsRef.current[columnId] ?? 100
      const min = mins[columnId] ?? 48
      let currentWidth = startWidth

      const onMove = (e: MouseEvent) => {
        currentWidth = Math.max(min, startWidth + (e.clientX - clientX))
        const next = { ...widthsRef.current, [columnId]: currentWidth }
        setWidths(next)
      }

      const onUp = () => {
        document.removeEventListener("mousemove", onMove)
        document.removeEventListener("mouseup", onUp)
        document.body.style.cursor = ""
        document.body.style.userSelect = ""
        persist({ ...widthsRef.current, [columnId]: currentWidth })
      }

      document.body.style.cursor = "col-resize"
      document.body.style.userSelect = "none"
      document.addEventListener("mousemove", onMove)
      document.addEventListener("mouseup", onUp)
    },
    [mins, persist]
  )

  const resetWidths = useCallback(() => {
    const next = { ...defaultsRef.current }
    setWidths(next)
    persist(next)
  }, [persist])

  const totalWidth = Object.values(widths).reduce((sum, w) => sum + w, 0)

  return { widths, beginResize, resetWidths, totalWidth }
}
