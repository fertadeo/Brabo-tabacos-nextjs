"use client"

import React, { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Category, createCategory, updateCategory, CreateCategoryData, UpdateCategoryData } from "@/lib/api"
import { useConfirmBeforeClose } from "@/lib/use-confirm-before-close"

export interface CategoryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
  category?: Category | null
  categories: Category[]
  onSuccess: () => void
}

const emptyForm = {
  name: "",
  description: "",
  parent_id: "",
  woocommerce_id: "",
  woocommerce_slug: "",
  is_active: true,
}

export function CategoryModal({
  open,
  onOpenChange,
  mode,
  category,
  categories,
  onSuccess,
}: CategoryModalProps) {
  const [formData, setFormData] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setError(null)
      if (mode === "edit" && category) {
        setFormData({
          name: category.name,
          description: category.description ?? "",
          parent_id: category.parent_id?.toString() ?? "",
          woocommerce_id: category.woocommerce_id?.toString() ?? "",
          woocommerce_slug: category.woocommerce_slug ?? "",
          is_active: category.is_active !== false,
        })
      } else {
        setFormData(emptyForm)
      }
    }
  }, [open, mode, category])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      setError("El nombre de la categoría es obligatorio")
      return
    }
    setLoading(true)
    setError(null)
    try {
      if (mode === "create") {
        const data: CreateCategoryData = {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          ...(formData.parent_id ? { parent_id: parseInt(formData.parent_id) } : {}),
        }
        if (formData.woocommerce_id.trim())
          data.woocommerce_id = parseInt(formData.woocommerce_id, 10) || undefined
        if (formData.woocommerce_slug.trim()) data.woocommerce_slug = formData.woocommerce_slug.trim()
        await createCategory(data)
      } else if (category) {
        const data: UpdateCategoryData = {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          ...(formData.parent_id ? { parent_id: parseInt(formData.parent_id) } : { parent_id: null }),
          is_active: formData.is_active,
          woocommerce_id: formData.woocommerce_id.trim()
            ? parseInt(formData.woocommerce_id, 10) || null
            : null,
          woocommerce_slug: formData.woocommerce_slug.trim() || null,
        }
        await updateCategory(category.id, data)
      }
      onSuccess()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar la categoría")
    } finally {
      setLoading(false)
    }
  }

  const activeCategories = categories.filter((c) => c.is_active !== false && c.id !== category?.id)

  const [handleOpenChange, confirmDialog] = useConfirmBeforeClose(onOpenChange)

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Nueva categoría" : "Editar categoría"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-2 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="cat-modal-name">Nombre *</Label>
            <Input
              id="cat-modal-name"
              value={formData.name}
              onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              placeholder="Nombre de la categoría"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cat-modal-desc">Descripción</Label>
            <Textarea
              id="cat-modal-desc"
              value={formData.description}
              onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
              placeholder="Descripción opcional"
              rows={2}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label>Categoría padre</Label>
            <Select
              value={formData.parent_id || "__none__"}
              onValueChange={(v) => setFormData((p) => ({ ...p, parent_id: v === "__none__" ? "" : v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sin categoría padre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sin categoría padre</SelectItem>
                {activeCategories.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cat-modal-wc-id">ID WooCommerce</Label>
              <Input
                id="cat-modal-wc-id"
                type="text"
                inputMode="numeric"
                value={formData.woocommerce_id}
                onChange={(e) => setFormData((p) => ({ ...p, woocommerce_id: e.target.value }))}
                placeholder="Ej: 15"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-modal-wc-slug">Slug WooCommerce</Label>
              <Input
                id="cat-modal-wc-slug"
                value={formData.woocommerce_slug}
                onChange={(e) => setFormData((p) => ({ ...p, woocommerce_slug: e.target.value }))}
                placeholder="Ej: celulares"
              />
            </div>
          </div>

          {mode === "edit" && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="cat-modal-active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData((p) => ({ ...p, is_active: !!checked }))}
              />
              <Label htmlFor="cat-modal-active" className="font-normal cursor-pointer">
                Categoría activa
              </Label>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !formData.name.trim()}>
              {loading ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2 inline-block" />
                  Guardando...
                </>
              ) : mode === "create" ? (
                "Crear categoría"
              ) : (
                "Guardar cambios"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    {confirmDialog}
    </>
  )
}
