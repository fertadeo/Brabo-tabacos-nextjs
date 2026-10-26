"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { LayoutGrid, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { MENU_GROUPS, type MenuItem, type Role } from "@/app/config/menu"
import { filterMenuGroupsByRole } from "@/app/lib/menuAuth"
import { useRole } from "@/app/hooks/useRole"
import {
  ATAJO_ACCENT_CLASS,
  ATAJOS_DEFAULT_ORDER,
  bumpAtajoUsage,
  getAtajoMeta,
  readAtajosUsage,
} from "@/lib/atajos-meta"
import { cn } from "@/lib/utils"

function pathMatches(href: string, path: string): boolean {
  const base = href.split("?")[0]
  if (path === base) return true
  if (base !== "/" && path.startsWith(`${base}/`)) return true
  return false
}

function flattenMenuItems(role: Role | undefined): MenuItem[] {
  const groups = filterMenuGroupsByRole(MENU_GROUPS, role)
  const seen = new Set<string>()
  const items: MenuItem[] = []
  for (const g of groups) {
    for (const item of g.items) {
      if (seen.has(item.id)) continue
      seen.add(item.id)
      items.push(item)
    }
  }
  return items
}

export function ErpAtajosButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [usage, setUsage] = useState<Record<string, number>>({})
  const { getCurrentRole } = useRole()
  const role = getCurrentRole()
  const router = useRouter()
  const pathname = usePathname()
  const [modKey, setModKey] = useState("Ctrl")

  useEffect(() => {
    setUsage(readAtajosUsage())
  }, [open])

  useEffect(() => {
    setModKey(navigator.platform.toLowerCase().includes("mac") ? "⌘" : "Ctrl")
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const items = useMemo(() => flattenMenuItems(role), [role])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((it) => {
      const meta = getAtajoMeta(it.id)
      return (
        it.label.toLowerCase().includes(q) ||
        meta.description.toLowerCase().includes(q) ||
        it.href.toLowerCase().includes(q)
      )
    })
  }, [items, query])

  const sorted = useMemo(() => {
    const defaultRank = new Map(ATAJOS_DEFAULT_ORDER.map((id, i) => [id, i]))
    return [...filtered].sort((a, b) => {
      const ua = usage[a.id] || 0
      const ub = usage[b.id] || 0
      if (ua !== ub) return ub - ua
      const da = defaultRank.has(a.id) ? defaultRank.get(a.id)! : 999
      const db = defaultRank.has(b.id) ? defaultRank.get(b.id)! : 999
      if (da !== db) return da - db
      return a.label.localeCompare(b.label, "es")
    })
  }, [filtered, usage])

  const mostUsed = useMemo(() => sorted.slice(0, 12), [sorted])
  const rest = useMemo(() => sorted.slice(12), [sorted])

  const go = useCallback(
    (item: MenuItem) => {
      bumpAtajoUsage(item.id)
      setUsage(readAtajosUsage())
      setOpen(false)
      setQuery("")
      router.push(item.href)
    },
    [router]
  )

  function renderCard(item: MenuItem) {
    const meta = getAtajoMeta(item.id)
    const accent = ATAJO_ACCENT_CLASS[meta.accent]
    const Icon = item.icon
    const isCurrent = pathMatches(item.href, pathname)

    return (
      <button
        key={item.id}
        type="button"
        onClick={() => go(item)}
        className={cn(
          "group flex items-start gap-3 rounded-xl border bg-card/60 p-3 text-left transition-colors",
          "hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
          isCurrent && "border-primary/60 bg-primary/5 ring-1 ring-primary/30"
        )}
      >
        <span
          className={cn(
            "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            accent.wrap
          )}
        >
          <Icon className={cn("h-5 w-5", accent.icon)} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="font-semibold text-sm truncate">{item.label}</span>
            {isCurrent ? (
              <Badge className="h-5 px-1.5 text-[10px] bg-primary text-primary-foreground border-0">
                Actual
              </Badge>
            ) : null}
          </span>
          <span className="block text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {meta.description}
          </span>
        </span>
      </button>
    )
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className={cn(
          "rounded-full h-9 gap-2 px-3.5 border-border/80 bg-background/80 backdrop-blur-sm shadow-sm",
          "hover:bg-accent",
          className
        )}
        aria-label="Abrir atajos de módulos"
      >
        <LayoutGrid className="h-4 w-4" />
        <span className="font-medium">Atajos</span>
        <kbd className="hidden sm:inline-flex pointer-events-none h-5 select-none items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          {modKey}+K
        </kbd>
      </Button>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v)
          if (!v) setQuery("")
        }}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col gap-0 p-0 sm:rounded-2xl">
          <DialogHeader className="px-5 pt-5 pb-3 shrink-0 text-left space-y-1">
            <DialogTitle className="text-xl">Atajos</DialogTitle>
            <DialogDescription>
              Entrá directo a los módulos que usás. Solo aparecen los que tu rol puede ver.
            </DialogDescription>
          </DialogHeader>

          <div className="px-5 pb-3 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar módulo…"
                className="pl-9 h-10"
                autoFocus
              />
              {query ? (
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground"
                  onClick={() => setQuery("")}
                  aria-label="Limpiar búsqueda"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-5">
            {sorted.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">
                No hay módulos que coincidan.
              </p>
            ) : (
              <>
                <section className="space-y-2">
                  {!query ? (
                    <h3 className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                      Más usados
                    </h3>
                  ) : null}
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(query ? sorted : mostUsed).map(renderCard)}
                  </div>
                </section>
                {!query && rest.length > 0 ? (
                  <section className="space-y-2">
                    <h3 className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                      Todos los módulos
                    </h3>
                    <div className="grid gap-2 sm:grid-cols-2">{rest.map(renderCard)}</div>
                  </section>
                ) : null}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

/** Chips rápidos en la barra (top N más usados visibles). */
export function ErpAtajosQuickStrip({ limit = 5 }: { limit?: number }) {
  const { getCurrentRole } = useRole()
  const role = getCurrentRole()
  const router = useRouter()
  const pathname = usePathname()
  const [usage, setUsage] = useState<Record<string, number>>({})

  useEffect(() => {
    setUsage(readAtajosUsage())
  }, [pathname])

  const chips = useMemo(() => {
    const items = flattenMenuItems(role)
    const defaultRank = new Map(ATAJOS_DEFAULT_ORDER.map((id, i) => [id, i]))
    return [...items]
      .sort((a, b) => {
        const ua = usage[a.id] || 0
        const ub = usage[b.id] || 0
        if (ua !== ub) return ub - ua
        const da = defaultRank.has(a.id) ? defaultRank.get(a.id)! : 999
        const db = defaultRank.has(b.id) ? defaultRank.get(b.id)! : 999
        return da - db
      })
      .filter((it) => !pathMatches(it.href, pathname))
      .slice(0, limit)
  }, [role, usage, pathname, limit])

  if (chips.length === 0) return null

  return (
    <div className="hidden lg:flex items-center gap-1.5 min-w-0 overflow-x-auto">
      {chips.map((item) => {
        const meta = getAtajoMeta(item.id)
        const accent = ATAJO_ACCENT_CLASS[meta.accent]
        const Icon = item.icon
        return (
          <button
            key={item.id}
            type="button"
            title={item.label}
            onClick={() => {
              bumpAtajoUsage(item.id)
              setUsage(readAtajosUsage())
              router.push(item.href)
            }}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 h-8 text-xs font-medium",
              "bg-background/70 hover:bg-accent transition-colors shrink-0"
            )}
          >
            <span className={cn("flex h-5 w-5 items-center justify-center rounded-full", accent.wrap)}>
              <Icon className="h-3 w-3" />
            </span>
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
