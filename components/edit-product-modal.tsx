"use client"

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Package, DollarSign, BarChart3, Edit, Tag, Image as ImageIcon, Upload, X, ExternalLink, Loader2, Ruler, Truck, ClipboardList } from "lucide-react"
import Image from "next/image"
import { IvaRateSelect } from "@/components/iva-rate-select"
import {
  Product,
  updateProduct,
  getCategories,
  Category,
  UpdateProductData,
} from "@/lib/api"
import {
  productIvaRate,
  type SaleIvaRate,
} from "@/lib/sale-iva"
import { getAllProductImages } from "@/lib/product-image-utils"
import { uploadImagesToWordPress } from "@/lib/woocommerce-media"
import { useToast } from "@/contexts/ToastContext"
import {
  getProductListDestination,
  buildDestinationExplanation,
  type ProductListTabKey,
} from "@/lib/product-list-destination"
import { ProductSaveConfirmDialog } from "@/components/product-save-confirm-dialog"
import { ProductModalCloseDialog } from "@/components/product-modal-close-dialog"
import { nextIsActiveAfterStockChange } from "@/lib/product-stock-is-active"

interface EditProductModalProps {
  product: Product | null
  isOpen: boolean
  onClose: () => void
  onSuccess: (updated?: Product) => void
}

function editBaselineImageUrls(product: Product): string[] {
  if (product.images !== null && product.images !== undefined) {
    return [...product.images]
  }
  if (product.image_url) return [product.image_url]
  const all = getAllProductImages(product)
  return all.length > 0 ? all : []
}

function dimensionMatchesForm(form: string, stored: number | null | undefined): boolean {
  const t = form.trim()
  if (t === "") return stored == null || stored === undefined
  if (stored == null || stored === undefined) return false
  return Math.abs(parseFloat(t) - Number(stored)) < 1e-9
}

interface FormData {
  code: string
  name: string
  description: string
  category_id: string
  price: string
  stock: string
  min_stock: string
  max_stock: string
  is_active: string
  weight: string
  length: string
  width: string
  height: string
  allow_backorders: string  // "0" | "1"
}

