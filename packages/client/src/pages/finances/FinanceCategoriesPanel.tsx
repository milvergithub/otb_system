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
import { ComboboxSelect } from "@/components/ui/combobox"
import { toast } from "sonner"
import { useFinanceCategories } from "@/hooks/finances"
import { api, getApiErrorMessage } from "@/lib/api"
import { ApiPath } from "@/lib/apiPath"
import Can from "@/components/Can"
import type { FinanceCategoryType } from "@/lib/types"

const CATEGORY_TYPES: Array<{ labelKey: string; value: FinanceCategoryType }> = [
  { labelKey: "finances.type.income", value: "income" },
  { labelKey: "finances.type.expense", value: "expense" },
  { labelKey: "finances.type.both", value: "both" },
]

export default function FinanceCategoriesPanel() {
  const { t } = useTranslation()
  const { data: categories, isLoading, refetch } = useFinanceCategories()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<{ id: string; name: string; type?: FinanceCategoryType } | null>(null)
  const [name, setName] = useState("")
  const [type, setType] = useState<FinanceCategoryType | "">("")
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)

  function openCreate() {
    setEditing(null)
    setName("")
    setType("")
    setDialogOpen(true)
  }
  function openEdit(c: { id: string; name: string; type?: FinanceCategoryType }) {
    setEditing(c)
    setName(c.name)
    setType(c.type ?? "")
    setDialogOpen(true)
  }

  function handleSave() {
    if (!name.trim()) return
    const payload = { name: name.trim(), type: type || undefined }
    const done = () => {
      refetch()
      setDialogOpen(false)
    }
    if (editing) {
      api.patch(ApiPath.FinanceCategories.ONE(editing.id), payload).then(done).catch((err) => toast.error(getApiErrorMessage(err)))
    } else {
      api.post(ApiPath.FinanceCategories.BASE, payload).then(done).catch((err) => toast.error(getApiErrorMessage(err)))
    }
  }

  function handleDelete(id: string) {
    api.delete(ApiPath.FinanceCategories.ONE(id)).then(() => {
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
        <p className="text-sm text-muted-foreground">{t("finances.categoriesDescription")}</p>
        <Can permission="finances.create">
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-2 size-4" />
            {t("finances.newCategory")}
          </Button>
        </Can>
      </div>

      {!categories?.length && (
        <p className="text-sm text-muted-foreground text-center py-8">{t("finances.noCategories")}</p>
      )}

      {categories?.map((c) => (
        <div key={c.id} className="flex items-center gap-3 rounded border p-3">
          <div className="flex-1">
            <p className="text-sm font-medium">{c.name}</p>
            <p className="text-xs text-muted-foreground">{t(`finances.type.${c.type}`)}</p>
          </div>
          <Can permission="finances.update">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </Can>
          <Can permission="finances.update">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget({ id: c.id, name: c.name })}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </Can>
        </div>
      ))}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? t("finances.editCategory") : t("finances.newCategory")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="finance-category-name">{t("finances.name")}</Label>
            <Input id="finance-category-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t("finances.typeLabel")}</Label>
            <ComboboxSelect value={type} onValueChange={(v) => setType(v as FinanceCategoryType)} options={[{label:t("common.none"),value:""},...CATEGORY_TYPES.map(o=>({label:t(o.labelKey),value:o.value}))]} placeholder={t("finances.allTypes")} />
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
            <AlertDialogTitle>{t("finances.deleteCategoryTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("finances.deleteCategoryConfirm", { name: deleteTarget?.name })}</AlertDialogDescription>
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
