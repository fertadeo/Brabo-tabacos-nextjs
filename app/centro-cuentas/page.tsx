"use client"

import { ERPLayout } from "@/components/erp-layout"
import { Protected } from "@/components/protected"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { UsersManagement } from "@/components/users-management"
import { UserPlus } from "lucide-react"

export default function CentroCuentasPage() {
  return (
    <Protected requiredRoles={["admin", "gerencia", "superadmin"]}>
      <ERPLayout activeItem="centro-cuentas">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <UserPlus className="h-8 w-8" />
              Centro de cuentas
            </h1>
            <p className="text-muted-foreground">
              Creá y administrá cuentas de acceso al sistema (usuarios, roles y estado).
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Cuentas de acceso</CardTitle>
              <CardDescription>
                Alta de nuevos usuarios con usuario, contraseña, datos personales y rol.
                Los permisos dependen del rol asignado.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UsersManagement />
            </CardContent>
          </Card>
        </div>
      </ERPLayout>
    </Protected>
  )
}
