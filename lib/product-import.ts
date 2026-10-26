/**
 * Parseo flexible de CSV/TSV/XLSX para importación masiva de productos.
 * Solo el nombre es obligatorio; el resto se completa en API.
 */

export interface ProductImportItem {
  name?: string
  code?: string
  category?: string
  category_id?: number
  price?: number
  prices?: {
    venta_local?: number
    mayorista?: number
    revendedor?: number
  }
  iva_rate?: number
  stock?: number
  min_stock?: number
  max_stock?: number
  description?: string
  is_active?: boolean
  allow_backorders?: boolean
}

export interface ParsedImportSheet {
  items: ProductImportItem[]
  headers: string[]
  warnings: string[]
  skippedEmptyRows: number
}

function normalizeHeader(h: string): string {
  return h
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

const FIELD_ALIASES: Record<keyof ProductImportItem | "venta_local" | "mayorista" | "revendedor", string[]> = {
  name: ["nombre", "name", "producto", "articulo", "descripcion producto", "titulo", "item"],
  code: ["codigo", "code", "sku", "cod", "referencia", "ref", "ean", "barcode", "codigo barras", "barra"],
  category: ["categoria", "category", "rubro", "familia", "grupo"],
  category_id: ["category id", "categoria id", "id categoria"],
  price: ["precio", "price", "pvp", "precio venta", "importe"],
  venta_local: [
    "venta local",
    "precio local",
    "local",
    "precio venta local",
    "lista local",
    "pventa",
  ],
  mayorista: ["mayorista", "precio mayorista", "lista mayorista", "wholesale"],
  revendedor: ["revendedor", "precio revendedor", "lista revendedor", "reseller"],
  iva_rate: ["iva", "alicuota", "alicuota iva", "iva rate", "porcentaje iva"],
  stock: ["stock", "cantidad", "existencias", "qty", "quantity", "disponible"],
  min_stock: ["min stock", "stock min", "stock minimo"],
  max_stock: ["max stock", "stock max", "stock maximo"],
  description: ["descripcion", "description", "detalle", "observaciones", "notas"],
  is_active: ["activo", "active", "is active", "publicado"],
  allow_backorders: ["backorder", "encargo", "allow backorders", "venta encargo"],
  prices: [],
}

function parseNumber(raw: unknown): number | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined
  if (typeof raw === "number" && Number.isFinite(raw)) return raw
  let s = String(raw).trim().replace(/\s/g, "").replace(/\$/g, "").replace(/%/g, "")
  if (!s) return undefined
  if (s.includes(",") && s.includes(".")) {
    s = s.replace(/\./g, "").replace(",", ".")
  } else if ((s.match(/\./g) || []).length >= 2) {
    const parts = s.split(".")
    if (parts[parts.length - 1].length === 2) {
      s = parts.slice(0, -1).join("") + "." + parts[parts.length - 1]
    } else {
      s = parts.join("")
    }
  } else {
    s = s.replace(",", ".")
  }
  const n = Number(s)
  return Number.isFinite(n) ? n : undefined
}

function parseBool(raw: unknown): boolean | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined
  if (typeof raw === "boolean") return raw
  const s = String(raw).trim().toLowerCase()
  if (["1", "true", "si", "sí", "yes", "activo", "publicado"].includes(s)) return true
  if (["0", "false", "no", "inactivo", "borrador"].includes(s)) return false
  return undefined
}

function mapHeaderToField(header: string): string | null {
  const n = normalizeHeader(header)
  if (!n) return null
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    if (aliases.includes(n)) return field
  }
  // coincidencia parcial suave
  if (n.includes("mayorista")) return "mayorista"
  if (n.includes("revendedor")) return "revendedor"
  if (n.includes("venta") && n.includes("local")) return "venta_local"
  if (n === "precio" || (n.includes("precio") && !n.includes("mayor") && !n.includes("revende"))) {
    return "price"
  }
  if (n.includes("nombre") || n.includes("producto") || n.includes("articulo")) return "name"
  if (n.includes("codigo") || n === "sku") return "code"
  if (n.includes("categ") || n.includes("rubro")) return "category"
  if (n.includes("stock") && !n.includes("min") && !n.includes("max")) return "stock"
  if (n === "iva" || n.includes("alicuota")) return "iva_rate"
  return null
}

function detectDelimiter(firstLine: string): string {
  const commas = (firstLine.match(/,/g) || []).length
  const semis = (firstLine.match(/;/g) || []).length
  const tabs = (firstLine.match(/\t/g) || []).length
  if (tabs >= commas && tabs >= semis && tabs > 0) return "\t"
  if (semis >= commas) return ";"
  return ","
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const out: string[] = []
  let cur = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (ch === delimiter && !inQuotes) {
      out.push(cur)
      cur = ""
      continue
    }
    cur += ch
  }
  out.push(cur)
  return out.map((c) => c.trim())
}

