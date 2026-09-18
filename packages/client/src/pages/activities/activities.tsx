import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import {
  CalendarDays,
  CircleDollarSign,
  Clock,
  Pencil,
  Plus,
  Search,
  Share2,
  Trash2,
} from "lucide-react"
import { useAuth } from "@/lib/auth"
import {
  useSearchActivities,
  useAddActivity,
  useEditActivity,
  useDeleteActivity,
  useFineTypes,
  useAddFineType,
  useEditFineType,
  useDeleteFineType,
} from "@/hooks/activities"
import type { Activity, FineType, FineTypeCode } from "@/lib/types"
import { getApiErrorMessage } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import Can from "@/components/Can"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { ComboboxSelect } from "@/components/ui/combobox"
import { useTableSort } from "@/hooks/use-sort"
import { RowActions } from "@/components/ui/row-actions"
import { DataTable, type DataTableColumn } from "@/components/ui/data-table"
import { DataTablePagination } from "@/components/ui/data-table-pagination"

function activitySchema(t: (k: string) => string) {
  return z.object({
    name: z.string().min(1, t("validation.required")),
    description: z.string().optional(),
    date: z.string().min(1, t("validation.required")),
    startTime: z.string().min(1, t("validation.required")),
    endTime: z.string().min(1, t("validation.required")),
  })
}

type ActivityFormValues = z.infer<ReturnType<typeof activitySchema>>

function fineTypeSchema(t: (k: string) => string) {
  return z.object({
    code: z.string().min(1, t("validation.required")),
    name: z.string().min(1, t("validation.required")),
    description: z.string().optional(),
    amount: z.coerce.number().min(0, t("validation.required")),
    is_active: z.boolean(),
  })
}

type FineTypeFormValues = z.infer<ReturnType<typeof fineTypeSchema>>

const FINE_TYPE_CODES: { value: FineTypeCode; label: string }[] = [
  { value: "absent_start", label: "Falta inicio" },
  { value: "absent_both", label: "Falta total" },
  { value: "absent_end", label: "Falta final" },
]

