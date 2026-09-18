import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Pencil, Plus, Trash2 } from "lucide-react"
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
  useMeterTypes,
  useCreateMeterType,
  useUpdateMeterType,
  useDeleteMeterType,
} from "@/hooks/meterTypes"
import type { MeterTypeItem } from "@/lib/types"
import Can from "@/components/Can"

export default function MeterTypesPanel() {
  const { t } = useTranslation()
  const { data: meterTypes, isLoading } = useMeterTypes()
  const createMeterType = useCreateMeterType()
  const updateMeterType = useUpdateMeterType()
  const deleteMeterType = useDeleteMeterType()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<MeterTypeItem | null>(null)
  const [name, setName] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<MeterTypeItem | null>(null)

  function openCreate() {
    setEditing(null)
    setName("")
    setDialogOpen(true)
  }

  function openEdit(mt: MeterTypeItem) {
    setEditing(mt)
    setName(mt.name)
    setDialogOpen(true)
  }

  function handleSave() {
    if (!name.trim()) return
    if (editing) {
      updateMeterType.mutate(
        { id: editing.id, name },
        { onSuccess: () => setDialogOpen(false) },
      )
    } else {
      createMeterType.mutate(
        { name },
        { onSuccess: () => setDialogOpen(false) },
      )
    }
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return
    deleteMeterType.mutate(deleteTarget.id, {
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
          {t("meters.typesDescription", "Define los tipos de medidor disponibles")}
        </p>
        <Can permission="meter_types.create">
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-2 size-4" />
            {t("meters.newType", "Nuevo tipo")}
          </Button>
        </Can>
      </div>

      <div className="space-y-2">
        {!meterTypes?.length ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            {t("meters.noTypes", "No hay tipos de medidor definidos")}
          </p>
        ) : (
          meterTypes.map((mt) => (
            <div
              key={mt.id}
              className="flex items-center gap-3 p-3 rounded-md border hover:bg-accent/50"
            >
              <span className="flex-1 text-sm font-medium">{mt.name}</span>
              <Can permission="meter_types.update">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => openEdit(mt)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </Can>
              <Can permission="meter_types.delete">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={() => setDeleteTarget(mt)}
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
                ? t("meters.editType", "Editar tipo")
                : t("meters.newType", "Nuevo tipo")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t("meters.typeName", "Nombre")}</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("meters.typeNamePlaceholder", "Ej: Residencial")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t("common.cancel", "Cancelar")}
            </Button>
            <Button onClick={handleSave} disabled={!name.trim()}>
              {t("common.save", "Guardar")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("meters.deleteTypeTitle", "Eliminar tipo")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "meters.deleteTypeDescription",
                '¿Estás seguro de que quieres eliminar el tipo "{{name}}"?',
              ).replace("{{name}}", deleteTarget?.name || "")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel", "Cancelar")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmDelete}
            >
              {t("common.delete", "Eliminar")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