function rowsToItems(headers: string[], rows: unknown[][]): ParsedImportSheet {
  const warnings: string[] = []
  const fieldMap = headers.map((h) => mapHeaderToField(h))
  if (!fieldMap.includes("name")) {
    warnings.push(
      "No se detectó columna de nombre. Se intentará usar la primera columna de texto como nombre."
    )
  }

  const items: ProductImportItem[] = []
  let skippedEmptyRows = 0

  for (const row of rows) {
    const cells = row.map((c) => (c == null ? "" : String(c).trim()))
    if (cells.every((c) => !c)) {
      skippedEmptyRows++
      continue
    }

    const item: ProductImportItem = {}
    const prices: NonNullable<ProductImportItem["prices"]> = {}

    for (let i = 0; i < headers.length; i++) {
      const field = fieldMap[i]
      const raw = cells[i]
      if (!field || raw === undefined || raw === "") continue

      switch (field) {
        case "name":
        case "code":
        case "category":
        case "description":
          item[field] = raw
          break
        case "category_id":
        case "iva_rate":
        case "stock":
        case "min_stock":
        case "max_stock":
        case "price": {
          const n = parseNumber(raw)
          if (n !== undefined) (item as any)[field] = n
          break
        }
        case "venta_local":
        case "mayorista":
        case "revendedor": {
          const n = parseNumber(raw)
          if (n !== undefined) prices[field] = n
          break
        }
        case "is_active":
        case "allow_backorders": {
          const b = parseBool(raw)
          if (b !== undefined) item[field] = b
          break
        }
      }
    }

    if (Object.keys(prices).length > 0) {
      item.prices = prices
    }

    if (!item.name) {
      // fallback: primera celda no vacía que no sea solo número
      const fallback = cells.find((c) => c && Number.isNaN(Number(c.replace(",", "."))))
      if (fallback) {
        item.name = fallback
        warnings.push(`Fila sin nombre detectado: se usó "${fallback.slice(0, 40)}"`)
      } else {
        skippedEmptyRows++
        continue
      }
    }

    items.push(item)
  }

  return { items, headers, warnings, skippedEmptyRows }
}

export function parseDelimitedText(text: string): ParsedImportSheet {
  const cleaned = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n")
  const lines = cleaned.split("\n").filter((l, idx, arr) => !(idx === arr.length - 1 && l === ""))
  if (lines.length === 0) {
    return { items: [], headers: [], warnings: ["Archivo vacío"], skippedEmptyRows: 0 }
  }
  const delimiter = detectDelimiter(lines[0])
  const headers = parseCsvLine(lines[0], delimiter)
  const rows = lines.slice(1).map((line) => parseCsvLine(line, delimiter))
  return rowsToItems(headers, rows)
}

export async function parseImportFile(file: File): Promise<ParsedImportSheet> {
  const name = file.name.toLowerCase()
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const XLSX = await import("xlsx")
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf, { type: "array" })
    const sheetName = wb.SheetNames[0]
    if (!sheetName) {
      return { items: [], headers: [], warnings: ["El Excel no tiene hojas"], skippedEmptyRows: 0 }
    }
    const sheet = wb.Sheets[sheetName]
    const aoa = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
      header: 1,
      defval: "",
      raw: false,
    }) as unknown[][]
    if (!aoa.length) {
      return { items: [], headers: [], warnings: ["Hoja vacía"], skippedEmptyRows: 0 }
    }
    const headers = (aoa[0] || []).map((c) => String(c ?? "").trim())
    const rows = aoa.slice(1)
    const parsed = rowsToItems(headers, rows)
    if (wb.SheetNames.length > 1) {
      parsed.warnings.push(`Se importó solo la primera hoja: "${sheetName}"`)
    }
    return parsed
  }

  const text = await file.text()
  return parseDelimitedText(text)
}

export function downloadImportTemplateCsv() {
  const headers = [
    "nombre",
    "codigo",
    "categoria",
    "precio",
    "venta_local",
    "mayorista",
    "revendedor",
    "iva",
    "stock",
    "descripcion",
  ]
  const sample = [
    "Habano ejemplo",
    "",
    "Habanos",
    "15000",
    "",
    "",
    "",
    "21",
    "0",
    "Puede faltar código y precios de lista",
  ]
  const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`
  const csv = [headers.map(escape).join(","), sample.map(escape).join(",")].join("\n")
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "plantilla-importacion-productos.csv"
  a.click()
  URL.revokeObjectURL(url)
}
