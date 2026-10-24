import { ERPLayout } from "@/components/erp-layout"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export default function VentasLoading() {
  return (
    <ERPLayout activeItem="ventas">
      <div className="space-y-6">
        <div className="h-20 bg-muted/30 rounded-lg animate-pulse" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 w-32 bg-muted rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <div className="h-6 w-48 bg-muted rounded animate-pulse" />
            <div className="h-4 w-64 bg-muted/80 rounded animate-pulse mt-2" />
          </CardHeader>
          <CardContent>
            <div className="flex justify-center py-12">
              <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>
    </ERPLayout>
  )
}
