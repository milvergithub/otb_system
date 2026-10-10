import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Pencil, Plus, Search, Trash2 } from "lucide-react"
import { useAuth } from "@/lib/auth"
import {
  useAddContribution,
  useDeleteContribution,
  useEditContribution,
  useSearchContributions,
} from "@/hooks/contributions"
import type { Contribution, ContributionStatus } from "@/lib/types"
import { getApiErrorMessage } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import Can from "@/components/Can"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { ComboboxSelect } from "@/components/ui/combobox"
import { useSearchUsers } from "@/hooks/users"
import { useTableSort } from "@/hooks/use-sort"
import { RowActions } from "@/components/ui/row-actions"
import { DataTable, type DataTableColumn } from "@/components/ui/data-table"
import { DataTablePagination } from "@/components/ui/data-table-pagination"

function contributionSchema(t: (k: string) => string) {
  return z.object({
    title: z.string().min(1, t("validation.required")),
    purpose: z.string().optional(),
    amountPerMember: z.coerce
      .number()
      .positive(t("contributions.amountPositive")),
    collectorUserId: z.string().optional(),
    responsibleUserId: z.string().optional(),
    notes: z.string().optional(),
  })
}

type ContributionFormValues = z.infer<ReturnType<typeof contributionSchema>>

const CONTRIBUTION_STATUSES: ContributionStatus[] = [
  "draft",
  "active",
  "paused",
  "completed",
  "cancelled",
]

const STATUS_BADGE: Record<
  ContributionStatus,
  { variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  draft: { variant: "secondary" },
  active: { variant: "default" },
  paused: { variant: "outline" },
  completed: { variant: "outline" },
  cancelled: { variant: "destructive" },
}

