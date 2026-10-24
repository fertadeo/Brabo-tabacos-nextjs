/** Nombre de cliente para listados y modales (mayúsculas, locale AR). */
export function formatClienteNombreDisplay(name?: string | null): string {
  return (name ?? "").trim().toLocaleUpperCase("es-AR")
}
