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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { useAssetLocations } from "@/hooks/assets"
import { getApiErrorMessage } from "@/lib/api"
import { api } from "@/lib/api"
import { ApiPath } from "@/lib/apiPath"
import Can from "@/components/Can"

export default function AssetLocationsPanel() {
  const { t } = useTranslation()
  const { data: locations, isLoading, refetch } = useAssetLocations()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null)
  const [name, setName] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)

  function openCreate() {
    setEditing(null)
    setName("")
    setDialogOpen(true)
  }
  function openEdit(l: { id: string; name: string }) {
    setEditing(l)
    setName(l.name)
    setDialogOpen(true)
  }

  function handleSave() {
    if (!name.trim()) return
    const payload = { name: name.trim() }
    const done = () => {
      refetch()
      setDialogOpen(false)
    }
    if (editing) {
      api.patch(ApiPath.AssetLocations.ONE(editing.id), payload).then(done).catch((err) => toast.error(getApiErrorMessage(err)))
    } else {
      api.post(ApiPath.AssetLocations.BASE, payload).then(done).catch((err) => toast.error(getApiErrorMessage(err)))
    }
  }

  function handleDelete(id: string) {
    api.delete(ApiPath.AssetLocations.ONE(id)).then(() => {
      refetch()
      setDeleteTarget(null)
    }).catch((err) => toast.error(getApiErrorMessage(err)))
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
        <p className="text-sm text-muted-foreground">{t("assets.locationsDescription")}</p>
        <Can permission="assets.create">
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-2 size-4" />
            {t("assets.newLocation")}
          </Button>
        </Can>
      </div>

      {!locations?.length && (
        <p className="text-sm text-muted-foreground text-center py-8">{t("assets.noLocations")}</p>
      )}

      {locations?.map((l) => (
        <div key={l.id} className="flex items-center gap-3 rounded border p-3">
          <span className="flex-1 text-sm font-medium">{l.name}</span>
          <Can permission="assets.update">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(l)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </Can>
          <Can permission="assets.delete">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget({ id: l.id, name: l.name })}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </Can>
        </div>
      ))}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? t("assets.editLocation") : t("assets.newLocation")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="asset-location-name">{t("assets.name")}</Label>
            <Input id="asset-location-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleSave}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("assets.deleteLocationTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("assets.deleteLocationConfirm", { name: deleteTarget?.name })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && handleDelete(deleteTarget.id)}>{t("common.delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
