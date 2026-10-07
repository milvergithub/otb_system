import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import {
  CalendarDays,
  CircleDollarSign,
  Clock,
  Pencil,
  Ban,
  CheckCircle2,
  Play,
  Plus,
  Search,
  Tag,
  Trash2, MonitorCheck, Type, FileTypeCorner,
} from "lucide-react"
import { useAuth } from "@/lib/auth"
import {
  useSearchActivities,
  useAddActivity,
  useEditActivity,
  useDeleteActivity,
  useChangeActivityStatus,
  useActivityTypes,
  useAddActivityType,
  useEditActivityType,
  useFineTypes,
  useAddFineType,
  useEditFineType,
  useDeleteFineType,
} from "@/hooks/activities"
import type {
  Activity,
  ActivityStatus,
  ActivityType,
  FineType,
  FineTypeAppliesTo,
} from "@/lib/types"
import { getApiErrorMessage } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { useForm, useWatch, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { ComboboxSelect } from "@/components/ui/combobox"
import { DatePicker } from "@/components/ui/date-picker"
import { TimePicker } from "@/components/ui/time-picker"
import { useSearchUsers } from "@/hooks/users"
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
    typeId: z.string().optional(),
    location: z.string().optional(),
    responsibleUserId: z.string().optional(),
    collectorUserId: z.string().optional(),
    attendanceRequired: z.boolean(),
    fineEnabled: z.boolean(),
  })
}

type ActivityFormValues = z.infer<ReturnType<typeof activitySchema>>

function fineTypeSchema(t: (k: string) => string) {
  return z.object({
    code: z.string().min(1, t("validation.required")),
    name: z.string().min(1, t("validation.required")),
    description: z.string().optional(),
    amount: z.coerce.number().min(0, t("validation.required")),
    applies_to: z.enum(["absent", "late", "left_early", "any", "manual"]),
    is_active: z.boolean(),
  })
}

type FineTypeFormValues = z.infer<ReturnType<typeof fineTypeSchema>>

function activityTypeSchema(t: (k: string) => string) {
  return z.object({
    code: z.string().min(1, t("validation.required")),
    name: z.string().min(1, t("validation.required")),
    description: z.string().optional(),
    is_active: z.boolean(),
  })
}

type ActivityTypeFormValues = z.infer<ReturnType<typeof activityTypeSchema>>

const ACTIVITY_STATUSES: ActivityStatus[] = [
  "draft",
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
]

const STATUS_BADGE: Record<
  ActivityStatus,
  { variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  draft: { variant: "secondary" },
  scheduled: { variant: "outline" },
  in_progress: { variant: "default" },
  completed: { variant: "outline" },
  cancelled: { variant: "destructive" },
}

const APPLIES_TO_OPTIONS: FineTypeAppliesTo[] = [
  "absent",
  "late",
  "left_early",
  "any",
  "manual",
]

