import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Pencil, Plus, Shield, Trash2 } from "lucide-react"
import { formatDate } from "@/lib/utils"
import type { Role } from "@/lib/types"
import { useAuth } from "@/lib/auth"
import { useRoles } from "@/hooks/roles"
import { useTableSort } from "@/hooks/use-sort"
import { RowActions } from "@/components/ui/row-actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/ui/data-table"
import { useSortedData } from "@/hooks/use-sorted-data"
import RoleFormDialog from "./RoleFormDialog"
import DeleteRoleDialog from "./DeleteRoleDialog"
import { roleAccessor } from "./helpers"
import Can from "@/components/Can"

export default function RolesPage() {
  const { t } = useTranslation()
  const { hasPermission } = useAuth()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Role | null>(null)
  const [deleting, setDeleting] = useState<Role | null>(null)

  const { data: roles, isLoading: rolesLoading } = useRoles()

  const { sort, toggleSort } = useTableSort({ key: "name", order: "asc" })

  const sortedRoles = useSortedData(roles, sort, roleAccessor, "name", "asc")

  if (!hasPermission("roles.read")) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-muted-foreground">{t("roles.accessDenied")}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("roles.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("roles.subtitle")}
          </p>
        </div>
        <Can permission="roles.create">
          <Button
            onClick={() => {
              setEditing(null)
              setDialogOpen(true)
            }}
          >
            <Plus className="mr-2 size-4" />
            {t("roles.newRole")}
          </Button>
        </Can>
      </div>

      <Card>
        <CardContent className="p-0">
          <DataTable<Role>
            columns={[
              { key: "name", label: t("roles.name"), sortable: true, render: (r) => <span className="font-medium">{r.name}</span> },
              { key: "description", label: t("roles.description"), sortable: true, render: (r) => <span className="text-muted-foreground">{r.description || "—"}</span> },
              { key: "permissions", label: t("roles.permissions"), sortable: true, render: (r) => <Badge variant="secondary">{r.permissions?.length ?? 0}</Badge> },
              {
                key: "is_system",
                label: t("roles.status"),
                sortable: true,
                render: (r) => (r.is_system ? <Badge>{t("roles.system")}</Badge> : <Badge variant="outline">{t("roles.custom")}</Badge>),
              },
              { key: "created_at", label: t("roles.created"), sortable: true, render: (r) => <span className="text-muted-foreground">{formatDate(r.created_at)}</span> },
              {
                key: "actions",
                label: "",
                className: "w-10",
                stickyRight: true,
                render: (role) =>
                  !role.is_system ? (
                    <RowActions
                      items={[
                        { label: t("common.edit"), icon: <Pencil className="size-4" />, permission: "roles.update", onClick: () => { setEditing(role); setDialogOpen(true) } },
                        { label: t("common.delete"), icon: <Trash2 className="size-4" />, permission: "roles.delete", destructive: true, onClick: () => setDeleting(role) },
                      ]}
                    />
                  ) : null,
              },
            ]}
            data={sortedRoles}
            sort={sort}
            onSort={toggleSort}
            isLoading={rolesLoading}
            emptyIcon={<Shield className="size-6 text-muted-foreground" />}
            emptyText={t("roles.empty")}
            rowKey={(r) => r.id}
          />
        </CardContent>
      </Card>

      <RoleFormDialog
        open={dialogOpen}
        editing={editing}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setEditing(null)
        }}
      />
      <DeleteRoleDialog
        deleting={deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
      />
    </div>
  )
}
