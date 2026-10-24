"use client"

import Link from "next/link"
import { ERPLayout } from "@/components/erp-layout"
import { Protected } from "@/components/protected"
import { CategoryAdjustmentPanel } from "@/components/product-pricing/category-adjustment-panel"
import { DollarAdjustmentPanel } from "@/components/product-pricing/dollar-adjustment-panel"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Percent, TrendingUp } from "lucide-react"
import { useRouter } from "next/navigation"

export default function ActualizacionPreciosPage() {
  const router = useRouter()

  const handleApplied = () => {
    router.refresh()
  }

  return (
    <Protected requiredRoles={["gerencia"]}>
      <ERPLayout activeItem="actualizacion-precios">
        <div className="space-y-4 sm:space-y-6 pb-2 sm:pb-0">
          <div className="flex flex-col gap-3 sm:gap-4">
            <Button variant="ghost" size="sm" className="-ml-2 w-fit max-w-full" asChild>
              <Link href="/productos">
                <ArrowLeft className="h-4 w-4 mr-2 shrink-0" />
                <span className="truncate">Volver a productos</span>
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Actualización de precios
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base mt-1 max-w-2xl">
                Ajuste masivo por porcentaje según categorías o por variación del dólar oficial (ARS).
                Solo productos activos. Confirmá cada operación antes de aplicar.
              </p>
            </div>
          </div>

          <Tabs defaultValue="categoria" className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-auto p-1 gap-1">
              <TabsTrigger
                value="categoria"
                className="gap-1.5 sm:gap-2 py-2.5 text-xs sm:text-sm data-[state=active]:shadow-sm"
              >
                <Percent className="h-4 w-4 shrink-0" />
                <span className="truncate">Por categoría</span>
              </TabsTrigger>
              <TabsTrigger
                value="dolar"
                className="gap-1.5 sm:gap-2 py-2.5 text-xs sm:text-sm data-[state=active]:shadow-sm"
              >
                <TrendingUp className="h-4 w-4 shrink-0" />
                <span className="truncate">Por dólar</span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="categoria" className="mt-4 sm:mt-6 focus-visible:outline-none">
              <CategoryAdjustmentPanel onApplied={handleApplied} />
            </TabsContent>
            <TabsContent value="dolar" className="mt-4 sm:mt-6 focus-visible:outline-none">
              <DollarAdjustmentPanel onApplied={handleApplied} />
            </TabsContent>
          </Tabs>
        </div>
      </ERPLayout>
    </Protected>
  )
}
