import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Pencil, Plus, Search, Trash2, Users, Phone, CircleDollarSign, MapPinHouse } from "lucide-react"
import { formatDate, getWhatsAppUrl } from "@/lib/utils"
import type { Member } from "@/lib/types"
import { useSearchMembers } from "@/hooks/members"
import { useFines } from "@/hooks/activities"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useTableSort } from "@/hooks/use-sort"
import { RowActions } from "@/components/ui/row-actions"
import { DataTable } from "@/components/ui/data-table"
import { DataTablePagination } from "@/components/ui/data-table-pagination"
import MemberFormDialog from "./MemberFormDialog"
import DeleteMemberDialog from "./DeleteMemberDialog"
import Can from "@/components/Can"

export default function MembersPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  function memberInitials(firstName: string, lastName: string): string {
    return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase()
  }

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Member | null>(null)
  const [deleting, setDeleting] = useState<Member | null>(null)

  const { sort, toggleSort } = useTableSort(
    { key: "first_name", order: "asc" },
    () => setPage(1),
  )

  const { data, isLoading } = useSearchMembers({
    page,
    search,
    sortBy: sort?.key,
    sortOrder: sort?.order,
  })

  const { data: fines } = useFines()

  const finesByMember = useMemo(() => {
    const g = new Map<
      string,
      { pending: number; paid: number; cancelled: number; pendingAmount: number }
    >()
    for (const f of fines ?? []) {
      const entry = g.get(f.member_id) ?? {
        pending: 0,
        paid: 0,
        cancelled: 0,
        pendingAmount: 0,
      }
      if (f.status === "pending") {
        entry.pending++
        entry.pendingAmount += parseFloat(f.amount)
      } else if (f.status === "paid") {
        entry.paid++
      } else if (f.status === "cancelled") {
        entry.cancelled++
      }
      g.set(f.member_id, entry)
    }
    return g
  }, [fines])

  function getFines(member: Member) {
    return finesByMember.get(member.id)
  }

  function openCreate() {
    setEditing(null)
    setDialogOpen(true)
  }

  function openEdit(member: Member) {
    setEditing(member)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("members.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("members.subtitle")}
          </p>
        </div>
        <Can permission="members.create">
          <Button onClick={openCreate}>
            <Plus className="mr-2 size-4" />
            {t("members.newMember")}
          </Button>
        </Can>
      </div>

      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder={t("members.searchPlaceholder")}
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

      <Card>
        <CardContent className="p-0">
          <DataTable<Member>
            columns={[
              {
                key: "first_name",
                label: t("members.name"),
                sortable: true,
                render: (member) => (
                  <div className="flex items-center gap-2">
                    <Avatar className="size-8">
                      <AvatarFallback className="text-xs">
                        {memberInitials(member.first_name, member.last_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col leading-tight">
                      <span>{member.first_name} {member.last_name}</span>
                      <span className="text-xs text-muted-foreground">{member.ci}</span>
                    </div>
                  </div>
                ),
              },
              {
                key: "phone",
                label: t("members.phone"),
                render: (member) => (
                  <div className="flex flex-col gap-1">
                    {member.phone ? (
                      <div className="flex flex-row gap-1">
                        <Phone className="size-3.5 text-muted-foreground" />
                        <a
                          href={getWhatsAppUrl(member.phone, member.phone_country ?? "BO") ?? "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Abrir en WhatsApp"
                          className="inline-flex items-center gap-1 text-primary font-semibold"
                        >
                          {member.phone}
                        </a>
                      </div>
                    ) : (
                      "-"
                    )}
                    <div className="flex flex-row gap-1">
                      <MapPinHouse className="size-3.5 text-muted-foreground" />
                      <span>{member.address || "-"}</span>
                    </div>
                  </div>
                ),
              },
              {
                key: "meters",
                label: t("members.meters"),
                render: (member) =>
                  member.meters?.length ? (
                    <div className="flex flex-wrap gap-1">
                      {member.meters.map((m) => (
                        <Badge key={m.id} variant="secondary" className="text-xs">
                          {m.code}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span>{"\u2014"}</span>
                  ),
              },
              {
                key: "created_at",
                label: t("members.joined"),
                sortable: true,
                render: (member) => <span className="text-muted-foreground">{formatDate(member.created_at)}</span>,
              },
              {
                key: "fines",
                label: t("members.fines"),
                render: (member) => {
                  const s = getFines(member)
                  if (!s || (s.pending === 0 && s.paid === 0 && s.cancelled === 0)) {
                    return <span className="text-muted-foreground">{"\u2014"}</span>
                  }
                  return (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {s.pending > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {s.pending} {t("activities.finesPending").toLowerCase()}
                        </Badge>
                      )}
                      {s.paid > 0 && (
                        <Badge variant="default" className="text-xs">
                          {s.paid} {t("activities.finesPaidCount").toLowerCase()}
                        </Badge>
                      )}
                      {s.cancelled > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {s.cancelled} {t("activities.finesCancelledCount").toLowerCase()}
                        </Badge>
                      )}
                    </div>
                  )
                },
              },
              {
                key: "actions",
                label: "",
                className: "w-10",
                stickyRight: true,
                render: (member: Member) => (
                  <RowActions
                    items={[
                      {
                        label: t("members.viewFines"),
                        icon: <CircleDollarSign className="size-4" />,
                        permission: "members.viewFines",
                        onClick: () => navigate(`/fines/${member.id}`),
                      },
                      {
                        label: t("common.edit"),
                        icon: <Pencil className="size-4" />,
                        permission: "members.update",
                        onClick: () => openEdit(member),
                      },
                      {
                        label: t("common.delete"),
                        icon: <Trash2 className="size-4" />,
                        permission: "members.delete",
                        destructive: true,
                        onClick: () => setDeleting(member),
                      },
                    ]}
                  />
                ),
              } as const,
            ]}
            data={data?.items ?? []}
            sort={sort}
            onSort={toggleSort}
            isLoading={isLoading}
            emptyIcon={<Users className="mx-auto size-6 text-muted-foreground" />}
            emptyText={t("members.noMembers")}
            rowKey={(member) => member.id}
          />
        </CardContent>
      </Card>

      {data ? (
        <DataTablePagination
          page={data.page}
          totalPages={data.totalPages}
          total={data.total}
          onPageChange={setPage}
          noun={t("members.noun")}
        />
      ) : null}

      <MemberFormDialog
        open={dialogOpen}
        editing={editing}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setEditing(null)
        }}
      />
      <DeleteMemberDialog
        deleting={deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
      />
    </div>
  )
}
