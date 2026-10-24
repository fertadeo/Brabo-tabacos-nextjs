"use client"

import { useCallback, useState } from "react"
import { linkWooCommerceIds, type LinkWooCommerceIdsSummary } from "@/lib/api"

interface UseLinkWooCommerceIdsResult {
  execute: () => Promise<LinkWooCommerceIdsSummary | null>
  loading: boolean
  error: string | null
  result: LinkWooCommerceIdsSummary | null
  reset: () => void
}

export function useLinkWooCommerceIds(): UseLinkWooCommerceIdsResult {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<LinkWooCommerceIdsSummary | null>(null)

  const execute = useCallback(async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const data = await linkWooCommerceIds()
      setResult(data)
      return data
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error vinculando productos con WooCommerce"
      setError(message)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setError(null)
    setResult(null)
  }, [])

  return { execute, loading, error, result, reset }
}
