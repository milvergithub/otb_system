import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Pencil, Plus, Trash2, Wallet } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  useCreatePaymentMethod,
  useDeletePaymentMethod,
  useEditPaymentMethod,
  usePaymentMethods,
} from "@/hooks/paymentMethods"
import type { PaymentMethodItem } from "@/lib/types"
import Can from "@/components/Can"

export default function PaymentMethodsPanel() {
  const { t } = useTranslation()
  const { data: paymentMethods, isLoading } = usePaymentMethods()
  const createPaymentMethod = useCreatePaymentMethod()
  const updatePaymentMethod = useEditPaymentMethod()
  const deletePaymentMethod = useDeletePaymentMethod()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<PaymentMethodItem | null>(null)
  const [code, setCode] = useState("")
  const [name, setName] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<PaymentMethodItem | null>(
    null,
  )

  function openCreate() {
    setEditing(null)
    setCode("")
    setName("")
    setDialogOpen(true)
  }

  function openEdit(pm: PaymentMethodItem) {
    setEditing(pm)
    setCode(pm.code)
    setName(pm.name)
    setDialogOpen(true)
  }

  function handleSave() {
    const trimmedCode = code.trim()
    const trimmedName = name.trim()
    if (!trimmedCode || !trimmedName) return
    if (editing) {
      updatePaymentMethod.mutate(
        { id: editing.id, name: trimmedName },
        { onSuccess: () => setDialogOpen(false) },
      )
    } else {
      createPaymentMethod.mutate(
        { code: trimmedCode, name: trimmedName },
        { onSuccess: () => setDialogOpen(false) },
      )
    }
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return
    deletePaymentMethod.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t("settings.paymentMethods.description")}
        </p>
        <Can permission="payment_methods.create">
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-2 size-4" />
            {t("settings.paymentMethods.new")}
          </Button>
        </Can>
      </div>

      <div className="space-y-2">
        {!paymentMethods?.length ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            {t("settings.paymentMethods.empty")}
          </p>
        ) : (
          paymentMethods.map((pm) => (
            <div
              key={pm.id}
              className="flex items-center gap-3 p-3 rounded-md border hover:bg-accent/50"
            >
              <Badge variant="outline" className="font-mono shrink-0">
                {pm.code}
              </Badge>
              <span className="flex-1 text-sm font-medium">{pm.name}</span>
              <Can permission="payment_methods.update">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => openEdit(pm)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </Can>
              <Can permission="payment_methods.delete">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={() => setDeleteTarget(pm)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </Can>
            </div>
          ))
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing
                ? t("settings.paymentMethods.edit")
                : t("settings.paymentMethods.new")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t("settings.paymentMethods.code")}</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={t("settings.paymentMethods.codePlaceholder")}
                disabled={!!editing}
                className="font-mono"
                maxLength={30}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("settings.paymentMethods.name")}</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("settings.paymentMethods.namePlaceholder")}
                maxLength={50}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleSave}
              disabled={!name.trim() || (!editing && !code.trim())}
            >
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("settings.paymentMethods.deleteTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("settings.paymentMethods.deleteDescription", {
                name: deleteTarget?.name || "",
              })}
              {t("settings.paymentMethods.deleteInUse")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmDelete}
            >
              <Trash2 className="mr-2 size-4" />
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
