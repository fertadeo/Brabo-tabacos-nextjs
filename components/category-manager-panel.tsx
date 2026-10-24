"use client"

import React, { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useConfirmBeforeClose } from "@/lib/use-confirm-before-close"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Tag, Edit, Trash2, Save, X, AlertTriangle } from "lucide-react"
import {
  Category,
  createCategory,
  updateCategory,
  deleteCategory,
  CreateCategoryData,
  UpdateCategoryData,
} from "@/lib/api"

export interface CategoryManagerPanelFormData {
  name: string
  description: string
  parent_id: string
  woocommerce_id?: string
  woocommerce_slug?: string
}

const initialFormData: CategoryManagerPanelFormData = {
  name: "",
  description: "",
  parent_id: "",
  woocommerce_id: "",
  woocommerce_slug: "",
}

export interface CategoryManagerPanelProps {
  categories: Category[]
  loadingCategories: boolean
  loadCategories: () => Promise<void>
  selectedCategoryId?: string
  onSelectCategory?: (id: string) => void
  onCategoryCreated?: (category: Category) => void
  showWoocommerceFields?: boolean
}

export function CategoryManagerPanel({
  categories,
  loadingCategories,
  loadCategories,
  selectedCategoryId,
  onSelectCategory,
  onCategoryCreated,
  showWoocommerceFields = false,
}: CategoryManagerPanelProps) {
  const [categoryFormData, setCategoryFormData] = useState<CategoryManagerPanelFormData>(initialFormData)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null)
  const [categoryError, setCategoryError] = useState<string | null>(null)
  const [categoryLoading, setCategoryLoading] = useState(false)

  const [handleDeleteModalOpenChange, confirmDeleteDialog] = useConfirmBeforeClose((open) => {
    if (!open) setDeletingCategory(null)
  })

  const handleCreateCategory = async () => {
    if (!categoryFormData.name.trim()) {
      setCategoryError("El nombre de la categoría es obligatorio")
      return
    }
    setCategoryLoading(true)
    setCategoryError(null)
    try {
      const categoryData: CreateCategoryData = {
        name: categoryFormData.name.trim(),
        description: categoryFormData.description.trim() || undefined,
        ...(categoryFormData.parent_id ? { parent_id: parseInt(categoryFormData.parent_id) } : {}),
      }
      if (showWoocommerceFields) {
        const wcId = categoryFormData.woocommerce_id?.trim()
        if (wcId) categoryData.woocommerce_id = parseInt(wcId, 10) || undefined
        if (categoryFormData.woocommerce_slug?.trim())
          categoryData.woocommerce_slug = categoryFormData.woocommerce_slug.trim()
      }
      const newCategory = await createCategory(categoryData)
      await loadCategories()
      onCategoryCreated?.(newCategory)
      setCategoryFormData(initialFormData)
    } catch (err) {
      setCategoryError(err instanceof Error ? err.message : "Error al crear la categoría")
    } finally {
      setCategoryLoading(false)
    }
  }

  const handleUpdateCategory = async () => {
    if (!editingCategory) return
    if (!categoryFormData.name.trim()) {
      setCategoryError("El nombre de la categoría es obligatorio")
      return
    }
    setCategoryLoading(true)
    setCategoryError(null)
    try {
      const updateData: UpdateCategoryData = {
        name: categoryFormData.name.trim(),
        description: categoryFormData.description.trim() || undefined,
        ...(categoryFormData.parent_id ? { parent_id: parseInt(categoryFormData.parent_id) } : {}),
      }
      if (showWoocommerceFields) {
        const wcId = categoryFormData.woocommerce_id?.trim()
        updateData.woocommerce_id = wcId ? parseInt(wcId, 10) || null : null
        updateData.woocommerce_slug = categoryFormData.woocommerce_slug?.trim() || null
      }
      await updateCategory(editingCategory.id, updateData)
      await loadCategories()
      setCategoryFormData(initialFormData)
      setEditingCategory(null)
    } catch (err) {
      setCategoryError(err instanceof Error ? err.message : "Error al actualizar la categoría")
    } finally {
      setCategoryLoading(false)
    }
  }

  const handleDeleteCategory = async () => {
    if (!deletingCategory) return
    setCategoryLoading(true)
    setCategoryError(null)
    try {
      await deleteCategory(deletingCategory.id)
      await loadCategories()
      if (selectedCategoryId === deletingCategory.id.toString()) {
        onSelectCategory?.("")
      }
      setDeletingCategory(null)
    } catch (err) {
      setCategoryError(err instanceof Error ? err.message : "Error al eliminar la categoría")
    } finally {
      setCategoryLoading(false)
    }
  }

  const startEditCategory = (category: Category) => {
    setEditingCategory(category)
    setCategoryFormData({
      name: category.name,
      description: category.description || "",
      parent_id: category.parent_id?.toString() || "",
      woocommerce_id: category.woocommerce_id?.toString() ?? "",
      woocommerce_slug: category.woocommerce_slug ?? "",
    })
    setCategoryError(null)
  }

  const startDeleteCategory = (category: Category) => {
    setDeletingCategory(category)
    setCategoryError(null)
  }

  const cancelCategoryForm = () => {
    setCategoryFormData(initialFormData)
    setEditingCategory(null)
    setCategoryError(null)
  }

  const activeCategories = categories.filter((c) => c.is_active !== false)

  return (
    <>
      <Card className="mt-4 border-2 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-blue-200 dark:border-blue-800">
            <h4 className="font-semibold text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Tag className="h-4 w-4" />
              {editingCategory ? "Editar Categoría" : "Nueva Categoría"}
            </h4>
            {editingCategory && (
              <Button type="button" variant="ghost" size="sm" onClick={cancelCategoryForm} className="h-6 px-2 text-xs">
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          {categoryError && (
            <div className="p-2 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded text-xs text-red-700 dark:text-red-300">
              {categoryError}
            </div>
          )}

          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="category-name" className="text-xs font-medium">
                Nombre *
              </Label>
              <Input
                id="category-name"
                value={categoryFormData.name}
                onChange={(e) => setCategoryFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Nombre de la categoría"
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="category-description" className="text-xs font-medium">
                Descripción
              </Label>
              <Textarea
                id="category-description"
                value={categoryFormData.description}
                onChange={(e) => setCategoryFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Descripción de la categoría"
                rows={2}
                className="text-sm resize-none"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="category-parent" className="text-xs font-medium">
                Categoría Padre (opcional)
              </Label>
              <Select
                value={categoryFormData.parent_id || "__none__"}
                onValueChange={(value) =>
                  setCategoryFormData((prev) => ({ ...prev, parent_id: value === "__none__" ? "" : value }))
                }
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Sin categoría padre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin categoría padre</SelectItem>
                  {activeCategories
                    .filter((cat) => cat.id !== editingCategory?.id)
                    .map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {showWoocommerceFields && (
              <>
                <div className="space-y-1">
                  <Label htmlFor="category-wc-id" className="text-xs font-medium">
                    ID WooCommerce (opcional)
                  </Label>
                  <Input
                    id="category-wc-id"
                    type="text"
                    inputMode="numeric"
                    value={categoryFormData.woocommerce_id ?? ""}
                    onChange={(e) =>
                      setCategoryFormData((prev) => ({ ...prev, woocommerce_id: e.target.value }))
                    }
                    placeholder="Ej: 15"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="category-wc-slug" className="text-xs font-medium">
                    Slug WooCommerce (opcional)
                  </Label>
                  <Input
                    id="category-wc-slug"
                    value={categoryFormData.woocommerce_slug ?? ""}
                    onChange={(e) =>
                      setCategoryFormData((prev) => ({ ...prev, woocommerce_slug: e.target.value }))
                    }
                    placeholder="Ej: celulares"
                    className="h-9 text-sm"
                  />
                </div>
              </>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                onClick={editingCategory ? handleUpdateCategory : handleCreateCategory}
                disabled={categoryLoading || !categoryFormData.name.trim()}
                className="flex-1 h-9 text-xs"
                size="sm"
              >
                {categoryLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent mr-2" />
                    {editingCategory ? "Guardando..." : "Creando..."}
                  </>
                ) : (
                  <>
                    <Save className="h-3 w-3 mr-1" />
                    {editingCategory ? "Guardar Cambios" : "Crear Categoría"}
                  </>
                )}
              </Button>
              {editingCategory && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={cancelCategoryForm}
                  disabled={categoryLoading}
                  className="h-9 px-3 text-xs"
                  size="sm"
                >
                  Cancelar
                </Button>
              )}
            </div>
          </div>

          {activeCategories.length > 0 && (
            <div className="pt-4 border-t border-blue-200 dark:border-blue-800">
              <Label className="text-xs font-medium mb-2 block">Categorías Existentes</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {activeCategories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Tag className="h-3 w-3 text-slate-400 flex-shrink-0" />
                      <span className="text-xs text-slate-700 dark:text-slate-300 truncate">{category.name}</span>
                      {category.description && (
                        <span className="text-xs text-slate-500 dark:text-slate-400 truncate hidden sm:inline">
                          - {category.description}
                        </span>
                      )}
                      {showWoocommerceFields && (category.woocommerce_id != null || category.woocommerce_slug) && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 shrink-0">WC</span>
                      )}
                    </div>
                    <div className="flex gap-1 ml-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => startEditCategory(category)}
                        disabled={categoryLoading}
                        className="h-6 w-6 p-0"
                      >
                        <Edit className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => startDeleteCategory(category)}
                        disabled={categoryLoading}
                        className="h-6 w-6 p-0"
                      >
                        <Trash2 className="h-3 w-3 text-red-600 dark:text-red-400" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!deletingCategory} onOpenChange={handleDeleteModalOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" />
              Confirmar Eliminación
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              ¿Estás seguro de que deseas eliminar la categoría <strong>"{deletingCategory?.name}"</strong>?
            </p>
            <p className="text-xs text-orange-600 dark:text-orange-400">
              Esta acción eliminará la categoría de WooCommerce (si está sincronizada) y la marcará como inactiva en
              el sistema.
            </p>
            {categoryError && (
              <div className="p-2 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded text-xs text-red-700 dark:text-red-300">
                {categoryError}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeletingCategory(null)}
                disabled={categoryLoading}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDeleteCategory}
                disabled={categoryLoading}
              >
                {categoryLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {confirmDeleteDialog}
    </>
  )
}
