/**
 * Regla compartida crear/editar producto: stock 0 sin encargo → inactivo;
 * stock pasa de 0 a >0 sin encargo → activo (simétrico).
 */
export function nextIsActiveAfterStockChange(
  prev: { stock: string; allow_backorders: string; is_active: string },
  newStock: string
): string {
  const stockValue = parseInt(newStock, 10) || 0
  const prevStock = parseInt(prev.stock, 10) || 0
  const backorders = prev.allow_backorders === "1"
  if (stockValue === 0 && !backorders) return "0"
  if (stockValue > 0 && prevStock === 0 && !backorders) return "1"
  return prev.is_active
}