export default function ActivitiesPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user, hasPermission } = useAuth()

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")

  const { sort, toggleSort } = useTableSort(
    { key: "created_at", order: "desc" },
    () => setPage(1),
  )

  const { data, isLoading } = useSearchActivities({
    page,
    search,
    sortBy: sort?.key,
    sortOrder: sort?.order,
  })

  const addMut = useAddActivity()
  const editMut = useEditActivity()
  const deleteMut = useDeleteActivity()

  const { data: fineTypes, isLoading: loadingFineTypes } = useFineTypes()
  const addFineTypeMut = useAddFineType()
  const editFineTypeMut = useEditFineType()
  const deleteFineTypeMut = useDeleteFineType()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Activity | null>(null)
  const [deleting, setDeleting] = useState<Activity | null>(null)

  const [ftDialogOpen, setFtDialogOpen] = useState(false)
  const [editingFt, setEditingFt] = useState<FineType | null>(null)
  const [deletingFt, setDeletingFt] = useState<FineType | null>(null)

  const form = useForm<ActivityFormValues>({
    resolver: zodResolver(activitySchema(t)),
    defaultValues: {
      name: "",
      description: "",
      date: new Date().toISOString().split("T")[0],
      startTime: "08:00",
      endTime: "12:00",
    },
  })

  const ftForm = useForm<FineTypeFormValues>({
    resolver: zodResolver(fineTypeSchema(t)),
    defaultValues: {
      code: "absent_start",
      name: "",
      description: "",
      amount: 0,
      is_active: true,
    },
  })

  const watchFtCode = useWatch({ control: ftForm.control, name: "code" })

  const openCreate = () => {
    setEditing(null)
    form.reset({
      name: "",
      description: "",
      date: new Date().toISOString().split("T")[0],
      startTime: "08:00",
      endTime: "12:00",
    })
    setDialogOpen(true)
  }

  const openEdit = (a: Activity) => {
    setEditing(a)
    form.reset({
      name: a.name,
      description: a.description ?? "",
      date: a.date,
      startTime: a.start_time,
      endTime: a.end_time,
    })
    setDialogOpen(true)
  }

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      if (editing) {
        await editMut.mutateAsync({ id: editing.id, ...values })
        toast.success(t("common.saved"))
      } else {
        await addMut.mutateAsync(values)
        toast.success(t("common.created"))
      }
      setDialogOpen(false)
    } catch (err) {
      toast.error(getApiErrorMessage(err))
    }
  })

  const onDelete = async () => {
    if (!deleting) return
    try {
      await deleteMut.mutateAsync({ id: deleting.id })
      toast.success(t("common.deleted"))
      setDeleting(null)
    } catch (err) {
      toast.error(getApiErrorMessage(err))
    }
  }

  const openCreateFt = () => {
    setEditingFt(null)
    ftForm.reset({
      code: "absent_start",
      name: "",
      description: "",
      amount: 0,
      is_active: true,
    })
    setFtDialogOpen(true)
  }

  const openEditFt = (ft: FineType) => {
    setEditingFt(ft)
    ftForm.reset({
      code: ft.code,
      name: ft.name,
      description: ft.description ?? "",
      amount: Number(ft.amount),
      is_active: ft.is_active,
    })
    setFtDialogOpen(true)
  }

  const onSubmitFt = ftForm.handleSubmit(async (values) => {
    try {
      if (editingFt) {
        await editFineTypeMut.mutateAsync({ id: editingFt.id, ...values })
        toast.success(t("common.saved"))
      } else {
        await addFineTypeMut.mutateAsync(values)
        toast.success(t("common.created"))
      }
      setFtDialogOpen(false)
    } catch (err) {
      toast.error(getApiErrorMessage(err))
    }
  })

  const onDeleteFt = async () => {
    if (!deletingFt) return
    try {
      await deleteFineTypeMut.mutateAsync({ id: deletingFt.id })
      toast.success(t("common.deleted"))
      setDeletingFt(null)
    } catch (err) {
      toast.error(getApiErrorMessage(err))
    }
  }

  const formatShortDate = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString()

  const activityColumns: DataTableColumn<Activity>[] = [
    {
      key: "name",
      label: t("activities.name"),
      sortable: true,
      render: (a) => (
        <span className="font-medium">{a.name}</span>
      ),
    },
    {
      key: "date",
      label: t("activities.date"),
      sortable: true,
      render: (a) => (
        <span className="text-muted-foreground">{formatShortDate(a.date)}</span>
      ),
    },
    {
      key: "time",
      label: t("activities.startTime"),
      render: (a) => (
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <Clock className="size-3" />
          {a.start_time} - {a.end_time}
        </span>
      ),
    },
    {
      key: "creator",
      label: "",
      render: (a) =>
        a.created_by !== user?.id && a.creator ? (
          <Badge variant="outline" className="text-xs">
            {t("activities.sharedBy", { name: a.creator.full_name })}
          </Badge>
        ) : null,
    },
    {
      key: "actions",
      label: "",
      className: "w-10",
      stickyRight: true,
      render: (a) => {
        const isOwner = a.created_by === user?.id
        return (
            <div onClick={(e) => e.stopPropagation()}>
              <RowActions
                items={[
                  ...(isOwner
                    ? [
                        {
                          label: t("activities.shareActivity"),
                          icon: <Share2 className="size-4" />,
                          permission: "activities.update" as const,
                          onClick: () => navigate(`/actividades/${a.id}`),
                        },
                        {
                          label: t("common.edit"),
                          icon: <Pencil className="size-4" />,
                          permission: "activities.update" as const,
                          onClick: () => openEdit(a),
                        },
                        {
                          label: t("common.delete"),
                          icon: <Trash2 className="size-4" />,
                          permission: "activities.delete" as const,
                          destructive: true as const,
                          onClick: () => setDeleting(a),
                        },
                      ]
                    : []),
                ]}
              />
            </div>
        )
      },
    } as const,
  ]

  if (!hasPermission("activities.read")) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-muted-foreground">{t("common.accessDenied")}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("activities.title")}</h1>
        <p className="text-muted-foreground">{t("activities.subtitle")}</p>
      </div>

      <Tabs defaultValue="activities">
        <TabsList>
          <TabsTrigger value="activities">
            {t("activities.title")}
            {data ? (
              <Badge variant="secondary" className="ml-1">
                {data.total}
              </Badge>
            ) : null}
          </TabsTrigger>
          <Can permission="activities.read">
            <TabsTrigger value="fineTypes">
              {t("activities.fineTypesTitle")}
              {fineTypes ? (
                <Badge variant="secondary" className="ml-1">
                  {fineTypes.length}
                </Badge>
              ) : null}
            </TabsTrigger>
          </Can>
        </TabsList>

        <TabsContent value="activities" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder={t("common.search")}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setSearch(searchInput.trim())
                    setPage(1)
                  }
                }}
              />
            </div>
            <Can permission="activities.create">
              <Button onClick={openCreate}>
                <Plus className="mr-2 size-4" />
                {t("activities.create")}
              </Button>
            </Can>
          </div>

          <Card>
            <CardContent className="p-0">
              <DataTable<Activity>
                columns={activityColumns}
                data={data?.items ?? []}
                sort={sort}
                onSort={toggleSort}
                isLoading={isLoading}
                emptyIcon={<CalendarDays className="mx-auto size-6 text-muted-foreground" />}
                emptyText={t("activities.noActivities")}
                rowKey={(a) => a.id}
                onRowClick={(a) => navigate(`/actividades/${a.id}/asistencia`)}
              />
            </CardContent>
          </Card>

          {data ? (
            <DataTablePagination
              page={data.page}
              totalPages={data.totalPages}
              total={data.total}
              onPageChange={setPage}
              noun={t("activities.title").toLowerCase()}
            />
          ) : null}
        </TabsContent>

        <Can permission="activities.read">
          <TabsContent value="fineTypes" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
                  <CircleDollarSign className="size-5" />
                  {t("activities.fineTypesTitle")}
                </h2>
                <p className="text-sm text-muted-foreground">{t("activities.fineTypesSubtitle")}</p>
              </div>
              <Can permission="activities.create">
                <Button variant="outline" onClick={openCreateFt}>
                  <Plus className="mr-2 size-4" />
                  {t("activities.createFineType")}
                </Button>
              </Can>
            </div>

            {loadingFineTypes ? (
              <p className="text-muted-foreground">{t("common.loading")}</p>
            ) : !fineTypes?.length ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <CircleDollarSign className="mb-3 size-10 text-muted-foreground/50" />
                  <p className="text-muted-foreground">{t("activities.noFineTypes")}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {fineTypes.map((ft) => (
                  <Card key={ft.id}>
                    <CardContent className="flex items-center gap-4 p-4">
                      <Badge variant="outline" className="font-mono shrink-0">
                        {ft.code}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium">{ft.name}</h3>
                        {ft.description && (
                          <p className="text-sm text-muted-foreground">{ft.description}</p>
                        )}
                      </div>
                      <span className="font-semibold shrink-0">{ft.amount} BOB</span>
                      {!ft.is_active && (
                        <Badge variant="secondary">{t("common.inactive")}</Badge>
                      )}
                      <div className="flex items-center gap-1 shrink-0">
                        <Can permission="activities.update">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => openEditFt(ft)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                        </Can>
                        <Can permission="activities.delete">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-destructive"
                            onClick={() => setDeletingFt(ft)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </Can>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Can>
      </Tabs>

      {/* Activity Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? t("activities.edit") : t("activities.create")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("activities.name")}</label>
              <Input {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("common.description")}</label>
              <Input {...form.register("description")} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("activities.date")}</label>
              <Input type="date" {...form.register("date")} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("activities.startTime")}</label>
                <Input type="time" {...form.register("startTime")} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("activities.endTime")}</label>
                <Input type="time" {...form.register("endTime")} />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={addMut.isPending || editMut.isPending}>
                {addMut.isPending || editMut.isPending ? t("common.saving") : t("common.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Activity Delete Dialog */}
      <AlertDialog open={!!deleting} onOpenChange={() => setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("activities.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("activities.deleteConfirm", { name: deleting?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMut.isPending ? t("common.deleting") : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Fine Type Dialog */}
      <Dialog open={ftDialogOpen} onOpenChange={setFtDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingFt ? t("activities.editFineType") : t("activities.createFineType")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmitFt} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("activities.fineTypeCode")}</label>
              <ComboboxSelect
                value={watchFtCode}
                onValueChange={(v) => ftForm.setValue("code", v as FineTypeCode)}
                className="w-full"
                options={FINE_TYPE_CODES.map((c) => ({ label: c.label, value: c.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("activities.fineTypeName")}</label>
              <Input {...ftForm.register("name")} />
              {ftForm.formState.errors.name && (
                <p className="text-sm text-destructive">{ftForm.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("activities.fineTypeDescription")}</label>
              <Input {...ftForm.register("description")} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("activities.fineTypeAmount")}</label>
              <Input type="number" step="0.01" {...ftForm.register("amount")} />
              {ftForm.formState.errors.amount && (
                <p className="text-sm text-destructive">{ftForm.formState.errors.amount.message}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={ftForm.watch("is_active")}
                onCheckedChange={(v) => ftForm.setValue("is_active", v)}
              />
              <label className="text-sm font-medium">{t("activities.fineTypeActive")}</label>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={addFineTypeMut.isPending || editFineTypeMut.isPending}>
                {addFineTypeMut.isPending || editFineTypeMut.isPending ? t("common.saving") : t("common.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Fine Type Delete Dialog */}
      <AlertDialog open={!!deletingFt} onOpenChange={() => setDeletingFt(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("activities.deleteFineTypeTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("activities.deleteFineTypeConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDeleteFt}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteFineTypeMut.isPending ? t("common.deleting") : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
