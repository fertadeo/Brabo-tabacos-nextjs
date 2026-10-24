"use client"

import { useState, useEffect } from "react"
import { ERPLayout } from "@/components/erp-layout"
import { Protected } from "@/components/protected"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FolderTree, Search, Plus, RefreshCw, Edit, Trash2 } from "lucide-react"
import { getCategories, deleteCategory, type Category } from "@/lib/api"
import { useToast } from "@/contexts/ToastContext"
import { CategoryModal } from "@/components/category-modal"

export default function CategoriasPage() {
  const { showToast } = useToast()
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<"create" | "edit">("create")
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const loadCategories = async () => {
    setIsLoading(true)
    try {
      const data = await getCategories()
      setCategories(data ?? [])
    } catch (err) {
      console.error("Error al cargar categorías:", err)
      showToast({ message: "Error al cargar las categorías", type: "error" })
      setCategories([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCategories()
  }, [])

  const filteredCategories = categories.filter((cat) => {
    const matchSearch =
      !searchTerm ||
      cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cat.description ?? "").toLowerCase().includes(searchTerm.toLowerCase())
    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && cat.is_active !== false) ||
      (statusFilter === "inactive" && cat.is_active === false)
    return matchSearch && matchStatus
  })

  const handleCreate = () => {
    setModalMode("create")
    setEditingCategory(null)
    setModalOpen(true)
  }

  const handleEdit = (category: Category) => {
    setModalMode("edit")
    setEditingCategory(category)
    setModalOpen(true)
  }

  const handleDelete = async (category: Category) => {
    if (!confirm(`¿Eliminar la categoría "${category.name}"? Se marcará como inactiva.`)) return
    setDeletingId(category.id)
    try {
      await deleteCategory(category.id)
      showToast({ message: "Categoría eliminada", type: "success" })
      await loadCategories()
    } catch (err) {
      showToast({
        message: err instanceof Error ? err.message : "Error al eliminar la categoría",
        type: "error",
      })
    } finally {
      setDeletingId(null)
    }
  }

  const getParentName = (parentId: number | null | undefined) => {
    if (parentId == null) return "—"
    const parent = categories.find((c) => c.id === parentId)
    return parent?.name ?? `ID ${parentId}`
  }

  const activeCount = categories.filter((c) => c.is_active !== false).length
  const inactiveCount = categories.length - activeCount

  return (
    <Protected requiredRoles={["gerencia", "ventas", "logistica", "finanzas"]}>
      <ERPLayout activeItem="categorias">
        <div className="space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Categorías de productos</h1>
              <p className="text-muted-foreground">
                Gestiona categorías vinculadas a WooCommerce
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={loadCategories} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                Actualizar
              </Button>
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Nueva categoría
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total</CardTitle>
                <FolderTree className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{categories.length}</div>
                <p className="text-xs text-muted-foreground">Categorías</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Activas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{activeCount}</div>
                <p className="text-xs text-muted-foreground">Visibles en productos</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Inactivas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-muted-foreground">{inactiveCount}</div>
                <p className="text-xs text-muted-foreground">Ocultas</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Categorías</CardTitle>
              <CardDescription>Lista de categorías. Edita para vincular con WooCommerce (ID y slug).</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4 mb-4 md:flex-row">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nombre o descripción..."
                      className="pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="active">Activas</SelectItem>
                    <SelectItem value="inactive">Inactivas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                  <span>Cargando categorías...</span>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Categoría padre</TableHead>
                      <TableHead>WooCommerce</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="w-[100px]">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCategories.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No hay categorías
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCategories.map((cat) => (
                        <TableRow key={cat.id}>
                          <TableCell className="font-medium">{cat.name}</TableCell>
                          <TableCell className="max-w-[200px] truncate text-muted-foreground">
                            {cat.description || "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {getParentName(cat.parent_id)}
                          </TableCell>
                          <TableCell>
                            {cat.woocommerce_id != null || cat.woocommerce_slug ? (
                              <Badge variant="secondary" className="font-mono text-xs">
                                {cat.woocommerce_id != null ? `ID ${cat.woocommerce_id}` : ""}
                                {cat.woocommerce_id != null && cat.woocommerce_slug ? " · " : ""}
                                {cat.woocommerce_slug || ""}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={cat.is_active !== false ? "default" : "secondary"}>
                              {cat.is_active !== false ? "Activa" : "Inactiva"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleEdit(cat)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleDelete(cat)}
                                disabled={deletingId === cat.id}
                              >
                                {deletingId === cat.id ? (
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </ERPLayout>

      <CategoryModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        mode={modalMode}
        category={editingCategory}
        categories={categories}
        onSuccess={loadCategories}
      />
    </Protected>
  )
}
