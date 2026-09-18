import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Pencil, Plus, Search, Trash2, Users, Power } from "lucide-react"
import { getApiErrorMessage } from "@/lib/api"
import { formatDate } from "@/lib/utils"
import type { UserWithRoles } from "@/lib/types"
import { useAuth } from "@/lib/auth"
import { useSearchUsers, useToggleUserActive } from "@/hooks/users"
import { useTableSort } from "@/hooks/use-sort"
import { RowActions } from "@/components/ui/row-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/ui/data-table"
import { useSortedData } from "@/hooks/use-sorted-data"
import { toast } from "sonner"
import UserDialog, { type UserDialogMode } from "./UserDialog"
import DeleteUserDialog from "./DeleteUserDialog"
import { userAccessor } from "./helpers"

export default function UsersPage() {
  const { t } = useTranslation()
  const { hasPermission } = useAuth()
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [dialogMode, setDialogMode] = useState<UserDialogMode | null>(null)
  const [editing, setEditing] = useState<UserWithRoles | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: users, isLoading } = useSearchUsers(search)

  const { sort, toggleSort } = useTableSort({ key: "created_at", order: "desc" })

  const toggleActiveMutation = useToggleUserActive()

  const sortedUsers = useSortedData(users, sort, userAccessor, "created_at", "desc")

  if (!hasPermission("users.read")) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-muted-foreground">{t("users.accessDenied")}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("users.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("users.subtitle")}
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null)
            setDialogMode("create")
          }}
        >
          <Plus className="mr-2 size-4" />
          {t("users.newUser")}
        </Button>
      </div>

      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder={t("users.searchPlaceholder")}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setSearch(searchInput.trim())
            }
          }}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <DataTable<UserWithRoles>
            columns={[
              { key: "full_name", label: t("users.name"), sortable: true, render: (u) => <span className="font-medium">{u.full_name}</span> },
              { key: "email", label: t("users.email"), sortable: true, render: (u) => <span>{u.email}</span> },
              {
                key: "roles",
                label: t("users.roles"),
                sortable: true,
                render: (u) => (
                  <div className="flex flex-wrap gap-1">
                    {u.roles?.length ? (
                      u.roles.map((role) => (
                        <Badge key={role.id} variant="secondary">
                          {role.name}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground">{t("users.noRoles")}</span>
                    )}
                  </div>
                ),
              },
              {
                key: "is_active",
                label: t("users.status"),
                sortable: true,
                render: (u) => <Badge variant={u.is_active ? "default" : "destructive"}>{u.is_active ? t("common.status.active") : t("common.status.inactive")}</Badge>,
              },
              { key: "created_at", label: t("users.joined"), sortable: true, render: (u) => <span className="text-muted-foreground">{formatDate(u.created_at)}</span> },
              {
                key: "actions",
                label: "",
                className: "w-10",
                stickyRight: true,
                render: (userItem) => (
                  <RowActions
                    items={[
                      { label: t("common.edit"), icon: <Pencil className="size-4" />, permission: "users.update", onClick: () => { setEditing(userItem); setDialogMode("edit") } },
                      { label: t("users.roles"), icon: <Users className="size-4" />, permission: "users.roles", onClick: () => { setEditing(userItem); setDialogMode("roles") } },
                      {
                        label: userItem.is_active ? t("common.deactivate") : t("common.activate"),
                        icon: <Power className="size-4" />,
                        permission: "users.archive",
                        onClick: () =>
                          toggleActiveMutation.mutate(
                            { id: userItem.id, isActive: !userItem.is_active },
                            {
                              onSuccess: (_data, variables) => {
                                toast.success(variables.isActive ? t("users.activated") : t("users.deactivated"))
                              },
                              onError: (err) => toast.error(getApiErrorMessage(err)),
                            },
                          ),
                      },
                      { label: t("common.delete"), icon: <Trash2 className="size-4" />, permission: "users.delete", destructive: true, onClick: () => setDeleteId(userItem.id) },
                    ]}
                  />
                ),
              },
            ]}
            data={sortedUsers}
            sort={sort}
            onSort={toggleSort}
            isLoading={isLoading}
            emptyIcon={<Users className="size-6 text-muted-foreground" />}
            emptyText={t("users.empty")}
            rowKey={(u) => u.id}
          />
        </CardContent>
      </Card>

      <UserDialog
        mode={dialogMode}
        editing={editing}
        onOpenChange={(open) => {
          if (!open) {
            setDialogMode(null)
            setEditing(null)
          }
        }}
      />
      <DeleteUserDialog
        deleteId={deleteId}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null)
        }}
      />
    </div>
  )
}
