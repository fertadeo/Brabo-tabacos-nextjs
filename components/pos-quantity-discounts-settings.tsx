"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  createPosQuantityDiscount,
  deletePosQuantityDiscount,
  getPosQuantityDiscounts,
  updatePosQuantityDiscount,
  type PosQuantityDiscount,
} from "@/lib/api"
import { PRICE_LIST_OPTIONS } from "@/lib/price-lists"
import { Loader2, Plus, Trash2 } from "lucide-react"

export function PosQuantityDiscountsSettings() {
  const [rows, setRows] = useState<PosQuantityDiscount[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [minQty, setMinQty] = useState("10")
  const [percent, setPercent] = useState("5")
  const [slug, setSlug] = useState<string>("all")

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getPosQuantityDiscounts(false)
      setRows(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar los descuentos")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleCreate() {
    setSaving(true)
    setError(null)
    try {
      await createPosQuantityDiscount({
        name: name.trim() || `${minQty}+ unidades`,
        min_quantity: Math.max(1, parseInt(minQty, 10) || 1),
        discount_percent: Math.min(100, Math.max(0, parseFloat(percent.replace(",", ".")) || 0)),
        price_list_slug: slug === "all" ? null : slug,
        is_active: true,
      })
      setName("")
      setMinQty("10")
      setPercent("5")
      setSlug("all")
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al crear")
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(row: PosQuantityDiscount) {
    try {
      await updatePosQuantityDiscount(row.id, { is_active: !row.is_active })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al actualizar")
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm("¿Eliminar esta regla de descuento?")) return
    try {
      await deletePosQuantityDiscount(id)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al eliminar")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Descuentos escalonados (POS)</CardTitle>
        <CardDescription>
          Si la cantidad de una línea alcanza el mínimo, se aplica el % sobre el precio de la lista
          seleccionada. Gana el tramo con mayor cantidad mínima aplicable. El cajero puede seguir
          editando el precio a mano.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 items-end">
          <div className="space-y-1 lg:col-span-2">
            <Label htmlFor="disc-name">Nombre</Label>
            <Input
              id="disc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: 10+ unidades"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="disc-min">Cant. mínima</Label>
            <Input
              id="disc-min"
              type="number"
              min={1}
              value={minQty}
              onChange={(e) => setMinQty(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="disc-pct">Descuento %</Label>
            <Input
              id="disc-pct"
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={percent}
              onChange={(e) => setPercent(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Lista</Label>
            <Select value={slug} onValueChange={setSlug}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las listas</SelectItem>
                {PRICE_LIST_OPTIONS.map((o) => (
                  <SelectItem key={o.slug} value={o.slug}>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button type="button" onClick={handleCreate} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
          Agregar regla
        </Button>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="text-right">Desde</TableHead>
                  <TableHead className="text-right">%</TableHead>
                  <TableHead>Lista</TableHead>
                  <TableHead>Activo</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground text-sm">
                      No hay reglas. Agregá tramos (ej. 10 → 5%, 25 → 8%).
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.name}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.min_quantity}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.discount_percent}%</TableCell>
                      <TableCell>
                        {row.price_list_slug ? (
                          PRICE_LIST_OPTIONS.find((o) => o.slug === row.price_list_slug)?.name ||
                          row.price_list_slug
                        ) : (
                          <Badge variant="outline">Todas</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Checkbox
                          checked={row.is_active}
                          onCheckedChange={() => toggleActive(row)}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(row.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
