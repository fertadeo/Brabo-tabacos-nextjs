"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useConfirmBeforeClose } from "@/lib/use-confirm-before-close"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createRepairOrderPayment, type CreateRepairOrderPaymentBody } from "@/lib/api"
import { IntegerCurrencyFieldInput } from "@/components/integer-currency-field-input"
import { DollarSign, Loader2 } from "lucide-react"

interface RepairOrderPaymentModalProps {
  orderId: number | string
  balance: number
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const PAYMENT_METHODS: { value: CreateRepairOrderPaymentBody["method"]; label: string }[] = [
  { value: "efectivo", label: "Efectivo" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "transferencia", label: "Transferencia" },
]

export function RepairOrderPaymentModal({
  orderId,
  balance,
  isOpen,
  onClose,
  onSuccess,
}: RepairOrderPaymentModalProps) {
  const [amount, setAmount] = useState(0)
  const [method, setMethod] = useState<CreateRepairOrderPaymentBody["method"]>("efectivo")
  const [paymentDate, setPaymentDate] = useState(() =>
    new Date().toISOString().slice(0, 16)
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const num = amount
    if (num <= 0) {
      setError("Ingresá un monto mayor a 0")
      return
    }
    setLoading(true)
    setError(null)
    try {
      await createRepairOrderPayment(orderId, {
        amount: num,
        method,
        payment_date: new Date(paymentDate).toISOString(),
      })
      onSuccess()
      onClose()
      setAmount(0)
      setMethod("efectivo")
      setPaymentDate(new Date().toISOString().slice(0, 16))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al registrar el pago")
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => onClose()

  const [handleOpenChange, confirmDialog] = useConfirmBeforeClose((open) => {
    if (!open) handleClose()
  })

  return (
    <>
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Registrar pago
          </DialogTitle>
          <DialogDescription>
            Saldo pendiente: ${balance.toLocaleString("es-AR")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Monto ($)</Label>
            <IntegerCurrencyFieldInput
              placeholder="Ej: 150000"
              value={amount}
              onValueChange={setAmount}
            />
          </div>
          <div className="space-y-2">
            <Label>Método de pago</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as CreateRepairOrderPaymentBody["method"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Fecha y hora</Label>
            <Input
              type="datetime-local"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Registrar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    {confirmDialog}
    </>
  )
}