export function EditProductModal({ product, isOpen, onClose, onSuccess }: EditProductModalProps) {
  const IMAGE_REORDER_MIME = "application/x-mf-image-reorder-index"
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [submitStep, setSubmitStep] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [loadingCategories, setLoadingCategories] = useState(false)
  const [syncToWooCommerce, setSyncToWooCommerce] = useState(true)
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [woocommerceImageIds, setWoocommerceImageIds] = useState<(number | null)[]>([])
  const [uploadingImages, setUploadingImages] = useState(false)
  const [imageUrlInput, setImageUrlInput] = useState("")
  const [isDragOverUpload, setIsDragOverUpload] = useState(false)
  const [draggedImageIndex, setDraggedImageIndex] = useState<number | null>(null)
  const [reorderTargetIndex, setReorderTargetIndex] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const reorderGridRef = useRef<HTMLDivElement>(null)
  const dragPreviewRef = useRef<HTMLElement | null>(null)
  const submitBottomRef = useRef<HTMLDivElement>(null)
  const saveRunnerRef = useRef<(() => Promise<void>) | null>(null)
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false)
  const [saveConfirmDestination, setSaveConfirmDestination] =
    useState<ProductListTabKey>("published")
  const [saveConfirmName, setSaveConfirmName] = useState("")
  const [saveConfirmLines, setSaveConfirmLines] = useState<string[]>([])
  const [closePromptOpen, setClosePromptOpen] = useState(false)
  const [draftCloseLoading, setDraftCloseLoading] = useState(false)
  const [ivaRate, setIvaRate] = useState<SaleIvaRate>(21)

  const [formData, setFormData] = useState<FormData>({
    code: "",
    name: "",
    description: "",
    category_id: "",
    price: "",
    stock: "0",
    min_stock: "0",
    max_stock: "1000",
    is_active: "1",
    weight: "",
    length: "",
    width: "",
    height: "",
    allow_backorders: "0",
  })

  // Parsea precio en formato es-AR (ej. "543.020" o "1.250.000") a número
  const parsePrecioFormato = (valor: string): number => {
    const limpio = valor.replace(/\./g, "").replace(",", ".")
    return Number(limpio) || 0
  }

  const loadCategories = async () => {
    setLoadingCategories(true)
    try {
      const data = await getCategories()
      setCategories(data ?? [])
    } catch (err) {
      console.error("Error al cargar categorías:", err)
      setCategories([])
    } finally {
      setLoadingCategories(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadCategories()
    }
  }, [isOpen])

  // Rellenar formulario cuando se abre con un producto
  useEffect(() => {
    if (isOpen && product) {
      const stock = product.stock ?? 0
      const allowBackorders = product.allow_backorders === true
      setFormData({
        code: product.code ?? "",
        name: product.name ?? "",
        description: product.description ?? "",
        category_id: product.category_id != null ? String(product.category_id) : "",
        price: Math.round(Number(product.price ?? 0)).toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
        stock: String(stock),
        min_stock: String(product.min_stock ?? 0),
        max_stock: String(product.max_stock ?? 1000),
        is_active: stock > 0 ? "1" : (allowBackorders && product.is_active ? "1" : "0"),
        weight: product.weight != null ? String(product.weight) : "",
        length: product.length != null ? String(product.length) : "",
        width: product.width != null ? String(product.width) : "",
        height: product.height != null ? String(product.height) : "",
        allow_backorders: product.allow_backorders ? "1" : "0",
      })
      setIvaRate(productIvaRate(product))
      setSyncToWooCommerce(true)
      setImageUrlInput("")
      // Imágenes: usar product.images si existe (incluso si es []). Solo usar otras fuentes si images no existe (null/undefined).
      let urls: string[] = []
      let ids: (number | null)[] = []
      if (product.images !== null && product.images !== undefined) {
        // product.images existe (puede ser [] o tener elementos) - usar ese valor directamente
        urls = [...product.images]
        const wcIds = product.woocommerce_image_ids ?? []
        ids = urls.map((_, i) => (wcIds[i] != null ? wcIds[i]! : null))
      } else if (product.image_url) {
        // Solo si images no existe, usar image_url como fallback
        urls = [product.image_url]
        ids = [null]
      } else {
        // Solo si images no existe y no hay image_url, intentar getAllProductImages
        const all = getAllProductImages(product)
        urls = all.length > 0 ? all : []
        ids = urls.map(() => null)
      }
      setImageUrls(urls)
      setWoocommerceImageIds(ids)
    }
  }, [isOpen, product])

  const isEditDirty = useMemo(() => {
    if (!product) return false
    const pStock = product.stock ?? 0
    const pAllow = !!product.allow_backorders
    const expectedIsActive =
      pStock > 0 ? "1" : pAllow && product.is_active ? "1" : "0"
    if (formData.code.trim() !== (product.code ?? "").trim()) return true
    if (formData.name.trim() !== (product.name ?? "").trim()) return true
    if (formData.description.trim() !== (product.description ?? "").trim()) return true
    const fc = formData.category_id ? parseInt(formData.category_id, 10) : null
    if (fc !== (product.category_id ?? null)) return true
    if (parsePrecioFormato(formData.price) !== Number(product.price ?? 0)) return true
    if ((parseInt(formData.stock, 10) || 0) !== pStock) return true
    if ((parseInt(formData.min_stock, 10) || 0) !== (product.min_stock ?? 0)) return true
    if ((parseInt(formData.max_stock, 10) || 1000) !== (product.max_stock ?? 1000)) return true
    if (formData.is_active !== expectedIsActive) return true
    if ((formData.allow_backorders === "1") !== pAllow) return true
    if (ivaRate !== productIvaRate(product)) return true
    if (!dimensionMatchesForm(formData.weight, product.weight ?? null)) return true
    if (!dimensionMatchesForm(formData.length, product.length ?? null)) return true
    if (!dimensionMatchesForm(formData.width, product.width ?? null)) return true
    if (!dimensionMatchesForm(formData.height, product.height ?? null)) return true
    const baseUrls = editBaselineImageUrls(product)
    if (JSON.stringify(imageUrls) !== JSON.stringify(baseUrls)) return true
    if (syncToWooCommerce !== true) return true
    return false
  }, [product, formData, imageUrls, syncToWooCommerce, ivaRate])

  useEffect(() => {
    if (!isOpen || !loading || !submitStep) return
    const t = setTimeout(() => {
      submitBottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
    }, 50)
    return () => clearTimeout(t)
  }, [isOpen, loading, submitStep])

  const handleAddImageUrl = () => {
    const url = imageUrlInput.trim()
    if (!url) return
    try {
      new URL(url)
      if (imageUrls.length >= 5) {
        showToast({ message: "Máximo 5 imágenes", type: "error" })
        return
      }
      setImageUrls((prev) => [...prev, url])
      setWoocommerceImageIds((prev) => [...prev, null])
      setImageUrlInput("")
    } catch {
      showToast({ message: "URL de imagen no válida", type: "error" })
    }
  }

  const removeImage = (index: number) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== index))
    setWoocommerceImageIds((prev) => prev.filter((_, i) => i !== index))
  }

  const moveImage = (fromIndex: number, toIndex: number) => {
    if (
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= imageUrls.length ||
      toIndex >= imageUrls.length ||
      fromIndex === toIndex
    ) {
      return
    }
    setImageUrls((prev) => {
      const next = [...prev]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return next
    })
    setWoocommerceImageIds((prev) => {
      const next = [...prev]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return next
    })
  }

  const isReorderDrag = (e: React.DragEvent) => e.dataTransfer.types.includes(IMAGE_REORDER_MIME)

  const getReorderTargetIndex = (e: React.DragEvent<HTMLDivElement>, itemCount: number) => {
    const grid = reorderGridRef.current
    if (!grid) return 0
    const rect = grid.getBoundingClientRect()
    const style = window.getComputedStyle(grid)
    const columns = Math.max(1, style.gridTemplateColumns.split(" ").filter(Boolean).length)
    const rowGap = Number.parseFloat(style.rowGap || "0") || 0
    const colGap = Number.parseFloat(style.columnGap || "0") || 0
    const firstItem = grid.querySelector('[data-reorder-item="true"]') as HTMLElement | null
    if (!firstItem) return itemCount
    const itemRect = firstItem.getBoundingClientRect()
    const cellWidth = itemRect.width + colGap
    const cellHeight = itemRect.height + rowGap
    const x = Math.max(0, e.clientX - rect.left)
    const y = Math.max(0, e.clientY - rect.top)
    const col = Math.max(0, Math.min(columns - 1, Math.floor(x / Math.max(1, cellWidth))))
    const row = Math.max(0, Math.floor(y / Math.max(1, cellHeight)))
    const index = row * columns + col
    return Math.max(0, Math.min(index, Math.max(0, itemCount - 1)))
  }

  const cleanupDragPreview = () => {
    if (dragPreviewRef.current) {
      dragPreviewRef.current.remove()
      dragPreviewRef.current = null
    }
  }

  const setDragPreviewImage = (e: React.DragEvent, element: HTMLElement) => {
    cleanupDragPreview()
    const clone = element.cloneNode(true) as HTMLElement
    const rect = element.getBoundingClientRect()
    clone.style.position = "fixed"
    clone.style.top = "-9999px"
    clone.style.left = "-9999px"
    clone.style.width = `${rect.width}px`
    clone.style.height = `${rect.height}px`
    clone.style.opacity = "0.95"
    clone.style.pointerEvents = "none"
    clone.style.transform = "none"
    clone.style.zIndex = "9999"
    document.body.appendChild(clone)
    dragPreviewRef.current = clone
    e.dataTransfer.setDragImage(clone, rect.width / 2, rect.height / 2)
  }

  const processFilesUpload = async (incomingFiles: FileList | File[]) => {
    const files = Array.from(incomingFiles)
    if (!files.length) return
    const remaining = 5 - imageUrls.length
    if (remaining <= 0) {
      showToast({ message: "Máximo 5 imágenes", type: "error" })
      return
    }
    const toAdd = files
      .slice(0, remaining)
      .filter((f) => ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(f.type))
    if (!toAdd.length) {
      showToast({ message: "Solo se permiten imágenes (jpeg, png, gif, webp)", type: "error" })
      return
    }

    // Vista previa inmediata para que se vean las miniaturas al instante
    const newUrls: string[] = []
    const newIds: (number | null)[] = []
    for (const file of toAdd) {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve((reader.result as string) ?? "")
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(file)
      })
      newUrls.push(dataUrl)
      newIds.push(null)
    }
    setImageUrls((prev) => [...prev, ...newUrls])
    setWoocommerceImageIds((prev) => [...prev, ...newIds])

    setUploadingImages(true)
    try {
      const uploads = await uploadImagesToWordPress(toAdd)
      setImageUrls((prev) => {
        const start = prev.length - uploads.length
        const next = [...prev]
        uploads.forEach((u, i) => {
          if (next[start + i] !== undefined) next[start + i] = u.source_url
        })
        return next
      })
      setWoocommerceImageIds((prev) => {
        const start = prev.length - uploads.length
        const next = [...prev]
        uploads.forEach((u, i) => {
          if (next[start + i] !== undefined) next[start + i] = u.id
        })
        return next
      })
    } catch (err) {
      showToast({
        message: err instanceof Error ? err.message : "Error subiendo imágenes",
        type: "error",
      })
    } finally {
      setUploadingImages(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    await processFilesUpload(files)
    e.target.value = ""
  }

  // Al enfocar un input numérico con valor "0", seleccionar todo para que al escribir se reemplace (no "01")
  const handleNumericFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    const v = e.target.value
    if (v === "0" || v === "0.00") e.target.select()
  }

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value }
      if (field === "stock") {
        updated.is_active = nextIsActiveAfterStockChange(prev, value)
      }
      if (field === "allow_backorders") {
        const stockValue = parseInt(prev.stock) || 0
        if (stockValue === 0 && value === "0") updated.is_active = "0"
        if (stockValue === 0 && value === "1") updated.is_active = "1" // Con reserva y stock 0 se envía activo (WooCommerce)
      }
      return updated
    })
  }

  const validateForm = (): string | null => {
    if (!formData.code.trim()) return "El código del producto es obligatorio"
    if (formData.code.trim().length > 20) return "El código no puede exceder 20 caracteres"
    if (!formData.name.trim()) return "El nombre del producto es obligatorio"
    if (formData.name.trim().length > 100) return "El nombre no puede exceder 100 caracteres"
    const price = parsePrecioFormato(formData.price)
    if (isNaN(price) || price < 0) return "El precio debe ser un número mayor o igual a 0"
    const stock = parseInt(formData.stock) || 0
    if (stock < 0) return "El stock no puede ser negativo"
    const minStock = parseInt(formData.min_stock) || 0
    if (minStock < 0) return "El stock mínimo no puede ser negativo"
    const maxStock = parseInt(formData.max_stock) || 1000
    if (maxStock < 0) return "El stock máximo no puede ser negativo"
    const weight = formData.weight.trim() === "" ? null : parseFloat(formData.weight)
    if (weight != null && (isNaN(weight) || weight < 0)) return "El peso debe ser ≥ 0 (kg)"
    const length = formData.length.trim() === "" ? null : parseFloat(formData.length)
    if (length != null && (isNaN(length) || length < 0)) return "La longitud debe ser ≥ 0 (cm)"
    const width = formData.width.trim() === "" ? null : parseFloat(formData.width)
    if (width != null && (isNaN(width) || width < 0)) return "El ancho debe ser ≥ 0 (cm)"
    const height = formData.height.trim() === "" ? null : parseFloat(formData.height)
    if (height != null && (isNaN(height) || height < 0)) return "El alto debe ser ≥ 0 (cm)"
    return null
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!product) return
    const validationError = validateForm()
    if (validationError) {
      showToast({ message: validationError, type: "error" })
      return
    }

    const stock = parseInt(formData.stock) || 0
    const allowBackorders = formData.allow_backorders === "1"
    const isActive =
      stock > 0
        ? formData.is_active === "1"
        : allowBackorders
          ? true
          : formData.is_active === "1"

    const destination = getProductListDestination({
      is_active: isActive,
      stock,
      allow_backorders: allowBackorders,
    })
    const previousDestination = getProductListDestination({
      is_active: product.is_active ?? true,
      stock: product.stock ?? 0,
      allow_backorders: product.allow_backorders,
    })
    const explanationLines = buildDestinationExplanation({
      destination,
      stock,
      allow_backorders: allowBackorders,
      sync_to_woocommerce: syncToWooCommerce,
      previousDestination,
    })

    saveRunnerRef.current = async () => {
      setLoading(true)

      try {
        const STEP_VIEW_MS = 650
        const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
        const setStep = async (msg: string, ms: number = STEP_VIEW_MS) => {
          setSubmitStep(msg)
          await wait(ms)
        }

        const nextPrice = parsePrecioFormato(formData.price)
      const nextMinStock = parseInt(formData.min_stock) || 0
      const nextMaxStock = parseInt(formData.max_stock) || 1000
      const nextCategoryId = formData.category_id ? parseInt(formData.category_id) : null
      const nextCode = formData.code.trim()
      const nextName = formData.name.trim()
      const nextDescription = formData.description.trim()

      // Lista final para WooCommerce: solo URLs (http/https) en el orden que ve el usuario.
      // Incluye URLs externas y source_url de archivos subidos (POST woocommerce/media).
      // Si el usuario deja solo URL → enviamos ["https://..."]. Si archivo + URL → [source_url, "https://..."].
      // Enviar siempre images (aunque sea []) para que la API actualice la galería; si no se envía, no toca la galería.
      const validImageUrls = imageUrls.filter(
        (url) =>
          typeof url === "string" &&
          (url.startsWith("http://") || url.startsWith("https://"))
      )

      const prevImageUrls =
        product.images !== null && product.images !== undefined
          ? product.images
          : product.image_url
            ? [product.image_url]
            : getAllProductImages(product)

      const arraysEqual = (a: string[], b: string[]) =>
        a.length === b.length && a.every((v, i) => v === b[i])

      const prevStock = product.stock ?? 0
      const prevIsActive = product.is_active ?? true
      const prevPrice = Number(product.price ?? 0)
      const prevMinStock = product.min_stock ?? 0
      const prevMaxStock = product.max_stock ?? 1000
      const prevCategoryId = product.category_id ?? null
      const prevCode = (product.code ?? "").trim()
      const prevName = (product.name ?? "").trim()
      const prevDescription = (product.description ?? "").trim()

      const stockChanged = stock !== prevStock
      const activeChanged = isActive !== prevIsActive
      const priceChanged = nextPrice !== prevPrice
      const limitsChanged = nextMinStock !== prevMinStock || nextMaxStock !== prevMaxStock
      const categoryChanged = nextCategoryId !== prevCategoryId
      const codeChanged = nextCode !== prevCode
      const nameChanged = nextName !== prevName
      const descriptionChanged = nextDescription !== prevDescription
      const infoChanged = codeChanged || nameChanged || descriptionChanged || categoryChanged
      const imagesChanged = !arraysEqual(validImageUrls, prevImageUrls ?? [])

      const preSteps: string[] = []
      if (activeChanged && !isActive) {
        preSteps.push(stock === 0 ? "Dejando el producto sin stock e inactivándolo…" : "Inactivando el producto…")
      } else if (activeChanged && isActive) {
        preSteps.push("Activando el producto…")
      }
      if (stockChanged && !(activeChanged && !isActive)) {
        preSteps.push("Actualizando stock…")
      }
      if (priceChanged) preSteps.push("Actualizando precio…")
      if (infoChanged) preSteps.push("Actualizando información del producto…")
      if (limitsChanged) preSteps.push("Actualizando límites de stock…")
      if (imagesChanged) preSteps.push("Actualizando imágenes…")

      // Mostrar algunos pasos relevantes (sin hacer eterno el submit)
      const stepsToShow = preSteps.length > 0 ? preSteps.slice(0, 3) : ["Preparando cambios…"]
      for (const s of stepsToShow) {
        // eslint-disable-next-line no-await-in-loop
        await setStep(s)
      }

      const weightVal = formData.weight.trim() === "" ? null : parseFloat(formData.weight)
      const lengthVal = formData.length.trim() === "" ? null : parseFloat(formData.length)
      const widthVal = formData.width.trim() === "" ? null : parseFloat(formData.width)
      const heightVal = formData.height.trim() === "" ? null : parseFloat(formData.height)

      const payload: UpdateProductData = {
        code: nextCode,
        name: nextName,
        description: nextDescription || null,
        category_id: nextCategoryId,
        price: nextPrice,
        stock,
        min_stock: nextMinStock,
        max_stock: nextMaxStock,
        is_active: isActive,
        images: validImageUrls,
        sync_to_woocommerce: syncToWooCommerce || undefined,
        weight: weightVal ?? undefined,
        length: lengthVal ?? undefined,
        width: widthVal ?? undefined,
        height: heightVal ?? undefined,
        allow_backorders: allowBackorders,
        iva_rate: ivaRate,
      }

      if (syncToWooCommerce) {
        const wcMsg =
          !isActive || stock === 0
            ? "Sincronizando baja de stock con WooCommerce…"
            : imagesChanged
              ? "Sincronizando imágenes con WooCommerce…"
              : priceChanged
                ? "Sincronizando precio con WooCommerce…"
                : "Sincronizando cambios con WooCommerce…"
        await setStep(wcMsg, 550)
      } else {
        await setStep("Guardando cambios en el servidor…", 450)
      }

      const updated = await updateProduct(product.id, payload)

      showToast({ message: "Producto actualizado correctamente.", type: "success" })
      onSuccess(updated)
      onClose()
      } catch (err) {
        console.error("Error al actualizar producto:", err)
        showToast({
          message: err instanceof Error ? err.message : "Error al actualizar el producto",
          type: "error",
        })
      } finally {
        setSubmitStep(null)
        setLoading(false)
      }
    }

    setSaveConfirmDestination(destination)
    setSaveConfirmName(formData.name.trim())
    setSaveConfirmLines(explanationLines)
    setSaveConfirmOpen(true)
  }

  const handleConfirmSave = () => {
    setSaveConfirmOpen(false)
    const run = saveRunnerRef.current
    saveRunnerRef.current = null
    void run?.()
  }

  const handleCancelSaveConfirm = () => {
    setSaveConfirmOpen(false)
    saveRunnerRef.current = null
  }

  const handleClose = () => {
    if (!loading && !draftCloseLoading) {
      setClosePromptOpen(false)
      onClose()
    }
  }

  const requestClose = () => {
    if (loading || draftCloseLoading) return
    if (!isEditDirty) handleClose()
    else setClosePromptOpen(true)
  }

  const handleDialogOpenChange = (open: boolean) => {
    if (open) return
    if (loading || draftCloseLoading) return
    if (!isEditDirty) handleClose()
    else setClosePromptOpen(true)
  }

  const saveDraftAndClose = useCallback(async () => {
    if (!product) return
    const validationError = validateForm()
    if (validationError) {
      showToast({ message: validationError, type: "error" })
      setClosePromptOpen(false)
      return
    }

    setDraftCloseLoading(true)
    try {
      const nextPrice = parsePrecioFormato(formData.price)
      const nextMinStock = parseInt(formData.min_stock, 10) || 0
      const nextMaxStock = parseInt(formData.max_stock, 10) || 1000
      const nextCategoryId = formData.category_id ? parseInt(formData.category_id, 10) : null
      const nextCode = formData.code.trim()
      const nextName = formData.name.trim()
      const nextDescription = formData.description.trim()

      const validImageUrls = imageUrls.filter(
        (url) =>
          typeof url === "string" &&
          (url.startsWith("http://") || url.startsWith("https://"))
      )

      const weightVal = formData.weight.trim() === "" ? null : parseFloat(formData.weight)
      const lengthVal = formData.length.trim() === "" ? null : parseFloat(formData.length)
      const widthVal = formData.width.trim() === "" ? null : parseFloat(formData.width)
      const heightVal = formData.height.trim() === "" ? null : parseFloat(formData.height)

      const payload: UpdateProductData = {
        code: nextCode,
        name: nextName,
        description: nextDescription || null,
        category_id: nextCategoryId,
        price: nextPrice,
        stock: 0,
        min_stock: nextMinStock,
        max_stock: nextMaxStock,
        is_active: true,
        images: validImageUrls,
        sync_to_woocommerce: false,
        weight: weightVal ?? undefined,
        length: lengthVal ?? undefined,
        width: widthVal ?? undefined,
        height: heightVal ?? undefined,
        allow_backorders: false,
        iva_rate: ivaRate,
      }

      const updated = await updateProduct(product.id, payload)
      showToast({
        message: "Cambios guardados en Borrador (stock 0, sin venta por encargo).",
        type: "success",
      })
      setClosePromptOpen(false)
      onSuccess(updated)
      onClose()
    } catch (err) {
      console.error("Borrador edición:", err)
      showToast({
        message: err instanceof Error ? err.message : "No se pudo guardar el borrador",
        type: "error",
      })
      setClosePromptOpen(false)
    } finally {
      setDraftCloseLoading(false)
    }
  }, [product, formData, imageUrls, showToast, onSuccess, onClose])

  if (!product) return null

  const wcBaseUrl = (process.env.NEXT_PUBLIC_WOOCOMMERCE_URL || "https://mfcomputers.com.ar").replace(/\/+$/, "")
  const wcSlug = product.woocommerce_slug?.replace(/^\/+|\/+$/g, "").trim()
  const wcProductUrl = wcSlug ? `${wcBaseUrl}/${wcSlug}` : null

  return (
    <>
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Editar producto
          </DialogTitle>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm text-muted-foreground">
              {product.name}
            </p>
            {wcProductUrl && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                asChild
              >
                <a href={wcProductUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  Ver producto en WC
                </a>
              </Button>
            )}
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Información básica</span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-code">Código *</Label>
                  <Input
                    id="edit-code"
                    value={formData.code}
                    onChange={(e) => handleInputChange("code", e.target.value)}
                    maxLength={20}
                    placeholder="PROD-001"
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-category">Categoría</Label>
                  <Select
                    value={formData.category_id || "__none__"}
                    onValueChange={(v) => handleInputChange("category_id", v === "__none__" ? "" : v)}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Sin categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sin categoría</SelectItem>
                      {categories
                        .filter((c) => c.is_active !== false)
                        .map((cat) => (
                          <SelectItem key={cat.id} value={String(cat.id)}>
                            <span className="flex items-center gap-2">
                              <Tag className="h-3 w-3" />
                              {cat.name}
                            </span>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-name">Nombre *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  maxLength={100}
                  placeholder="Nombre del producto"
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Descripción</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  placeholder="Descripción del producto"
                  rows={3}
                  className="resize-none"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Precio y stock</span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-price">Precio *</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="edit-price"
                      type="text"
                      inputMode="numeric"
                      placeholder="Ej: 1.250.000"
                      value={formData.price}
                      onChange={(e) => handleInputChange("price", e.target.value)}
                      onFocus={handleNumericFocus}
                      className="h-10 pl-9"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Precio final con IVA incluido.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-iva-rate">Alícuota IVA</Label>
                  <IvaRateSelect
                    id="edit-iva-rate"
                    value={ivaRate}
                    onChange={setIvaRate}
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Se usa al vender y facturar. No confundir con la condición fiscal del cliente.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-stock">Stock</Label>
                  <Input
                    id="edit-stock"
                    type="number"
                    min="0"
                    value={formData.stock}
                    onChange={(e) => handleInputChange("stock", e.target.value)}
                    onFocus={handleNumericFocus}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-min-stock">Stock mínimo</Label>
                  <Input
                    id="edit-min-stock"
                    type="number"
                    min="0"
                    value={formData.min_stock}
                    onChange={(e) => handleInputChange("min_stock", e.target.value)}
                    onFocus={handleNumericFocus}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-max-stock">Stock máximo</Label>
                  <Input
                    id="edit-max-stock"
                    type="number"
                    min="0"
                    value={formData.max_stock}
                    onChange={(e) => handleInputChange("max_stock", e.target.value)}
                    onFocus={handleNumericFocus}
                    className="h-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Estado</Label>
                <Select
                  value={formData.is_active}
                  onValueChange={(v) => handleInputChange("is_active", v)}
                  disabled={parseInt(formData.stock) === 0}
                >
                  <SelectTrigger className="h-10 w-full sm:w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Activo</SelectItem>
                    <SelectItem value="0">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
                {parseInt(formData.stock) === 0 && formData.allow_backorders !== "1" && (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    Con stock 0 el producto se guardará como inactivo. Marcá &quot;Venta por encargo&quot; para vender con stock 0.
                  </p>
                )}
              </div>

              {product.woocommerce_id != null ? (
                <div className="flex items-center space-x-2 pt-2">
                  <input
                    type="checkbox"
                    id="edit-sync-woo"
                    checked={syncToWooCommerce}
                    onChange={(e) => setSyncToWooCommerce(e.target.checked)}
                    className="h-4 w-4 rounded border-primary"
                  />
                  <Label htmlFor="edit-sync-woo" className="text-sm cursor-pointer">
                    Sincronizar cambios con WooCommerce
                  </Label>
                </div>
              ) : (
                <p className="text-sm text-amber-600 dark:text-amber-500 pt-2">
                  Este producto aún no está sincronizado con WooCommerce. Sincronizalo desde el detalle del producto para poder enviar cambios.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <ClipboardList className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Reserva (venta por encargo)</span>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="edit-allow-backorders"
                  checked={formData.allow_backorders === "1"}
                  onChange={(e) => handleInputChange("allow_backorders", e.target.checked ? "1" : "0")}
                  className="h-4 w-4 rounded border-primary"
                />
                <Label htmlFor="edit-allow-backorders" className="text-sm cursor-pointer">
                  Permitir reservas con stock 0 (venta por encargo)
                </Label>
              </div>
              <p className="text-xs text-muted-foreground">
                En WooCommerce se sincroniza como &quot;Permitir reservas&quot; → el cliente puede comprar con stock 0 y se le avisará.
              </p>
            </CardContent>
          </Card>

          <Card
            className={`transition-colors ${isDragOverUpload ? "ring-2 ring-primary/60 shadow-sm shadow-primary/20" : ""}`}
            onDragOver={(e) => {
              if (uploadingImages || imageUrls.length >= 5) return
              if (isReorderDrag(e)) {
                e.preventDefault()
                setIsDragOverUpload(false)
                return
              }
              e.preventDefault()
              setIsDragOverUpload(true)
            }}
            onDragEnter={(e) => {
              if (uploadingImages || imageUrls.length >= 5) return
              if (isReorderDrag(e)) {
                e.preventDefault()
                setIsDragOverUpload(false)
                return
              }
              e.preventDefault()
              setIsDragOverUpload(true)
            }}
            onDragLeave={(e) => {
              const nextTarget = e.relatedTarget as Node | null
              if (nextTarget && e.currentTarget.contains(nextTarget)) return
              setIsDragOverUpload(false)
            }}
            onDrop={async (e) => {
              if (uploadingImages || imageUrls.length >= 5) return
              e.preventDefault()
              setIsDragOverUpload(false)
              if (isReorderDrag(e)) return
              const droppedFiles = e.dataTransfer.files
              if (droppedFiles?.length) {
                await processFilesUpload(droppedFiles)
              }
            }}
          >
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <Truck className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Dimensiones y peso (envíos)</span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-weight" className="text-sm flex items-center gap-1">
                    <Ruler className="h-3.5 w-3.5" />
                    Peso (kg)
                  </Label>
                  <Input
                    id="edit-weight"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.weight}
                    onChange={(e) => handleInputChange("weight", e.target.value)}
                    onFocus={handleNumericFocus}
                    placeholder="Ej: 2.5"
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-length">Largo (cm)</Label>
                  <Input
                    id="edit-length"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.length}
                    onChange={(e) => handleInputChange("length", e.target.value)}
                    onFocus={handleNumericFocus}
                    placeholder="Ej: 35"
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-width">Ancho (cm)</Label>
                  <Input
                    id="edit-width"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.width}
                    onChange={(e) => handleInputChange("width", e.target.value)}
                    onFocus={handleNumericFocus}
                    placeholder="Ej: 24"
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-height">Alto (cm)</Label>
                  <Input
                    id="edit-height"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.height}
                    onChange={(e) => handleInputChange("height", e.target.value)}
                    onFocus={handleNumericFocus}
                    placeholder="Ej: 2"
                    className="h-10"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Imágenes</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Hasta 5 imágenes. Agregá URLs o subí archivos al equipo (se cargan a la galería de WooCommerce). JPG, PNG, GIF, WebP · máx. 10 MB c/u.
              </p>
              <div
                className={`flex flex-wrap gap-2 rounded-lg border-2 border-dashed p-3 transition-colors ${
                  isDragOverUpload
                    ? "border-primary bg-primary/5"
                    : "border-border"
                }`}
              >
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={imageUrls.length >= 5 || uploadingImages}
                  className="h-10"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploadingImages ? "Subiendo…" : "Subir a WooCommerce"}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  multiple
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <div className="flex gap-2 flex-1 min-w-[200px]">
                  <Input
                    type="url"
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    placeholder="https://ejemplo.com/imagen.jpg"
                    className="h-10 flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        handleAddImageUrl()
                      }
                    }}
                    disabled={imageUrls.length >= 5}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddImageUrl}
                    disabled={!imageUrlInput.trim() || imageUrls.length >= 5}
                    className="h-10 shrink-0"
                  >
                    Agregar URL
                  </Button>
                </div>
                <p className="w-full text-xs text-muted-foreground">
                  También podés arrastrar y soltar archivos desde tu ordenador en esta zona.
                </p>
              </div>
              {imageUrls.length > 0 && (
                <div className="space-y-2">
                  <div
                    ref={reorderGridRef}
                    className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 min-h-[88px] rounded-lg transition-colors ${
                      draggedImageIndex !== null ? "bg-muted/40 p-2" : ""
                    }`}
                    onDragOver={(e) => {
                      if (uploadingImages || draggedImageIndex === null || !isReorderDrag(e)) return
                      e.preventDefault()
                      e.stopPropagation()
                      e.dataTransfer.dropEffect = "move"
                      setReorderTargetIndex(getReorderTargetIndex(e, imageUrls.length))
                      setIsDragOverUpload(false)
                    }}
                    onDrop={(e) => {
                      if (uploadingImages || draggedImageIndex === null || !isReorderDrag(e)) return
                      e.preventDefault()
                      e.stopPropagation()
                      const targetIndex = reorderTargetIndex ?? draggedImageIndex
                      moveImage(draggedImageIndex, targetIndex)
                      setDraggedImageIndex(null)
                      setReorderTargetIndex(null)
                      setIsDragOverUpload(false)
                      cleanupDragPreview()
                    }}
                    onDragLeave={(e) => {
                      const nextTarget = e.relatedTarget as Node | null
                      if (nextTarget && e.currentTarget.contains(nextTarget)) return
                      setReorderTargetIndex(null)
                    }}
                  >
                    {imageUrls.map((url, index) => (
                      <div
                        key={`${url}-${index}`}
                        data-reorder-item="true"
                        className={`relative group aspect-square rounded-lg overflow-hidden bg-muted border transition-all duration-200 ${
                          uploadingImages ? "cursor-not-allowed" : "cursor-grab active:cursor-grabbing"
                        } ${draggedImageIndex === index ? "opacity-60" : ""} ${
                          reorderTargetIndex === index && draggedImageIndex !== null
                            ? "ring-2 ring-dashed ring-primary shadow-md shadow-primary/20"
                            : ""
                        }`}
                        draggable={!uploadingImages}
                        onDragStart={(e) => {
                          if (uploadingImages) return
                          setDraggedImageIndex(index)
                          setReorderTargetIndex(index)
                          setDragPreviewImage(e, e.currentTarget)
                          e.dataTransfer.setData(IMAGE_REORDER_MIME, String(index))
                          e.dataTransfer.setData("text/plain", String(index))
                          e.dataTransfer.effectAllowed = "move"
                        }}
                        onDragEnd={() => {
                          setDraggedImageIndex(null)
                          setReorderTargetIndex(null)
                          cleanupDragPreview()
                        }}
                      >
                        <Image
                          src={url}
                          alt={`Imagen ${index + 1}`}
                          fill
                          className="object-cover"
                          sizes="120px"
                          onError={(ev) => {
                            const target = ev.target as HTMLImageElement
                            target.src = "https://via.placeholder.com/120?text=Error"
                          }}
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeImage(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                        <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-1 py-0.5 truncate">
                          {index + 1}
                        </span>
                        {index === 0 && (
                          <span className="absolute top-1 left-1 rounded bg-emerald-600 text-white text-[10px] px-1.5 py-0.5">
                            Principal
                          </span>
                        )}
                        {reorderTargetIndex === index && draggedImageIndex !== null && (
                          <div className="absolute inset-0 rounded-lg bg-primary/10 border-2 border-dashed border-primary flex items-center justify-center pointer-events-none">
                            <span className="text-[11px] font-semibold text-primary bg-background/80 px-2 py-0.5 rounded">
                              Soltar aqui
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Arrastrá y soltá en cualquier espacio de la grilla para reordenar. La primera imagen siempre será la <span className="font-semibold text-emerald-600 dark:text-emerald-400">Principal</span> (portada).
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {loading && submitStep && (
            <div
              role="status"
              aria-live="polite"
              className="rounded-md border bg-muted/40 px-3 py-2 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Procesando</p>
                  <p className="text-sm font-medium leading-snug break-words">{submitStep}</p>
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={requestClose} disabled={loading || draftCloseLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || draftCloseLoading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando…
                </>
              ) : (
                "Guardar cambios"
              )}
            </Button>
          </div>
          <div ref={submitBottomRef} />
        </form>
      </DialogContent>
    </Dialog>
    <ProductModalCloseDialog
      open={closePromptOpen}
      onStay={() => setClosePromptOpen(false)}
      onDiscard={handleClose}
      onSaveDraft={saveDraftAndClose}
      draftLoading={draftCloseLoading}
    />
    <ProductSaveConfirmDialog
      open={saveConfirmOpen}
      productName={saveConfirmName}
      destination={saveConfirmDestination}
      explanationLines={saveConfirmLines}
      onConfirm={handleConfirmSave}
      onCancel={handleCancelSaveConfirm}
    />
    </>
  )
}
