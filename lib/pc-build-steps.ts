import type { Product } from "@/lib/api"

export interface PcBuildStep {
  id: string
  label: string
  description: string
  /** Palabras en nombre, código o categoría del producto */
  keywords: string[]
  optional?: boolean
}

export const PC_BUILD_STEPS: PcBuildStep[] = [
  {
    id: "case",
    label: "Gabinete",
    description: "Chasis, formato (ITX / ATX) y ventilación.",
    keywords: ["gabinete", "case", "chasis", "tower", "mid tower", "full tower"],
  },
  {
    id: "motherboard",
    label: "Motherboard",
    description: "Placa madre compatible con el procesador y el gabinete.",
    keywords: ["motherboard", "mother", "placa madre", "mainboard", "mobo", "placa base"],
  },
  {
    id: "cpu",
    label: "Procesador",
    description: "CPU (Intel / AMD) acorde al socket de la placa.",
    keywords: ["procesador", "cpu", "ryzen", "core i3", "core i5", "core i7", "core i9", "athlon", "pentium", "celeron"],
  },
  {
    id: "ram",
    label: "Memoria RAM",
    description: "Módulos DDR según placa y uso (8 / 16 / 32 GB).",
    keywords: ["memoria", "ram", "ddr4", "ddr5", "sodimm", "dimm"],
  },
  {
    id: "storage",
    label: "Almacenamiento",
    description: "SSD / NVMe / HDD para sistema y datos.",
    keywords: ["ssd", "nvme", "m.2", "hdd", "disco", "almacenamiento", "storage"],
  },
  {
    id: "gpu",
    label: "Placa de video",
    description: "GPU dedicada o integrada según el uso.",
    keywords: ["placa de video", "gpu", "geforce", "radeon", "rtx", "gtx", "video"],
    optional: true,
  },
  {
    id: "psu",
    label: "Fuente de poder",
    description: "PSU con wattaje y certificación adecuados.",
    keywords: ["fuente", "psu", "power supply", "80 plus", "watts", "fuente de alimentacion"],
  },
  {
    id: "cooler",
    label: "Refrigeración",
    description: "Cooler CPU o líquida si el gabinete lo permite.",
    keywords: ["cooler", "refriger", "ventilador cpu", "aio", "watercool", "disipador"],
    optional: true,
  },
  {
    id: "monitor",
    label: "Monitor",
    description: "Pantalla según resolución y uso.",
    keywords: ["monitor", "pantalla", "display"],
    optional: true,
  },
  {
    id: "peripherals",
    label: "Periféricos",
    description: "Teclado, mouse, auriculares u otros accesorios.",
    keywords: ["teclado", "mouse", "auricular", "headset", "webcam", "parlante", "perifer"],
    optional: true,
  },
]

function productHaystack(p: Product): string {
  return [p.name, p.code, p.category_name, p.description]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
}

export function productMatchesPcStep(product: Product, step: PcBuildStep): boolean {
  const hay = productHaystack(product)
  return step.keywords.some((kw) => {
    const k = kw.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "")
    return hay.includes(k)
  })
}

export function filterProductsForPcStep(products: Product[], step: PcBuildStep): Product[] {
  const matched = products.filter((p) => productMatchesPcStep(p, step))
  if (matched.length > 0) return matched
  // Sin coincidencias: mostrar catálogo completo para no bloquear al usuario
  return products
}

export function findPcStepForProduct(product: Product): PcBuildStep | undefined {
  return PC_BUILD_STEPS.find((step) => productMatchesPcStep(product, step))
}