export default function ActivitiesPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user, hasPermission } = useAuth()

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [status, setStatus] = useState<ActivityStatus | undefined>()
  const [typeId, setTypeId] = useState<string | undefined>()
  const [dateFrom, setDateFrom] = useState<string | undefined>()
  const [dateTo, setDateTo] = useState<string | undefined>()

  const { sort, toggleSort } = useTableSort(
    { key: "created_at", order: "desc" },
    () => setPage(1),
  )

  const { data, isLoading } = useSearchActivities({
    page,
    search,
    sortBy: sort?.key,
    sortOrder: sort?.order,
    status,
    typeId,
    dateFrom,
    dateTo,
  })

  const addMut = useAddActivity()
  const editMut = useEditActivity()
  const deleteMut = useDeleteActivity()

  const { data: fineTypes, isLoading: loadingFineTypes } = useFineTypes()
  const { data: activityTypes } = useActivityTypes()
  const changeStatusMut = useChangeActivityStatus()
  const addActivityTypeMut = useAddActivityType()
  const editActivityTypeMut = useEditActivityType()

  const [atDialogOpen, setAtDialogOpen] = useState(false)
  const [editingAt, setEditingAt] = useState<ActivityType | null>(null)
  const canPickResponsible = hasPermission("users.read")
  const { data: users } = useSearchUsers(undefined, canPickResponsible)
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
      typeId: "",
      location: "",
      responsibleUserId: user?.id ?? "",
      collectorUserId: user?.id ?? "",
      attendanceRequired: true,
      fineEnabled: true,
    },
  })

  const atForm = useForm<ActivityTypeFormValues>({
    resolver: zodResolver(activityTypeSchema(t)),
    defaultValues: { code: "", name: "", description: "", is_active: true },
  })

  const ftForm = useForm<FineTypeFormValues>({
    resolver: zodResolver(fineTypeSchema(t)),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      amount: 0,
      applies_to: "absent",
      is_active: true,
    },
  })


  const openCreate = () => {
    setEditing(null)
    form.reset({
      name: "",
      description: "",
      date: new Date().toISOString().split("T")[0],
      startTime: "08:00",
      endTime: "12:00",
      typeId: "",
      location: "",
      responsibleUserId: user?.id ?? "",
      collectorUserId: user?.id ?? "",
      attendanceRequired: true,
      fineEnabled: true,
    })
    setDialogOpen(true)
  }

  const openEdit = (a: Activity) => {
    setEditing(a)
    form.reset({
      name: a.name,
      description: a.description ?? "",
      date: a.date,
      startTime: a?.start_time,
      endTime: a.end_time,
      typeId: a.type_id ?? "",
      location: a.location ?? "",
      responsibleUserId: a.responsible_user_id ?? a.collector_user_id ?? "",
      collectorUserId: a.collector_user_id ?? "",
      attendanceRequired: a.attendance_required ?? true,
      fineEnabled: a.fine_enabled ?? true,
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
      code: "",
      name: "",
      description: "",
      amount: 0,
      applies_to: "absent",
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
      applies_to: ft.applies_to ?? "absent",
      is_active: ft.is_active,
    })
    setFtDialogOpen(true)
  }

  const onSubmitFt = ftForm.handleSubmit(async (values) => {
    // The form keeps snake_case keys; the API DTO only accepts camelCase
    // (appliesTo/isActive), everything else is stripped by the validation pipe.
    const payload = {
      code: values.code,
      name: values.name,
      description: values.description,
      amount: values.amount,
      appliesTo: values.applies_to,
      isActive: values.is_active,
    }
    try {
      if (editingFt) {
        await editFineTypeMut.mutateAsync({ id: editingFt.id, ...payload })
        toast.success(t("common.saved"))
      } else {
        await addFineTypeMut.mutateAsync(payload)
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

  const openCreateAt = () => {
    setEditingAt(null)
    atForm.reset({ code: "", name: "", description: "", is_active: true })
    setAtDialogOpen(true)
  }

  const openEditAt = (at: ActivityType) => {
    setEditingAt(at)
    atForm.reset({
      code: at.code,
      name: at.name,
      description: at.description ?? "",
      is_active: at.is_active,
    })
    setAtDialogOpen(true)
  }

  const onSubmitAt = atForm.handleSubmit(async (values) => {
    try {
      if (editingAt) {
        await editActivityTypeMut.mutateAsync({ id: editingAt.id, ...values })
        toast.success(t("common.saved"))
      } else {
        await addActivityTypeMut.mutateAsync(values)
        toast.success(t("common.created"))
      }
      setAtDialogOpen(false)
    } catch (err) {
      toast.error(getApiErrorMessage(err))
    }
  })

  const onChangeStatus = async (activity: Activity, next: ActivityStatus) => {
    try {
      await changeStatusMut.mutateAsync({ id: activity.id, status: next })
      toast.success(t("common.saved"))
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
      key: "type",
      label: t("activities.type"),
      render: (a) => (
        <span className="text-muted-foreground">
          {a.type?.name ?? t("activities.noType")}
        </span>
      ),
    },
    {
      key: "location",
      label: t("activities.location"),
      render: (a) => (
        <span className="text-muted-foreground">
          {a.location || "—"}
        </span>
      ),
    },
    {
      key: "responsibleUser",
      label: t("activities.responsible"),
      render: (a) => (
        <span className="text-muted-foreground">
          {a.responsibleUser?.full_name ?? t("activities.noResponsible")}
        </span>
      ),
    },
    {
      key: "collectorUser",
      label: t("activities.collector"),
      render: (a) => (
        <span className="text-muted-foreground">
          {a.collectorUser?.full_name ?? t("activities.noCollector")}
        </span>
      ),
    },
    {
      key: "status",
      label: t("activities.status"),
      render: (a) => (
        <Badge variant={STATUS_BADGE[a.status ?? "draft"].variant}>
          {t(`activities.statuses.${a.status ?? "draft"}`)}
        </Badge>
      ),
    },
    {
      key: "creator",
      label: "",
      render: (a) =>
        a.created_by !== user?.id && a.creator ? (
          <Badge variant="outline" className="text-xs">
            {t("activities.createdBy", { name: a.creator.full_name })}
          </Badge>
        ) : null,
    },
    {
      key: "actions",
      label: "",
      className: "w-10",
      stickyRight: true,
      render: (a) => {
        const canManage = a.created_by === user?.id || a.responsible_user_id === user?.id
        return (
            <div onClick={(e) => e.stopPropagation()}>
              <RowActions
                items={[
                  ...(canManage
                    ? [
                        ...(a.status === "draft" || a.status === "scheduled"
                          ? [
                              {
                                label: t("activities.startActivity"),
                                icon: <Play className="size-4" />,
                                permission: "activities.update" as const,
                                onClick: () =>
                                  onChangeStatus(a, "in_progress"),
                              },
                            ]
                          : []),
                        ...(a.status === "in_progress"
                          ? [
                              {
                                label: t("activities.completeActivity"),
                                icon: <CheckCircle2 className="size-4" />,
                                permission: "activities.update" as const,
                                onClick: () => onChangeStatus(a, "completed"),
                              },
                              {
                                label: t("activities.cancelActivity"),
                                icon: <Ban className="size-4" />,
                                permission: "activities.update" as const,
                                onClick: () => onChangeStatus(a, "cancelled"),
                              },
                            ]
                          : []),
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
            <MonitorCheck className="mx-1" />
            {t("activities.title")}
            {data ? (
              <Badge variant="secondary" className="ml-1">
                {data.total}
              </Badge>
            ) : null}
          </TabsTrigger>
          <Can permission="activities.read">
            <TabsTrigger value="types">
              <Type className="mx-1" />
              {t("activities.typesTitle")}
              {activityTypes ? (
                <Badge variant="secondary" className="ml-1">
                  {activityTypes.length}
                </Badge>
              ) : null}
            </TabsTrigger>
          </Can>
          <Can permission="activities.read">
            <TabsTrigger value="fineTypes">
              <FileTypeCorner className="mx-1" />
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

          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={status ?? "all"}
              onValueChange={(v) => {
                setStatus(v === "all" ? undefined : (v as ActivityStatus))
                setPage(1)
              }}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder={t("activities.status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("activities.allStatuses")}</SelectItem>
                {ACTIVITY_STATUSES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(`activities.statuses.${value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={typeId ?? "all"}
              onValueChange={(v) => {
                setTypeId(v === "all" ? undefined : v || undefined)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder={t("activities.type")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("activities.allTypes")}</SelectItem>
                {(activityTypes ?? []).map((at) => (
                  <SelectItem key={at.id} value={at.id}>
                    {at.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <DatePicker
              className="w-40"
              value={dateFrom ?? ""}
              onChange={(v) => {
                setDateFrom(v || undefined)
                setPage(1)
              }}
            />
            <DatePicker
              className="w-40"
              value={dateTo ?? ""}
              onChange={(v) => {
                setDateTo(v || undefined)
                setPage(1)
              }}
            />

            {status || typeId || dateFrom || dateTo || search ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStatus(undefined)
                  setTypeId(undefined)
                  setDateFrom(undefined)
                  setDateTo(undefined)
                  setSearch("")
                  setSearchInput("")
                  setPage(1)
                }}
              >
                {t("common.clearFilters")}
              </Button>
            ) : null}
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
                onRowClick={(a) => navigate(`/actividades/${a.id}`)}
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
          <TabsContent value="types" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
                  <Tag className="size-5" />
                  {t("activities.typesTitle")}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t("activities.typesSubtitle")}
                </p>
              </div>
              <Can permission="activities.create">
                <Button variant="outline" onClick={openCreateAt}>
                  <Plus className="mr-2 size-4" />
                  {t("activities.createType")}
                </Button>
              </Can>
            </div>

            {!activityTypes?.length ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Tag className="mb-3 size-10 text-muted-foreground/50" />
                  <p className="text-muted-foreground">{t("activities.noTypes")}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {activityTypes.map((at) => (
                  <Card key={at.id}>
                    <CardContent className="flex items-center gap-4 p-4">
                      <Badge variant="outline" className="font-mono shrink-0">
                        {at.code}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium">{at.name}</h3>
                        {at.description && (
                          <p className="text-sm text-muted-foreground">
                            {at.description}
                          </p>
                        )}
                      </div>
                      {!at.is_active && (
                        <Badge variant="secondary">{t("common.inactive")}</Badge>
                      )}
                      <Can permission="activities.update">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => openEditAt(at)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                      </Can>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Can>

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
              <Controller
                control={form.control}
                name="date"
                render={({ field }) => (
                  <DatePicker id="activity-date" value={field.value ?? ""} onChange={field.onChange} />
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("activities.startTime")}</label>
                <Controller
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <TimePicker
                      id="activity-start-time"
                      value={field.value ?? ""}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("activities.endTime")}</label>
                <Controller
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <TimePicker
                      id="activity-end-time"
                      value={field.value ?? ""}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("activities.type")}</label>
              <Controller
                control={form.control}
                name="typeId"
                render={({ field }) => (
                  <ComboboxSelect
                    value={field.value || ""}
                    onValueChange={field.onChange}
                    options={[
                      { label: t("activities.noType"), value: "" },
                      ...(activityTypes ?? [])
                        .filter((at) => at.is_active)
                        .map((at) => ({ label: at.name, value: at.id })),
                    ]}
                    placeholder={t("common.select")}
                    searchPlaceholder={t("common.search")}
                  />
                )}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("activities.location")}</label>
              <Input {...form.register("location")} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t("activities.responsible")}
              </label>
              <Controller
                control={form.control}
                name="responsibleUserId"
                render={({ field }) => (
                  <ComboboxSelect
                    value={field.value || ""}
                    onValueChange={field.onChange}
                    options={[
                      { label: t("activities.noResponsible"), value: "" },
                      ...(users ?? []).map((u) => ({
                        label: u.full_name,
                        value: u.id,
                      })),
                    ]}
                    placeholder={t("common.select")}
                    searchPlaceholder={t("common.search")}
                  />
                )}
              />
              <p className="text-xs text-muted-foreground">
                {t("activities.responsibleHint")}
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t("activities.collector")}
              </label>
              <Controller
                control={form.control}
                name="collectorUserId"
                render={({ field }) => (
                  <ComboboxSelect
                    value={field.value || ""}
                    onValueChange={field.onChange}
                    options={[
                      { label: t("activities.noCollector"), value: "" },
                      ...(users ?? []).map((u) => ({
                        label: u.full_name,
                        value: u.id,
                      })),
                    ]}
                    placeholder={t("common.select")}
                    searchPlaceholder={t("common.search")}
                  />
                )}
              />
              <p className="text-xs text-muted-foreground">
                {t("activities.collectorHint")}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <Controller
                  control={form.control}
                  name="attendanceRequired"
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <label className="text-sm font-medium">
                  {t("activities.attendanceRequired")}
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Controller
                  control={form.control}
                  name="fineEnabled"
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <label className="text-sm font-medium">
                  {t("activities.fineEnabled")}
                </label>
              </div>
            </div>
            {editing && editing.creator && (
              <p className="text-xs text-muted-foreground">
                {t("activities.createdBy", { name: editing.creator.full_name })}
              </p>
            )}
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

      {/* Activity Type Dialog */}
      <Dialog open={atDialogOpen} onOpenChange={setAtDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAt ? t("activities.editType") : t("activities.createType")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmitAt} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("activities.typeCode")}</label>
              <Input {...atForm.register("code")} disabled={!!editingAt} />
              {atForm.formState.errors.code && (
                <p className="text-sm text-destructive">
                  {atForm.formState.errors.code.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("activities.typeName")}</label>
              <Input {...atForm.register("name")} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t("activities.typeDescription")}
              </label>
              <Input {...atForm.register("description")} />
            </div>
            <div className="flex items-center gap-2">
              <Controller
                control={atForm.control}
                name="is_active"
                render={({ field }) => (
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <label className="text-sm font-medium">{t("activities.typeActive")}</label>
            </div>
            <DialogFooter>
              <Button
                type="submit"
                disabled={
                  addActivityTypeMut.isPending || editActivityTypeMut.isPending
                }
              >
                {addActivityTypeMut.isPending || editActivityTypeMut.isPending
                  ? t("common.saving")
                  : t("common.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
              <Input {...ftForm.register("code")} />
              {ftForm.formState.errors.code && (
                <p className="text-sm text-destructive">
                  {ftForm.formState.errors.code.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("activities.fineAppliesTo")}</label>
              <Controller
                control={ftForm.control}
                name="applies_to"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(v) =>
                      ftForm.setValue("applies_to", v as FineTypeAppliesTo)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {APPLIES_TO_OPTIONS.map((value) => (
                        <SelectItem key={value} value={value}>
                          {t(`activities.appliesTo.${value}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
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
              <Controller
                control={ftForm.control}
                name="is_active"
                render={({ field }) => (
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
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