export default function ContributionsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { hasPermission, user } = useAuth()

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [status, setStatus] = useState<ContributionStatus | undefined>()
  const { sort, toggleSort } = useTableSort({
    key: "created_at",
    order: "desc",
  })

  const { data, isLoading } = useSearchContributions({
    page,
    search,
    status,
    sortBy: sort?.key,
    sortOrder: sort?.order,
  })

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Contribution | null>(null)
  const [deleting, setDeleting] = useState<Contribution | null>(null)

  const addMutation = useAddContribution()
  const editMutation = useEditContribution()
  const deleteMutation = useDeleteContribution()

  const {
    data: usersData,
    isLoading: usersLoading,
    refetch: refetchUsers,
  } = useSearchUsers(undefined, hasPermission("users.read"))

  const form = useForm<ContributionFormValues>({
    resolver: zodResolver(contributionSchema(t)),
    defaultValues: {
      title: "",
      purpose: "",
      amountPerMember: 0,
      collectorUserId: "",
      responsibleUserId: "",
      notes: "",
    },
  })

  const openCreate = () => {
    setEditing(null)
    form.reset({
      title: "",
      purpose: "",
      amountPerMember: 0,
      collectorUserId: user?.id ?? "",
      responsibleUserId: user?.id ?? "",
      notes: "",
    })
    if (hasPermission("users.read")) void refetchUsers()
    setFormOpen(true)
  }

  const openEdit = (contribution: Contribution) => {
    setEditing(contribution)
    form.reset({
      title: contribution.title,
      purpose: contribution.purpose ?? "",
      amountPerMember: Number(contribution.amount_per_member),
      collectorUserId: contribution.collector_user_id ?? "",
      responsibleUserId: contribution.responsible_user_id ?? "",
      notes: contribution.notes ?? "",
    })
    if (hasPermission("users.read")) void refetchUsers()
    setFormOpen(true)
  }

  const onSubmit = (values: ContributionFormValues) => {
    const payload = {
      title: values.title,
      purpose: values.purpose || undefined,
      amountPerMember: values.amountPerMember,
      collectorUserId: values.collectorUserId || undefined,
      responsibleUserId: values.responsibleUserId || undefined,
      notes: values.notes || undefined,
    }
    const onSuccess = () => {
      toast.success(t("common.saved"))
      setFormOpen(false)
    }
    const onError = (error: unknown) =>
      toast.error(getApiErrorMessage(error))

    if (editing) {
      editMutation.mutate(
        { id: editing.id, ...payload },
        { onSuccess, onError },
      )
    } else {
      addMutation.mutate(payload, { onSuccess, onError })
    }
  }

  const confirmDelete = () => {
    if (!deleting) return
    deleteMutation.mutate(deleting.id, {
      onSuccess: () => {
        toast.success(t("common.deleted"))
        setDeleting(null)
      },
      onError: (error) => toast.error(getApiErrorMessage(error)),
    })
  }

  const userOptions = useMemo(
    () =>
      (usersData ?? []).map((u) => ({
        value: u.id,
        label: u.full_name,
      })),
    [usersData],
  )

  const columns: DataTableColumn<Contribution>[] = [
    {
      key: "title",
      label: t("contributions.fields.title"),
      sortable: true,
      render: (c) => (
        <div className="max-w-[240px]">
          <div className="font-medium truncate">{c.title}</div>
          {c.purpose ? (
            <div className="text-xs text-muted-foreground truncate">
              {c.purpose}
            </div>
          ) : null}
        </div>
      ),
    },
    {
      key: "amount_per_member",
      label: t("contributions.fields.amount"),
      sortable: true,
      render: (c) => `${Number(c.amount_per_member).toFixed(2)} Bs`,
    },
    {
      key: "status",
      label: t("contributions.fields.status"),
      sortable: true,
      render: (c) => (
        <Badge variant={STATUS_BADGE[c.status].variant}>
          {t(`contributions.statuses.${c.status}`)}
        </Badge>
      ),
    },
    {
      key: "collectorUser",
      label: t("contributions.fields.collector"),
      render: (c) => c.collectorUser?.full_name ?? "-",
    },
    {
      key: "responsibleUser",
      label: t("contributions.fields.responsible"),
      render: (c) => c.responsibleUser?.full_name ?? "-",
    },
    {
      key: "created_at",
      label: t("contributions.fields.createdAt"),
      sortable: true,
      render: (c) => new Date(c.created_at).toLocaleDateString("es-BO"),
    },
  ]

  const canManage = (c: Contribution) =>
    hasPermission("contributions.all") ||
    hasPermission("contributions.update") ||
    c.created_by === user?.id ||
    c.responsible_user_id === user?.id

  const columnsWithActions: DataTableColumn<Contribution>[] = [
    ...columns,
    {
      key: "actions",
      label: "",
      className: "w-10",
      stickyRight: true,
      render: (c) => (
        <div onClick={(e) => e.stopPropagation()}>
          <RowActions
            items={[
              {
                label: t("common.view"),
                onClick: () => navigate(`/contributions/${c.id}`),
              },
              ...(canManage(c) && c.status === "draft"
                ? [
                    {
                      label: t("common.edit"),
                      icon: <Pencil className="size-4" />,
                      onClick: () => openEdit(c),
                    },
                    {
                      label: t("common.delete"),
                      icon: <Trash2 className="size-4" />,
                      destructive: true,
                      onClick: () => setDeleting(c),
                    },
                  ]
                : []),
            ]}
          />
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t("contributions.title")}
        </h1>
        <p className="text-muted-foreground">{t("contributions.subtitle")}</p>
      </div>

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
        <Can permission="contributions.create">
          <Button onClick={openCreate}>
            <Plus className="mr-2 size-4" />
            {t("contributions.create")}
          </Button>
        </Can>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={status ?? "all"}
          onValueChange={(v) => {
            setStatus(v === "all" ? undefined : (v as ContributionStatus))
            setPage(1)
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder={t("contributions.fields.status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("contributions.allStatuses")}</SelectItem>
            {CONTRIBUTION_STATUSES.map((value) => (
              <SelectItem key={value} value={value}>
                {t(`contributions.statuses.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {status || search ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatus(undefined)
              setSearch("")
              setSearchInput("")
              setPage(1)
            }}
          >
            {t("common.clearFilters")}
          </Button>
        ) : null}
      </div>

      <DataTable<Contribution>
        columns={columnsWithActions}
        data={data?.items ?? []}
        sort={sort}
        onSort={toggleSort}
        isLoading={isLoading}
        onRowClick={(c) => navigate(`/contributions/${c.id}`)}
        emptyText={t("contributions.empty")}
        rowKey={(c) => c.id}
      />

      <DataTablePagination
        page={page}
        totalPages={data?.totalPages ?? 1}
        total={data?.total ?? 0}
        onPageChange={setPage}
        noun={t("contributions.title").toLowerCase()}
      />

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? t("contributions.edit") : t("contributions.create")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">{t("contributions.fields.title")}</Label>
              <Input id="title" {...form.register("title")} />
              {form.formState.errors.title ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.title.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="purpose">
                {t("contributions.fields.purpose")}
              </Label>
              <Textarea id="purpose" {...form.register("purpose")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amountPerMember">
                {t("contributions.fields.amount")}
              </Label>
              <Input
                id="amountPerMember"
                type="number"
                step="0.01"
                min="0"
                {...form.register("amountPerMember")}
              />
              {form.formState.errors.amountPerMember ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.amountPerMember.message}
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("contributions.fields.collector")}</Label>
                <Controller
                  control={form.control}
                  name="collectorUserId"
                  render={({ field }) => (
                    <ComboboxSelect
                      options={userOptions}
                      value={field.value || undefined}
                      onValueChange={field.onChange}
                      placeholder={t("contributions.selectUser")}
                      disabled={!hasPermission("users.read") || usersLoading}
                    />
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("contributions.fields.responsible")}</Label>
                <Controller
                  control={form.control}
                  name="responsibleUserId"
                  render={({ field }) => (
                    <ComboboxSelect
                      options={userOptions}
                      value={field.value || undefined}
                      onValueChange={field.onChange}
                      placeholder={t("contributions.selectUser")}
                      disabled={!hasPermission("users.read") || usersLoading}
                    />
                  )}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">{t("contributions.fields.notes")}</Label>
              <Textarea id="notes" {...form.register("notes")} />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormOpen(false)}
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={addMutation.isPending || editMutation.isPending}
              >
                {t("common.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("contributions.deleteWarning")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
