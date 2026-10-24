"use client"

import { useState, useRef, useLayoutEffect, useEffect, useCallback } from "react"
import Image from "next/image"
import { useRouter, usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { useAuth } from "@/contexts/AuthContext"
import { useRole } from "@/app/hooks/useRole"
import { MENU_GROUPS, MENU_GROUP_IDS_COLLAPSED_BY_DEFAULT } from "@/app/config/menu"
import { filterMenuGroupsByRole } from "@/app/lib/menuAuth"
import {
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  LogOut,
} from "lucide-react"

const SIDEBAR_NAV_SCROLL_KEY = "erp-sidebar-nav-scroll"

function itemMatchesPath(href: string, path: string): boolean {
  if (path === href) return true
  if (href !== "/" && path.startsWith(`${href}/`)) return true
  return false
}

interface ERPSidebarProps {
  activeItem?: string
  onItemClick?: (itemId: string) => void
}

export function ERPSidebar({ activeItem, onItemClick }: ERPSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    () => new Set(MENU_GROUP_IDS_COLLAPSED_BY_DEFAULT)
  )
  const { logout, user } = useAuth()
  const { getCurrentRole, getCurrentRoleLabel } = useRole()
  const router = useRouter()
  const pathname = usePathname()
  const navRef = useRef<HTMLElement>(null)
  const scrollSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Filtrar grupos del menú según el rol del usuario
  const filteredGroups = filterMenuGroupsByRole(MENU_GROUPS, getCurrentRole())

  /** Al cambiar de ruta, abrir el grupo que contiene la página actual (evita ítem activo colapsado). */
  useLayoutEffect(() => {
    setCollapsedGroups((prev) => {
      let next: Set<string> | null = null
      for (const g of filteredGroups) {
        const hasActive = g.items.some((it) => itemMatchesPath(it.href, pathname))
        if (hasActive && prev.has(g.id)) {
          if (!next) next = new Set(prev)
          next.delete(g.id)
        }
      }
      return next ?? prev
    })
  }, [pathname, filteredGroups])

  /** Tras pintar (y tras expandir grupos), llevar el ítem activo al área visible del scroll del nav. */
  useEffect(() => {
    if (isCollapsed) return
    let cancelled = false
    const run = () => {
      if (cancelled) return
      const nav = navRef.current
      if (!nav) return
      const active = nav.querySelector<HTMLElement>("[data-sidebar-active=\"true\"]")
      active?.scrollIntoView({ block: "nearest", inline: "nearest" })
      sessionStorage.setItem(SIDEBAR_NAV_SCROLL_KEY, String(nav.scrollTop))
    }
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(run)
    })
    return () => {
      cancelled = true
      cancelAnimationFrame(id)
    }
  }, [pathname, filteredGroups, isCollapsed, collapsedGroups])

  /** Restaurar scroll del nav tras recarga completa (mismo valor que guardamos al navegar / hacer scroll). */
  useLayoutEffect(() => {
    if (isCollapsed) return
    const nav = navRef.current
    if (!nav) return
    const raw = sessionStorage.getItem(SIDEBAR_NAV_SCROLL_KEY)
    if (raw == null) return
    const y = parseInt(raw, 10)
    if (!Number.isNaN(y) && y > 0) nav.scrollTop = y
  }, [isCollapsed])

  const persistNavScroll = useCallback(() => {
    const nav = navRef.current
    if (!nav || isCollapsed) return
    if (scrollSaveTimer.current) clearTimeout(scrollSaveTimer.current)
    scrollSaveTimer.current = setTimeout(() => {
      sessionStorage.setItem(SIDEBAR_NAV_SCROLL_KEY, String(nav.scrollTop))
    }, 120)
  }, [isCollapsed])

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups(prev => {
      const newSet = new Set(prev)
      if (newSet.has(groupId)) {
        newSet.delete(groupId)
      } else {
        newSet.add(groupId)
      }
      return newSet
    })
  }

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden bg-background/80 backdrop-blur-sm border hover:bg-background/90 hover:scale-110 transition-all duration-300 focus:ring-2 focus:ring-primary/50 focus:ring-offset-2"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 shadow-lg",
          isCollapsed ? "w-16" : "w-64",
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header con logo de marca */}
          <div
            className={cn(
              "flex border-b border-sidebar-border bg-sidebar/80 backdrop-blur-sm transition-all duration-300",
              isCollapsed ? "h-16 flex-col justify-center gap-2 py-3 px-2" : "h-28 min-h-[7rem] items-center justify-between gap-3 px-4 py-4"
            )}
          >
            <div
              className={cn(
                "flex flex-shrink-0 items-center overflow-hidden",
                isCollapsed ? "justify-center" : "min-w-0 flex-1 justify-center"
              )}
            >
              <a
                href="/dashboard"
                className={cn(
                  "flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar rounded-md",
                  isCollapsed && "w-full"
                )}
                aria-label={`${process.env.NEXT_PUBLIC_APP_NAME?.trim() || "Aurix Retail"} - Ir al inicio`}
              >
                <span
                  className={cn(
                    "relative flex-shrink-0 transition-all duration-300",
                    isCollapsed ? "h-12 w-12" : "h-[72px] w-[220px]"
                  )}
                >
                  <Image
                    src={process.env.NEXT_PUBLIC_LOGO_FULL_PATH?.trim() || "/images/placeholder-logo.png"}
                    alt={`${process.env.NEXT_PUBLIC_APP_NAME?.trim() || "Aurix Retail"}`}
                    fill
                    sizes="(max-width: 256px) 48px, 220px"
                    className={cn(
                      "object-contain object-center select-none",
                      "invert dark:invert-0"
                    )}
                    priority
                  />
                </span>
              </a>
            </div>
            <div className={cn("flex items-center gap-1", isCollapsed && "flex-col")}>
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                className="hidden md:flex hover:bg-sidebar-accent hover:scale-105 transition-all duration-300 focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
                onClick={() => setIsCollapsed(!isCollapsed)}
                aria-label={isCollapsed ? "Expandir menú" : "Colapsar menú"}
              >
                <Menu className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Navigation */}
          <nav
            ref={navRef}
            onScroll={persistNavScroll}
            className={cn(
              "flex-1 space-y-2 overflow-y-auto transition-all duration-300",
              isCollapsed
                ? "px-2 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:[display:none]"
                : "p-4 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent"
            )}
          >
            {filteredGroups.map((group) => {
              const GroupIcon = group.icon
              const isGroupCollapsed = collapsedGroups.has(group.id)
              
              return (
                <div key={group.id} className="space-y-1">
                  {/* Group Header */}
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-between gap-2 h-10 px-3 transition-all duration-300 ease-in-out group",
                      "text-muted-foreground hover:text-foreground",
                      "hover:bg-slate-100 dark:hover:bg-slate-700",
                      "focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
                    )}
                    onClick={() => toggleGroup(group.id)}
                  >
                    <div className="flex items-center gap-2">
                      <GroupIcon className="h-4 w-4 flex-shrink-0" />
                      {!isCollapsed && (
                        <span className="text-xs font-semibold uppercase tracking-wider truncate">
                          {group.title}
                        </span>
                      )}
                    </div>
                    {!isCollapsed && (
                      <div className="transition-transform duration-300">
                        {isGroupCollapsed ? (
                          <ChevronRight className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    )}
                  </Button>

                  {/* Group Items */}
                  {!isGroupCollapsed && (
                    <div className="space-y-1 ml-2">
                      {group.items.map((item) => {
                        const Icon = item.icon
                        const isActive = itemMatchesPath(item.href, pathname)

                        return (
                          <Button
                            key={item.id}
                            data-sidebar-active={isActive ? "true" : undefined}
                            variant={isActive ? "default" : "ghost"}
                            className={cn(
                              "w-full justify-start gap-3 h-9 transition-all duration-300 ease-in-out group relative overflow-hidden",
                              isActive && "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]",
                              !isActive && [
                                "text-sidebar-foreground",
                                "hover:bg-gradient-to-r hover:from-slate-100 hover:to-slate-50",
                                "dark:hover:bg-gradient-to-r dark:hover:from-slate-700 dark:hover:to-slate-600",
                                "hover:text-slate-900 dark:hover:text-slate-100",
                                "hover:shadow-md hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50",
                                "hover:scale-[1.02] hover:translate-x-1",
                                "focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 dark:focus:ring-offset-slate-800",
                                "active:scale-[0.98] active:translate-x-0"
                              ],
                              isCollapsed && "px-2"
                            )}
                            onClick={() => {
                              router.push(item.href)
                              onItemClick?.(item.id)
                              setIsMobileOpen(false)
                            }}
                          >
                            <Icon className={cn(
                              "h-4 w-4 flex-shrink-0 transition-all duration-300",
                              isActive && "scale-110",
                              !isActive && "group-hover:scale-110 group-hover:text-primary dark:group-hover:text-primary"
                            )} />
                            {!isCollapsed && (
                              <span className={cn(
                                "truncate font-medium transition-all duration-300",
                                isActive && "font-semibold",
                                !isActive && "group-hover:font-semibold"
                              )}>
                                {item.label}
                              </span>
                            )}
                          </Button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-sidebar-border bg-sidebar/30 space-y-3">
            {/* Información del usuario */}
            {!isCollapsed && user && (
              <div className="text-xs text-muted-foreground text-center pb-2 border-b border-sidebar-border">
                <div className="font-medium text-foreground">{user.firstName} {user.lastName}</div>
                <div className="text-xs opacity-70">{getCurrentRoleLabel()}</div>
              </div>
            )}

            {/* Botón de Logout */}
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-3 h-10 transition-all duration-300 ease-in-out group",
                "text-red-600 hover:text-red-700 hover:bg-red-50",
                "dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/20",
                "hover:scale-[1.02] hover:translate-x-1",
                "focus:ring-2 focus:ring-red-500/50 focus:ring-offset-2 dark:focus:ring-offset-slate-800",
                isCollapsed && "px-2 justify-center"
              )}
              onClick={logout}
            >
              <LogOut className={cn(
                "h-4 w-4 flex-shrink-0 transition-all duration-300",
                "group-hover:scale-110"
              )} />
              {!isCollapsed && (
                <span className="truncate font-medium transition-all duration-300 group-hover:font-semibold">
                  Cerrar Sesión
                </span>
              )}
            </Button>

            {/* Marca Aurix */}
            <div className="flex flex-col items-center gap-1.5 pt-1">
              <Image
                src="/images/aurix-logo.png"
                alt="Aurix ERP by FENEC"
                width={200}
                height={50}
                className={cn(
                  "h-auto w-auto object-contain object-center select-none opacity-90",
                  isCollapsed ? "max-h-9 max-w-[2.25rem]" : "max-h-10 max-w-[12.5rem]"
                )}
              />
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
