import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Tipos para canales de venta
export type SalesChannel = "woocommerce_minorista" | "woocommerce_mayorista" | "mercadolibre" | "sistema_mf" | "manual" | "otro";

// Configuración de canales de venta con colores y etiquetas
export const SALES_CHANNEL_CONFIG = {
  woocommerce_minorista: {
    label: "WooCommerce Minorista",
    shortLabel: "WooC Min",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    icon: "🛒",
    description: "Cliente de tienda WooCommerce minorista"
  },
  woocommerce_mayorista: {
    label: "WooCommerce Mayorista", 
    shortLabel: "WooC May",
    color: "bg-indigo-100 text-indigo-800 border-indigo-200",
    icon: "🏢",
    description: "Cliente de tienda WooCommerce mayorista"
  },
  mercadolibre: {
    label: "MercadoLibre",
    shortLabel: "ML",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    icon: "📦",
    description: "Cliente de MercadoLibre"
  },
  sistema_mf: {
    label: "Sistema local",
    shortLabel: "Local",
    color: "bg-turquoise-100 text-turquoise-800 border-turquoise-200",
    icon: "🏠",
    description: "Cliente del sistema local / mostrador"
  },
  manual: {
    label: "Manual",
    shortLabel: "Manual",
    color: "bg-gray-100 text-gray-800 border-gray-200",
    icon: "✏️",
    description: "Cliente creado manualmente"
  },
  otro: {
    label: "Otro",
    shortLabel: "Otro",
    color: "bg-purple-100 text-purple-800 border-purple-200",
    icon: "🔗",
    description: "Otro canal de venta"
  }
} as const;

// Función helper para obtener configuración del canal de venta
export function getSalesChannelConfig(channel: SalesChannel) {
  return SALES_CHANNEL_CONFIG[channel] || SALES_CHANNEL_CONFIG.otro;
}

// Función para obtener el color del canal de venta
export function getSalesChannelColor(channel: SalesChannel): string {
  return getSalesChannelConfig(channel).color;
}

// Función para obtener la etiqueta del canal de venta
export function getSalesChannelLabel(channel: SalesChannel): string {
  return getSalesChannelConfig(channel).label;
}

// Función para obtener la etiqueta corta del canal de venta
export function getSalesChannelShortLabel(channel: SalesChannel): string {
  return getSalesChannelConfig(channel).shortLabel;
}