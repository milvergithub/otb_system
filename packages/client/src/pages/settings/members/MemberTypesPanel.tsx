import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Pencil, Plus, Power, Search, Tags, Trash2 } from "lucide-react"
import { getApiErrorMessage } from "@/lib/api"
import type { MemberType } from "@/lib/types"
import {
  useMemberTypes,
  useSetMemberTypeStatus,
} from "@/hooks/memberTypes"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/ui/data-table"
import { RowActions } from "@/components/ui/row-actions"
import Can from "@/components/Can"
import MemberTypeFormDialog from "./MemberTypeFormDialog"
import DeleteMemberTypeDialog from "./DeleteMemberTypeDialog"
import { toast } from "sonner"

export default function MemberTypesPanel() {
  const { t } = useTranslation()

  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<MemberType | null>(null)
  const [deleting, setDeleting] = useState<MemberType | null>(null)

  const { data, isLoading, error, refetch } = useMemberTypes(search, true)
  const setStatus = useSetMemberTypeStatus()

  function openCreate() {
    setEditing(null)
    setDialogOpen(true)
  }

  function openEdit(type: MemberType) {
    setEditing(type)
    setDialogOpen(true)
  }

  function toggleStatus(type: MemberType) {
    const nextActive = !type.is_active
    setStatus.mutate(
      { id: type.id, isActive: nextActive },
      {
        onSuccess: () => {
          toast.success(
            nextActive
              ? t("memberTypes.activated")
              : t("memberTypes.deactivated"),
          )
        },
        onError: (err) => toast.error(getApiErrorMessage(err)),
      },
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t("memberTypes.subtitle")}
        </p>
        <Can permission="memberTypes.create">
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-2 size-4" />
            {t("memberTypes.newType")}
          </Button>
        </Can>
      </div>

      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder={t("memberTypes.searchPlaceholder")}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setSearch(searchInput.trim())
            }
          }}
        />
      </div>

      {error ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-8 text-sm text-destructive">
            <span>{getApiErrorMessage(error)}</span>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              {t("common.retry")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <DataTable<MemberType>
              columns={[
                {
                  key: "code",
                  label: t("memberTypes.code"),
                  render: (type) => (
                    <Badge variant="outline" className="font-mono">
                      {type.code}
                    </Badge>
                  ),
                },
                {
                  key: "name",
                  label: t("memberTypes.name"),
                  render: (type) => (
                    <span className="font-medium">{type.name}</span>
                  ),
                },
                {
                  key: "description",
                  label: t("memberTypes.description"),
                  render: (type) => (
                    <span className="text-sm text-muted-foreground">
                      {type.description || "—"}
                    </span>
                  ),
                },
                {
                  key: "is_active",
                  label: t("memberTypes.status"),
                  render: (type) =>
                    type.is_active ? (
                      <Badge variant="default">{t("memberTypes.activeBadge")}</Badge>
                    ) : (
                      <Badge variant="secondary">
                        {t("memberTypes.inactiveBadge")}
                      </Badge>
                    ),
                },
                {
                  key: "member_count",
                  label: t("memberTypes.memberCount"),
                  align: "right",
                  render: (type) => (
                    <span className="tabular-nums">{type.member_count ?? 0}</span>
                  ),
                },
                {
                  key: "actions",
                  label: "",
                  className: "w-10",
                  stickyRight: true,
                  render: (type: MemberType) => (
                    <RowActions
                      items={[
                        {
                          label: type.is_active
                            ? t("memberTypes.deactivate")
                            : t("memberTypes.activate"),
                          icon: <Power className="size-4" />,
                          permission: "memberTypes.update",
                          onClick: () => toggleStatus(type),
                        },
                        {
                          label: t("common.edit"),
                          icon: <Pencil className="size-4" />,
                          permission: "memberTypes.update",
                          onClick: () => openEdit(type),
                        },
                        {
                          label: t("common.delete"),
                          icon: <Trash2 className="size-4" />,
                          permission: "memberTypes.delete",
                          destructive: true,
                          disabled: (type.member_count ?? 0) > 0,
                          onClick: () => setDeleting(type),
                        },
                      ]}
                    />
                  ),
                } as const,
              ]}
              data={data ?? []}
              isLoading={isLoading}
              emptyIcon={<Tags className="mx-auto size-6 text-muted-foreground" />}
              emptyText={t("memberTypes.noTypes")}
              rowKey={(type) => type.id}
            />
          </CardContent>
        </Card>
      )}

      <MemberTypeFormDialog
        open={dialogOpen}
        editing={editing}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setEditing(null)
        }}
      />
      <DeleteMemberTypeDialog
        deleting={deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
      />
    </div>
  )
}