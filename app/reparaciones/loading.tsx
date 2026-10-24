import { ERPLayout } from "@/components/erp-layout"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function ReparacionesLoading() {
  return (
    <ERPLayout activeItem="reparaciones">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Skeleton className="h-9 w-64 mb-2" />
            <Skeleton className="h-5 w-96" />
          </div>
        </div>
        <Card>
          <CardHeader className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-4 flex-wrap">
                <Skeleton className="h-10 w-40" />
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-10 w-28" />
                <Skeleton className="h-10 w-28" />
              </div>
              <Skeleton className="h-[400px] w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    </ERPLayout>
  )
}
