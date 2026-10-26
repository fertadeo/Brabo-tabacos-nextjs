"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DollarSign, ArrowLeftRight, RotateCcw, RotateCw } from "lucide-react"
import { PRICE_LIST_SHORT_LABELS, type PriceListSlug } from "@/lib/price-lists"

export type PriceListsFormValues = {
  price: string
  price_mayorista: string
  price_revendedor: string
}

type FieldKey = keyof PriceListsFormValues

const FIELD_BY_SLUG: Record<PriceListSlug, FieldKey> = {
  venta_local: "price",
  mayorista: "price_mayorista",
  revendedor: "price_revendedor",
}

const SLUG_ORDER: PriceListSlug[] = ["venta_local", "mayorista", "revendedor"]

interface PriceListsFieldsProps {
  values: PriceListsFormValues
  onChange: (field: FieldKey, value: string) => void
  onFocusNumeric?: (e: React.FocusEvent<HTMLInputElement>) => void
  /** type="text" para formato AR (edit) o number (new) */
  inputMode?: "text" | "number"
  disabled?: boolean
  idPrefix?: string
  className?: string
}

function rotateValues(values: PriceListsFormValues, direction: 1 | -1): PriceListsFormValues {
  const ordered = SLUG_ORDER.map((s) => values[FIELD_BY_SLUG[s]])
  const next =
    direction === 1
      ? [ordered[2], ordered[0], ordered[1]]
      : [ordered[1], ordered[2], ordered[0]]
  return {
    price: next[0],
    price_mayorista: next[1],
    price_revendedor: next[2],
  }
}

function swapFields(
  values: PriceListsFormValues,
  a: FieldKey,
  b: FieldKey
): PriceListsFormValues {
  return { ...values, [a]: values[b], [b]: values[a] }
}

/**
 * Tres campos de lista + acciones para rotar / intercambiar valores
 * (útil cuando el precio llegó en la columna equivocada).
 */
export function PriceListsFields({
  values,
  onChange,
  onFocusNumeric,
  inputMode = "text",
  disabled,
  idPrefix = "price",
  className,
}: PriceListsFieldsProps) {
  const apply = (next: PriceListsFormValues) => {
    onChange("price", next.price)
    onChange("price_mayorista", next.price_mayorista)
    onChange("price_revendedor", next.price_revendedor)
  }

  const copyFrom = (source: PriceListSlug, target: PriceListSlug) => {
    if (source === target) return
    const srcKey = FIELD_BY_SLUG[source]
    const tgtKey = FIELD_BY_SLUG[target]
    onChange(tgtKey, values[srcKey])
  }

  const fields: { slug: PriceListSlug; key: FieldKey; label: string }[] = [
    { slug: "venta_local", key: "price", label: "Venta en local" },
    { slug: "mayorista", key: "price_mayorista", label: "Mayorista" },
    { slug: "revendedor", key: "price_revendedor", label: "Revendedor" },
  ]

  return (
    <div className={className ?? "space-y-3"}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Label>Listas de precio *</Label>
          <p className="text-xs text-muted-foreground">
            Precios finales con IVA incluido. Si un valor está en la lista equivocada, rotá o
            intercambiá.
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            title="Rotar: Local ← Mayorista ← Revendedor"
            onClick={() => apply(rotateValues(values, -1))}
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Rotar
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            title="Rotar: Local → Mayorista → Revendedor"
            onClick={() => apply(rotateValues(values, 1))}
          >
            <RotateCw className="h-3.5 w-3.5 mr-1" />
            Rotar
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            title="Intercambiar Local ↔ Mayorista"
            onClick={() => apply(swapFields(values, "price", "price_mayorista"))}
          >
            <ArrowLeftRight className="h-3.5 w-3.5 mr-1" />
            Loc↔May
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            title="Intercambiar Mayorista ↔ Revendedor"
            onClick={() => apply(swapFields(values, "price_mayorista", "price_revendedor"))}
          >
            <ArrowLeftRight className="h-3.5 w-3.5 mr-1" />
            May↔Rev
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            title="Intercambiar Local ↔ Revendedor"
            onClick={() => apply(swapFields(values, "price", "price_revendedor"))}
          >
            <ArrowLeftRight className="h-3.5 w-3.5 mr-1" />
            Loc↔Rev
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {fields.map(({ slug, key, label }) => (
          <div key={slug} className="space-y-1">
            <Label htmlFor={`${idPrefix}-${slug}`} className="text-xs text-muted-foreground">
              {label}
            </Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id={`${idPrefix}-${slug}`}
                type={inputMode === "number" ? "number" : "text"}
                inputMode="numeric"
                step={inputMode === "number" ? "0.01" : undefined}
                min={inputMode === "number" ? "0" : undefined}
                placeholder={inputMode === "number" ? "0.00" : "Ej: 1.250.000"}
                value={values[key]}
                onChange={(e) => onChange(key, e.target.value)}
                onFocus={onFocusNumeric}
                disabled={disabled}
                className="h-10 pl-9"
              />
            </div>
            <div className="flex items-center gap-1 pt-0.5">
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">Copiar a</span>
              <Select
                disabled={disabled}
                onValueChange={(target) => copyFrom(slug, target as PriceListSlug)}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue placeholder="lista…" />
                </SelectTrigger>
                <SelectContent>
                  {SLUG_ORDER.filter((s) => s !== slug).map((s) => (
                    <SelectItem key={s} value={s}>
                      {PRICE_LIST_SHORT_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
