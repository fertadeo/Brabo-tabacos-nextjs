const BLOCKED_HOSTS = new Set(["localhost", "0.0.0.0", "::1", "metadata.google.internal"])

export function isBlockedIp(address: string): boolean {
  const host = address.toLowerCase().replace(/^\[|\]$/g, "")
  if (host.includes(":")) {
    if (host === "::1" || host.startsWith("fe80:") || host.startsWith("fc") || host.startsWith("fd")) return true
    const mapped = host.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
    if (!mapped) return false
    return isBlockedIp(mapped[1])
  }
  if (host === "0.0.0.0") return true

  const parts = host.split(".").map((part) => Number(part))
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false
  }
  const [a, b] = parts
  if (a === 10 || a === 127 || a === 0) return true
  if (a === 169 && b === 254) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  return false
}

export function isPublicHttpImageUrl(raw: string): URL | null {
  let target: URL
  try {
    target = new URL(raw)
  } catch {
    return null
  }
  if (target.protocol !== "http:" && target.protocol !== "https:") return null
  if (target.username || target.password) return null
  const hostname = target.hostname.toLowerCase().replace(/\.$/, "")
  if (!hostname || BLOCKED_HOSTS.has(hostname) || hostname.endsWith(".localhost") || hostname.endsWith(".local")) {
    return null
  }
  if (isBlockedIp(hostname)) return null
  return target
}
