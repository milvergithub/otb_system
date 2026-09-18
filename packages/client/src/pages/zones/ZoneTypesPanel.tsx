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
  useZoneTypes,
  useCreateZoneType,
  useUpdateZoneType,
  useDeleteZoneType,
} from "@/hooks/zoneTypes"
import type { ZoneTypeItem } from "@/lib/types"
import Can from "@/components/Can"

export default function ZoneTypesPanel() {
  const { t } = useTranslation()
  const { data: zoneTypes, isLoading } = useZoneTypes()
  const createZoneType = useCreateZoneType()
  const updateZoneType = useUpdateZoneType()
  const deleteZoneType = useDeleteZoneType()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ZoneTypeItem | null>(null)
  const [name, setName] = useState("")
  const [defaultColor, setDefaultColor] = useState("#3b82f6")
  const [defaultLineWidth, setDefaultLineWidth] = useState(3)
  const [deleteTarget, setDeleteTarget] = useState<ZoneTypeItem | null>(null)

  function openCreate() {
    setEditing(null)
    setName("")
    setDefaultColor("#3b82f6")
    setDefaultLineWidth(3)
    setDialogOpen(true)
  }

  function openEdit(zt: ZoneTypeItem) {
    setEditing(zt)
    setName(zt.name)
    setDefaultColor(zt.default_color)
    setDefaultLineWidth(zt.default_line_width)
    setDialogOpen(true)
  }

  function handleSave() {
    if (!name.trim()) return
    if (editing) {
      updateZoneType.mutate(
        { id: editing.id, name, default_color: defaultColor, default_line_width: defaultLineWidth },
        { onSuccess: () => setDialogOpen(false) },
      )
    } else {
      createZoneType.mutate(
        { name, default_color: defaultColor, default_line_width: defaultLineWidth },
        { onSuccess: () => setDialogOpen(false) },
      )
    }
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return
    deleteZoneType.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t("zones.typesDescription", "Define los tipos de zona disponibles y sus propiedades por defecto")}
        </p>
        <Can permission="zone_types.create">
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-2 size-4" />
            {t("zones.newType", "Nuevo tipo")}
          </Button>
        </Can>
      </div>

      <div className="space-y-2">
        {!zoneTypes?.length ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            {t("zones.noTypes", "No hay tipos de zona definidos")}
          </p>
        ) : (
          zoneTypes.map((zt) => (
            <div
              key={zt.id}
              className="flex items-center gap-3 p-3 rounded-md border hover:bg-accent/50"
            >
              <div className="flex items-center gap-2">
                <div
                  className="h-5 w-5 rounded-sm shrink-0 border"
                  style={{ backgroundColor: zt.default_color }}
                />
                <span className="text-xs text-muted-foreground border rounded px-1.5 py-0.5">
                  {zt.default_line_width}px
                </span>
              </div>
              <span className="flex-1 text-sm font-medium">{zt.name}</span>
              <Can permission="zone_types.update">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => openEdit(zt)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </Can>
              <Can permission="zone_types.delete">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={() => setDeleteTarget(zt)}
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
                ? t("zones.editType", "Editar tipo")
                : t("zones.newType", "Nuevo tipo")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t("zones.typeName", "Nombre")}</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("zones.typeNamePlaceholder", "Ej: Zona Residencial")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("zones.defaultColor", "Color por defecto")}</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={defaultColor}
                  onChange={(e) => setDefaultColor(e.target.value)}
                  className="h-8 w-8 cursor-pointer rounded border"
                />
                <Input
                  value={defaultColor}
                  onChange={(e) => setDefaultColor(e.target.value)}
                  className="w-28 font-mono"
                  maxLength={7}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("zones.defaultLineWidth", "Ancho de línea por defecto")}: {defaultLineWidth}</Label>
              <input
                type="range"
                min={1}
                max={10}
                value={defaultLineWidth}
                onChange={(e) => setDefaultLineWidth(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1</span>
                <span>10</span>
              </div>
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
            <AlertDialogTitle>{t("zones.deleteTypeTitle", "Eliminar tipo")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "zones.deleteTypeDescription",
                "¿Estás seguro de que quieres eliminar el tipo \"{{name}}\"?",
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
